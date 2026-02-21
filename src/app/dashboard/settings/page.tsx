import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Building } from "lucide-react";
import { requireTenantContext, hasPermissions } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";

export default async function SettingsPage() {
  const ctx = await requireTenantContext();

  const allSections = [
    {
      title: "Clinic Profile",
      description: "Update your clinic information",
      href: "/dashboard/settings/clinic",
      icon: Building,
      permissions: [PERMISSIONS.SETTINGS_READ],
    },
    {
      title: "Team Members",
      description: "Manage your team and roles",
      href: "/dashboard/settings/members",
      icon: Users,
      permissions: [PERMISSIONS.MEMBERS_READ],
    },
    {
      title: "Billing & Subscription",
      description: "Manage your plan and payment method",
      href: "/dashboard/settings/billing",
      icon: CreditCard,
      permissions: [PERMISSIONS.SETTINGS_READ],
    },
  ];

  // Filter sections by user permissions
  const sections = allSections.filter((s) =>
    hasPermissions(ctx, s.permissions as any)
  );

  if (sections.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to access any settings. Contact your
          clinic admin for access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                </div>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
