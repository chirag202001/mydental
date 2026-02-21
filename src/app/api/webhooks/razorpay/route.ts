import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { SubscriptionStatus, PlanType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Verify webhook signature
  const isValid = verifyWebhookSignature(body, signature, process.env.RAZORPAY_WEBHOOK_SECRET);
  if (!isValid) {
    logger.error("Razorpay webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  const eventType: string = event.event;
  const payload = event.payload;

  logger.info("Razorpay webhook received", { type: eventType, id: event.id ?? "" });

  try {
    switch (eventType) {
      case "subscription.activated": {
        const sub = payload.subscription?.entity;
        if (sub) await handleSubscriptionActivated(sub);
        break;
      }

      case "subscription.charged": {
        const sub = payload.subscription?.entity;
        const payment = payload.payment?.entity;
        if (sub) await handleSubscriptionCharged(sub, payment);
        break;
      }

      case "subscription.pending": {
        const sub = payload.subscription?.entity;
        if (sub?.id) {
          await db.subscription.updateMany({
            where: { razorpaySubId: sub.id },
            data: { status: SubscriptionStatus.PAST_DUE },
          });
        }
        break;
      }

      case "subscription.halted": {
        const sub = payload.subscription?.entity;
        if (sub?.id) {
          await db.subscription.updateMany({
            where: { razorpaySubId: sub.id },
            data: { status: SubscriptionStatus.UNPAID },
          });
        }
        break;
      }

      case "subscription.cancelled": {
        const sub = payload.subscription?.entity;
        if (sub?.id) {
          await db.subscription.updateMany({
            where: { razorpaySubId: sub.id },
            data: { status: SubscriptionStatus.CANCELLED },
          });
        }
        break;
      }

      case "subscription.completed": {
        const sub = payload.subscription?.entity;
        if (sub?.id) {
          await db.subscription.updateMany({
            where: { razorpaySubId: sub.id },
            data: { status: SubscriptionStatus.CANCELLED },
          });
        }
        break;
      }

      case "payment.failed": {
        const payment = payload.payment?.entity;
        logger.warn("Razorpay payment failed", {
          paymentId: payment?.id,
          reason: payment?.error_description,
        });
        break;
      }
    }
  } catch (err) {
    logger.error("Razorpay webhook handler error", {
      error: String(err),
      type: eventType,
    });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/* ───── Helpers ──────────────────────────────────────────────── */

interface RazorpaySub {
  id: string;
  plan_id: string;
  customer_id?: string;
  status: string;
  current_start?: number;
  current_end?: number;
  notes?: Record<string, string>;
}

async function handleSubscriptionActivated(sub: RazorpaySub) {
  const plan = determinePlan(sub);

  await db.subscription.updateMany({
    where: { razorpaySubId: sub.id },
    data: {
      razorpayCustomerId: sub.customer_id ?? null,
      razorpayPlanId: sub.plan_id,
      status: SubscriptionStatus.ACTIVE,
      plan,
      currentPeriodStart: sub.current_start
        ? new Date(sub.current_start * 1000)
        : undefined,
      currentPeriodEnd: sub.current_end
        ? new Date(sub.current_end * 1000)
        : undefined,
      cancelAtPeriodEnd: false,
    },
  });
}

async function handleSubscriptionCharged(
  sub: RazorpaySub,
  _payment?: { id: string }
) {
  const plan = determinePlan(sub);

  await db.subscription.updateMany({
    where: { razorpaySubId: sub.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      plan,
      currentPeriodStart: sub.current_start
        ? new Date(sub.current_start * 1000)
        : undefined,
      currentPeriodEnd: sub.current_end
        ? new Date(sub.current_end * 1000)
        : undefined,
    },
  });

  logger.info("Subscription charged", {
    subscriptionId: sub.id,
    paymentId: _payment?.id,
  });
}

function determinePlan(sub: RazorpaySub): PlanType {
  // First try from notes (set during checkout)
  if (sub.notes?.plan) {
    const p = sub.notes.plan.toUpperCase();
    if (p in PlanType) return p as PlanType;
  }

  // Fallback: match plan_id against env vars
  const planId = sub.plan_id;
  if (planId === process.env.RAZORPAY_BASIC_PLAN_ID) return PlanType.BASIC;
  if (planId === process.env.RAZORPAY_PRO_PLAN_ID) return PlanType.PRO;
  if (planId === process.env.RAZORPAY_ENTERPRISE_PLAN_ID) return PlanType.ENTERPRISE;

  return PlanType.BASIC;
}
