"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppointmentStatus, deleteAppointment } from "@/server/actions/appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@prisma/client";

const STATUS_FLOW: Record<string, { label: string; next: AppointmentStatus[]; color: string }> = {
  SCHEDULED: {
    label: "Scheduled",
    next: ["CONFIRMED", "CANCELLED"],
    color: "bg-slate-100 text-slate-800",
  },
  CONFIRMED: {
    label: "Confirmed",
    next: ["ARRIVED", "CANCELLED", "NO_SHOW"],
    color: "bg-blue-100 text-blue-800",
  },
  ARRIVED: {
    label: "Arrived",
    next: ["IN_TREATMENT", "NO_SHOW"],
    color: "bg-amber-100 text-amber-800",
  },
  IN_TREATMENT: {
    label: "In Treatment",
    next: ["COMPLETED"],
    color: "bg-orange-100 text-orange-800",
  },
  COMPLETED: {
    label: "Completed",
    next: [],
    color: "bg-green-100 text-green-800",
  },
  NO_SHOW: {
    label: "No Show",
    next: ["SCHEDULED"],
    color: "bg-red-100 text-red-800",
  },
  CANCELLED: {
    label: "Cancelled",
    next: ["SCHEDULED"],
    color: "bg-red-100 text-red-800",
  },
};

export function AppointmentStatusActions({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const current = STATUS_FLOW[currentStatus];
  const nextStatuses = current?.next ?? [];

  function handleStatusChange(status: AppointmentStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateAppointmentStatus(appointmentId, status);
      if (result?.success) {
        router.refresh();
      } else {
        setError("Failed to update status");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this appointment?")) return;
    setError(null);
    startTransition(async () => {
      await deleteAppointment(appointmentId);
      router.push("/dashboard/appointments");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Update Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status flow visualization */}
        <div className="text-sm">
          <span className="text-muted-foreground">Current: </span>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${current?.color ?? ""}`}>
            {current?.label ?? currentStatus}
          </span>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {nextStatuses.length > 0 ? (
          <div className="space-y-2">
            {nextStatuses.map((status) => {
              const s = STATUS_FLOW[status];
              const isPositive = ["CONFIRMED", "ARRIVED", "IN_TREATMENT", "COMPLETED"].includes(status);
              return (
                <Button
                  key={status}
                  variant={isPositive ? "default" : "outline"}
                  className="w-full justify-start"
                  disabled={isPending}
                  onClick={() => handleStatusChange(status)}
                >
                  → {s?.label ?? status}
                </Button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No further status transitions available.
          </p>
        )}

        {/* Delete */}
        {currentStatus !== "COMPLETED" && (
          <div className="pt-3 border-t">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              disabled={isPending}
              onClick={handleDelete}
            >
              Delete Appointment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
