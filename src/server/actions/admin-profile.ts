"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function adminUpdateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) return { error: "Forbidden" };

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();

  if (!name || name.length < 2) {
    return { error: "Name must be at least 2 characters" };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone: phone || null,
    },
  });

  revalidatePath("/admin/profile");
  revalidatePath("/admin");
  return { success: true };
}

export async function adminChangePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true, passwordHash: true },
  });
  if (!user?.isSuperAdmin) return { error: "Forbidden" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword) {
    return { error: "All password fields are required" };
  }

  if (newPassword.length < 6) {
    return { error: "New password must be at least 6 characters" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match" };
  }

  if (!user.passwordHash) {
    return { error: "No password set for this account" };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "Current password is incorrect" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return { success: true, message: "Password changed successfully" };
}
