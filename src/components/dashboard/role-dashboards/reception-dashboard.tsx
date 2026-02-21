import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  UserPlus,
  Users,
  CheckCircle2,
  UserCheck,
  ArrowRight,
  Bell,
} from "lucide-react";
import Link from "next/link";
import type { getReceptionDashboardStats } from "@/server/actions/dashboard";

type Stats = Awaited<ReturnType<typeof getReceptionDashboardStats>>;

export function ReceptionDashboard({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Front Desk</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Appointments &amp; patient check-in
          </p>
        </div>
        <Link href="/dashboard/patients">
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 transition-colors"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Register Patient
          </Badge>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Today&apos;s Appointments
                </p>
                <p className="text-2xl font-bold mt-1">
                  {stats.todayAppointments}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Checked In / Arrived
                </p>
                <p className="text-2xl font-bold mt-1">
                  {stats.arrivedCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Waiting</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.waitingCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.completedCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Register Patient",
            href: "/dashboard/patients",
            icon: UserPlus,
            color: "text-blue-600",
          },
          {
            label: "Book Appointment",
            href: "/dashboard/appointments",
            icon: Calendar,
            color: "text-green-600",
          },
          {
            label: "Create Invoice",
            href: "/dashboard/billing",
            icon: ArrowRight,
            color: "text-purple-600",
          },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointment Queue */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Appointment Queue
            </CardTitle>
            <Link
              href="/dashboard/appointments"
              className="text-xs text-primary hover:underline"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {stats.todaySchedule.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No appointments today
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.todaySchedule.map((apt: any) => {
                  const statusConfig: Record<
                    string,
                    { label: string; variant: string }
                  > = {
                    SCHEDULED: { label: "Waiting", variant: "bg-gray-100 text-gray-700" },
                    CONFIRMED: { label: "Confirmed", variant: "bg-blue-100 text-blue-700" },
                    ARRIVED: { label: "Arrived", variant: "bg-yellow-100 text-yellow-700" },
                    IN_TREATMENT: { label: "In Chair", variant: "bg-orange-100 text-orange-700" },
                    COMPLETED: { label: "Done", variant: "bg-green-100 text-green-700" },
                    NO_SHOW: { label: "No Show", variant: "bg-red-100 text-red-700" },
                    CANCELLED: { label: "Cancelled", variant: "bg-red-100 text-red-700" },
                  };
                  const sc = statusConfig[apt.status] ?? {
                    label: apt.status,
                    variant: "bg-gray-100 text-gray-700",
                  };

                  return (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono w-12">
                          {new Date(apt.startTime).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {apt.patient.firstName} {apt.patient.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {apt.type ?? "General"}
                            {apt.dentistProfile?.clinicMember?.user?.name &&
                              ` · Dr. ${apt.dentistProfile.clinicMember.user.name}`}
                          </p>
                        </div>
                      </div>
                      <Badge className={sc.variant}>{sc.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Registrations & Upcoming */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Recent Registrations
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {stats.newPatientsToday} today
              </Badge>
            </CardHeader>
            <CardContent>
              {stats.recentRegistrations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent registrations
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.recentRegistrations.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.phone ?? "No phone"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming appointments
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.upcomingAppointments.map((apt: any) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {apt.patient.firstName} {apt.patient.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(apt.startTime).toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(apt.startTime).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary">{apt.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
