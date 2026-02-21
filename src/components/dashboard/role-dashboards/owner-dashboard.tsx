import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  Calendar,
  IndianRupee,
  FileText,
  UserPlus,
  TrendingUp,
  CheckCircle2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { getOwnerDashboardStats } from "@/server/actions/dashboard";

type Stats = Awaited<ReturnType<typeof getOwnerDashboardStats>>;

export function OwnerDashboard({ stats }: { stats: Stats }) {
  const kpis = [
    {
      title: "Total Patients",
      value: stats.totalPatients.toString(),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/dashboard/patients",
    },
    {
      title: "Today's Appointments",
      value: `${stats.completedToday}/${stats.todayAppointments}`,
      icon: Calendar,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/dashboard/appointments",
    },
    {
      title: "Month Revenue",
      value: formatCurrency(stats.monthRevenue),
      icon: IndianRupee,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/dashboard/reports",
    },
    {
      title: "Pending Invoices",
      value: stats.pendingInvoices.toString(),
      icon: FileText,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/dashboard/billing",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clinic overview &amp; management
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <UsersRound className="h-3 w-3 mr-1" />
          {stats.totalMembers} team members
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.title}</p>
                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  </div>
                  <div
                    className={`h-12 w-12 rounded-lg ${kpi.bg} flex items-center justify-center`}
                  >
                    <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Add Patient",
            href: "/dashboard/patients",
            icon: UserPlus,
            color: "text-blue-600",
          },
          {
            label: "New Appointment",
            href: "/dashboard/appointments",
            icon: Calendar,
            color: "text-green-600",
          },
          {
            label: "View Reports",
            href: "/dashboard/reports",
            icon: TrendingUp,
            color: "text-purple-600",
          },
          {
            label: "Manage Team",
            href: "/dashboard/settings/members",
            icon: UsersRound,
            color: "text-orange-600",
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
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
            <Link
              href="/dashboard/appointments"
              className="text-xs text-primary hover:underline"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {stats.todaySchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No appointments today
              </p>
            ) : (
              <div className="space-y-3">
                {stats.todaySchedule.map((apt: any) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.startTime).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        – {apt.type ?? "General"}
                        {apt.dentistProfile?.clinicMember?.user?.name &&
                          ` · Dr. ${apt.dentistProfile.clinicMember.user.name}`}
                      </p>
                    </div>
                    <Badge
                      variant={
                        apt.status === "COMPLETED"
                          ? "success"
                          : apt.status === "CANCELLED"
                            ? "destructive"
                            : apt.status === "IN_TREATMENT"
                              ? "default"
                              : "secondary"
                      }
                    >
                      {apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Patients</CardTitle>
            <Link
              href="/dashboard/patients"
              className="text-xs text-primary hover:underline"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients yet</p>
            ) : (
              <div className="space-y-3">
                {stats.recentPatients.map((patient: any) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {patient.phone ?? "No phone"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-blue-600">
                {stats.monthAppointments}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total Appointments
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.monthRevenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Revenue</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-amber-600">
                {stats.totalPatients}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total Patients
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-purple-600">
                {stats.totalMembers}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Team Members</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
