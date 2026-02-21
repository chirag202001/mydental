import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { SubscriptionStatus, PlanType } from "@prisma/client";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", { error: String(err) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  logger.info("Stripe webhook received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: { status: SubscriptionStatus.CANCELLED },
        });
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logger.info("Invoice paid", { invoiceId: invoice.id, customer: invoice.customer });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logger.warn("Payment failed", { invoiceId: invoice.id, customer: invoice.customer });
        // Update subscription to PAST_DUE
        const subId = (invoice as unknown as Record<string, unknown>).subscription;
        if (subId && typeof subId === "string") {
          await db.subscription.updateMany({
            where: { stripeSubId: subId },
            data: { status: SubscriptionStatus.PAST_DUE },
          });
        }
        break;
      }
    }
  } catch (err) {
    logger.error("Stripe webhook handler error", { error: String(err), type: event.type });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Map Stripe status to our enum
  const statusMap: Record<string, SubscriptionStatus> = {
    trialing: SubscriptionStatus.TRIALING,
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELLED,
    unpaid: SubscriptionStatus.UNPAID,
    incomplete: SubscriptionStatus.INCOMPLETE,
  };

  // Determine plan from price metadata or price ID
  const priceId = sub.items.data[0]?.price?.id;
  let plan: PlanType = PlanType.BASIC;
  if (priceId) {
    const priceMeta = sub.items.data[0]?.price?.metadata;
    if (priceMeta?.plan) {
      plan = priceMeta.plan.toUpperCase() as PlanType;
    }
  }

  // Extract period dates (Stripe API v2024+ may structure these differently)
  const rawSub = sub as unknown as Record<string, unknown>;
  const periodStart = rawSub.current_period_start as number | undefined;
  const periodEnd = rawSub.current_period_end as number | undefined;

  await db.subscription.updateMany({
    where: { stripeCustomerId },
    data: {
      stripeSubId: sub.id,
      stripePriceId: priceId || null,
      status: statusMap[sub.status] ?? SubscriptionStatus.ACTIVE,
      plan,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}
