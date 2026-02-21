"use client";

import { PatientForm } from "@/components/dashboard/patient-form";

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  bloodGroup: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  notes: string | null;
}

export function EditPatientClient({
  patient,
  action,
}: {
  patient: PatientData;
  action: (formData: FormData) => Promise<any>;
}) {
  return (
    <PatientForm
      patient={patient}
      action={action}
      submitLabel="Update Patient"
    />
  );
}
