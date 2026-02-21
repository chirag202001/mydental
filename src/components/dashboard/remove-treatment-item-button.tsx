"use client";

import { useTransition } from "react";
import { removeTreatmentItem } from "@/server/actions/treatments";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function RemoveTreatmentItemButton({ itemId }: { itemId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    if (!confirm("Remove this procedure from the plan?")) return;
    startTransition(async () => {
      await removeTreatmentItem(itemId);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={handleRemove}
      title="Remove item"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
