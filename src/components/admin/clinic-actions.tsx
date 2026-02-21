"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminUpdateSubscription,
  adminExtendTrial,
  adminDeleteClinic,
} from "@/server/actions/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Clock, Save } from "lucide-react";

const PLANS = ["TRIAL", "BASIC", "PRO", "ENTERPRISE"];
const STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "UNPAID",
  "INCOMPLETE",
];

export function AdminClinicActions({
  clinicId,
  clinicName,
  currentPlan,
  currentStatus,
}: {
  clinicId: string;
  clinicName: string;
  currentPlan: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(currentPlan);
  const [status, setStatus] = useState(currentStatus);
  const [trialDays, setTrialDays] = useState(14);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleUpdateSubscription() {
    startTransition(async () => {
      setMessage(null);
      const result = await adminUpdateSubscription(clinicId, plan, status);
      if ("error" in result) {
        setMessage({ type: "error", text: String(result.error) });
      } else {
        setMessage({
          type: "success",
          text: `Subscription updated to ${plan} / ${status}`,
        });
      }
    });
  }

  function handleExtendTrial() {
    startTransition(async () => {
      setMessage(null);
      const result = await adminExtendTrial(clinicId, trialDays);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error ?? "Unknown error" });
      } else {
        setMessage({
          type: "success",
          text: `Trial extended by ${trialDays} days`,
        });
      }
    });
  }

  function handleDeleteClinic() {
    startTransition(async () => {
      setMessage(null);
      const result = await adminDeleteClinic(clinicId);
      if ("error" in result) {
        setMessage({ type: "error", text: result.error ?? "Unknown error" });
      } else {
        router.push("/admin/clinics");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Subscription Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-5 w-5" />
            Subscription Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white"
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
                className="border rounded-md px-3 py-2 text-sm bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleUpdateSubscription} disabled={isPending}>
              {isPending ? "Updating…" : "Update Subscription"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Extend Trial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Extend Trial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Add extra trial days. If the trial has already expired, the new
            period starts from today.
          </p>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Days to add
              </label>
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                min={1}
                max={365}
                className="border rounded-md px-3 py-2 text-sm w-24 bg-white"
              />
            </div>
            <Button
              onClick={handleExtendTrial}
              disabled={isPending}
              variant="outline"
            >
              {isPending ? "Extending…" : "Extend Trial"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2 text-base">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete this clinic and all its data including patients,
            appointments, invoices, and team members. This action cannot be
            undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isPending}>
                Delete Clinic
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete &quot;{clinicName}&quot;?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the clinic and all associated data
                  including patients, appointments, invoices, and team members.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteClinic}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isPending ? "Deleting…" : "Delete Permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Status message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
