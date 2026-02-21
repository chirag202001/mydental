import { getInvoice, getClinicPatientsForSelect } from "@/server/actions/billing";
import { InvoiceForm } from "@/components/dashboard/invoice-form";
import { notFound, redirect } from "next/navigation";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let invoice: any;
  try {
    invoice = await getInvoice(id);
  } catch {
    notFound();
  }

  // Only DRAFT invoices can be edited
  if (invoice.status !== "DRAFT") {
    redirect(`/dashboard/billing/${id}`);
  }

  const patients = await getClinicPatientsForSelect();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Invoice {invoice.invoiceNumber}</h1>
      <InvoiceForm patients={patients} invoice={invoice} />
    </div>
  );
}
