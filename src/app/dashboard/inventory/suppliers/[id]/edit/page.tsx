import { notFound } from "next/navigation";
import { getSupplier } from "@/server/actions/inventory";
import { SupplierForm } from "@/components/dashboard/supplier-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditSupplierPage({
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
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/dashboard/inventory/suppliers/${supplier.id}`}
          className="hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          {supplier.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Edit</span>
      </div>

      <SupplierForm
        supplier={{
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          notes: supplier.notes,
        }}
      />
    </div>
  );
}
