import {
  getTreatmentPlan,
  getCompletedUnbilledItems,
  getVisitNotesForPlan,
  getClinicDentists,
} from "@/server/actions/treatments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  ClipboardList,
  User,
  Pencil,
  Receipt,
  Calendar,
  Trash2,
} from "lucide-react";
import { TreatmentPlanStatusActions } from "@/components/dashboard/treatment-plan-status-actions";
import { TreatmentItemForm } from "@/components/dashboard/treatment-item-form";
import { TreatmentItemStatusSelect } from "@/components/dashboard/treatment-item-status-select";
import { GenerateInvoiceFromPlan } from "@/components/dashboard/generate-invoice-from-plan";
import { VisitNotesList } from "@/components/dashboard/visit-notes-list";
import { RemoveTreatmentItemButton } from "@/components/dashboard/remove-treatment-item-button";

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "success" | "warning"
> = {
  DRAFT: "secondary",
  PROPOSED: "default",
  ACCEPTED: "success",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export default async function TreatmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let plan: any;
  try {
    plan = await getTreatmentPlan(id);
  } catch {
    notFound();
  }

  const [completedUnbilled, visits, dentists] = await Promise.all([
    getCompletedUnbilledItems(id),
    getVisitNotesForPlan(id),
    getClinicDentists(),
  ]);

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

  const canAddItems = !["COMPLETED", "CANCELLED"].includes(plan.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{plan.name}</h1>
            <Badge
              variant={statusColors[plan.status] ?? "secondary"}
              className="text-sm px-3 py-1"
            >
              {plan.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Created{" "}
            {new Date(plan.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/treatments/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Plan Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{plan.items.length}</p>
                <p className="text-xs text-muted-foreground">Procedures</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{completedItems}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">
                  {formatCurrency(totalCost)}
                </p>
                <p className="text-xs text-muted-foreground">Total Cost</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{progressPct}%</p>
                <p className="text-xs text-muted-foreground">Progress</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {plan.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {plan.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" /> Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                href={`/dashboard/patients/${plan.patient.id}`}
                className="text-primary hover:underline font-medium"
              >
                {plan.patient.firstName} {plan.patient.lastName}
              </Link>
              {plan.patient.phone && (
                <p className="text-muted-foreground">{plan.patient.phone}</p>
              )}
              {plan.patient.email && (
                <p className="text-muted-foreground">{plan.patient.email}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <TreatmentPlanStatusActions
                planId={plan.id}
                currentStatus={plan.status}
              />
            </CardContent>
          </Card>

          {/* Invoice suggestion banner */}
          {completedUnbilled.length > 0 && (
            <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Receipt className="h-4 w-4" />
                  {completedUnbilled.length} completed item
                  {completedUnbilled.length !== 1 ? "s" : ""} ready to invoice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GenerateInvoiceFromPlan
                  planId={plan.id}
                  completedItems={completedUnbilled}
                />
              </CardContent>
            </Card>
          )}

          {/* Linked invoices */}
          {plan.invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" /> Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.invoices.map((inv: any) => (
                  <Link
                    key={inv.id}
                    href={`/dashboard/billing/${inv.id}`}
                    className="flex items-center justify-between rounded-md border p-2 hover:bg-accent/50 text-sm"
                  >
                    <span className="font-medium">{inv.invoiceNumber}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatCurrency(inv.total)}</span>
                      <Badge variant="outline" className="text-xs">
                        {inv.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Treatment items table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Procedures</CardTitle>
          {canAddItems && (
            <TreatmentItemForm planId={plan.id} dentists={dentists} />
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Procedure</TableHead>
                <TableHead>Tooth</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Net</TableHead>
                {canAddItems && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canAddItems ? 8 : 7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No procedures added yet. Click &quot;Add Procedure&quot; to
                    get started.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {plan.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.procedure}</p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.toothNum ? `#${item.toothNum}` : "—"}
                      </TableCell>
                      <TableCell>
                        <TreatmentItemStatusSelect
                          itemId={item.id}
                          currentStatus={item.status}
                        />
                      </TableCell>
                      <TableCell>
                        {item.scheduledDate
                          ? new Date(item.scheduledDate).toLocaleDateString(
                              "en-IN",
                              { day: "2-digit", month: "short" }
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.discount > 0
                          ? formatCurrency(item.discount)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.cost - item.discount)}
                      </TableCell>
                      {canAddItems && (
                        <TableCell>
                          <RemoveTreatmentItemButton itemId={item.id} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell
                      colSpan={canAddItems ? 6 : 6}
                      className="text-right font-bold"
                    >
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(totalCost)}
                    </TableCell>
                    {canAddItems && <TableCell />}
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Visit Notes */}
      <VisitNotesList visits={visits} />
    </div>
  );
}
