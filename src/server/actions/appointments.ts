"use server";

import { db } from "@/lib/db";
import { requireTenantContext, requirePermissions, requireActiveSubscription } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { appointmentSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { AppointmentStatus } from "@prisma/client";

// ─── helpers ───────────────────────────────────────────────────

/** Check for overlapping appointments for the same dentist. */
async function checkDoubleBooking(
  clinicId: string,
  dentistProfileId: string,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
): Promise<boolean> {
  const where: Record<string, unknown> = {
    clinicId,
    dentistProfileId,
    status: { notIn: ["CANCELLED", "NO_SHOW"] as AppointmentStatus[] },
    // Overlap: existing.start < new.end AND existing.end > new.start
    startTime: { lt: endTime },
    endTime: { gt: startTime },
  };

  if (excludeAppointmentId) {
    where.id = { not: excludeAppointmentId };
  }

  const conflicting = await db.appointment.findFirst({ where: where as any });
  return !!conflicting;
}

// ─── getAppointments ───────────────────────────────────────────
export async function getAppointments(params?: {
  date?: string;
  dentistProfileId?: string;
  status?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.APPOINTMENTS_READ]);

  const where: Record<string, unknown> = { clinicId: ctx.clinicId };

  if (params?.date) {
    const start = new Date(params.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(params.date);
    end.setHours(23, 59, 59, 999);
    where.startTime = { gte: start, lte: end };
  }

  if (params?.dentistProfileId) {
    where.dentistProfileId = params.dentistProfileId;
  }

  if (params?.status) {
    where.status = params.status;
  }

  return db.appointment.findMany({
    where: where as any,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      dentistProfile: {
        include: {
          clinicMember: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });
}

// ─── getAppointmentsForWeek ────────────────────────────────────
export async function getAppointmentsForWeek(weekStart: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.APPOINTMENTS_READ]);

  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(0, 0, 0, 0);

  return db.appointment.findMany({
    where: {
      clinicId: ctx.clinicId,
      startTime: { gte: start, lt: end },
    } as any,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      dentistProfile: {
        include: {
          clinicMember: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });
}

// ─── getAppointment ────────────────────────────────────────────
export async function getAppointment(appointmentId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.APPOINTMENTS_READ]);

  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, clinicId: ctx.clinicId },
    include: {
      patient: true,
      dentistProfile: {
        include: {
          clinicMember: { include: { user: { select: { name: true, email: true } } } },
        },
      },
      appointmentNotes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!appointment) throw new Error("NOT_FOUND");
  return appointment;
}

// ─── getClinicDentists ─────────────────────────────────────────
export async function getClinicDentists() {
  const ctx = await requireTenantContext();

  return db.dentistProfile.findMany({
    where: { clinicMember: { clinicId: ctx.clinicId } },
    include: {
      clinicMember: { include: { user: { select: { name: true } } } },
    },
  });
}

// ─── getClinicPatientsForSelect ────────────────────────────────
export async function getClinicPatientsForSelect() {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_READ]);

  return db.patient.findMany({
    where: { clinicId: ctx.clinicId },
    select: { id: true, firstName: true, lastName: true, phone: true },
    orderBy: { firstName: "asc" },
    take: 500,
  });
}

// ─── createAppointment ────────────────────────────────────────
export async function createAppointment(formData: FormData) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.APPOINTMENTS_WRITE]);
  await requireActiveSubscription(ctx.clinicId);

  const raw = Object.fromEntries(formData.entries());
  const parsed = appointmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (endTime <= startTime) {
    return { error: "End time must be after start time" };
  }

  // Verify patient belongs to clinic
  const patient = await db.patient.findFirst({
    where: { id: data.patientId, clinicId: ctx.clinicId },
  });
  if (!patient) return { error: "Patient not found" };

  // Double-booking check
  if (data.dentistProfileId) {
    const conflict = await checkDoubleBooking(
      ctx.clinicId,
      data.dentistProfileId,
      startTime,
      endTime
    );
    if (conflict) {
      return { error: "This dentist already has an appointment during that time slot" };
    }
  }

  const reminderEmail = raw.reminderEmail === "on" || raw.reminderEmail === "true";

  const appointment = await db.appointment.create({
    data: {
      clinicId: ctx.clinicId,
      patientId: data.patientId,
      dentistProfileId: data.dentistProfileId || null,
      title: data.title || `Appointment - ${patient.firstName} ${patient.lastName}`,
      startTime,
      endTime,
      status: data.status as AppointmentStatus,
      type: data.type || null,
      notes: data.notes || null,
      reminderEmail,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "appointment.create",
    entity: "Appointment",
    entityId: appointment.id,
  });

  revalidatePath("/dashboard/appointments");
  return { success: true, appointmentId: appointment.id };
}

// ─── updateAppointment ─────────────────────────────────────────
export async function updateAppointment(appointmentId: string, formData: FormData) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.APPOINTMENTS_WRITE]);

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, clinicId: ctx.clinicId },
  });
  if (!existing) throw new Error("NOT_FOUND");

  const raw = Object.fromEntries(formData.entries());
  const parsed = appointmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (endTime <= startTime) {
    return { error: "End time must be after start time" };
  }

  // Double-booking check (exclude self)
  if (data.dentistProfileId) {
    const conflict = await checkDoubleBooking(
      ctx.clinicId,
      data.dentistProfileId,
      startTime,
      endTime,
      appointmentId
    );
    if (conflict) {
      return { error: "This dentist already has an appointment during that time slot" };
    }
  }

  const reminderEmail = raw.reminderEmail === "on" || raw.reminderEmail === "true";

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      patientId: data.patientId,
      dentistProfileId: data.dentistProfileId || null,
      title: data.title || null,
      startTime,
      endTime,
      status: data.status as AppointmentStatus,
      type: data.type || null,
      notes: data.notes || null,
      reminderEmail,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "appointment.update",
    entity: "Appointment",
    entityId: appointmentId,
    metadata: { changes: data },
  });

  revalidatePath(`/dashboard/appointments/${appointmentId}`);
  revalidatePath("/dashboard/appointments");
  return { success: true };
}

// ─── toggleReminder ────────────────────────────────────────────
export async function toggleAppointmentReminder(
  appointmentId: string,
  reminderEmail: boolean
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.APPOINTMENTS_WRITE]);

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, clinicId: ctx.clinicId },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await db.appointment.update({
    where: { id: appointmentId },
    data: { reminderEmail },
  });

  revalidatePath(`/dashboard/appointments/${appointmentId}`);
  return { success: true };
}

// ─── updateAppointmentStatus ───────────────────────────────────
export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.APPOINTMENTS_WRITE]);

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, clinicId: ctx.clinicId },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await db.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "appointment.statusChange",
    entity: "Appointment",
    entityId: appointmentId,
    metadata: { from: existing.status, to: status },
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath(`/dashboard/appointments/${appointmentId}`);
  return { success: true };
}

// ─── addAppointmentNote ────────────────────────────────────────
export async function addAppointmentNote(appointmentId: string, note: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.APPOINTMENTS_WRITE]);

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, clinicId: ctx.clinicId },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await db.appointmentNote.create({
    data: {
      appointmentId,
      note,
      createdBy: ctx.userId,
    },
  });

  revalidatePath(`/dashboard/appointments/${appointmentId}`);
  return { success: true };
}

// ─── deleteAppointment ─────────────────────────────────────────
export async function deleteAppointment(appointmentId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.APPOINTMENTS_DELETE]);

  const existing = await db.appointment.findFirst({
    where: { id: appointmentId, clinicId: ctx.clinicId },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await db.appointment.delete({ where: { id: appointmentId } });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "appointment.delete",
    entity: "Appointment",
    entityId: appointmentId,
  });

  revalidatePath("/dashboard/appointments");
  return { success: true };
}

// ─── Reminder job placeholder ──────────────────────────────────
/**
 * Placeholder: call from a cron job (e.g. Vercel Cron, node-cron).
 * Queries appointments within the next 24h that have
 * reminderEmail=true and reminderSentAt IS NULL, sends an email
 * for each, then marks reminderSentAt.
 *
 * Wire up via: POST /api/cron/reminders (protected by CRON_SECRET)
 */
export async function processAppointmentReminders() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(now.getHours() + 24);

  const pending = await db.appointment.findMany({
    where: {
      reminderEmail: true,
      reminderSentAt: null,
      startTime: { gte: now, lte: tomorrow },
      status: { in: ["SCHEDULED", "CONFIRMED"] as AppointmentStatus[] },
    },
    include: {
      patient: { select: { email: true, firstName: true, lastName: true } },
      clinic: { select: { name: true } },
    },
  });

  const { sendAppointmentReminder } = await import("@/lib/email");
  let sent = 0;

  for (const apt of pending) {
    if (!apt.patient.email) continue;

    const dateTime = new Date(apt.startTime).toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const ok = await sendAppointmentReminder(
      apt.patient.email,
      `${apt.patient.firstName} ${apt.patient.lastName}`,
      apt.clinic.name,
      dateTime
    );

    if (ok) {
      await db.appointment.update({
        where: { id: apt.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    }
  }

  return { processed: pending.length, sent };
}
