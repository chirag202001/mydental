import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function AdminSubscriptionsPage() {
  const subscriptions = await db.subscription.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      clinic: { select: { id: true, name: true, slug: true } },
    },
  });

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    TRIALING: "bg-blue-100 text-blue-700",
    PAST_DUE: "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-red-100 text-red-700",
    UNPAID: "bg-red-100 text-red-700",
    INCOMPLETE: "bg-gray-100 text-gray-600",
    EXPIRED: "bg-gray-100 text-gray-600",
  };

  const planColor: Record<string, string> = {
    TRIAL: "bg-gray-100 text-gray-700",
    BASIC: "bg-blue-100 text-blue-700",
    PRO: "bg-purple-100 text-purple-700",
    ENTERPRISE: "bg-amber-100 text-amber-700",
  };

  const planPrices: Record<string, string> = {
    TRIAL: "Free",
    BASIC: "₹999/mo",
    PRO: "₹2,499/mo",
    ENTERPRISE: "₹4,999/mo",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          {subscriptions.length} total subscription{subscriptions.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">Clinic</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Price</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Period End</th>
                  <th className="pb-3 font-medium">Razorpay ID</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0">
                    <td className="py-3">
                      <Link
                        href={`/admin/clinics/${sub.clinic.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {sub.clinic.name}
                      </Link>
                    </td>
                    <td className="py-3">
                      <Badge className={planColor[sub.plan] ?? ""}>
                        {sub.plan}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {planPrices[sub.plan] ?? "—"}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={statusColor[sub.status] ?? ""}
                      >
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN")
                        : sub.trialEndsAt
                        ? new Date(sub.trialEndsAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="py-3 font-mono text-xs text-muted-foreground">
                      {sub.razorpaySubId ?? "—"}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/admin/clinics/${sub.clinic.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subscriptions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No subscriptions yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
