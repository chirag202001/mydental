import { getInvoice } from "@/server/actions/billing";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ReceiptPage({
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
  const payments = invoice.payments.filter((p: any) => !p.isRefund);
  const refunds = invoice.payments.filter((p: any) => p.isRefund);

  return (
    <>
      {/* Print-only styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              nav, header, aside, .no-print { display: none !important; }
              body { background: white !important; }
              .receipt-container { box-shadow: none !important; border: none !important; max-width: 100% !important; }
            }
          `,
        }}
      />

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Back button — hidden in print */}
        <div className="no-print flex items-center justify-between">
          <Link href={`/dashboard/billing/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Invoice
            </Button>
          </Link>
          <Button size="sm" onClick={() => {}} id="printBtn">
            Print Receipt
          </Button>
        </div>

        {/* Print button script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.getElementById('printBtn')?.addEventListener('click',()=>window.print())`,
          }}
        />

        {/* Receipt */}
        <div className="receipt-container bg-white dark:bg-gray-950 border rounded-lg shadow-sm p-8 space-y-6">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">RECEIPT</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Invoice #{invoice.invoiceNumber}
            </p>
            <p className="text-xs text-muted-foreground">
              Date:{" "}
              {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Patient info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">
                Bill To
              </p>
              <p className="font-semibold">
                {invoice.patient.firstName} {invoice.patient.lastName}
              </p>
              {invoice.patient.phone && <p>{invoice.patient.phone}</p>}
              {invoice.patient.email && <p>{invoice.patient.email}</p>}
            </div>
            <div className="text-right">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">
                Status
              </p>
              <p className="font-semibold">
                {invoice.status.replace("_", " ")}
              </p>
              {invoice.dueDate && (
                <p className="text-muted-foreground text-xs mt-1">
                  Due:{" "}
                  {new Date(invoice.dueDate).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Line items table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Description</th>
                <th className="text-right py-2 font-medium w-16">Qty</th>
                <th className="text-right py-2 font-medium w-28">Price</th>
                <th className="text-right py-2 font-medium w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item: any) => (
                <tr key={item.id} className="border-b border-dashed">
                  <td className="py-2">{item.description}</td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="text-right py-2 font-medium">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({invoice.taxRate}%)</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>−{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-1 text-base">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Paid</span>
                <span>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between font-bold text-orange-600 border-t pt-1">
                  <span>Balance Due</span>
                  <span>{formatCurrency(balanceDue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment records */}
          {payments.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-sm mb-2">Payments Received</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Date</th>
                    <th className="text-left py-1">Method</th>
                    <th className="text-left py-1">Reference</th>
                    <th className="text-right py-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id} className="border-b border-dashed">
                      <td className="py-1">
                        {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-1">{p.method.replace("_", " ")}</td>
                      <td className="py-1">{p.reference || "—"}</td>
                      <td className="py-1 text-right">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Refunds */}
          {refunds.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-sm mb-2 text-red-600">
                Refunds
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Date</th>
                    <th className="text-left py-1">Reason</th>
                    <th className="text-right py-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r: any) => (
                    <tr key={r.id} className="border-b border-dashed">
                      <td className="py-1">
                        {new Date(r.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-1">{r.notes || "—"}</td>
                      <td className="py-1 text-right text-red-600">
                        −{formatCurrency(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="text-center border-t pt-4 text-xs text-muted-foreground">
            <p>Thank you for choosing our dental clinic.</p>
            <p className="mt-1">This is a computer-generated receipt.</p>
          </div>
        </div>
      </div>
    </>
  );
}
