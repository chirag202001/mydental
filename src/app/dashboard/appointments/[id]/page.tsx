import { getAppointment } from "@/server/actions/appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppointmentStatusActions } from "@/components/dashboard/appointment-status-actions";
import { ReminderToggle } from "@/components/dashboard/reminder-toggle";
import { AddNoteForm } from "@/components/dashboard/add-note-form";
import { WhatsAppButton } from "@/components/dashboard/whatsapp-button";
import { Clock, User, Stethoscope, FileText, Pencil, MessageCircle } from "lucide-react";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  SCHEDULED: "secondary",
  CONFIRMED: "default",
  ARRIVED: "warning",
  IN_TREATMENT: "warning",
  COMPLETED: "success",
  NO_SHOW: "destructive",
  CANCELLED: "destructive",
};

export default async function AppointmentDetailPage({
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

  const startDate = new Date(appointment.startTime);
  const endDate = new Date(appointment.endTime);
  const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {appointment.title ?? "Appointment"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {startDate.toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusColors[appointment.status] ?? "secondary"} className="text-sm px-3 py-1">
            {appointment.status.replace("_", " ")}
          </Badge>
          <Link href={`/dashboard/appointments/${appointment.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Details */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    {" – "}
                    {endDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-muted-foreground">{durationMin} minutes</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Patient</p>
                  <Link href={`/dashboard/patients/${appointment.patient.id}`}
                    className="text-sm text-primary hover:underline">
                    {appointment.patient.firstName} {appointment.patient.lastName}
                  </Link>
                  {appointment.patient.phone && (
                    <p className="text-xs text-muted-foreground">{appointment.patient.phone}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Stethoscope className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Dentist</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.dentistProfile?.clinicMember?.user?.name
                      ? `Dr. ${appointment.dentistProfile.clinicMember.user.name}`
                      : "Unassigned"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground capitalize">{appointment.type ?? "General"}</p>
                </div>
              </div>
            </div>

            {appointment.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{appointment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <AppointmentStatusActions appointmentId={appointment.id} currentStatus={appointment.status} />

          {/* Reminder settings */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Reminders</CardTitle></CardHeader>
            <CardContent>
              <ReminderToggle
                appointmentId={appointment.id}
                reminderEmail={appointment.reminderEmail}
              />
              {appointment.reminderSentAt && (
                <p className="text-xs text-muted-foreground mt-2 px-3">
                  Last sent: {new Date(appointment.reminderSentAt).toLocaleString("en-IN")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <WhatsAppButton
                phone={appointment.patient.phone}
                templateParams={{
                  patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
                  date: startDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
                  time: startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                  dentistName: appointment.dentistProfile?.clinicMember?.user?.name ?? undefined,
                }}
                templates={["appointment_reminder", "appointment_confirmation", "greeting", "followup"]}
              />
              <Link href={`/dashboard/patients/${appointment.patient.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <User className="h-4 w-4 mr-2" /> View Patient
                </Button>
              </Link>
              <Link href="/dashboard/appointments" className="block">
                <Button variant="outline" className="w-full justify-start">← Back to Appointments</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Clinical Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Clinical Notes</CardTitle>
          <AddNoteForm appointmentId={appointment.id} />
        </CardHeader>
        <CardContent>
          {appointment.appointmentNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clinical notes for this appointment.</p>
          ) : (
            <div className="space-y-3">
              {appointment.appointmentNotes.map((note: any) => (
                <div key={note.id} className="p-3 rounded-md bg-muted/50 text-sm">
                  <p className="whitespace-pre-wrap">{note.note}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(note.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
