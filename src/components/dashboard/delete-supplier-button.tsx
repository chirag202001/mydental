"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteSupplier } from "@/server/actions/inventory";
import { Trash2 } from "lucide-react";

interface DeleteSupplierButtonProps {
  supplierId: string;
  supplierName: string;
  itemCount: number;
}

export function DeleteSupplierButton({
  supplierId,
  supplierName,
  itemCount,
}: DeleteSupplierButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSupplier(supplierId);
      if (result?.error) {
        alert(result.error);
        setConfirming(false);
      } else {
        router.push("/dashboard/inventory?tab=suppliers");
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
      disabled={itemCount > 0}
      title={
        itemCount > 0
          ? "Cannot delete supplier with linked items"
          : "Delete supplier"
      }
    >
      <Trash2 className="h-4 w-4 mr-1" /> Delete
    </Button>
  );
}
