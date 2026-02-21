import {
  getAppointment,
  getClinicDentists,
  getClinicPatientsForSelect,
} from "@/server/actions/appointments";
import { AppointmentForm } from "@/components/dashboard/appointment-form";
import { notFound } from "next/navigation";

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let appointment;
  try {
    appointment = await getAppointment(id);
  } catch {
    notFound();
  }

  const [patients, dentists] = await Promise.all([
    getClinicPatientsForSelect(),
    getClinicDentists(),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Appointment</h1>
      <AppointmentForm
        patients={patients}
        dentists={dentists}
        appointment={appointment}
      />
    </div>
  );
}
