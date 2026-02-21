import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Clock,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  FileText,
  ExternalLink,
} from "lucide-react";
import { SubscriptionStatus } from "@prisma/client";

export default async function AdminDashboardPage() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalClinics,
    totalUsers,
    totalPatients,
    totalAppointments,
    totalInvoices,
    subscriptions,
    recentClinics,
    recentUsers,
    clinicsThisMonth,
    clinicsLastMonth,
    usersThisMonth,
    usersLastMonth,
    patientsThisMonth,
    appointmentsThisMonth,
    allClinics,
  ] = await Promise.all([
    db.clinic.count(),
    db.user.count(),
    db.patient.count(),
    db.appointment.count(),
    db.invoice.count(),
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
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isSuperAdmin: true,
      },
    }),
    db.clinic.count({ where: { createdAt: { gte: thisMonthStart } } }),
    db.clinic.count({
      where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
    }),
    db.user.count({ where: { createdAt: { gte: thisMonthStart } } }),
    db.user.count({
      where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
    }),
    db.patient.count({ where: { createdAt: { gte: thisMonthStart } } }),
    db.appointment.count({ where: { createdAt: { gte: thisMonthStart } } }),
    db.clinic.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: { appointments: true, patients: true, invoices: true },
        },
        subscription: { select: { plan: true, status: true } },
      },
    }),
  ]);

  // Subscription breakdown
  const activeCount = subscriptions.filter(
    (s) => s.status === SubscriptionStatus.ACTIVE
  ).length;
  const trialCount = subscriptions.filter(
    (s) => s.status === SubscriptionStatus.TRIALING
  ).length;
  const pastDueCount = subscriptions.filter(
    (s) => s.status === SubscriptionStatus.PAST_DUE
  ).length;
  const cancelledCount = subscriptions.filter(
    (s) => s.status === SubscriptionStatus.CANCELLED
  ).length;

  // MRR calculation
  const planPrices: Record<string, number> = {
    BASIC: 999,
    PRO: 2499,
    ENTERPRISE: 4999,
  };
  const mrr = subscriptions
    .filter((s) => s.status === SubscriptionStatus.ACTIVE)
    .reduce((sum, s) => sum + (planPrices[s.plan] ?? 0), 0);

  // Revenue by plan
  const revenueByPlan = Object.entries(planPrices)
    .map(([plan, price]) => ({
      plan,
      count: subscriptions.filter(
        (s) => s.status === SubscriptionStatus.ACTIVE && s.plan === plan
      ).length,
      revenue:
        subscriptions.filter(
          (s) => s.status === SubscriptionStatus.ACTIVE && s.plan === plan
        ).length * price,
    }))
    .filter((r) => r.count > 0);

  // Growth percentages
  const clinicGrowth =
    clinicsLastMonth > 0
      ? Math.round(
          ((clinicsThisMonth - clinicsLastMonth) / clinicsLastMonth) * 100
        )
      : clinicsThisMonth > 0
        ? 100
        : 0;
  const userGrowth =
    usersLastMonth > 0
      ? Math.round(
          ((usersThisMonth - usersLastMonth) / usersLastMonth) * 100
        )
      : usersThisMonth > 0
        ? 100
        : 0;

  // Clinic health
  const activeClinicCount = allClinics.filter(
    (c) => c._count.appointments > 0 || c._count.patients > 0
  ).length;
  const dormantClinicCount = allClinics.filter(
    (c) => c._count.appointments === 0 && c._count.patients === 0
  ).length;

  // Combined activity timeline
  type ActivityItem = {
    type: string;
    label: string;
    detail: string;
    time: Date;
  };
  const activities: ActivityItem[] = [
    ...recentClinics.map((c) => ({
      type: "clinic",
      label: "New clinic registered",
      detail: c.name,
      time: c.createdAt,
    })),
    ...recentUsers.map((u) => ({
      type: "user",
      label: "New user signed up",
      detail: u.name ?? u.email,
      time: u.createdAt,
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 10);

  function timeAgo(date: Date) {
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function GrowthIndicator({ value }: { value: number }) {
    return (
      <span
        className={`inline-flex items-center text-xs font-medium ${value >= 0 ? "text-green-600" : "text-red-600"}`}
      >
        {value >= 0 ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        {Math.abs(value)}%
      </span>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with quick actions */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide overview of DentOS SaaS
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/clinics"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Building2 className="h-4 w-4" />
            Manage Clinics
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-4 w-4" />
            Manage Users
          </Link>
        </div>
      </div>

      {/* Primary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clinics</p>
                <p className="text-3xl font-bold">{totalClinics}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    +{clinicsThisMonth} this month
                  </span>
                  {clinicsLastMonth > 0 && (
                    <GrowthIndicator value={clinicGrowth} />
                  )}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{totalUsers}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    +{usersThisMonth} this month
                  </span>
                  {usersLastMonth > 0 && (
                    <GrowthIndicator value={userGrowth} />
                  )}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-green-100 text-green-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-3xl font-bold">
                  ₹{mrr.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeCount} paying{" "}
                  {activeCount === 1 ? "clinic" : "clinics"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                <IndianRupee className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
                <p className="text-3xl font-bold">{totalPatients}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  +{patientsThisMonth} this month
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription breakdown + Revenue */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5" />
              Subscription Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  label: "Active",
                  count: activeCount,
                  color: "bg-green-500",
                },
                {
                  label: "Trialing",
                  count: trialCount,
                  color: "bg-blue-500",
                },
                {
                  label: "Past Due",
                  count: pastDueCount,
                  color: "bg-yellow-500",
                },
                {
                  label: "Cancelled",
                  count: cancelledCount,
                  color: "bg-red-500",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.color}`}
                      style={{
                        width: `${
                          subscriptions.length > 0
                            ? (item.count / subscriptions.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Subscriptions</span>
                  <span className="font-bold">{subscriptions.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IndianRupee className="h-5 w-5" />
              Revenue by Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByPlan.length > 0 ? (
              <div className="space-y-4">
                {revenueByPlan.map((item) => (
                  <div
                    key={item.plan}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div>
                      <Badge variant="outline" className="mb-1">
                        {item.plan}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {item.count} {item.count === 1 ? "clinic" : "clinics"}
                      </p>
                    </div>
                    <p className="text-xl font-bold">
                      ₹{item.revenue.toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="font-medium text-sm">Total MRR</span>
                  <span className="text-xl font-bold text-green-600">
                    ₹{mrr.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <IndianRupee className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No paying clinics yet</p>
                <p className="text-xs mt-1">
                  Revenue appears when clinics upgrade from trial
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform metrics + Activity timeline */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Platform metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5" />
              Platform Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Appointments</span>
                </div>
                <span className="font-bold">{totalAppointments}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm">Invoices</span>
                </div>
                <span className="font-bold">{totalInvoices}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm">Appts This Month</span>
                </div>
                <span className="font-bold">{appointmentsThisMonth}</span>
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Clinic Health
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 p-2.5 rounded-lg bg-green-50 text-center">
                    <p className="text-lg font-bold text-green-700">
                      {activeClinicCount}
                    </p>
                    <p className="text-xs text-green-600">Active</p>
                  </div>
                  <div className="flex-1 p-2.5 rounded-lg bg-gray-100 text-center">
                    <p className="text-lg font-bold text-gray-500">
                      {dormantClinicCount}
                    </p>
                    <p className="text-xs text-gray-500">No Activity</p>
                  </div>
                </div>
              </div>
              {pastDueCount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {pastDueCount} past due{" "}
                    {pastDueCount === 1 ? "subscription" : "subscriptions"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {activities.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      activity.type === "clinic"
                        ? "bg-blue-500"
                        : "bg-green-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="text-muted-foreground">
                        {activity.label}:
                      </span>{" "}
                      <span className="font-medium">{activity.detail}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(activity.time)}
                  </span>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent clinics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recently Added Clinics</CardTitle>
            <Link
              href="/admin/clinics"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentClinics.map((clinic) => (
              <Link
                key={clinic.id}
                href={`/admin/clinics/${clinic.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium">{clinic.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {clinic._count.members} members · {clinic._count.patients}{" "}
                    patients
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={
                      clinic.subscription?.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : clinic.subscription?.status === "TRIALING"
                          ? "bg-blue-100 text-blue-700"
                          : clinic.subscription?.status === "PAST_DUE"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                    }
                  >
                    {clinic.subscription?.plan ?? "NO PLAN"} ·{" "}
                    {clinic.subscription?.status ?? "—"}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(clinic.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </Link>
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
