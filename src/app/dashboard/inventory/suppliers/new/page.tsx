import { SupplierForm } from "@/components/dashboard/supplier-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewSupplierPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/inventory?tab=suppliers"
          className="hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Suppliers
        </Link>
        <span>/</span>
        <span className="text-foreground">New Supplier</span>
      </div>

      <SupplierForm />
    </div>
  );
}
