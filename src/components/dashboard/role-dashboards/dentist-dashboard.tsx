import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Users,
  ClipboardList,
  CheckCircle2,
  Loader2,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import type { getDentistDashboardStats } from "@/server/actions/dashboard";

type Stats = Awaited<ReturnType<typeof getDentistDashboardStats>>;

export function DentistDashboard({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your appointments &amp; clinical overview
        </p>
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
                  {stats.myTodayAppointments}
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
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.completedToday}/{stats.myTodayAppointments}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Treatment</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.inProgressToday}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Patients</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.myTotalPatients}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              My Schedule Today
            </CardTitle>
            <Link
              href="/dashboard/appointments"
              className="text-xs text-primary hover:underline"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {stats.myTodaySchedule.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No appointments scheduled for today
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.myTodaySchedule.map((apt: any) => {
                  const statusColors: Record<string, string> = {
                    SCHEDULED: "bg-gray-100 text-gray-700",
                    CONFIRMED: "bg-blue-100 text-blue-700",
                    ARRIVED: "bg-yellow-100 text-yellow-700",
                    IN_TREATMENT: "bg-orange-100 text-orange-700",
                    COMPLETED: "bg-green-100 text-green-700",
                    NO_SHOW: "bg-red-100 text-red-700",
                    CANCELLED: "bg-red-100 text-red-700",
                  };

                  return (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center text-xs text-muted-foreground w-14">
                          <Clock className="h-3 w-3 mb-0.5" />
                          {new Date(apt.startTime).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {apt.patient.firstName} {apt.patient.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {apt.type ?? "General Checkup"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          statusColors[apt.status] ?? "bg-gray-100 text-gray-700"
                        }
                      >
                        {apt.status.replace("_", " ")}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Treatment Plans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Pending Treatments
            </CardTitle>
            <Link
              href="/dashboard/treatments"
              className="text-xs text-primary hover:underline"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {stats.pendingTreatments.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  All treatment plans are up to date
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.pendingTreatments.map((tp: any) => {
                  const pendingItems = tp.items.filter(
                    (i: any) => i.status === "PENDING"
                  ).length;
                  const totalCost = tp.items.reduce(
                    (sum: number, i: any) => sum + i.cost,
                    0
                  );

                  return (
                    <div
                      key={tp.id}
                      className="py-2 border-b last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {tp.patient.firstName} {tp.patient.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tp.name} · {pendingItems} pending item
                            {pendingItems !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <Badge
                          variant={
                            tp.status === "IN_PROGRESS"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {tp.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-green-600">
                {stats.myMonthCompleted}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Completed Appointments
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-blue-600">
                {stats.myTotalPatients}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total Patients
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-amber-600">
                {stats.pendingTreatments.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Active Treatment Plans
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
