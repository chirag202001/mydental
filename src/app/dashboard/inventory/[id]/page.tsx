import { notFound } from "next/navigation";
import {
  getInventoryItem,
  getStockMovements,
  deleteInventoryItem,
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
  ArrowLeft,
  Pencil,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
} from "lucide-react";
import { StockMovementForm } from "@/components/dashboard/stock-movement-form";
import { DeleteItemButton } from "@/components/dashboard/delete-item-button";

export default async function InventoryItemPage({
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

  const lowStock = item.currentStock <= item.minStock;

  const movementIcon = (type: string) => {
    switch (type) {
      case "in":
        return <ArrowDownToLine className="h-3.5 w-3.5 text-green-600" />;
      case "out":
        return <ArrowUpFromLine className="h-3.5 w-3.5 text-red-600" />;
      default:
        return <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/inventory" className="hover:text-foreground">
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Inventory
        </Link>
        <span>/</span>
        <span className="text-foreground">{item.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {item.name}
            {lowStock && (
              <Badge variant="destructive" className="text-xs">
                Low Stock
              </Badge>
            )}
          </h1>
          {item.sku && (
            <p className="text-sm text-muted-foreground mt-0.5">
              SKU: {item.sku}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/inventory/${item.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
          <DeleteItemButton itemId={item.id} itemName={item.name} />
        </div>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Current Stock</p>
            <p className={`text-2xl font-bold ${lowStock ? "text-destructive" : ""}`}>
              {item.currentStock}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {item.unit}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Min Stock Level</p>
            <p className="text-2xl font-bold">
              {item.minStock}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {item.unit}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Cost Price</p>
            <p className="text-2xl font-bold">{formatCurrency(item.costPrice)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Sell Price</p>
            <p className="text-2xl font-bold">{formatCurrency(item.sellPrice)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Meta info */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Category:</span>{" "}
              <span className="font-medium">{item.category || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Unit:</span>{" "}
              <span className="font-medium">{item.unit}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Supplier:</span>{" "}
              <span className="font-medium">
                {item.supplier ? (
                  <Link
                    href={`/dashboard/inventory/suppliers/${item.supplier.id}`}
                    className="text-primary hover:underline"
                  >
                    {item.supplier.name}
                  </Link>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Stock Value:</span>{" "}
              <span className="font-medium">
                {formatCurrency(item.currentStock * item.costPrice)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock movement form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Record Stock Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <StockMovementForm
            itemId={item.id}
            itemName={item.name}
            currentStock={item.currentStock}
            unit={item.unit}
          />
        </CardContent>
      </Card>

      {/* Movement history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Movement History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.stockMovements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    No stock movements yet
                  </TableCell>
                </TableRow>
              ) : (
                item.stockMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {movementIcon(m.type)}
                        <span className="capitalize">{m.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {m.type === "out" ? "-" : "+"}
                      {m.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.reason || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
