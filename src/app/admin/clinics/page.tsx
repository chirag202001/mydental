import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";

export default async function AdminClinicsPage() {
  const clinics = await db.clinic.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, patients: true, appointments: true } },
      subscription: {
        select: { plan: true, status: true, currentPeriodEnd: true, trialEndsAt: true },
      },
    },
  });

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    TRIALING: "bg-blue-100 text-blue-700",
    PAST_DUE: "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-red-100 text-red-700",
    UNPAID: "bg-red-100 text-red-700",
    INCOMPLETE: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clinics</h1>
          <p className="text-muted-foreground mt-1">
            {clinics.length} registered clinic{clinics.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {clinics.map((clinic) => (
          <Card key={clinic.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{clinic.name}</h3>
                      <Badge
                        variant="outline"
                        className={
                          statusColor[clinic.subscription?.status ?? ""] ?? "bg-gray-100"
                        }
                      >
                        {clinic.subscription?.plan ?? "NO PLAN"} ·{" "}
                        {clinic.subscription?.status ?? "NONE"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {clinic.email ?? "No email"} · {clinic.phone ?? "No phone"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {clinic.city ? `${clinic.city}, ` : ""}
                      {clinic.state ?? ""} · Slug: {clinic.slug}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{clinic._count.members} members</span>
                      <span>{clinic._count.patients} patients</span>
                      <span>{clinic._count.appointments} appointments</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Link
                    href={`/admin/clinics/${clinic.id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    View Details <ExternalLink className="h-3 w-3" />
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {new Date(clinic.createdAt).toLocaleDateString("en-IN")}
                  </p>
                  {clinic.subscription?.currentPeriodEnd && (
                    <p className="text-xs text-muted-foreground">
                      Period ends{" "}
                      {new Date(clinic.subscription.currentPeriodEnd).toLocaleDateString(
                        "en-IN"
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {clinics.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No clinics registered yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
