import { notFound } from "next/navigation";
import {
  getInventoryItem,
  getSuppliers,
  getInventoryCategories,
} from "@/server/actions/inventory";
import { InventoryItemForm } from "@/components/dashboard/inventory-item-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let item: Awaited<ReturnType<typeof getInventoryItem>>;
  try {
    item = await getInventoryItem(id);
  } catch (err: any) {
    if (err.message === "NOT_FOUND") notFound();
    throw err;
  }

  const [suppliers, categories] = await Promise.all([
    getSuppliers(),
    getInventoryCategories(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/dashboard/inventory/${item.id}`}
          className="hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          {item.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Edit</span>
      </div>

      <InventoryItemForm
        item={{
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          unit: item.unit,
          currentStock: item.currentStock,
          minStock: item.minStock,
          costPrice: item.costPrice,
          sellPrice: item.sellPrice,
          supplierId: item.supplierId,
        }}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        categories={categories}
      />
    </div>
  );
}
