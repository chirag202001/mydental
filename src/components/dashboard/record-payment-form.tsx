"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordPayment } from "@/server/actions/billing";
import { useRouter } from "next/navigation";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "INSURANCE", label: "Insurance" },
];

export function RecordPaymentForm({
  invoiceId,
  balanceDue,
}: {
  invoiceId: string;
  balanceDue: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const method = formData.get("method") as string;
    const reference = formData.get("reference") as string;
    const notes = formData.get("notes") as string;

    if (!amount || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    if (amount > balanceDue) {
      setError(`Amount cannot exceed balance of ₹${balanceDue.toFixed(2)}`);
      return;
    }

    startTransition(async () => {
      const result = await recordPayment({
        invoiceId,
        amount,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            max={balanceDue}
            defaultValue={balanceDue}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="method">Method</Label>
          <select
            id="method"
            name="method"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue="CASH"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="reference">Reference (optional)</Label>
          <Input id="reference" name="reference" placeholder="Txn ID, cheque #" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input id="notes" name="notes" placeholder="Payment notes" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Recording…" : "Record Payment"}
      </Button>
    </form>
  );
}
