"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { approveTreatmentPlan } from "@/server/actions/treatments";
import { useRouter } from "next/navigation";

export function TreatmentApproveButton({ planId }: { planId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove() {
    startTransition(async () => {
      await approveTreatmentPlan(planId);
      router.refresh();
    });
  }

  return (
    <Button
      onClick={handleApprove}
      disabled={isPending}
      className="w-full justify-start"
    >
      <CheckCircle className="h-4 w-4 mr-2" />
      {isPending ? "Approving…" : "Approve Plan"}
    </Button>
  );
}
