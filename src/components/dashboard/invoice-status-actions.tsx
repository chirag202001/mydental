"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateInvoiceStatus, deleteInvoice, refundPayment } from "@/server/actions/billing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Send,
  Ban,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Clock,
  Undo2,
} from "lucide-react";

/**
 * State-machine driven action buttons for an invoice.
 * Transitions:
 *   DRAFT     → SENT, CANCELLED
 *   SENT      → OVERDUE, CANCELLED
 *   PARTIALLY_PAID → OVERDUE, CANCELLED
 *   OVERDUE   → CANCELLED
 *   PAID      → REFUNDED (via refund flow)
 *   CANCELLED → DRAFT
 */

const STATUS_TRANSITIONS: Record<
  string,
  { label: string; to: string; icon: React.ReactNode; variant: any }[]
> = {
  DRAFT: [
    { label: "Send Invoice", to: "SENT", icon: <Send className="h-4 w-4 mr-1" />, variant: "default" },
    { label: "Cancel", to: "CANCELLED", icon: <Ban className="h-4 w-4 mr-1" />, variant: "destructive" },
  ],
  SENT: [
    { label: "Mark Overdue", to: "OVERDUE", icon: <Clock className="h-4 w-4 mr-1" />, variant: "outline" },
    { label: "Cancel", to: "CANCELLED", icon: <Ban className="h-4 w-4 mr-1" />, variant: "destructive" },
  ],
  PARTIALLY_PAID: [
    { label: "Mark Overdue", to: "OVERDUE", icon: <Clock className="h-4 w-4 mr-1" />, variant: "outline" },
    { label: "Cancel", to: "CANCELLED", icon: <Ban className="h-4 w-4 mr-1" />, variant: "destructive" },
  ],
  OVERDUE: [
    { label: "Cancel", to: "CANCELLED", icon: <Ban className="h-4 w-4 mr-1" />, variant: "destructive" },
  ],
  CANCELLED: [
    { label: "Reopen as Draft", to: "DRAFT", icon: <RotateCcw className="h-4 w-4 mr-1" />, variant: "outline" },
  ],
};

interface InvoiceStatusActionsProps {
  invoiceId: string;
  status: string;
  paidAmount: number;
  canDelete: boolean;
  canRefund: boolean;
}

export function InvoiceStatusActions({
  invoiceId,
  status,
  paidAmount,
  canDelete,
  canRefund,
}: InvoiceStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRefund, setShowRefund] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const transitions = STATUS_TRANSITIONS[status] || [];

  function handleStatusChange(newStatus: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoiceId, newStatus);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteInvoice(invoiceId);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard/billing");
      }
    });
  }

  function handleRefund(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("refundAmount"));
    const reason = (formData.get("refundReason") as string) || undefined;
    if (!amount || amount <= 0) {
      setError("Enter a valid refund amount");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await refundPayment(invoiceId, amount, reason);
      if (result?.error) {
        setError(result.error);
      } else {
        setShowRefund(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive text-sm p-2">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <Button
            key={t.to}
            variant={t.variant}
            size="sm"
            disabled={isPending}
            onClick={() => handleStatusChange(t.to)}
          >
            {t.icon}
            {t.label}
          </Button>
        ))}

        {/* Refund button — only for PAID invoices */}
        {status === "PAID" && canRefund && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setShowRefund(!showRefund)}
          >
            <Undo2 className="h-4 w-4 mr-1" /> Refund
          </Button>
        )}

        {/* Delete button — only for drafts with no payments */}
        {canDelete && status === "DRAFT" && (
          <>
            {showDeleteConfirm ? (
              <div className="flex gap-1 items-center">
                <span className="text-xs text-muted-foreground">Sure?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  Yes, Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  No
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </>
        )}
      </div>

      {/* Inline refund form */}
      {showRefund && (
        <form onSubmit={handleRefund} className="border rounded-md p-3 space-y-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <AlertTriangle className="h-4 w-4" /> Issue a refund
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="refundAmount">Amount (₹)</Label>
              <Input
                id="refundAmount"
                name="refundAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={paidAmount}
                defaultValue={paidAmount}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="refundReason">Reason (optional)</Label>
              <Input id="refundReason" name="refundReason" placeholder="e.g. Patient request" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" size="sm" disabled={isPending}>
              {isPending ? "Processing…" : "Confirm Refund"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRefund(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
