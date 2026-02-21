import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  Package,
  AlertTriangle,
  Clock,
  Eye,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import type { getAssistantDashboardStats } from "@/server/actions/dashboard";

type Stats = Awaited<ReturnType<typeof getAssistantDashboardStats>>;

export function AssistantDashboard({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assistant Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Schedule overview &amp; inventory alerts
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
                  {stats.todayAppointmentCount}
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
                <p className="text-sm text-muted-foreground">In Treatment</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.inTreatmentCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.totalPatients}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.lowStockItems.length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule (Read-only) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Today&apos;s Schedule
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              View only
            </Badge>
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
                {stats.todaySchedule.map((apt: any) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
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
                    <Badge
                      variant={
                        apt.status === "COMPLETED"
                          ? "success"
                          : apt.status === "IN_TREATMENT"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {apt.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Inventory Alerts
            </CardTitle>
            <Link
              href="/dashboard/inventory"
              className="text-xs text-primary hover:underline"
            >
              View inventory →
            </Link>
          </CardHeader>
          <CardContent>
            {stats.lowStockItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  All items are well stocked
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.lowStockItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.category ?? "Uncategorized"} · Min: {item.minStock}{" "}
                        {item.unit}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.currentStock === 0 ? "destructive" : "secondary"
                      }
                    >
                      {item.currentStock} {item.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4 flex items-center gap-3">
          <Eye className="h-5 w-5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800">
            You have <strong>read-only</strong> access. Contact your clinic
            admin to update appointments, patients, or inventory.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
