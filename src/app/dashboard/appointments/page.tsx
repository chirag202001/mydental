import { getAppointments, getClinicDentists } from "@/server/actions/appointments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Calendar, List } from "lucide-react";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { WhatsAppButton } from "@/components/dashboard/whatsapp-button";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  SCHEDULED: "secondary",
  CONFIRMED: "default",
  ARRIVED: "warning",
  IN_TREATMENT: "warning",
  COMPLETED: "success",
  NO_SHOW: "destructive",
  CANCELLED: "destructive",
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; dentistProfileId?: string; view?: string }>;
}) {
  const params = await searchParams;
  const today = params.date ?? new Date().toISOString().split("T")[0];
  const view = params.view ?? "list";

  const [appointments, dentists] = await Promise.all([
    view === "list" ? getAppointments({ date: today, dentistProfileId: params.dentistProfileId }) : Promise.resolve([]),
    getClinicDentists(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <Link
              href={`/dashboard/appointments?view=list&date=${today}`}
              className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
                view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <List className="h-4 w-4" /> List
            </Link>
            <Link
              href="/dashboard/appointments?view=calendar"
              className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
                view === "calendar" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Calendar className="h-4 w-4" /> Week
            </Link>
          </div>

          <Link href="/dashboard/appointments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* Calendar View */}
      {view === "calendar" && <CalendarView />}

      {/* List View */}
      {view === "list" && (
        <>
          {/* Date + dentist filter */}
          <Card>
            <CardContent className="p-4">
              <form className="flex items-center gap-4 flex-wrap">
                <input type="hidden" name="view" value="list" />
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Date:</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={today}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Dentist:</label>
                  <select
                    name="dentistProfileId"
                    defaultValue={params.dentistProfileId ?? ""}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-40"
                  >
                    <option value="">All Dentists</option>
                    {dentists.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.clinicMember?.user?.name ?? "Unknown"}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" variant="secondary">
                  Filter
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Appointment list */}
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No appointments for {today}
                </CardContent>
              </Card>
            ) : (
              appointments.map((apt: any) => (
                <Link key={apt.id} href={`/dashboard/appointments/${apt.id}`} className="block">
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-15">
                            <div className="text-lg font-bold">
                              {new Date(apt.startTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(apt.endTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          {/* Dentist color bar */}
                          {apt.dentistProfile?.color && (
                            <div
                              className="w-1 h-10 rounded-full"
                              style={{ backgroundColor: apt.dentistProfile.color }}
                            />
                          )}
                          <div>
                            <p className="font-medium">
                              {apt.patient.firstName} {apt.patient.lastName}
                            </p>
                            <div className="text-sm text-muted-foreground">
                              {apt.type ?? "General"}{" "}
                              {apt.dentistProfile?.clinicMember?.user?.name
                                ? `· Dr. ${apt.dentistProfile.clinicMember.user.name}`
                                : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusColors[apt.status] ?? "secondary"}>
                            {apt.status.replace("_", " ")}
                          </Badge>
                          <WhatsAppButton
                            phone={apt.patient.phone}
                            templateParams={{
                              patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
                              date: new Date(apt.startTime).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
                              time: new Date(apt.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                              dentistName: apt.dentistProfile?.clinicMember?.user?.name ?? undefined,
                            }}
                            size="icon"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
