"use server";

import { db } from "@/lib/db";
import {
  requireTenantContext,
  requirePermissions,
  requireActiveSubscription,
} from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { invoiceSchema, paymentSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { generateInvoiceNumber } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { InvoiceStatus } from "@prisma/client";

// ─── Queries ────────────────────────────────────────────────────

export async function getInvoices(params?: {
  patientId?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.BILLING_READ]);

  const where: Record<string, unknown> = { clinicId: ctx.clinicId };
  if (params?.patientId) where.patientId = params.patientId;
  if (params?.status) where.status = params.status;
  if (params?.from || params?.to) {
    where.createdAt = {
      ...(params?.from ? { gte: new Date(params.from) } : {}),
      ...(params?.to ? { lte: new Date(params.to + "T23:59:59") } : {}),
    };
  }

  return db.invoice.findMany({
    where: where as any,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      treatmentPlan: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoice(invoiceId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.BILLING_READ]);

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, clinicId: ctx.clinicId },
    include: {
      patient: true,
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      treatmentPlan: { select: { id: true, name: true } },
    },
  });

  if (!invoice) throw new Error("NOT_FOUND");
  return invoice;
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

// ─── Create Invoice ─────────────────────────────────────────────

export async function createInvoice(data: {
  patientId: string;
  treatmentPlanId?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  taxRate?: number;
  discount?: number;
  dueDate?: string;
  notes?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.BILLING_WRITE]);
  await requireActiveSubscription(ctx.clinicId);

  const parsed = invoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;

  // Verify patient belongs to clinic
  const patient = await db.patient.findFirst({
    where: { id: input.patientId, clinicId: ctx.clinicId },
  });
  if (!patient) return { error: "Patient not found" };

  const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxAmount = subtotal * ((input.taxRate || 0) / 100);
  const total = subtotal + taxAmount - (input.discount || 0);

  const invoice = await db.invoice.create({
    data: {
      clinicId: ctx.clinicId,
      patientId: input.patientId,
      treatmentPlanId: input.treatmentPlanId || null,
      invoiceNumber: generateInvoiceNumber(),
      subtotal,
      taxAmount,
      taxRate: input.taxRate || 0,
      discount: input.discount || 0,
      total,
      paidAmount: 0,
      status: "DRAFT",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      notes: input.notes || null,
      items: {
        create: input.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.quantity * i.unitPrice,
        })),
      },
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "invoice.create",
    entity: "Invoice",
    entityId: invoice.id,
    metadata: { total, invoiceNumber: invoice.invoiceNumber },
  });

  revalidatePath("/dashboard/billing");
  return { success: true, invoiceId: invoice.id };
}

// ─── Update Invoice ─────────────────────────────────────────────

export async function updateInvoice(
  invoiceId: string,
  data: {
    items: { description: string; quantity: number; unitPrice: number }[];
    taxRate?: number;
    discount?: number;
    dueDate?: string;
    notes?: string;
  }
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.BILLING_WRITE]);

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, clinicId: ctx.clinicId },
  });
  if (!invoice) return { error: "Invoice not found" };

  // Only DRAFT invoices can be edited
  if (invoice.status !== "DRAFT") {
    return { error: "Only draft invoices can be edited" };
  }

  const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxAmount = subtotal * ((data.taxRate || 0) / 100);
  const total = subtotal + taxAmount - (data.discount || 0);

  // Delete old items and recreate
  await db.invoiceItem.deleteMany({ where: { invoiceId } });

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      taxAmount,
      taxRate: data.taxRate || 0,
      discount: data.discount || 0,
      total,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
      items: {
        create: data.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.quantity * i.unitPrice,
        })),
      },
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "invoice.update",
    entity: "Invoice",
    entityId: invoiceId,
  });

  revalidatePath("/dashboard/billing");
  revalidatePath(`/dashboard/billing/${invoiceId}`);
  return { success: true };
}

// ─── Delete Invoice ─────────────────────────────────────────────

export async function deleteInvoice(invoiceId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.BILLING_WRITE]);

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, clinicId: ctx.clinicId },
  });
  if (!invoice) return { error: "Invoice not found" };

  if (invoice.paidAmount > 0) {
    return { error: "Cannot delete an invoice with recorded payments" };
  }

  await db.invoice.delete({ where: { id: invoiceId } });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "invoice.delete",
    entity: "Invoice",
    entityId: invoiceId,
  });

  revalidatePath("/dashboard/billing");
  return { success: true };
}

// ─── Invoice Status ─────────────────────────────────────────────

const VALID_INVOICE_TRANSITIONS: Record<string, InvoiceStatus[]> = {
  DRAFT: [InvoiceStatus.SENT, InvoiceStatus.CANCELLED],
  SENT: [InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED],
  PARTIALLY_PAID: [InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED],
  OVERDUE: [InvoiceStatus.CANCELLED],
  PAID: [InvoiceStatus.REFUNDED],
  CANCELLED: [InvoiceStatus.DRAFT],
  REFUNDED: [],
};

export async function updateInvoiceStatus(
  invoiceId: string,
  newStatus: string
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.BILLING_WRITE]);

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, clinicId: ctx.clinicId },
  });
  if (!invoice) return { error: "Invoice not found" };

  const status = newStatus as InvoiceStatus;
  const allowed = VALID_INVOICE_TRANSITIONS[invoice.status] || [];
  if (!allowed.includes(status)) {
    return { error: `Cannot transition from ${invoice.status} to ${status}` };
  }

  await db.invoice.update({
    where: { id: invoiceId },
    data: { status },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: `invoice.status.${status.toLowerCase()}`,
    entity: "Invoice",
    entityId: invoiceId,
  });

  revalidatePath("/dashboard/billing");
  revalidatePath(`/dashboard/billing/${invoiceId}`);
  return { success: true };
}

// ─── Payments ───────────────────────────────────────────────────

export async function recordPayment(data: {
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.BILLING_WRITE]);

  const parsed = paymentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;

  const invoice = await db.invoice.findFirst({
    where: { id: input.invoiceId, clinicId: ctx.clinicId },
  });
  if (!invoice) return { error: "Invoice not found" };

  if (["CANCELLED", "REFUNDED"].includes(invoice.status)) {
    return { error: "Cannot record payment on a cancelled or refunded invoice" };
  }

  const balanceDue = invoice.total - invoice.paidAmount;
  if (input.amount > balanceDue + 0.01) {
    return { error: `Amount exceeds balance due of ₹${balanceDue.toFixed(2)}` };
  }

  const newPaidAmount = invoice.paidAmount + input.amount;
  let newStatus: InvoiceStatus = invoice.status as InvoiceStatus;
  if (newPaidAmount >= invoice.total) {
    newStatus = "PAID";
  } else if (newPaidAmount > 0) {
    newStatus = "PARTIALLY_PAID";
  }

  await db.$transaction([
    db.payment.create({
      data: {
        invoiceId: input.invoiceId,
        amount: input.amount,
        method: input.method,
        reference: input.reference || null,
        notes: input.notes || null,
      },
    }),
    db.invoice.update({
      where: { id: input.invoiceId },
      data: { paidAmount: newPaidAmount, status: newStatus },
    }),
  ]);

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "payment.record",
    entity: "Payment",
    entityId: input.invoiceId,
    metadata: { amount: input.amount, method: input.method },
  });

  revalidatePath("/dashboard/billing");
  revalidatePath(`/dashboard/billing/${input.invoiceId}`);
  return { success: true };
}

// ─── Refund ─────────────────────────────────────────────────────

export async function refundPayment(
  invoiceId: string,
  amount: number,
  reason?: string
) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.BILLING_REFUND]);

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, clinicId: ctx.clinicId },
  });
  if (!invoice) return { error: "Invoice not found" };

  if (amount > invoice.paidAmount) {
    return { error: `Refund amount exceeds paid amount of ₹${invoice.paidAmount.toFixed(2)}` };
  }

  const newPaidAmount = invoice.paidAmount - amount;
  let newStatus: InvoiceStatus = invoice.status as InvoiceStatus;
  if (newPaidAmount <= 0) {
    newStatus = "REFUNDED";
  } else {
    newStatus = "PARTIALLY_PAID";
  }

  await db.$transaction([
    db.payment.create({
      data: {
        invoiceId,
        amount,
        method: "REFUND",
        isRefund: true,
        notes: reason || null,
      },
    }),
    db.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: newPaidAmount, status: newStatus },
    }),
  ]);

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "payment.refund",
    entity: "Payment",
    entityId: invoiceId,
    metadata: { amount, reason },
  });

  revalidatePath("/dashboard/billing");
  revalidatePath(`/dashboard/billing/${invoiceId}`);
  return { success: true };
}

// ─── CSV Export ──────────────────────────────────────────────────

export async function exportLedger(params?: { from?: string; to?: string }) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.REPORTS_EXPORT]);

  const where: Record<string, unknown> = { clinicId: ctx.clinicId };
  if (params?.from || params?.to) {
    where.createdAt = {
      ...(params?.from ? { gte: new Date(params.from) } : {}),
      ...(params?.to ? { lte: new Date(params.to + "T23:59:59") } : {}),
    };
  }

  const invoices = await db.invoice.findMany({
    where: where as any,
    include: {
      patient: { select: { firstName: true, lastName: true } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Invoice #",
    "Patient",
    "Date",
    "Due Date",
    "Subtotal",
    "Tax Rate %",
    "Tax Amount",
    "Discount",
    "Total",
    "Paid",
    "Balance",
    "Status",
  ];

  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    `"${inv.patient.firstName} ${inv.patient.lastName}"`,
    inv.createdAt.toISOString().split("T")[0],
    inv.dueDate ? inv.dueDate.toISOString().split("T")[0] : "",
    inv.subtotal.toFixed(2),
    inv.taxRate.toFixed(2),
    inv.taxAmount.toFixed(2),
    inv.discount.toFixed(2),
    inv.total.toFixed(2),
    inv.paidAmount.toFixed(2),
    (inv.total - inv.paidAmount).toFixed(2),
    inv.status,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const filename = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

export async function exportPayments(params?: { from?: string; to?: string }) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.REPORTS_EXPORT]);

  const where: Record<string, unknown> = { invoice: { clinicId: ctx.clinicId } };
  if (params?.from || params?.to) {
    where.createdAt = {
      ...(params?.from ? { gte: new Date(params.from) } : {}),
      ...(params?.to ? { lte: new Date(params.to + "T23:59:59") } : {}),
    };
  }

  const payments = await db.payment.findMany({
    where: where as any,
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          patient: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Date",
    "Invoice #",
    "Patient",
    "Amount",
    "Method",
    "Reference",
    "Is Refund",
    "Notes",
  ];

  const rows = payments.map((p) => [
    p.createdAt.toISOString().split("T")[0],
    p.invoice.invoiceNumber,
    `"${p.invoice.patient.firstName} ${p.invoice.patient.lastName}"`,
    p.amount.toFixed(2),
    p.method,
    p.reference || "",
    p.isRefund ? "Yes" : "No",
    p.notes ? `"${p.notes.replace(/"/g, '""')}"` : "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const filename = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}
