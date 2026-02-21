"use server";

import { db } from "@/lib/db";
import {
  requireTenantContext,
  requirePermissions,
  requireActiveSubscription,
} from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import {
  treatmentPlanSchema,
  treatmentItemSchema,
  updateTreatmentItemSchema,
} from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { generateInvoiceNumber } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { TreatmentPlanStatus, TreatmentItemStatus } from "@prisma/client";

// ─── Queries ────────────────────────────────────────────────────

export async function getTreatmentPlans(params?: {
  patientId?: string;
  status?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_READ]);

  const where: Record<string, unknown> = { clinicId: ctx.clinicId };
  if (params?.patientId) where.patientId = params.patientId;
  if (params?.status) where.status = params.status;

  return db.treatmentPlan.findMany({
    where: where as any,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      items: { orderBy: { sortOrder: "asc" } },
      invoices: { select: { id: true, invoiceNumber: true, status: true, total: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTreatmentPlan(planId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_READ]);

  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, clinicId: ctx.clinicId },
    include: {
      patient: true,
      items: { orderBy: { sortOrder: "asc" } },
      invoices: {
        include: {
          items: true,
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!plan) throw new Error("NOT_FOUND");
  return plan;
}

export async function getClinicPatientsForSelect() {
  const ctx = await requireTenantContext();
  return db.patient.findMany({
    where: { clinicId: ctx.clinicId },
    select: { id: true, firstName: true, lastName: true, phone: true },
    orderBy: { firstName: "asc" },
    take: 500,
  });
}

export async function getClinicDentists() {
  const ctx = await requireTenantContext();
  return db.dentistProfile.findMany({
    where: { clinicMember: { clinicId: ctx.clinicId, isActive: true } },
    select: {
      id: true,
      specialization: true,
      clinicMember: {
        select: { user: { select: { name: true } } },
      },
    },
  });
}

// ─── Create / Update Plan ───────────────────────────────────────

export async function createTreatmentPlan(formData: FormData) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_WRITE]);
  await requireActiveSubscription(ctx.clinicId);

  const raw = Object.fromEntries(formData.entries());
  const parsed = treatmentPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Verify patient belongs to clinic
  const patient = await db.patient.findFirst({
    where: { id: data.patientId, clinicId: ctx.clinicId },
  });
  if (!patient) return { error: "Patient not found" };

  const plan = await db.treatmentPlan.create({
    data: {
      clinicId: ctx.clinicId,
      patientId: data.patientId,
      name: data.name,
      notes: data.notes || null,
      createdBy: ctx.userId,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "treatmentPlan.create",
    entity: "TreatmentPlan",
    entityId: plan.id,
  });

  revalidatePath("/dashboard/treatments");
  return { success: true, planId: plan.id };
}

export async function updateTreatmentPlan(
  planId: string,
  formData: FormData
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_WRITE]);

  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, clinicId: ctx.clinicId },
  });
  if (!plan) return { error: "Treatment plan not found" };

  const name = formData.get("name") as string;
  const notes = formData.get("notes") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Plan name is required" };
  }

  await db.treatmentPlan.update({
    where: { id: planId },
    data: {
      name: name.trim(),
      notes: notes?.trim() || null,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "treatmentPlan.update",
    entity: "TreatmentPlan",
    entityId: planId,
  });

  revalidatePath("/dashboard/treatments");
  revalidatePath(`/dashboard/treatments/${planId}`);
  return { success: true };
}

export async function deleteTreatmentPlan(planId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_WRITE]);

  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, clinicId: ctx.clinicId },
  });
  if (!plan) return { error: "Treatment plan not found" };

  await db.treatmentPlan.delete({ where: { id: planId } });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "treatmentPlan.delete",
    entity: "TreatmentPlan",
    entityId: planId,
  });

  revalidatePath("/dashboard/treatments");
  return { success: true };
}

// ─── Plan Status Transitions ────────────────────────────────────

const VALID_PLAN_TRANSITIONS: Record<string, TreatmentPlanStatus[]> = {
  DRAFT: [TreatmentPlanStatus.PROPOSED, TreatmentPlanStatus.CANCELLED],
  PROPOSED: [TreatmentPlanStatus.ACCEPTED, TreatmentPlanStatus.CANCELLED, TreatmentPlanStatus.DRAFT],
  ACCEPTED: [TreatmentPlanStatus.IN_PROGRESS, TreatmentPlanStatus.CANCELLED],
  IN_PROGRESS: [TreatmentPlanStatus.COMPLETED, TreatmentPlanStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [TreatmentPlanStatus.DRAFT],
};

export async function updateTreatmentPlanStatus(
  planId: string,
  newStatus: TreatmentPlanStatus
) {
  const ctx = await requireTenantContext();

  // Approve requires special permission
  if (newStatus === TreatmentPlanStatus.ACCEPTED) {
    requirePermissions(ctx, [PERMISSIONS.TREATMENTS_APPROVE]);
  } else {
    requirePermissions(ctx, [PERMISSIONS.TREATMENTS_WRITE]);
  }

  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, clinicId: ctx.clinicId },
  });
  if (!plan) return { error: "Treatment plan not found" };

  const allowed = VALID_PLAN_TRANSITIONS[plan.status] || [];
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from ${plan.status} to ${newStatus}` };
  }

  await db.treatmentPlan.update({
    where: { id: planId },
    data: { status: newStatus },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: `treatmentPlan.status.${newStatus.toLowerCase()}`,
    entity: "TreatmentPlan",
    entityId: planId,
  });

  revalidatePath("/dashboard/treatments");
  revalidatePath(`/dashboard/treatments/${planId}`);
  return { success: true };
}

// Legacy approve function for backward compat
export async function approveTreatmentPlan(planId: string) {
  return updateTreatmentPlanStatus(planId, TreatmentPlanStatus.ACCEPTED);
}

// ─── Treatment Items ────────────────────────────────────────────

export async function addTreatmentItem(
  planId: string,
  formData: FormData
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_WRITE]);

  // Verify plan belongs to clinic
  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, clinicId: ctx.clinicId },
    include: { items: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!plan) return { error: "Treatment plan not found" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = treatmentItemSchema.safeParse({
    ...raw,
    toothNum: raw.toothNum ? Number(raw.toothNum) : undefined,
    cost: raw.cost ? Number(raw.cost) : 0,
    discount: raw.discount ? Number(raw.discount) : 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const nextSort = (plan.items[0]?.sortOrder ?? -1) + 1;

  const item = await db.treatmentItem.create({
    data: {
      treatmentPlanId: planId,
      procedure: data.procedure,
      toothNum: data.toothNum ?? null,
      cost: data.cost,
      discount: data.discount,
      dentistId: data.dentistId || null,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      notes: data.notes || null,
      sortOrder: nextSort,
    },
  });

  // If plan is ACCEPTED or later, auto-move to IN_PROGRESS
  if (plan.status === TreatmentPlanStatus.ACCEPTED) {
    await db.treatmentPlan.update({
      where: { id: planId },
      data: { status: TreatmentPlanStatus.IN_PROGRESS },
    });
  }

  revalidatePath(`/dashboard/treatments/${planId}`);
  return { success: true, itemId: item.id };
}

export async function updateTreatmentItem(
  itemId: string,
  formData: FormData
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_WRITE]);

  const item = await db.treatmentItem.findFirst({
    where: { id: itemId },
    include: { treatmentPlan: { select: { clinicId: true, id: true } } },
  });
  if (!item || item.treatmentPlan.clinicId !== ctx.clinicId) {
    return { error: "Treatment item not found" };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateTreatmentItemSchema.safeParse({
    ...raw,
    toothNum: raw.toothNum ? Number(raw.toothNum) : raw.toothNum === "" ? null : undefined,
    cost: raw.cost !== undefined ? Number(raw.cost) : undefined,
    discount: raw.discount !== undefined ? Number(raw.discount) : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (data.procedure !== undefined) updateData.procedure = data.procedure;
  if (data.toothNum !== undefined) updateData.toothNum = data.toothNum;
  if (data.cost !== undefined) updateData.cost = data.cost;
  if (data.discount !== undefined) updateData.discount = data.discount;
  if (data.dentistId !== undefined) updateData.dentistId = data.dentistId || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  if (data.scheduledDate !== undefined) {
    updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
  }

  // Handle status changes
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "COMPLETED") {
      updateData.completedDate = new Date();
    } else if (String(item.status) === "COMPLETED") {
      // Reverting from completed, clear the date
      updateData.completedDate = null;
    }
  }

  await db.treatmentItem.update({
    where: { id: itemId },
    data: updateData as any,
  });

  revalidatePath(`/dashboard/treatments/${item.treatmentPlan.id}`);
  return { success: true };
}

export async function updateTreatmentItemStatus(
  itemId: string,
  status: TreatmentItemStatus
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_WRITE]);

  const item = await db.treatmentItem.findFirst({
    where: { id: itemId },
    include: { treatmentPlan: { select: { clinicId: true, id: true, status: true } } },
  });
  if (!item || item.treatmentPlan.clinicId !== ctx.clinicId) {
    return { error: "Treatment item not found" };
  }

  const updateData: Record<string, unknown> = { status };
  if (status === TreatmentItemStatus.COMPLETED) {
    updateData.completedDate = new Date();
  } else if (item.status === "COMPLETED") {
    updateData.completedDate = null;
  }

  await db.treatmentItem.update({
    where: { id: itemId },
    data: updateData as any,
  });

  // Auto-transition plan status based on items
  if (status === TreatmentItemStatus.COMPLETED || status === TreatmentItemStatus.IN_PROGRESS) {
    const allItems = await db.treatmentItem.findMany({
      where: { treatmentPlanId: item.treatmentPlan.id },
      select: { status: true },
    });

    const allCompleted = allItems.every(
      (i) => i.status === "COMPLETED" || i.status === "CANCELLED"
    );
    const anyActive = allItems.some(
      (i) => i.status === "IN_PROGRESS" || i.status === "COMPLETED"
    );

    if (allCompleted && item.treatmentPlan.status !== "COMPLETED") {
      await db.treatmentPlan.update({
        where: { id: item.treatmentPlan.id },
        data: { status: TreatmentPlanStatus.COMPLETED },
      });
    } else if (anyActive && item.treatmentPlan.status === "ACCEPTED") {
      await db.treatmentPlan.update({
        where: { id: item.treatmentPlan.id },
        data: { status: TreatmentPlanStatus.IN_PROGRESS },
      });
    }
  }

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: `treatmentItem.status.${status.toLowerCase()}`,
    entity: "TreatmentItem",
    entityId: itemId,
  });

  revalidatePath(`/dashboard/treatments/${item.treatmentPlan.id}`);
  return { success: true };
}

export async function removeTreatmentItem(itemId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_WRITE]);

  const item = await db.treatmentItem.findFirst({
    where: { id: itemId },
    include: { treatmentPlan: { select: { clinicId: true, id: true } } },
  });
  if (!item || item.treatmentPlan.clinicId !== ctx.clinicId) {
    return { error: "Treatment item not found" };
  }

  await db.treatmentItem.delete({ where: { id: itemId } });

  revalidatePath(`/dashboard/treatments/${item.treatmentPlan.id}`);
  return { success: true };
}

// ─── Invoice Generation from Treatment Plan ─────────────────────

export async function getCompletedUnbilledItems(planId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_READ]);

  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, clinicId: ctx.clinicId },
    include: {
      items: {
        where: { status: TreatmentItemStatus.COMPLETED },
        orderBy: { sortOrder: "asc" },
      },
      invoices: {
        include: { items: true },
      },
    },
  });
  if (!plan) throw new Error("NOT_FOUND");

  // Collect descriptions already invoiced
  const invoicedDescriptions = new Set<string>();
  for (const inv of plan.invoices) {
    for (const invItem of inv.items) {
      invoicedDescriptions.add(invItem.description);
    }
  }

  // Return completed items not already in an invoice
  return plan.items.filter(
    (item) => !invoicedDescriptions.has(item.procedure)
  );
}

export async function generateInvoiceFromPlan(
  planId: string,
  itemIds: string[],
  taxRate: number = 0,
  discount: number = 0
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_WRITE, PERMISSIONS.BILLING_WRITE]);
  await requireActiveSubscription(ctx.clinicId);

  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, clinicId: ctx.clinicId },
    include: {
      items: { where: { id: { in: itemIds }, status: TreatmentItemStatus.COMPLETED } },
    },
  });
  if (!plan) return { error: "Treatment plan not found" };
  if (plan.items.length === 0) return { error: "No completed items selected" };

  const invoiceItems = plan.items.map((item) => ({
    description: `${item.procedure}${item.toothNum ? ` (Tooth #${item.toothNum})` : ""}`,
    quantity: 1,
    unitPrice: item.cost - item.discount,
    total: item.cost - item.discount,
  }));

  const subtotal = invoiceItems.reduce((sum, i) => sum + i.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;

  const invoice = await db.invoice.create({
    data: {
      clinicId: ctx.clinicId,
      patientId: plan.patientId,
      treatmentPlanId: planId,
      invoiceNumber: generateInvoiceNumber(),
      subtotal,
      taxAmount,
      taxRate,
      discount,
      total,
      paidAmount: 0,
      status: "DRAFT",
      notes: `Generated from treatment plan: ${plan.name}`,
      items: { create: invoiceItems },
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "invoice.generateFromPlan",
    entity: "Invoice",
    entityId: invoice.id,
    metadata: { treatmentPlanId: planId, total, invoiceNumber: invoice.invoiceNumber },
  });

  revalidatePath(`/dashboard/treatments/${planId}`);
  revalidatePath("/dashboard/billing");
  return { success: true, invoiceId: invoice.id };
}

// ─── Visit Notes (Appointment Notes linked to treatment) ────────

export async function getVisitNotesForPlan(planId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.TREATMENTS_READ]);

  // Get all appointments for the patient of this plan
  const plan = await db.treatmentPlan.findFirst({
    where: { id: planId, clinicId: ctx.clinicId },
    select: { patientId: true },
  });
  if (!plan) throw new Error("NOT_FOUND");

  const appointments = await db.appointment.findMany({
    where: {
      clinicId: ctx.clinicId,
      patientId: plan.patientId,
      appointmentNotes: { some: {} },
    },
    include: {
      appointmentNotes: { orderBy: { createdAt: "desc" } },
      dentistProfile: {
        select: { clinicMember: { select: { user: { select: { name: true } } } } },
      },
    },
    orderBy: { startTime: "desc" },
    take: 20,
  });

  return appointments;
}
