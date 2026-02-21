import { getClinicPatientsForSelect } from "@/server/actions/billing";
import { InvoiceForm } from "@/components/dashboard/invoice-form";

export default async function NewInvoicePage() {
  const patients = await getClinicPatientsForSelect();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Invoice</h1>
      <InvoiceForm patients={patients} />
    </div>
  );
}
