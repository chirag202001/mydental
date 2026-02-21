import { getTenantContext, requirePermissions } from "@/lib/tenant";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { ClinicProfileForm } from "@/components/dashboard/clinic-profile-form";

export default async function ClinicSettingsPage() {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  await requirePermissions(ctx, ["settings:write"]);

  const clinic = await db.clinic.findUnique({
    where: { id: ctx.clinicId },
  });

  if (!clinic) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clinic Profile</h1>
        <p className="text-muted-foreground text-sm">Update your clinic details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>This information is displayed to your patients.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClinicProfileForm
            clinic={{
              id: clinic.id,
              name: clinic.name,
              slug: clinic.slug,
              address: clinic.address,
              phone: clinic.phone,
              email: clinic.email,
              city: clinic.city,
              state: clinic.state,
              timezone: clinic.timezone,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
