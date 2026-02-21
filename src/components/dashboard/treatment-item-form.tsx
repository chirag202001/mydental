"use client";

import { useState, useTransition } from "react";
import { addTreatmentItem, updateTreatmentItem } from "@/server/actions/treatments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Pencil } from "lucide-react";

interface Dentist {
  id: string;
  specialization?: string | null;
  clinicMember: { user: { name: string | null } };
}

interface TreatmentItemFormProps {
  planId: string;
  dentists: Dentist[];
  /** If provided, the form works in edit mode */
  item?: {
    id: string;
    procedure: string;
    toothNum: number | null;
    cost: number;
    discount: number;
    dentistId: string | null;
    scheduledDate: Date | string | null;
    notes: string | null;
  };
  onDone?: () => void;
}

export function TreatmentItemForm({ planId, dentists, item, onDone }: TreatmentItemFormProps) {
  const [isOpen, setIsOpen] = useState(!!item);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      let result: any;
      if (item) {
        result = await updateTreatmentItem(item.id, formData);
      } else {
        result = await addTreatmentItem(planId, formData);
      }
      if (result?.error) {
        setError(result.error);
      } else {
        if (!item) {
          // Reset form for adding more
          const form = document.getElementById("treatment-item-form") as HTMLFormElement;
          form?.reset();
        }
        setIsOpen(false);
        onDone?.();
      }
    });
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-4 w-4 mr-1" /> Add Procedure
      </Button>
    );
  }

  const scheduledStr = item?.scheduledDate
    ? new Date(item.scheduledDate).toISOString().slice(0, 10)
    : "";

  return (
    <form
      id="treatment-item-form"
      action={handleSubmit}
      className="border rounded-lg p-4 space-y-3 bg-muted/20"
    >
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive text-sm p-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="procedure" className="text-xs">Procedure *</Label>
          <Input
            id="procedure"
            name="procedure"
            required
            defaultValue={item?.procedure || ""}
            placeholder="e.g. Root Canal, Filling, Crown"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="toothNum" className="text-xs">Tooth Number</Label>
          <Input
            id="toothNum"
            name="toothNum"
            type="number"
            min={11}
            max={48}
            defaultValue={item?.toothNum ?? ""}
            placeholder="11-48"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="dentistId" className="text-xs">Assigned Dentist</Label>
          <select
            id="dentistId"
            name="dentistId"
            defaultValue={item?.dentistId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="">Unassigned</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.clinicMember.user.name || "Unnamed"}{d.specialization ? ` (${d.specialization})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="cost" className="text-xs">Cost (₹)</Label>
          <Input
            id="cost"
            name="cost"
            type="number"
            min={0}
            step={0.01}
            defaultValue={item?.cost ?? 0}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="discount" className="text-xs">Discount (₹)</Label>
          <Input
            id="discount"
            name="discount"
            type="number"
            min={0}
            step={0.01}
            defaultValue={item?.discount ?? 0}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="scheduledDate" className="text-xs">Scheduled Date</Label>
          <Input
            id="scheduledDate"
            name="scheduledDate"
            type="date"
            defaultValue={scheduledStr}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="item-notes" className="text-xs">Notes</Label>
          <Textarea
            id="item-notes"
            name="notes"
            rows={2}
            defaultValue={item?.notes || ""}
            placeholder="Procedure-specific notes…"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setIsOpen(false); onDone?.(); }}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending
            ? item ? "Saving…" : "Adding…"
            : item ? "Save" : "Add Procedure"}
        </Button>
      </div>
    </form>
  );
}
