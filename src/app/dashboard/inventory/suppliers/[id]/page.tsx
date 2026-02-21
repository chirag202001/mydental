import { notFound } from "next/navigation";
import { getSupplier, deleteSupplier } from "@/server/actions/inventory";
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
import { ArrowLeft, Pencil, Package } from "lucide-react";
import { DeleteSupplierButton } from "@/components/dashboard/delete-supplier-button";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let supplier: Awaited<ReturnType<typeof getSupplier>>;
  try {
    supplier = await getSupplier(id);
  } catch (err: any) {
    if (err.message === "NOT_FOUND") notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/inventory?tab=suppliers"
          className="hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Suppliers
        </Link>
        <span>/</span>
        <span className="text-foreground">{supplier.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {supplier.inventoryItems.length} linked item
            {supplier.inventoryItems.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/inventory/suppliers/${supplier.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
          <DeleteSupplierButton
            supplierId={supplier.id}
            supplierName={supplier.name}
            itemCount={supplier.inventoryItems.length}
          />
        </div>
      </div>

      {/* Contact info */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <span className="font-medium">{supplier.phone || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{supplier.email || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Address:</span>{" "}
              <span className="font-medium">{supplier.address || "—"}</span>
            </div>
          </div>
          {supplier.notes && (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Notes:</span>{" "}
              <span>{supplier.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Linked Inventory Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplier.inventoryItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground py-8"
                  >
                    No items linked to this supplier
                  </TableCell>
                </TableRow>
              ) : (
                supplier.inventoryItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/inventory/${item.id}`}
                        className="text-primary hover:underline"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.currentStock} {item.unit}
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
