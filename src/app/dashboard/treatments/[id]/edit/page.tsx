import {
  getTreatmentPlan,
  getClinicPatientsForSelect,
} from "@/server/actions/treatments";
import { TreatmentPlanForm } from "@/components/dashboard/treatment-plan-form";
import { notFound } from "next/navigation";

export default async function EditTreatmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let plan: any;
  try {
    plan = await getTreatmentPlan(id);
  } catch {
    notFound();
  }

  const patients = await getClinicPatientsForSelect();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Treatment Plan</h1>
      <TreatmentPlanForm
        patients={patients}
        plan={{
          id: plan.id,
          name: plan.name,
          notes: plan.notes,
          patientId: plan.patientId,
          patient: {
            firstName: plan.patient.firstName,
            lastName: plan.patient.lastName,
          },
        }}
      />
    </div>
  );
}
