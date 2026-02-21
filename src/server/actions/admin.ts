"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true, id: true },
  });

  if (!user?.isSuperAdmin) throw new Error("Forbidden");
  return user.id;
}

// ─── Clinic Actions ────────────────────────────────────────────

export async function adminUpdateSubscription(
  clinicId: string,
  plan: string,
  status: string
) {
  await requireSuperAdmin();

  await db.subscription.upsert({
    where: { clinicId },
    update: { plan: plan as any, status: status as any },
    create: { clinicId, plan: plan as any, status: status as any },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/clinics");
  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/clinics/${clinicId}`);
  return { success: true };
}

export async function adminExtendTrial(clinicId: string, days: number) {
  await requireSuperAdmin();

  if (days < 1 || days > 365) return { error: "Days must be between 1 and 365" };

  const sub = await db.subscription.findUnique({ where: { clinicId } });
  if (!sub) return { error: "No subscription found for this clinic" };

  const baseDate =
    sub.trialEndsAt && sub.trialEndsAt > new Date()
      ? sub.trialEndsAt
      : new Date();
  const newEnd = new Date(baseDate);
  newEnd.setDate(newEnd.getDate() + days);

  await db.subscription.update({
    where: { clinicId },
    data: { trialEndsAt: newEnd, status: "TRIALING", plan: "TRIAL" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/clinics");
  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/clinics/${clinicId}`);
  return { success: true };
}

export async function adminDeleteClinic(clinicId: string) {
  await requireSuperAdmin();

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true },
  });
  if (!clinic) return { error: "Clinic not found" };

  await db.clinic.delete({ where: { id: clinicId } });

  revalidatePath("/admin");
  revalidatePath("/admin/clinics");
  revalidatePath("/admin/subscriptions");
  return { success: true, clinicName: clinic.name };
}

// ─── User Actions ──────────────────────────────────────────────

export async function adminResetPassword(userId: string, newPassword: string) {
  await requireSuperAdmin();

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function adminToggleSuperAdmin(userId: string) {
  const adminId = await requireSuperAdmin();

  if (userId === adminId) {
    return { error: "You cannot change your own super admin status" };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, name: true, email: true },
  });
  if (!user) return { error: "User not found" };

  await db.user.update({
    where: { id: userId },
    data: { isSuperAdmin: !user.isSuperAdmin },
  });

  revalidatePath("/admin/users");
  return {
    success: true,
    newStatus: !user.isSuperAdmin,
    userName: user.name ?? user.email,
  };
}

export async function adminDeactivateUser(userId: string) {
  const adminId = await requireSuperAdmin();

  if (userId === adminId) {
    return { error: "You cannot deactivate your own account" };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user) return { error: "User not found" };

  await db.clinicMember.updateMany({
    where: { userId },
    data: { isActive: false },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function adminReactivateUser(userId: string) {
  await requireSuperAdmin();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user) return { error: "User not found" };

  await db.clinicMember.updateMany({
    where: { userId },
    data: { isActive: true },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
