"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";

const PLANS = [
  { key: "BASIC", name: "Basic", price: "₹999/mo", desc: "For solo practitioners" },
  { key: "PRO", name: "Pro", price: "₹2,499/mo", desc: "For growing clinics" },
  { key: "ENTERPRISE", name: "Enterprise", price: "₹4,999/mo", desc: "Full-featured for large clinics" },
];

export function SubscriptionActions({
  currentPlan,
  hasStripeSubscription,
}: {
  currentPlan: string;
  hasStripeSubscription: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("manage");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.key;
          return (
            <Card key={p.key} className={isCurrent ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <CardDescription>{p.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-4">{p.price}</p>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(p.key)}
                    disabled={loading !== null}
                  >
                    {loading === p.key ? "Redirecting…" : "Upgrade"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Manage existing subscription */}
      {hasStripeSubscription && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Manage Subscription</p>
                <p className="text-sm text-muted-foreground">
                  Update payment method, view invoices, or cancel.
                </p>
              </div>
              <Button variant="outline" onClick={handleManage} disabled={loading !== null}>
                {loading === "manage" ? "Redirecting…" : "Open Billing Portal"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
