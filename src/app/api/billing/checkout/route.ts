import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant";

// POST /api/billing/checkout – create a Stripe Checkout session
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const { priceId, successUrl, cancelUrl } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: "priceId required" }, { status: 400 });
    }

    // Get or create Stripe customer
    const sub = await db.subscription.findUnique({ where: { clinicId: ctx.clinicId } });
    let customerId = sub?.stripeCustomerId;

    if (!customerId) {
      const clinic = await db.clinic.findUnique({ where: { id: ctx.clinicId } });
      const session = await auth();

      const customer = await stripe.customers.create({
        email: session?.user?.email ?? undefined,
        name: clinic?.name ?? undefined,
        metadata: { clinicId: ctx.clinicId },
      });

      customerId = customer.id;

      await db.subscription.update({
        where: { clinicId: ctx.clinicId },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${process.env.NEXTAUTH_URL}/dashboard/settings/billing?success=true`,
      cancel_url: cancelUrl ?? `${process.env.NEXTAUTH_URL}/dashboard/settings/billing?cancelled=true`,
      metadata: { clinicId: ctx.clinicId },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
