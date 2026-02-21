"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PLANS = ["TRIAL", "BASIC", "PRO", "ENTERPRISE"];
const STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "UNPAID", "INCOMPLETE", "EXPIRED"];

export function AdminClinicActions({
  clinicId,
  currentPlan,
  currentStatus,
}: {
  clinicId: string;
  currentPlan: string;
  currentStatus: string;
}) {
  const [plan, setPlan] = useState(currentPlan);
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpdate() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/clinics/update-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, plan, status }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Subscription updated successfully");
      } else {
        setMessage(`❌ ${data.error || "Failed to update"}`);
      }
    } catch {
      setMessage("❌ Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? "Updating…" : "Update Subscription"}
          </Button>
        </div>
        {message && (
          <p className="mt-3 text-sm">{message}</p>
        )}
      </CardContent>
    </Card>
  );
}
