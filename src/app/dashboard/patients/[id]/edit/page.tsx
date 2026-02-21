import { getPatient, updatePatient } from "@/server/actions/patients";
import { notFound } from "next/navigation";
import { EditPatientClient } from "./edit-client";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let patient;
  try {
    patient = await getPatient(id);
  } catch {
    notFound();
  }

  async function handleUpdate(formData: FormData) {
    "use server";
    return updatePatient(id, formData);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Edit Patient — {patient.firstName} {patient.lastName}
      </h1>
      <EditPatientClient
        patient={{
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodGroup: patient.bloodGroup,
          address: patient.address,
          city: patient.city,
          state: patient.state,
          country: patient.country,
          notes: patient.notes,
        }}
        action={handleUpdate}
      />
    </div>
  );
}
