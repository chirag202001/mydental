"use server";

import { db } from "@/lib/db";
import { requireTenantContext, requirePermissions, requireActiveSubscription } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { patientSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getPatients(search?: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_READ]);

  const where: Record<string, unknown> = { clinicId: ctx.clinicId };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  return db.patient.findMany({
    where: where as any,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getPatient(patientId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_READ]);

  const patient = await db.patient.findFirst({
    where: { id: patientId, clinicId: ctx.clinicId },
    include: {
      medicalHistory: true,
      allergies: true,
      toothConditions: true,
      toothNotes: true,
      documents: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { startTime: "desc" }, take: 10 },
      treatmentPlans: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!patient) throw new Error("NOT_FOUND");
  return patient;
}

export async function createPatient(formData: FormData) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_WRITE]);
  await requireActiveSubscription(ctx.clinicId);

  const raw = Object.fromEntries(formData.entries());
  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const patient = await db.patient.create({
    data: {
      clinicId: ctx.clinicId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender || null,
      bloodGroup: data.bloodGroup || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      notes: data.notes || null,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "patient.create",
    entity: "Patient",
    entityId: patient.id,
  });

  revalidatePath("/dashboard/patients");
  return { success: true, patientId: patient.id };
}

export async function updatePatient(patientId: string, formData: FormData) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_WRITE]);

  // Verify patient belongs to clinic
  const existing = await db.patient.findFirst({
    where: { id: patientId, clinicId: ctx.clinicId },
  });
  if (!existing) throw new Error("NOT_FOUND");

  const raw = Object.fromEntries(formData.entries());
  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  await db.patient.update({
    where: { id: patientId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender || null,
      bloodGroup: data.bloodGroup || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      notes: data.notes || null,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "patient.update",
    entity: "Patient",
    entityId: patientId,
    metadata: { changes: data },
  });

  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath("/dashboard/patients");
  return { success: true };
}

export async function deletePatient(patientId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_DELETE]);

  const existing = await db.patient.findFirst({
    where: { id: patientId, clinicId: ctx.clinicId },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await db.patient.delete({ where: { id: patientId } });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "patient.delete",
    entity: "Patient",
    entityId: patientId,
  });

  revalidatePath("/dashboard/patients");
  return { success: true };
}
