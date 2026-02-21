"use server";

import { db } from "@/lib/db";
import { requireTenantContext, requirePermissions, requireActiveSubscription } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import {
  medicalHistorySchema,
  allergySchema,
  toothConditionSchema,
  toothNoteSchema,
} from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/* ─── Helpers ─────────────────────────────────────────────────── */

async function verifyPatientOwnership(patientId: string, clinicId: string) {
  const patient = await db.patient.findFirst({
    where: { id: patientId, clinicId },
  });
  if (!patient) throw new Error("NOT_FOUND");
  return patient;
}

/* ─── Medical History ─────────────────────────────────────────── */

export async function upsertMedicalHistory(data: {
  patientId: string;
  conditions?: string;
  medications?: string;
  surgeries?: string;
  familyHistory?: string;
  smokingStatus?: string;
  alcoholConsumption?: string;
  notes?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_WRITE]);
  await requireActiveSubscription(ctx.clinicId);

  const parsed = medicalHistorySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;
  await verifyPatientOwnership(input.patientId, ctx.clinicId);

  await db.medicalHistory.upsert({
    where: { patientId: input.patientId },
    create: {
      patientId: input.patientId,
      conditions: input.conditions || null,
      medications: input.medications || null,
      surgeries: input.surgeries || null,
      familyHistory: input.familyHistory || null,
      smokingStatus: input.smokingStatus || null,
      alcoholConsumption: input.alcoholConsumption || null,
      notes: input.notes || null,
    },
    update: {
      conditions: input.conditions || null,
      medications: input.medications || null,
      surgeries: input.surgeries || null,
      familyHistory: input.familyHistory || null,
      smokingStatus: input.smokingStatus || null,
      alcoholConsumption: input.alcoholConsumption || null,
      notes: input.notes || null,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "medicalHistory.upsert",
    entity: "MedicalHistory",
    entityId: input.patientId,
  });

  revalidatePath(`/dashboard/patients/${input.patientId}`);
  return { success: true };
}

/* ─── Allergies ───────────────────────────────────────────────── */

export async function addAllergy(data: {
  patientId: string;
  name: string;
  severity?: string;
  notes?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_WRITE]);
  await requireActiveSubscription(ctx.clinicId);

  const parsed = allergySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;
  await verifyPatientOwnership(input.patientId, ctx.clinicId);

  const allergy = await db.allergy.create({
    data: {
      patientId: input.patientId,
      name: input.name,
      severity: input.severity,
      notes: input.notes || null,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "allergy.create",
    entity: "Allergy",
    entityId: allergy.id,
  });

  revalidatePath(`/dashboard/patients/${input.patientId}`);
  return { success: true, allergyId: allergy.id };
}

export async function removeAllergy(allergyId: string, patientId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_WRITE]);

  await verifyPatientOwnership(patientId, ctx.clinicId);

  const allergy = await db.allergy.findFirst({
    where: { id: allergyId, patientId },
  });
  if (!allergy) throw new Error("NOT_FOUND");

  await db.allergy.delete({ where: { id: allergyId } });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "allergy.delete",
    entity: "Allergy",
    entityId: allergyId,
  });

  revalidatePath(`/dashboard/patients/${patientId}`);
  return { success: true };
}

/* ─── Tooth Conditions ────────────────────────────────────────── */

export async function upsertToothCondition(data: {
  patientId: string;
  toothNum: number;
  condition: string;
  surface?: string;
  notes?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_WRITE]);
  await requireActiveSubscription(ctx.clinicId);

  const parsed = toothConditionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;
  await verifyPatientOwnership(input.patientId, ctx.clinicId);

  // Upsert: one condition per tooth per patient
  const existing = await db.toothCondition.findFirst({
    where: { patientId: input.patientId, toothNum: input.toothNum },
  });

  let conditionId: string;
  if (existing) {
    await db.toothCondition.update({
      where: { id: existing.id },
      data: {
        condition: input.condition,
        surface: input.surface || null,
        notes: input.notes || null,
      },
    });
    conditionId = existing.id;
  } else {
    const created = await db.toothCondition.create({
      data: {
        patientId: input.patientId,
        toothNum: input.toothNum,
        condition: input.condition,
        surface: input.surface || null,
        notes: input.notes || null,
      },
    });
    conditionId = created.id;
  }

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "toothCondition.upsert",
    entity: "ToothCondition",
    entityId: conditionId,
    metadata: { toothNum: input.toothNum, condition: input.condition },
  });

  revalidatePath(`/dashboard/patients/${input.patientId}`);
  return { success: true };
}

export async function removeToothCondition(conditionId: string, patientId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_WRITE]);

  await verifyPatientOwnership(patientId, ctx.clinicId);

  const condition = await db.toothCondition.findFirst({
    where: { id: conditionId, patientId },
  });
  if (!condition) throw new Error("NOT_FOUND");

  await db.toothCondition.delete({ where: { id: conditionId } });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "toothCondition.delete",
    entity: "ToothCondition",
    entityId: conditionId,
  });

  revalidatePath(`/dashboard/patients/${patientId}`);
  return { success: true };
}

/* ─── Tooth Notes ─────────────────────────────────────────────── */

export async function addToothNote(data: {
  patientId: string;
  toothNum: number;
  note: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_WRITE]);
  await requireActiveSubscription(ctx.clinicId);

  const parsed = toothNoteSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;
  await verifyPatientOwnership(input.patientId, ctx.clinicId);

  const toothNote = await db.toothNote.create({
    data: {
      patientId: input.patientId,
      toothNum: input.toothNum,
      note: input.note,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "toothNote.create",
    entity: "ToothNote",
    entityId: toothNote.id,
  });

  revalidatePath(`/dashboard/patients/${input.patientId}`);
  return { success: true, noteId: toothNote.id };
}

/* ─── Documents / Attachments ─────────────────────────────────── */

export async function getPatientDocuments(patientId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_READ]);
  await verifyPatientOwnership(patientId, ctx.clinicId);

  return db.document.findMany({
    where: { patientId, clinicId: ctx.clinicId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addPatientDocument(data: {
  patientId: string;
  name: string;
  type: string;
  url: string;
  size?: number;
  mimeType?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_WRITE]);
  await requireActiveSubscription(ctx.clinicId);
  await verifyPatientOwnership(data.patientId, ctx.clinicId);

  const doc = await db.document.create({
    data: {
      clinicId: ctx.clinicId,
      patientId: data.patientId,
      name: data.name,
      type: data.type,
      url: data.url,
      size: data.size ?? null,
      mimeType: data.mimeType ?? null,
      uploadedBy: ctx.userId,
    },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "document.create",
    entity: "Document",
    entityId: doc.id,
  });

  revalidatePath(`/dashboard/patients/${data.patientId}`);
  return { success: true, documentId: doc.id };
}

export async function removePatientDocument(documentId: string, patientId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.PATIENTS_WRITE]);
  await verifyPatientOwnership(patientId, ctx.clinicId);

  const doc = await db.document.findFirst({
    where: { id: documentId, patientId, clinicId: ctx.clinicId },
  });
  if (!doc) throw new Error("NOT_FOUND");

  await db.document.delete({ where: { id: documentId } });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "document.delete",
    entity: "Document",
    entityId: documentId,
  });

  revalidatePath(`/dashboard/patients/${patientId}`);
  return { success: true };
}
