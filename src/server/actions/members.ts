"use server";

import { db } from "@/lib/db";
import { requireTenantContext, requirePermissions } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { inviteMemberSchema } from "@/lib/validations";
import { sendClinicInviteEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getClinicMembers() {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.MEMBERS_READ]);

  return db.clinicMember.findMany({
    where: { clinicId: ctx.clinicId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      role: { select: { id: true, name: true } },
      dentistProfile: true,
    },
    orderBy: { joinedAt: "asc" },
  });
}

export async function inviteMember(formData: FormData) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.MEMBERS_WRITE]);

  const raw = Object.fromEntries(formData.entries());
  const parsed = inviteMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, roleName } = parsed.data;

  // Get the role
  const role = await db.role.findUnique({
    where: { clinicId_name: { clinicId: ctx.clinicId, name: roleName } },
  });
  if (!role) return { error: `Role '${roleName}' not found` };

  // Prevent inviting as Owner
  if (roleName === "Owner") return { error: "Cannot invite another Owner" };

  // Check if user exists
  let user = await db.user.findUnique({ where: { email } });

  if (!user) {
    // Create a placeholder user account
    user = await db.user.create({
      data: { email, name: email.split("@")[0] },
    });
  }

  // Check if already a member
  const existingMembership = await db.clinicMember.findUnique({
    where: { clinicId_userId: { clinicId: ctx.clinicId, userId: user.id } },
  });
  if (existingMembership) return { error: "User is already a member of this clinic" };

  // Create membership
  const member = await db.clinicMember.create({
    data: {
      clinicId: ctx.clinicId,
      userId: user.id,
      roleId: role.id,
    },
  });

  // If dentist role, create dentist profile
  if (roleName === "Dentist") {
    await db.dentistProfile.create({
      data: { clinicMemberId: member.id },
    });
  }

  // Get clinic name for email
  const clinic = await db.clinic.findUnique({ where: { id: ctx.clinicId } });

  // Send invite email
  const inviteUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/login?email=${encodeURIComponent(email)}`;
  await sendClinicInviteEmail(email, clinic?.name ?? "DentOS Clinic", inviteUrl);

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "member.invite",
    entity: "ClinicMember",
    entityId: member.id,
    metadata: { email, role: roleName },
  });

  revalidatePath("/dashboard/settings/members");
  return { success: true };
}

export async function removeMember(memberId: string) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.MEMBERS_DELETE]);

  const member = await db.clinicMember.findFirst({
    where: { id: memberId, clinicId: ctx.clinicId },
    include: { role: true },
  });
  if (!member) throw new Error("NOT_FOUND");

  // Prevent removing Owner
  if (member.role.name === "Owner") {
    return { error: "Cannot remove the clinic Owner" };
  }

  // Prevent self-removal
  if (member.userId === ctx.userId) {
    return { error: "Cannot remove yourself" };
  }

  await db.clinicMember.update({
    where: { id: memberId },
    data: { isActive: false },
  });

  await createAuditLog({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: "member.remove",
    entity: "ClinicMember",
    entityId: memberId,
  });

  revalidatePath("/dashboard/settings/members");
  return { success: true };
}

export async function getUserClinics() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) return [];

  return db.clinicMember.findMany({
    where: { userId: session.user.id, isActive: true },
    include: {
      clinic: { select: { id: true, name: true, slug: true, logoUrl: true } },
      role: { select: { name: true } },
    },
  });
}
