"use client";

import { useState, useTransition } from "react";
import { generateInvoiceFromPlan } from "@/server/actions/treatments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { FileText, Receipt, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface CompletedItem {
  id: string;
  procedure: string;
  toothNum: number | null;
  cost: number;
  discount: number;
}

interface GenerateInvoiceFromPlanProps {
  planId: string;
  completedItems: CompletedItem[];
}

export function GenerateInvoiceFromPlan({
  planId,
  completedItems,
}: GenerateInvoiceFromPlanProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(completedItems.map((i) => i.id))
  );
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (completedItems.length === 0) return null;

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedItems = completedItems.filter((i) => selectedIds.has(i.id));
  const subtotal = selectedItems.reduce((sum, i) => sum + (i.cost - i.discount), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;

  function handleGenerate() {
    if (selectedIds.size === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await generateInvoiceFromPlan(
        planId,
        Array.from(selectedIds),
        taxRate,
        discount
      );
      if (result?.error) {
        setError(result.error);
      } else if (result?.invoiceId) {
        router.push(`/dashboard/billing/${result.invoiceId}`);
      }
    });
  }

  if (!isOpen) {
    return (
      <Button variant="default" size="sm" onClick={() => setIsOpen(true)}>
        <Receipt className="h-4 w-4 mr-1" /> Generate Invoice
      </Button>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-5 w-5" /> Generate Invoice from Completed Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 text-destructive text-sm p-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Item selection */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Select items to invoice:</Label>
          {completedItems.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 rounded-md border p-2 cursor-pointer hover:bg-accent/50"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleItem(item.id)}
                className="rounded"
              />
              <div className="flex-1 text-sm">
                <span className="font-medium">{item.procedure}</span>
                {item.toothNum && (
                  <span className="text-muted-foreground ml-1">
                    (Tooth #{item.toothNum})
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">
                {formatCurrency(item.cost - item.discount)}
              </span>
            </label>
          ))}
        </div>

        {/* Tax & discount */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="inv-tax" className="text-xs">Tax Rate (%)</Label>
            <Input
              id="inv-tax"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv-discount" className="text-xs">Discount (₹)</Label>
            <Input
              id="inv-discount"
              type="number"
              min={0}
              step={0.01}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Subtotal ({selectedIds.size} items)</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({taxRate}%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t pt-1">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={isPending || selectedIds.size === 0}
            onClick={handleGenerate}
          >
            {isPending ? "Generating…" : "Create Invoice"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
