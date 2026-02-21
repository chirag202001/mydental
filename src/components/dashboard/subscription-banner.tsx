import Link from "next/link";
import { AlertTriangle, Clock, XCircle } from "lucide-react";

interface SubscriptionBannerProps {
  type: "trial_ending" | "past_due" | "inactive";
  meta?: { daysLeft?: number; graceDeadline?: string };
}

export function SubscriptionBanner({ type, meta }: SubscriptionBannerProps) {
  if (type === "trial_ending") {
    return (
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-start gap-3">
        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Trial ending in {meta?.daysLeft} day{meta?.daysLeft !== 1 ? "s" : ""}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
            Subscribe to a plan to keep your clinic data and avoid interruption.
          </p>
        </div>
        <Link
          href="/dashboard/settings/billing"
          className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
        >
          Choose a Plan
        </Link>
      </div>
    );
  }

  if (type === "past_due") {
    return (
      <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
            Payment failed — action required
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-400 mt-0.5">
            Your last payment didn&apos;t go through. Please update your payment method
            {meta?.graceDeadline ? ` before ${meta.graceDeadline}` : ""} to avoid
            losing access.
          </p>
        </div>
        <Link
          href="/dashboard/settings/billing"
          className="shrink-0 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
        >
          Update Payment
        </Link>
      </div>
    );
  }

  // inactive
  return (
    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 flex items-start gap-3">
      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
          Subscription inactive
        </p>
        <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
          Your subscription has expired. Please subscribe to a plan to continue
          using DentOS.
        </p>
      </div>
      <Link
        href="/dashboard/settings/billing"
        className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
      >
        Reactivate
      </Link>
    </div>
  );
}
