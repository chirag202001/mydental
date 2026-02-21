import { getInvoice } from "@/server/actions/billing";
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
  Receipt,
  User,
  ArrowLeft,
  CreditCard,
  IndianRupee,
  Pencil,
  Printer,
  FileText,
} from "lucide-react";
import { RecordPaymentForm } from "@/components/dashboard/record-payment-form";
import { InvoiceStatusActions } from "@/components/dashboard/invoice-status-actions";

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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let invoice: any;
  try {
    invoice = await getInvoice(id);
  } catch {
    notFound();
  }

  const balanceDue = invoice.total - invoice.paidAmount;
  const canEdit = invoice.status === "DRAFT";
  const canDelete = invoice.status === "DRAFT" && invoice.paidAmount === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Invoice {invoice.invoiceNumber}
          </h1>
          <p className="text-muted-foreground text-sm">
            Created{" "}
            {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {invoice.dueDate && (
              <>
                {" "}
                · Due{" "}
                {new Date(invoice.dueDate).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={statusColors[invoice.status] ?? "secondary"}
            className="text-sm px-3 py-1"
          >
            {invoice.status.replace("_", " ")}
          </Badge>
          {canEdit && (
            <Link href={`/dashboard/billing/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            </Link>
          )}
          <Link href={`/dashboard/billing/${id}/receipt`}>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-1" /> Receipt
            </Button>
          </Link>
        </div>
      </div>

      {/* Status actions */}
      <InvoiceStatusActions
        invoiceId={invoice.id}
        status={invoice.status}
        paidAmount={invoice.paidAmount}
        canDelete={canDelete}
        canRefund={true}
      />

      {/* Treatment plan link */}
      {invoice.treatmentPlanId && (
        <div className="flex items-center gap-2 text-sm rounded-md border p-3 bg-muted/30">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Linked to</span>
          <Link
            href={`/dashboard/treatment-plans/${invoice.treatmentPlanId}`}
            className="text-primary hover:underline font-medium"
          >
            Treatment Plan
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">
                  {formatCurrency(invoice.subtotal)}
                </p>
                <p className="text-xs text-muted-foreground">Subtotal</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">
                  {formatCurrency(invoice.total)}
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(invoice.paidAmount)}
                </p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(balanceDue)}
                </p>
                <p className="text-xs text-muted-foreground">Balance Due</p>
              </div>
            </div>

            {invoice.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
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
                href={`/dashboard/patients/${invoice.patient.id}`}
                className="text-primary hover:underline font-medium"
              >
                {invoice.patient.firstName} {invoice.patient.lastName}
              </Link>
              {invoice.patient.phone && (
                <p className="text-muted-foreground">{invoice.patient.phone}</p>
              )}
              {invoice.patient.email && (
                <p className="text-muted-foreground">{invoice.patient.email}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <IndianRupee className="h-5 w-5" /> Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({invoice.taxRate}%)
                  </span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-600">
                    −{formatCurrency(invoice.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-2">
              <Link href="/dashboard/billing" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Invoices
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {invoice.payments.map((payment: any) => (
                <div
                  key={payment.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    payment.isRefund
                      ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                      : "bg-muted/50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {payment.isRefund ? "−" : ""}
                      {formatCurrency(payment.amount)}
                      {payment.isRefund && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          REFUND
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.method.replace("_", " ")} ·{" "}
                      {new Date(payment.createdAt).toLocaleDateString("en-IN")}
                      {payment.reference && ` · Ref: ${payment.reference}`}
                    </p>
                  </div>
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground max-w-50 truncate">
                      {payment.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Record payment inline */}
          {balanceDue > 0 &&
            invoice.status !== "CANCELLED" &&
            invoice.status !== "REFUNDED" && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">Record Payment</h3>
                <RecordPaymentForm
                  invoiceId={invoice.id}
                  balanceDue={balanceDue}
                />
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
