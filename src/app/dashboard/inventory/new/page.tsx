import {
  getSuppliers,
  getInventoryCategories,
} from "@/server/actions/inventory";
import { InventoryItemForm } from "@/components/dashboard/inventory-item-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewInventoryItemPage() {
  const [suppliers, categories] = await Promise.all([
    getSuppliers(),
    getInventoryCategories(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/inventory" className="hover:text-foreground">
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Inventory
        </Link>
        <span>/</span>
        <span className="text-foreground">New Item</span>
      </div>

      <InventoryItemForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        categories={categories}
      />
    </div>
  );
}
