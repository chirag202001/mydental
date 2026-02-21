import { getTreatmentPlans } from "@/server/actions/treatments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  DRAFT: "secondary",
  PROPOSED: "default",
  ACCEPTED: "success",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export default async function TreatmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; patientId?: string }>;
}) {
  const sp = await searchParams;
  const plans = await getTreatmentPlans({
    status: sp.status,
    patientId: sp.patientId,
  });

  const statuses = ["ALL", "DRAFT", "PROPOSED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Treatment Plans</h1>
        <Link href="/dashboard/treatments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New Plan
          </Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {statuses.map((s) => {
          const isActive = s === "ALL" ? !sp.status : sp.status === s;
          const href =
            s === "ALL"
              ? "/dashboard/treatments"
              : `/dashboard/treatments?status=${s}`;
          return (
            <Link key={s} href={href}>
              <Badge
                variant={isActive ? "default" : "outline"}
                className="cursor-pointer"
              >
                {s.replace("_", " ")}
              </Badge>
            </Link>
          );
        })}
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {sp.status
              ? `No treatment plans with status "${sp.status.replace("_", " ")}"`
              : "No treatment plans yet"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((plan: any) => {
            const totalCost = plan.items.reduce(
              (sum: number, item: any) => sum + (item.cost - item.discount),
              0
            );
            const completedItems = plan.items.filter(
              (i: any) => i.status === "COMPLETED"
            ).length;
            const progressPct =
              plan.items.length > 0
                ? Math.round((completedItems / plan.items.length) * 100)
                : 0;

            return (
              <Link key={plan.id} href={`/dashboard/treatments/${plan.id}`} className="block">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{plan.name}</p>
                          <Badge variant={statusColors[plan.status] ?? "secondary"}>
                            {plan.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {plan.patient.firstName} {plan.patient.lastName} ·{" "}
                          {plan.items.length} procedure
                          {plan.items.length !== 1 ? "s" : ""} ·{" "}
                          {formatCurrency(totalCost)}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-lg font-bold">{progressPct}%</p>
                        <p className="text-xs text-muted-foreground">
                          {completedItems}/{plan.items.length} done
                        </p>
                      </div>
                    </div>

                    {/* Mini progress bar */}
                    {plan.items.length > 0 && (
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}

                    {/* Invoice badges */}
                    {plan.invoices.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {plan.invoices.map((inv: any) => (
                          <Badge key={inv.id} variant="outline" className="text-xs">
                            {inv.invoiceNumber} · {inv.status}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
