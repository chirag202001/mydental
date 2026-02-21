"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

const PLANS = [
  { key: "BASIC", name: "Basic", price: "₹999/mo", desc: "For solo practitioners" },
  { key: "PRO", name: "Pro", price: "₹2,499/mo", desc: "For growing clinics" },
  { key: "ENTERPRISE", name: "Enterprise", price: "₹4,999/mo", desc: "Full-featured for large clinics" },
];

export function SubscriptionActions({
  currentPlan,
  hasActiveSubscription,
  cancelAtPeriodEnd,
}: {
  currentPlan: string;
  hasActiveSubscription: boolean;
  cancelAtPeriodEnd: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  // Load Razorpay.js script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  async function handleUpgrade(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (data.subscriptionId && data.razorpayKeyId) {
        // Open Razorpay checkout modal
        const options = {
          key: data.razorpayKeyId,
          subscription_id: data.subscriptionId,
          name: "DentOS",
          description: `${plan} Plan Subscription`,
          theme: { color: "#6366f1" },
          handler: function () {
            // Payment successful — refresh page to show updated status
            window.location.href = "/dashboard/settings/billing?success=true";
          },
          modal: {
            ondismiss: function () {
              setLoading(null);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.")) {
      return;
    }

    setLoading("cancel");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.error || "Failed to cancel subscription");
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
                    {loading === p.key ? "Processing…" : "Upgrade"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cancel subscription */}
      {hasActiveSubscription && !cancelAtPeriodEnd && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Cancel Subscription</p>
                <p className="text-sm text-muted-foreground">
                  Your subscription will remain active until the end of the current billing period.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={loading !== null}
              >
                {loading === "cancel" ? "Cancelling…" : "Cancel Subscription"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {cancelAtPeriodEnd && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-amber-600 font-medium">
              ⚠ Your subscription is set to cancel at the end of the current billing period.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
