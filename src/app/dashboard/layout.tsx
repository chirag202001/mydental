import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTenantContext, checkSubscriptionActive } from "@/lib/tenant";
import { db } from "@/lib/db";
import { GRACE_PERIOD_DAYS } from "@/lib/plans";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ctx = await getTenantContext();
  if (!ctx) redirect("/onboarding");

  const subActive = await checkSubscriptionActive(ctx.clinicId);

  // Fetch subscription for banner logic
  const subscription = await db.subscription.findUnique({
    where: { clinicId: ctx.clinicId },
  });

  // Determine banner state
  let bannerType: "trial_ending" | "past_due" | "inactive" | null = null;
  let bannerMeta: { daysLeft?: number; graceDeadline?: string } = {};

  if (subscription) {
    const now = new Date();

    if (subscription.status === "TRIALING" && subscription.trialEndsAt) {
      const daysLeft = Math.ceil(
        (subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft <= 5 && daysLeft > 0) {
        bannerType = "trial_ending";
        bannerMeta = { daysLeft };
      }
    }

    if (subscription.status === "PAST_DUE") {
      bannerType = "past_due";
      if (subscription.currentPeriodEnd) {
        const graceEnd = new Date(subscription.currentPeriodEnd);
        graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
        bannerMeta = { graceDeadline: graceEnd.toLocaleDateString("en-IN") };
      }
    }
  }

  if (!subActive && bannerType !== "past_due") {
    bannerType = "inactive";
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar activeMembership={ctx} />
      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-6 bg-muted/30">
          {bannerType && (
            <SubscriptionBanner type={bannerType} meta={bannerMeta} />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
