"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteInventoryItem } from "@/server/actions/inventory";
import { Trash2 } from "lucide-react";

interface DeleteItemButtonProps {
  itemId: string;
  itemName: string;
}

export function DeleteItemButton({ itemId, itemName }: DeleteItemButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteInventoryItem(itemId);
      if (result?.error) {
        alert(result.error);
        setConfirming(false);
      } else {
        router.push("/dashboard/inventory");
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex gap-1">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? "Deleting…" : "Confirm"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setConfirming(true)}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4 mr-1" /> Delete
    </Button>
  );
}
