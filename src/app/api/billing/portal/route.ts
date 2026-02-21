import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant";

// POST /api/billing/portal – create a Stripe Customer Portal session
export async function POST() {
  try {
    const ctx = await requireTenantContext();

    const sub = await db.subscription.findUnique({ where: { clinicId: ctx.clinicId } });
    if (!sub?.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account found" }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
