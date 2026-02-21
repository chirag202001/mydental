import { getTenantContext, requirePermissions } from "@/lib/tenant";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLAN_CONFIGS } from "@/lib/plans";
import { SubscriptionActions } from "@/components/dashboard/subscription-actions";

export default async function BillingSettingsPage() {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  await requirePermissions(ctx, ["settings:write"]);

  const subscription = await db.subscription.findFirst({
    where: { clinicId: ctx.clinicId },
    orderBy: { createdAt: "desc" },
  });

  const plan = subscription?.plan ?? "TRIAL";
  const planConfig = PLAN_CONFIGS[plan as keyof typeof PLAN_CONFIGS];
  const statusColor: Record<string, string> = {
    TRIALING: "bg-blue-100 text-blue-800",
    ACTIVE: "bg-green-100 text-green-800",
    PAST_DUE: "bg-yellow-100 text-yellow-800",
    CANCELED: "bg-red-100 text-red-800",
    EXPIRED: "bg-gray-100 text-gray-800",
  };

  const memberCount = await db.clinicMember.count({
    where: { clinicId: ctx.clinicId },
  });

  const patientCount = await db.patient.count({
    where: { clinicId: ctx.clinicId },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground text-sm">Manage your plan and billing details.</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your clinic&apos;s subscription details</CardDescription>
            </div>
            <Badge className={statusColor[subscription?.status ?? "TRIALING"] ?? ""}>
              {subscription?.status ?? "TRIALING"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Plan</p>
              <p className="font-semibold text-lg">{planConfig?.name ?? plan}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Team Members</p>
              <p className="font-semibold">
                {memberCount} / {planConfig?.maxUsers === 999 ? "∞" : planConfig?.maxUsers}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Patients</p>
              <p className="font-semibold">{patientCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Period End</p>
              <p className="font-semibold">
                {subscription?.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-sm font-medium mb-2">Plan Features</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {planConfig?.features &&
                Object.entries(planConfig.features).map(([key, enabled]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={enabled ? "text-green-600" : "text-muted-foreground"}>
                      {enabled ? "✓" : "✗"}
                    </span>
                    <span className={!enabled ? "text-muted-foreground" : ""}>
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade / Manage */}
      <SubscriptionActions
        currentPlan={plan}
        hasActiveSubscription={!!subscription?.razorpaySubId}
        cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
      />
    </div>
  );
}
