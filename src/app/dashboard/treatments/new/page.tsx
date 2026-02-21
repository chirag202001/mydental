import { getClinicPatientsForSelect } from "@/server/actions/treatments";
import { TreatmentPlanForm } from "@/components/dashboard/treatment-plan-form";

export default async function NewTreatmentPage() {
  const patients = await getClinicPatientsForSelect();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Treatment Plan</h1>
      <TreatmentPlanForm patients={patients} />
    </div>
  );
}
