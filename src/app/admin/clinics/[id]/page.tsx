import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Building2, Users, Calendar, FileText, Package } from "lucide-react";
import { AdminClinicActions } from "@/components/admin/clinic-actions";

export default async function AdminClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const clinic = await db.clinic.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { name: true, email: true, createdAt: true } },
          role: { select: { name: true } },
        },
      },
      subscription: true,
      _count: {
        select: {
          patients: true,
          appointments: true,
          invoices: true,
          inventoryItems: true,
          treatmentPlans: true,
        },
      },
    },
  });

  if (!clinic) notFound();

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    TRIALING: "bg-blue-100 text-blue-700",
    PAST_DUE: "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-red-100 text-red-700",
    UNPAID: "bg-red-100 text-red-700",
  };

  const stats = [
    { label: "Patients", value: clinic._count.patients, icon: Users },
    { label: "Appointments", value: clinic._count.appointments, icon: Calendar },
    { label: "Invoices", value: clinic._count.invoices, icon: FileText },
    { label: "Treatment Plans", value: clinic._count.treatmentPlans, icon: FileText },
    { label: "Inventory Items", value: clinic._count.inventoryItems, icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/clinics"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{clinic.name}</h1>
            <Badge
              className={statusColor[clinic.subscription?.status ?? ""] ?? "bg-gray-100"}
            >
              {clinic.subscription?.plan ?? "NO PLAN"} ·{" "}
              {clinic.subscription?.status ?? "NONE"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {clinic.email} · {clinic.phone} · {clinic.city}, {clinic.state}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <s.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscription details */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {clinic.subscription ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Plan</p>
                <p className="font-semibold">{clinic.subscription.plan}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold">{clinic.subscription.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Trial Ends</p>
                <p className="font-semibold">
                  {clinic.subscription.trialEndsAt
                    ? new Date(clinic.subscription.trialEndsAt).toLocaleDateString("en-IN")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Period End</p>
                <p className="font-semibold">
                  {clinic.subscription.currentPeriodEnd
                    ? new Date(clinic.subscription.currentPeriodEnd).toLocaleDateString("en-IN")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Razorpay Sub ID</p>
                <p className="font-mono text-xs">
                  {clinic.subscription.razorpaySubId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Razorpay Customer</p>
                <p className="font-mono text-xs">
                  {clinic.subscription.razorpayCustomerId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Cancel At Period End</p>
                <p className="font-semibold">
                  {clinic.subscription.cancelAtPeriodEnd ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-semibold">
                  {new Date(clinic.subscription.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No subscription record.</p>
          )}
        </CardContent>
      </Card>

      {/* Admin actions */}
      <AdminClinicActions
        clinicId={clinic.id}
        clinicName={clinic.name}
        currentPlan={clinic.subscription?.plan ?? "TRIAL"}
        currentStatus={clinic.subscription?.status ?? "TRIALING"}
      />

      {/* Team members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({clinic.members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {clinic.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <p className="font-medium">{m.user.name ?? "Unnamed"}</p>
                  <p className="text-sm text-muted-foreground">{m.user.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{m.role.name}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined {new Date(m.user.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
