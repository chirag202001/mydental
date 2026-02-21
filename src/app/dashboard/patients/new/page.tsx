"use client";

import { createPatient } from "@/server/actions/patients";
import { PatientForm } from "@/components/dashboard/patient-form";

export default function NewPatientPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Add New Patient</h1>
      <PatientForm action={createPatient} submitLabel="Save Patient" />
    </div>
  );
}
