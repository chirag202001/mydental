import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Clock,
  IndianRupee,
} from "lucide-react";
import { SubscriptionStatus } from "@prisma/client";

export default async function AdminDashboardPage() {
  // Fetch platform-wide stats
  const [
    totalClinics,
    totalUsers,
    totalPatients,
    totalAppointments,
    subscriptions,
    recentClinics,
  ] = await Promise.all([
    db.clinic.count(),
    db.user.count(),
    db.patient.count(),
    db.appointment.count(),
    db.subscription.findMany({
      include: { clinic: { select: { name: true } } },
    }),
    db.clinic.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: { select: { members: true, patients: true } },
        subscription: { select: { plan: true, status: true } },
      },
    }),
  ]);

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === SubscriptionStatus.ACTIVE
  ).length;
  const trialSubscriptions = subscriptions.filter(
    (s) => s.status === SubscriptionStatus.TRIALING
  ).length;
  const pastDueSubscriptions = subscriptions.filter(
    (s) => s.status === SubscriptionStatus.PAST_DUE
  ).length;

  // Calculate MRR (Monthly Recurring Revenue) from plan configs
  const planPrices: Record<string, number> = {
    BASIC: 999,
    PRO: 2499,
    ENTERPRISE: 4999,
  };
  const mrr = subscriptions
    .filter((s) => s.status === SubscriptionStatus.ACTIVE)
    .reduce((sum, s) => sum + (planPrices[s.plan] ?? 0), 0);

  const stats = [
    { label: "Total Clinics", value: totalClinics, icon: Building2, color: "text-blue-600 bg-blue-100" },
    { label: "Total Users", value: totalUsers, icon: Users, color: "text-green-600 bg-green-100" },
    { label: "Total Patients", value: totalPatients, icon: UserCheck, color: "text-purple-600 bg-purple-100" },
    { label: "Total Appointments", value: totalAppointments, icon: Clock, color: "text-orange-600 bg-orange-100" },
    { label: "Active Plans", value: activeSubscriptions, icon: CreditCard, color: "text-emerald-600 bg-emerald-100" },
    { label: "On Trial", value: trialSubscriptions, icon: TrendingUp, color: "text-cyan-600 bg-cyan-100" },
    { label: "Past Due", value: pastDueSubscriptions, icon: AlertTriangle, color: "text-red-600 bg-red-100" },
    { label: "MRR", value: `₹${mrr.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-amber-600 bg-amber-100" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">System Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Platform-wide overview of DentOS SaaS.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent clinics */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Added Clinics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentClinics.map((clinic) => (
              <div
                key={clinic.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <p className="font-medium">{clinic.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {clinic._count.members} members · {clinic._count.patients}{" "}
                    patients
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                      clinic.subscription?.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : clinic.subscription?.status === "TRIALING"
                        ? "bg-blue-100 text-blue-700"
                        : clinic.subscription?.status === "PAST_DUE"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {clinic.subscription?.plan ?? "NO PLAN"} ·{" "}
                    {clinic.subscription?.status ?? "—"}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(clinic.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
            ))}
            {recentClinics.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No clinics yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
