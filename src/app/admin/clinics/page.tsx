import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building2, ExternalLink, Users, Stethoscope, FileText } from "lucide-react";
import { SearchForm } from "@/components/admin/search-form";

export default async function AdminClinicsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; plan?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase();
  const statusFilter = params.status;
  const planFilter = params.plan;

  const clinics = await db.clinic.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          members: true,
          patients: true,
          appointments: true,
          invoices: true,
        },
      },
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
        },
      },
    },
  });

  // Filter in JS for compatibility
  let filtered = clinics;
  if (query) {
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.slug.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.city?.toLowerCase().includes(query)
    );
  }
  if (statusFilter) {
    filtered = filtered.filter(
      (c) => c.subscription?.status === statusFilter
    );
  }
  if (planFilter) {
    filtered = filtered.filter((c) => c.subscription?.plan === planFilter);
  }

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    TRIALING: "bg-blue-100 text-blue-700",
    PAST_DUE: "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-red-100 text-red-700",
    UNPAID: "bg-red-100 text-red-700",
    INCOMPLETE: "bg-gray-100 text-gray-600",
  };

  // Compute status/plan counts for filter pills
  const statusCounts: Record<string, number> = {};
  const planCounts: Record<string, number> = {};
  for (const c of clinics) {
    const s = c.subscription?.status ?? "NONE";
    const p = c.subscription?.plan ?? "NONE";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    planCounts[p] = (planCounts[p] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clinics</h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length === clinics.length
              ? `${clinics.length} registered clinic${clinics.length !== 1 ? "s" : ""}`
              : `${filtered.length} of ${clinics.length} clinics`}
            {query && ` matching "${params.q}"`}
          </p>
        </div>
      </div>

      {/* Search */}
      <SearchForm placeholder="Search by name, slug, email, or city..." defaultValue={params.q ?? ""} />

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/clinics"
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            !statusFilter && !planFilter
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white hover:bg-gray-50"
          }`}
        >
          All ({clinics.length})
        </Link>
        {Object.entries(statusCounts).map(([status, count]) => (
          <Link
            key={status}
            href={`/admin/clinics?status=${status}${query ? `&q=${encodeURIComponent(params.q!)}` : ""}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              statusFilter === status
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            {status} ({count})
          </Link>
        ))}
      </div>

      {/* Clinic cards */}
      <div className="grid gap-4">
        {filtered.map((clinic) => (
          <Card key={clinic.id} className="hover:shadow-md transition-shadow">
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
                          statusColor[clinic.subscription?.status ?? ""] ??
                          "bg-gray-100"
                        }
                      >
                        {clinic.subscription?.plan ?? "NO PLAN"} ·{" "}
                        {clinic.subscription?.status ?? "NONE"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {clinic.email ?? "No email"} ·{" "}
                      {clinic.phone ?? "No phone"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {clinic.city ? `${clinic.city}, ` : ""}
                      {clinic.state ?? ""} · Slug: {clinic.slug}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {clinic._count.members} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-3.5 w-3.5" />
                        {clinic._count.patients} patients
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {clinic._count.invoices} invoices
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Link
                    href={`/admin/clinics/${clinic.id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium"
                  >
                    View Details <ExternalLink className="h-3 w-3" />
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created{" "}
                    {new Date(clinic.createdAt).toLocaleDateString("en-IN")}
                  </p>
                  {clinic.subscription?.trialEndsAt && (
                    <p className="text-xs text-muted-foreground">
                      Trial ends{" "}
                      {new Date(
                        clinic.subscription.trialEndsAt
                      ).toLocaleDateString("en-IN")}
                    </p>
                  )}
                  {clinic.subscription?.currentPeriodEnd && (
                    <p className="text-xs text-muted-foreground">
                      Period ends{" "}
                      {new Date(
                        clinic.subscription.currentPeriodEnd
                      ).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {query || statusFilter
                ? "No clinics match your filters."
                : "No clinics registered yet."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
