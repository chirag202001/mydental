import { NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant";

// POST /api/billing/portal – cancel Razorpay subscription
export async function POST() {
  try {
    const ctx = await requireTenantContext();

    const sub = await db.subscription.findUnique({
      where: { clinicId: ctx.clinicId },
    });

    if (!sub?.razorpaySubId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    const razorpay = getRazorpay();

    // Cancel at end of current billing period
    await razorpay.subscriptions.cancel(sub.razorpaySubId, false);

    await db.subscription.update({
      where: { clinicId: ctx.clinicId },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({ success: true, message: "Subscription will cancel at period end" });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
