import {
  getRevenueReport,
  getDailyCollectionReport,
  getOutstandingReport,
  getDentistRevenueReport,
  getAppointmentUtilization,
} from "@/server/actions/reports";
import { requireTenantContext, hasPermissions } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
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
import { formatCurrency } from "@/lib/utils";
import {
  IndianRupee,
  Calendar,
  AlertTriangle,
  UserCheck,
  Activity,
  ShieldAlert,
} from "lucide-react";

const TABS = [
  { key: "revenue", label: "Revenue", icon: IndianRupee },
  { key: "daily", label: "Daily Collection", icon: Calendar },
  { key: "outstanding", label: "Outstanding", icon: AlertTriangle },
  { key: "dentist", label: "Dentist Revenue", icon: UserCheck },
  { key: "utilization", label: "Utilization", icon: Activity },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>;
}) {
  const ctx = await requireTenantContext();

  // Require reports:read permission
  if (!hasPermissions(ctx, [PERMISSIONS.REPORTS_READ])) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6 flex items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Access Denied</p>
              <p className="text-sm text-amber-700 mt-1">
                You don&apos;t have permission to view reports. Contact your
                clinic owner or admin for access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sp = await searchParams;
  const activeTab = (sp.tab as Tab) || "revenue";
  const from = sp.from;
  const to = sp.to;
  const dateParams = { from, to };

  // Fetch data based on active tab
  let revenue: any = null;
  let daily: any = null;
  let outstanding: any = null;
  let dentist: any = null;
  let utilization: any = null;

  switch (activeTab) {
    case "revenue":
      revenue = await getRevenueReport(dateParams);
      break;
    case "daily":
      daily = await getDailyCollectionReport(dateParams);
      break;
    case "outstanding":
      outstanding = await getOutstandingReport();
      break;
    case "dentist":
      dentist = await getDentistRevenueReport(dateParams);
      break;
    case "utilization":
      utilization = await getAppointmentUtilization(dateParams);
      break;
  }

  function tabUrl(tab: string) {
    const p = new URLSearchParams();
    p.set("tab", tab);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return `/dashboard/reports?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <Link key={t.key} href={tabUrl(t.key)}>
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="text-xs"
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {t.label}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Date range filter (for tabs that support it) */}
      {activeTab !== "outstanding" && (
        <form className="flex gap-2 items-end flex-wrap">
          <input type="hidden" name="tab" value={activeTab} />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <input
              type="date"
              name="from"
              defaultValue={from || ""}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="date"
              name="to"
              defaultValue={to || ""}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Apply
          </Button>
          {(from || to) && (
            <Link href={tabUrl(activeTab)}>
              <Button type="button" size="sm" variant="ghost">
                Clear
              </Button>
            </Link>
          )}
        </form>
      )}

      {/* ─── Revenue Tab ─── */}
      {activeTab === "revenue" && revenue && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  Total Collection
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(revenue.totalCollection)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Refunds</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(revenue.totalRefunds)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Net Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(revenue.netRevenue)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent payments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.payments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        No payments recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    revenue.payments.slice(0, 25).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/billing/${p.invoice.id}`}
                            className="text-primary hover:underline"
                          >
                            {p.invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {p.invoice.patient.firstName}{" "}
                          {p.invoice.patient.lastName}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            p.isRefund ? "text-red-600" : ""
                          }`}
                        >
                          {p.isRefund ? "−" : ""}
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell>{p.method.replace("_", " ")}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Daily Collection Tab ─── */}
      {activeTab === "daily" && daily && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  Total Collection
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(daily.totalCollection)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Refunds</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(daily.totalRefunds)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Days with Activity</p>
                <p className="text-2xl font-bold">{daily.daily.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* By payment method */}
          {daily.byMethod && Object.keys(daily.byMethod).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">By Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {Object.entries(daily.byMethod).map(([method, amount]: any) => (
                    <div
                      key={method}
                      className="text-center p-3 rounded-lg border"
                    >
                      <p className="text-lg font-bold">
                        {formatCurrency(amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {method.replace("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Collection</TableHead>
                    <TableHead className="text-right">Refunds</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Txns</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daily.daily.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        No data for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    daily.daily.map((d: any) => (
                      <TableRow key={d.date}>
                        <TableCell className="font-medium">
                          {new Date(d.date).toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(d.collection)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {d.refunds > 0
                            ? `−${formatCurrency(d.refunds)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(d.net)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {d.count}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Outstanding Tab ─── */}
      {activeTab === "outstanding" && outstanding && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  Total Outstanding
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(outstanding.totalOutstanding)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Overdue Amount</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(outstanding.overdueAmount)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  Outstanding Invoices
                </p>
                <p className="text-2xl font-bold">{outstanding.count}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstanding.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        No outstanding invoices
                      </TableCell>
                    </TableRow>
                  ) : (
                    outstanding.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/billing/${item.id}`}
                            className="text-primary hover:underline"
                          >
                            {item.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {item.patient.firstName} {item.patient.lastName}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(item.balance)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "OVERDUE"
                                ? "destructive"
                                : "warning"
                            }
                          >
                            {item.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.daysOverdue > 0 ? (
                            <span className="text-red-600 font-medium">
                              {item.daysOverdue}d
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Dentist Revenue Tab ─── */}
      {activeTab === "dentist" && dentist && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  Total Treatment Revenue
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(dentist.totalRevenue)}
                </p>
              </CardContent>
            </Card>
            {dentist.unassigned > 0 && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">
                    Unassigned Revenue
                  </p>
                  <p className="text-2xl font-bold text-muted-foreground">
                    {formatCurrency(dentist.unassigned)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue by Dentist</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dentist</TableHead>
                    <TableHead className="text-right">
                      Treatment Revenue
                    </TableHead>
                    <TableHead className="text-right">Appointments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dentist.dentists.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground py-8"
                      >
                        No data for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    dentist.dentists.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(d.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {d.appointments}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Utilization Tab ─── */}
      {activeTab === "utilization" && utilization && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{utilization.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {utilization.completed}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {utilization.noShow}
                </p>
                <p className="text-xs text-muted-foreground">No Show</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {utilization.completionRate}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Completion Rate
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {utilization.noShowRate}%
                </p>
                <p className="text-xs text-muted-foreground">No-Show Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* By status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {utilization.byStatus?.map((s: any) => (
                  <div
                    key={s.status}
                    className="text-center p-3 rounded-lg border"
                  >
                    <p className="text-xl font-bold">{s.count}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.status.replace("_", " ")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By type */}
          {utilization.byType && utilization.byType.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">By Appointment Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {utilization.byType.map((t: any) => (
                    <div
                      key={t.type}
                      className="text-center p-3 rounded-lg border"
                    >
                      <p className="text-xl font-bold">{t.count}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {t.type.replace("_", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* By hour */}
          {utilization.byHour && utilization.byHour.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hourly Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 items-end h-32">
                  {utilization.byHour.map((h: any) => {
                    const max = Math.max(
                      ...utilization.byHour.map((x: any) => x.count)
                    );
                    const pct = max > 0 ? (h.count / max) * 100 : 0;
                    return (
                      <div
                        key={h.hour}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <span className="text-[10px] text-muted-foreground">
                          {h.count}
                        </span>
                        <div
                          className="w-full bg-primary/80 rounded-t"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {h.hour}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* By day of week */}
          {utilization.byDay && utilization.byDay.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">By Day of Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {utilization.byDay.map((d: any) => (
                    <div
                      key={d.day}
                      className="text-center p-3 rounded-lg border"
                    >
                      <p className="text-xl font-bold">{d.count}</p>
                      <p className="text-xs text-muted-foreground">{d.day}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
