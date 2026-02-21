"use client";

import { useTransition } from "react";
import { updateTreatmentItemStatus } from "@/server/actions/treatments";
import { Badge } from "@/components/ui/badge";
import {
  CircleDot,
  Clock,
  Loader2,
  Play,
  CheckCircle,
  XCircle,
} from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "success" | "warning";
    icon: React.ElementType;
  }
> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Clock },
  SCHEDULED: { label: "Scheduled", variant: "default", icon: CircleDot },
  IN_PROGRESS: { label: "In Progress", variant: "warning", icon: Play },
  COMPLETED: { label: "Completed", variant: "success", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["PENDING"],
};

interface TreatmentItemStatusSelectProps {
  itemId: string;
  currentStatus: string;
}

export function TreatmentItemStatusSelect({
  itemId,
  currentStatus,
}: TreatmentItemStatusSelectProps) {
  const [isPending, startTransition] = useTransition();
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING;
  const nextStatuses = TRANSITIONS[currentStatus] || [];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (!newStatus || newStatus === currentStatus) return;
    startTransition(async () => {
      await updateTreatmentItemStatus(itemId, newStatus as any);
    });
  }

  if (isPending) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Updating…
      </Badge>
    );
  }

  if (nextStatuses.length === 0) {
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" /> {config.label}
      </Badge>
    );
  }

  return (
    <select
      value=""
      onChange={handleChange}
      className="text-xs border rounded px-2 py-1 bg-transparent cursor-pointer"
      title={`Current: ${config.label}. Click to change.`}
    >
      <option value="" disabled>
        {config.label} ▾
      </option>
      {nextStatuses.map((s) => (
        <option key={s} value={s}>
          → {STATUS_CONFIG[s]?.label || s}
        </option>
      ))}
    </select>
  );
}
