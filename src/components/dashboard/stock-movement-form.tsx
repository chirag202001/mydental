"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordStockMovement } from "@/server/actions/inventory";
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from "lucide-react";

interface StockMovementFormProps {
  itemId: string;
  itemName: string;
  currentStock: number;
  unit: string;
}

const TYPES = [
  { value: "in", label: "Stock In", icon: ArrowDownToLine, color: "text-green-600" },
  { value: "out", label: "Stock Out", icon: ArrowUpFromLine, color: "text-red-600" },
  { value: "adjustment", label: "Adjustment", icon: SlidersHorizontal, color: "text-blue-600" },
] as const;

export function StockMovementForm({
  itemId,
  itemName,
  currentStock,
  unit,
}: StockMovementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string>("in");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const quantity = Number(form.get("quantity"));
    const reason = (form.get("reason") as string) || undefined;

    if (!quantity || quantity < 1) {
      setError("Enter a valid quantity");
      return;
    }

    startTransition(async () => {
      const result = await recordStockMovement({
        inventoryItemId: itemId,
        type,
        quantity,
        reason,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Type selector */}
      <div className="flex gap-1">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.value}
              type="button"
              variant={type === t.value ? "default" : "outline"}
              size="sm"
              onClick={() => setType(t.value)}
              className="text-xs"
            >
              <Icon className={`h-3.5 w-3.5 mr-1 ${type === t.value ? "" : t.color}`} />
              {t.label}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="quantity">Quantity ({unit})</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            required
            placeholder="Enter quantity"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reason">Reason (optional)</Label>
          <Input
            id="reason"
            name="reason"
            placeholder="e.g. Monthly restock"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Recording…" : "Record Movement"}
      </Button>
    </form>
  );
}
