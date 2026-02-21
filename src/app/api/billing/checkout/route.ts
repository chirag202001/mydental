import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant";
import { getRazorpay } from "@/lib/razorpay";
import { PLAN_CONFIGS } from "@/lib/plans";
import { PlanType } from "@prisma/client";

// POST /api/billing/checkout – create a Razorpay Subscription
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const { plan } = await req.json();

    if (!plan || !PLAN_CONFIGS[plan as PlanType]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planConfig = PLAN_CONFIGS[plan as PlanType];
    const razorpayPlanId = planConfig.razorpay.planId;

    if (!razorpayPlanId) {
      return NextResponse.json(
        { error: "Razorpay Plan ID not configured for this plan" },
        { status: 400 }
      );
    }

    const razorpay = getRazorpay();

    // Create a Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 12, // 12 billing cycles (1 year monthly)
      quantity: 1,
      notes: {
        clinicId: ctx.clinicId,
        plan: plan,
      },
    });

    // Store the Razorpay subscription ID
    await db.subscription.update({
      where: { clinicId: ctx.clinicId },
      data: {
        razorpaySubId: subscription.id,
        razorpayPlanId: razorpayPlanId,
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      plan: plan,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
