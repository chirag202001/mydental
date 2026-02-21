"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createInvoice, updateInvoice } from "@/server/actions/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Search } from "lucide-react";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceFormProps {
  patients: Patient[];
  invoice?: {
    id: string;
    patientId: string;
    patient: { firstName: string; lastName: string };
    items: { description: string; quantity: number; unitPrice: number }[];
    taxRate: number;
    discount: number;
    dueDate: Date | string | null;
    notes: string | null;
  };
}

export function InvoiceForm({ patients, invoice }: InvoiceFormProps) {
  const router = useRouter();
  const isEdit = !!invoice;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Patient search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    invoice
      ? {
          id: invoice.patientId,
          firstName: invoice.patient.firstName,
          lastName: invoice.patient.lastName,
        }
      : null
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return patients
      .filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          (p.phone && p.phone.includes(q))
      )
      .slice(0, 8);
  }, [searchQuery, patients]);

  // Line items
  const [items, setItems] = useState<LineItem[]>(
    invoice?.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })) || [{ description: "", quantity: 1, unitPrice: 0 }]
  );

  const [taxRate, setTaxRate] = useState(invoice?.taxRate ?? 0);
  const [discount, setDiscount] = useState(invoice?.discount ?? 0);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;

  function addItem() {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Please select a patient");
      return;
    }
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      patientId: selectedPatient.id,
      items: items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      })),
      taxRate,
      discount,
      dueDate: (form.get("dueDate") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    };

    try {
      let result: any;
      if (isEdit) {
        result = await updateInvoice(invoice.id, data);
      } else {
        result = await createInvoice(data);
      }

      if (result?.error) {
        setError(result.error);
      } else if (isEdit) {
        router.push(`/dashboard/billing/${invoice.id}`);
      } else if (result?.invoiceId) {
        router.push(`/dashboard/billing/${result.invoiceId}`);
      }
    } catch {
      setError("Failed to save invoice");
    } finally {
      setSubmitting(false);
    }
  }

  const dueDateStr = invoice?.dueDate
    ? new Date(invoice.dueDate).toISOString().slice(0, 10)
    : "";

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
              {error}
            </div>
          )}

          {/* Patient selector */}
          <div className="space-y-2">
            <Label>Patient *</Label>
            {selectedPatient ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border px-3 py-2 text-sm bg-muted/30">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </div>
                {!isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSearchQuery("");
                    }}
                  >
                    Change
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone…"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
                {showDropdown && filtered.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-auto">
                    {filtered.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedPatient(p);
                          setShowDropdown(false);
                          setSearchQuery("");
                        }}
                      >
                        {p.firstName} {p.lastName}
                        {p.phone && (
                          <span className="ml-2 text-muted-foreground">
                            {p.phone}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && searchQuery && filtered.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg p-3 text-sm text-muted-foreground">
                    No patients found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <Label>Line Items</Label>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1">
                  {i === 0 && (
                    <span className="text-xs text-muted-foreground">Description</span>
                  )}
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    required
                  />
                </div>
                <div className="w-20">
                  {i === 0 && (
                    <span className="text-xs text-muted-foreground">Qty</span>
                  )}
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(i, "quantity", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="w-28">
                  {i === 0 && (
                    <span className="text-xs text-muted-foreground">Price (₹)</span>
                  )}
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="w-24 text-right text-sm font-medium pt-1">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(i)}
                  disabled={items.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>

          {/* Tax, discount, due date */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (₹)</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                step={0.01}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={dueDateStr}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={invoice?.notes || ""}
              placeholder="Invoice notes…"
            />
          </div>

          {/* Live total summary */}
          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                ? "Save Invoice"
                : "Create Invoice"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
