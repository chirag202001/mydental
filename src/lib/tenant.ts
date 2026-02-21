/* ────────────────────────────────────────────────────────────────
   Tenant context helpers – resolve the current user's clinic
   membership and enforce isolation + RBAC.
   ──────────────────────────────────────────────────────────────── */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { PLAN_CONFIGS, GRACE_PERIOD_DAYS } from "@/lib/plans";
import type { PermissionCode } from "@/lib/permissions";
import { SubscriptionStatus } from "@prisma/client";
import { cookies } from "next/headers";

export interface TenantContext {
  userId: string;
  clinicId: string;
  clinicMemberId: string;
  roleName: string;
  permissions: string[];
}

/**
 * Get current user's authenticated clinic context.
 * Reads `x-clinic-id` from cookies (set during clinic switch).
 * Falls back to first membership.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const cookieStore = await cookies();
  const preferredClinicId = cookieStore.get("clinic-id")?.value;

  // Find membership, preferring the clinic stored in cookie
  const whereClause = preferredClinicId
    ? { userId, clinicId: preferredClinicId, isActive: true }
    : { userId, isActive: true };

  let membership = await db.clinicMember.findFirst({
    where: whereClause,
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  // Fallback: first active membership
  if (!membership && preferredClinicId) {
    membership = await db.clinicMember.findFirst({
      where: { userId, isActive: true },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
  }

  if (!membership) return null;

  return {
    userId,
    clinicId: membership.clinicId,
    clinicMemberId: membership.id,
    roleName: membership.role.name,
    permissions: membership.role.permissions.map((rp) => rp.permission.code),
  };
}

/**
 * Require authenticated tenant context or throw.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) {
    throw new Error("UNAUTHORIZED");
  }
  return ctx;
}

/**
 * Check if user has ALL of the given permissions.
 */
export function hasPermissions(ctx: TenantContext, required: PermissionCode[]): boolean {
  return required.every((p) => ctx.permissions.includes(p));
}

/**
 * Require specific permissions or throw.
 */
export function requirePermissions(ctx: TenantContext, required: PermissionCode[]): void {
  if (!hasPermissions(ctx, required)) {
    logger.warn("Permission denied", {
      userId: ctx.userId,
      clinicId: ctx.clinicId,
      required,
      had: ctx.permissions,
    });
    throw new Error("FORBIDDEN");
  }
}

/**
 * Check if the clinic subscription is active (not locked).
 */
export async function checkSubscriptionActive(clinicId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { clinicId } });
  if (!sub) return false;

  const now = new Date();

  // Active or trialing with time remaining
  if (sub.status === SubscriptionStatus.ACTIVE) return true;
  if (sub.status === SubscriptionStatus.TRIALING) {
    return sub.trialEndsAt ? sub.trialEndsAt > now : true;
  }

  // Past-due with grace period
  if (sub.status === SubscriptionStatus.PAST_DUE && sub.currentPeriodEnd) {
    const graceEnd = new Date(sub.currentPeriodEnd);
    graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
    return now < graceEnd;
  }

  return false;
}

/**
 * Require active subscription or throw.
 */
export async function requireActiveSubscription(clinicId: string): Promise<void> {
  const active = await checkSubscriptionActive(clinicId);
  if (!active) {
    throw new Error("SUBSCRIPTION_INACTIVE");
  }
}

/**
 * Check plan-level feature flag.
 */
export async function hasFeature(
  clinicId: string,
  feature: keyof typeof PLAN_CONFIGS.TRIAL.features
): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { clinicId } });
  if (!sub) return false;
  return PLAN_CONFIGS[sub.plan].features[feature];
}
