"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createInventoryItem,
  updateInventoryItem,
} from "@/server/actions/inventory";

interface Supplier {
  id: string;
  name: string;
}

interface InventoryItemFormProps {
  suppliers: Supplier[];
  categories: string[];
  item?: {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    unit: string;
    currentStock: number;
    minStock: number;
    costPrice: number;
    sellPrice: number;
    supplierId: string | null;
  };
}

export function InventoryItemForm({
  suppliers,
  categories,
  item,
}: InventoryItemFormProps) {
  const router = useRouter();
  const isEdit = !!item;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      sku: (form.get("sku") as string) || undefined,
      category: (form.get("category") as string) || undefined,
      unit: (form.get("unit") as string) || "pcs",
      currentStock: Number(form.get("currentStock") || 0),
      minStock: Number(form.get("minStock") || 5),
      costPrice: Number(form.get("costPrice") || 0),
      sellPrice: Number(form.get("sellPrice") || 0),
      supplierId: (form.get("supplierId") as string) || undefined,
    };

    try {
      const result = isEdit
        ? await updateInventoryItem(item.id, data)
        : await createInventoryItem(data);

      if (result?.error) {
        setError(result.error);
      } else if (isEdit) {
        router.push(`/dashboard/inventory/${item.id}`);
      } else {
        router.push("/dashboard/inventory");
      }
    } catch {
      setError("Failed to save item");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Item" : "New Inventory Item"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={item?.name || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                name="sku"
                defaultValue={item?.sku || ""}
                placeholder="e.g. GLOVE-M-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                defaultValue={item?.category || ""}
                list="category-list"
                placeholder="e.g. Consumables"
              />
              <datalist id="category-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                name="unit"
                defaultValue={item?.unit || "pcs"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierId">Supplier</Label>
              <select
                id="supplierId"
                name="supplierId"
                defaultValue={item?.supplierId || ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentStock">Current Stock</Label>
              <Input
                id="currentStock"
                name="currentStock"
                type="number"
                min={0}
                defaultValue={item?.currentStock ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Min Stock Alert</Label>
              <Input
                id="minStock"
                name="minStock"
                type="number"
                min={0}
                defaultValue={item?.minStock ?? 5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price (₹)</Label>
              <Input
                id="costPrice"
                name="costPrice"
                type="number"
                min={0}
                step={0.01}
                defaultValue={item?.costPrice ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellPrice">Sell Price (₹)</Label>
              <Input
                id="sellPrice"
                name="sellPrice"
                type="number"
                min={0}
                step={0.01}
                defaultValue={item?.sellPrice ?? 0}
              />
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
                ? "Save Item"
                : "Create Item"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
