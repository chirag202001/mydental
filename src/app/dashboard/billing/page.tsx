import { getInvoices, exportLedger, exportPayments } from "@/server/actions/billing";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CsvExportButton } from "@/components/dashboard/csv-export-button";

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "success" | "warning"
> = {
  DRAFT: "secondary",
  SENT: "default",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
};

const STATUSES = [
  "ALL",
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "REFUNDED",
] as const;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const statusFilter = sp.status && sp.status !== "ALL" ? sp.status : undefined;

  const invoices = await getInvoices(
    statusFilter ? { status: statusFilter } : undefined
  );

  // Counts per status
  const allInvoices = statusFilter
    ? await getInvoices()
    : invoices;
  const counts: Record<string, number> = { ALL: allInvoices.length };
  allInvoices.forEach((inv: any) => {
    counts[inv.status] = (counts[inv.status] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Billing & Invoices</h1>
        <div className="flex gap-2 items-center">
          <CsvExportButton exportAction={exportLedger} label="Export Invoices" />
          <CsvExportButton exportAction={exportPayments} label="Export Payments" />
          <Link href="/dashboard/billing/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1">
        {STATUSES.map((s) => {
          const active = s === (statusFilter ?? "ALL");
          return (
            <Link
              key={s}
              href={
                s === "ALL"
                  ? "/dashboard/billing"
                  : `/dashboard/billing?status=${s}`
              }
            >
              <Button
                variant={active ? "default" : "outline"}
                size="sm"
                className="text-xs"
              >
                {s.replace("_", " ")}
                {counts[s] !== undefined && (
                  <span className="ml-1 opacity-70">({counts[s]})</span>
                )}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Invoices table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {statusFilter
                      ? `No ${statusFilter.replace("_", " ")} invoices`
                      : "No invoices yet"}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv: any) => (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/billing/${inv.id}`}
                        className="hover:underline text-primary"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/patients/${inv.patient.id}`}
                        className="hover:underline"
                      >
                        {inv.patient.firstName} {inv.patient.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.paidAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.total - inv.paidAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusColors[inv.status] ?? "secondary"}
                      >
                        {inv.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
