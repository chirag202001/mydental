import {
  getInventoryItems,
  getSuppliers,
  getLowStockItems,
} from "@/server/actions/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Package,
  AlertTriangle,
  Truck,
} from "lucide-react";

const TABS = [
  { key: "items", label: "Items", icon: Package },
  { key: "low-stock", label: "Low Stock", icon: AlertTriangle },
  { key: "suppliers", label: "Suppliers", icon: Truck },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const activeTab = (sp.tab as Tab) || "items";

  // Feature gate — dynamic import catches FEATURE_NOT_AVAILABLE
  let featureBlocked = false;
  try {
    // Quick check by loading items
    if (activeTab === "items" || activeTab === "low-stock") {
      // will throw if not allowed
      await getInventoryItems();
    } else {
      await getSuppliers();
    }
  } catch (err: any) {
    if (err.message === "FEATURE_NOT_AVAILABLE") {
      featureBlocked = true;
    } else if (err.message !== "NOT_FOUND") {
      throw err;
    }
  }

  if (featureBlocked) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-2">Pro Feature</h3>
            <p className="text-muted-foreground mb-4">
              Inventory management is available on Pro and Enterprise plans.
            </p>
            <Link href="/dashboard/settings/billing">
              <Button>Upgrade Plan</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch data based on tab
  let items: any[] = [];
  let suppliers: any[] = [];
  let lowStockItems: any[] = [];

  if (activeTab === "items") {
    items = await getInventoryItems({
      search: sp.search,
      category: sp.category,
    });
  } else if (activeTab === "low-stock") {
    lowStockItems = await getLowStockItems();
  } else {
    suppliers = await getSuppliers();
  }

  function tabUrl(tab: string) {
    return tab === "items"
      ? "/dashboard/inventory"
      : `/dashboard/inventory?tab=${tab}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          {activeTab === "suppliers" ? (
            <Link href="/dashboard/inventory/suppliers/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Supplier
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard/inventory/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <Link key={t.key} href={tabUrl(t.key)}>
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="text-xs"
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {t.label}
                {t.key === "low-stock" && lowStockItems.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-[10px] px-1">
                    {lowStockItems.length}
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Search bar (items tab only) */}
      {activeTab === "items" && (
        <form className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              type="text"
              name="search"
              defaultValue={sp.search || ""}
              placeholder="Search by name or SKU…"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
          {sp.search && (
            <Link href="/dashboard/inventory">
              <Button type="button" size="sm" variant="ghost">
                Clear
              </Button>
            </Link>
          )}
        </form>
      )}

      {/* ─── Items Tab ─── */}
      {activeTab === "items" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Sell</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-8"
                    >
                      {sp.search ? "No items match your search" : "No inventory items"}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/inventory/${item.id}`}
                          className="text-primary hover:underline"
                        >
                          {item.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.sku || "—"}
                      </TableCell>
                      <TableCell>{item.category || "—"}</TableCell>
                      <TableCell className="text-right">
                        {item.currentStock} {item.unit}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.costPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.sellPrice)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.supplier?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.currentStock <= item.minStock
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {item.currentStock <= item.minStock
                            ? "Low Stock"
                            : "OK"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── Low Stock Tab ─── */}
      {activeTab === "low-stock" && (
        <div className="space-y-4">
          {lowStockItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  All items are above minimum stock levels 🎉
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} below
                  minimum stock
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Minimum</TableHead>
                      <TableHead className="text-right">Deficit</TableHead>
                      <TableHead>Supplier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/inventory/${item.id}`}
                            className="text-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {item.currentStock} {item.unit}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.minStock} {item.unit}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.minStock - item.currentStock} {item.unit}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.supplier?.name || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Suppliers Tab ─── */}
      {activeTab === "suppliers" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-8"
                    >
                      No suppliers yet
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s: any) => (
                    <TableRow key={s.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/inventory/suppliers/${s.id}`}
                          className="text-primary hover:underline"
                        >
                          {s.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.phone || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.email || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {s._count.inventoryItems}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
