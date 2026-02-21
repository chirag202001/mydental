"use client";

import { useTransition } from "react";
import { updateTreatmentPlanStatus, deleteTreatmentPlan } from "@/server/actions/treatments";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Send,
  CheckCircle,
  Play,
  XCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";

const STATUS_ACTIONS: Record<
  string,
  { label: string; target: string; icon: React.ElementType; variant?: "default" | "outline" | "destructive" }[]
> = {
  DRAFT: [
    { label: "Propose to Patient", target: "PROPOSED", icon: Send },
    { label: "Cancel", target: "CANCELLED", icon: XCircle, variant: "destructive" },
  ],
  PROPOSED: [
    { label: "Accept Plan", target: "ACCEPTED", icon: CheckCircle },
    { label: "Back to Draft", target: "DRAFT", icon: RotateCcw, variant: "outline" },
    { label: "Cancel", target: "CANCELLED", icon: XCircle, variant: "destructive" },
  ],
  ACCEPTED: [
    { label: "Start Treatment", target: "IN_PROGRESS", icon: Play },
    { label: "Cancel", target: "CANCELLED", icon: XCircle, variant: "destructive" },
  ],
  IN_PROGRESS: [
    { label: "Mark Complete", target: "COMPLETED", icon: CheckCircle },
    { label: "Cancel", target: "CANCELLED", icon: XCircle, variant: "destructive" },
  ],
  COMPLETED: [],
  CANCELLED: [
    { label: "Reopen as Draft", target: "DRAFT", icon: RotateCcw, variant: "outline" },
  ],
};

interface TreatmentPlanStatusActionsProps {
  planId: string;
  currentStatus: string;
  showDelete?: boolean;
}

export function TreatmentPlanStatusActions({
  planId,
  currentStatus,
  showDelete = true,
}: TreatmentPlanStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const actions = STATUS_ACTIONS[currentStatus] || [];

  function handleStatusChange(target: string) {
    startTransition(async () => {
      await updateTreatmentPlanStatus(planId, target as any);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this treatment plan? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteTreatmentPlan(planId);
      router.push("/dashboard/treatments");
    });
  }

  return (
    <div className="space-y-2">
      {actions.map(({ label, target, icon: Icon, variant }) => (
        <Button
          key={target}
          variant={variant || "default"}
          className="w-full justify-start"
          disabled={isPending}
          onClick={() => handleStatusChange(target)}
        >
          <Icon className="h-4 w-4 mr-2" />
          {isPending ? "Updating…" : label}
        </Button>
      ))}
      {showDelete && currentStatus !== "COMPLETED" && (
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Delete Plan
        </Button>
      )}
    </div>
  );
}
