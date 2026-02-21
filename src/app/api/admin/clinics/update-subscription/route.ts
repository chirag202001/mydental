import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlanType, SubscriptionStatus } from "@prisma/client";

// POST /api/admin/clinics/update-subscription
// Allows super admin to manually change a clinic's plan and status
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify super admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { clinicId, plan, status } = await req.json();

    if (!clinicId || !plan || !status) {
      return NextResponse.json(
        { error: "clinicId, plan, and status are required" },
        { status: 400 }
      );
    }

    // Validate plan and status
    if (!Object.values(PlanType).includes(plan as PlanType)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await db.subscription.upsert({
      where: { clinicId },
      update: {
        plan: plan as PlanType,
        status: status as SubscriptionStatus,
      },
      create: {
        clinicId,
        plan: plan as PlanType,
        status: status as SubscriptionStatus,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin update subscription error:", err);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
