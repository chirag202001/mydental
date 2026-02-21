import {
  getClinicDentists,
  getClinicPatientsForSelect,
} from "@/server/actions/appointments";
import { AppointmentForm } from "@/components/dashboard/appointment-form";

export default async function NewAppointmentPage() {
  const [patients, dentists] = await Promise.all([
    getClinicPatientsForSelect(),
    getClinicDentists(),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Appointment</h1>
      <AppointmentForm patients={patients} dentists={dentists} />
    </div>
  );
}
