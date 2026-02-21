import { getDashboardStats } from "@/server/actions/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Users, Calendar, IndianRupee, FileText } from "lucide-react";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const kpis = [
    {
      title: "Total Patients",
      value: stats.totalPatients.toString(),
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Today's Appointments",
      value: stats.todayAppointments.toString(),
      icon: Calendar,
      color: "text-green-600",
    },
    {
      title: "Month Revenue",
      value: formatCurrency(stats.monthRevenue),
      icon: IndianRupee,
      color: "text-amber-600",
    },
    {
      title: "Pending Invoices",
      value: stats.pendingInvoices.toString(),
      icon: FileText,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.todaySchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments today</p>
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
                      </p>
                    </div>
                    <Badge
                      variant={
                        apt.status === "COMPLETED"
                          ? "success"
                          : apt.status === "CANCELLED"
                          ? "destructive"
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
          <CardHeader>
            <CardTitle className="text-lg">Recent Patients</CardTitle>
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
    </div>
  );
}
