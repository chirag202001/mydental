import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  IndianRupee,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  CreditCard,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import type { getAccountantDashboardStats } from "@/server/actions/dashboard";

type Stats = Awaited<ReturnType<typeof getAccountantDashboardStats>>;

export function AccountantDashboard({ stats }: { stats: Stats }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Billing, invoices &amp; collections
          </p>
        </div>
        <Link href="/dashboard/reports">
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 transition-colors"
          >
            <PieChart className="h-3 w-3 mr-1" />
            Full Reports
          </Badge>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Month Revenue</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(stats.monthRevenue)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Collection</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(stats.todayRevenue)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Pending Invoices
                </p>
                <p className="text-2xl font-bold mt-1">
                  {stats.pendingInvoices}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Outstanding
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(stats.outstandingTotal)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Create Invoice",
            href: "/dashboard/billing",
            icon: FileText,
            color: "text-blue-600",
          },
          {
            label: "Record Payment",
            href: "/dashboard/billing",
            icon: CreditCard,
            color: "text-green-600",
          },
          {
            label: "Export Reports",
            href: "/dashboard/reports?tab=revenue",
            icon: ArrowUpRight,
            color: "text-purple-600",
          },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Recent Payments
            </CardTitle>
            <Link
              href="/dashboard/billing"
              className="text-xs text-primary hover:underline"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent payments
              </p>
            ) : (
              <div className="space-y-2">
                {stats.recentPayments.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {p.invoice.patient.firstName}{" "}
                        {p.invoice.patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.invoice.invoiceNumber} · {p.method}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          p.isRefund ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {p.isRefund ? "-" : "+"}
                        {formatCurrency(p.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.invoicesSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoices yet
              </p>
            ) : (
              <div className="space-y-3">
                {stats.invoicesSummary.map((group: any) => {
                  const statusColors: Record<string, string> = {
                    DRAFT: "bg-gray-100 text-gray-700",
                    SENT: "bg-blue-100 text-blue-700",
                    PARTIALLY_PAID: "bg-amber-100 text-amber-700",
                    PAID: "bg-green-100 text-green-700",
                    OVERDUE: "bg-red-100 text-red-700",
                    CANCELLED: "bg-gray-100 text-gray-500",
                    REFUNDED: "bg-purple-100 text-purple-700",
                  };

                  return (
                    <div
                      key={group.status}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            statusColors[group.status] ??
                            "bg-gray-100 text-gray-700"
                          }
                        >
                          {group.status.replace("_", " ")}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {group._count.id} invoice
                          {group._count.id !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(group._sum.total ?? 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {stats.overdueInvoices > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                {stats.overdueInvoices} overdue invoice
                {stats.overdueInvoices !== 1 ? "s" : ""} totalling{" "}
                {formatCurrency(stats.outstandingTotal)}
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Follow up with patients to collect outstanding payments
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="text-xs text-red-700 font-medium hover:underline"
            >
              View →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
