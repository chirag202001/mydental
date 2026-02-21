"use server";

import { db } from "@/lib/db";
import { requireTenantContext, requirePermissions } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";

// ─── Dashboard Stats ────────────────────────────────────────────

export async function getDashboardStats() {
  const ctx = await requireTenantContext();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    totalPatients,
    todayAppointments,
    monthAppointments,
    monthRevenue,
    pendingInvoices,
    recentPatients,
    todaySchedule,
  ] = await Promise.all([
    db.patient.count({ where: { clinicId: ctx.clinicId } }),
    db.appointment.count({
      where: {
        clinicId: ctx.clinicId,
        startTime: { gte: startOfDay, lt: endOfDay },
      },
    }),
    db.appointment.count({
      where: {
        clinicId: ctx.clinicId,
        startTime: { gte: startOfMonth, lt: endOfMonth },
      },
    }),
    db.payment.aggregate({
      where: {
        invoice: { clinicId: ctx.clinicId },
        createdAt: { gte: startOfMonth, lt: endOfMonth },
        isRefund: false,
      },
      _sum: { amount: true },
    }),
    db.invoice.count({
      where: {
        clinicId: ctx.clinicId,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      },
    }),
    db.patient.findMany({
      where: { clinicId: ctx.clinicId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
      },
    }),
    db.appointment.findMany({
      where: {
        clinicId: ctx.clinicId,
        startTime: { gte: startOfDay, lt: endOfDay },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        dentistProfile: {
          include: {
            clinicMember: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  return {
    totalPatients,
    todayAppointments,
    monthAppointments,
    monthRevenue: monthRevenue._sum.amount ?? 0,
    pendingInvoices,
    recentPatients,
    todaySchedule,
  };
}

// ─── Revenue Report ─────────────────────────────────────────────

export async function getRevenueReport(params?: {
  from?: string;
  to?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.REPORTS_READ]);

  const from = params?.from
    ? new Date(params.from)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = params?.to
    ? new Date(params.to + "T23:59:59")
    : new Date();

  const payments = await db.payment.findMany({
    where: {
      invoice: { clinicId: ctx.clinicId },
      createdAt: { gte: from, lte: to },
    },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          patient: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalCollection = payments
    .filter((p) => !p.isRefund)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRefunds = payments
    .filter((p) => p.isRefund)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    payments,
    totalCollection,
    totalRefunds,
    netRevenue: totalCollection - totalRefunds,
  };
}

// ─── Daily Collection Report ────────────────────────────────────

export async function getDailyCollectionReport(params?: {
  from?: string;
  to?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.REPORTS_READ]);

  const now = new Date();
  const from = params?.from
    ? new Date(params.from)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = params?.to
    ? new Date(params.to + "T23:59:59")
    : new Date();

  const payments = await db.payment.findMany({
    where: {
      invoice: { clinicId: ctx.clinicId },
      createdAt: { gte: from, lte: to },
    },
    select: {
      amount: true,
      isRefund: true,
      method: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const dailyMap = new Map<
    string,
    { date: string; collection: number; refunds: number; net: number; count: number }
  >();

  for (const p of payments) {
    const dateKey = p.createdAt.toISOString().split("T")[0];
    const entry = dailyMap.get(dateKey) || {
      date: dateKey,
      collection: 0,
      refunds: 0,
      net: 0,
      count: 0,
    };
    if (p.isRefund) {
      entry.refunds += p.amount;
    } else {
      entry.collection += p.amount;
      entry.count += 1;
    }
    entry.net = entry.collection - entry.refunds;
    dailyMap.set(dateKey, entry);
  }

  // Group by method
  const methodMap = new Map<string, number>();
  for (const p of payments) {
    if (!p.isRefund) {
      methodMap.set(p.method, (methodMap.get(p.method) || 0) + p.amount);
    }
  }

  return {
    daily: Array.from(dailyMap.values()),
    byMethod: Array.from(methodMap.entries()).map(([method, amount]) => ({
      method,
      amount,
    })),
    totalCollection: payments
      .filter((p) => !p.isRefund)
      .reduce((s, p) => s + p.amount, 0),
    totalRefunds: payments
      .filter((p) => p.isRefund)
      .reduce((s, p) => s + p.amount, 0),
  };
}

// ─── Outstanding Report ─────────────────────────────────────────

export async function getOutstandingReport() {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.REPORTS_READ]);

  const invoices = await db.invoice.findMany({
    where: {
      clinicId: ctx.clinicId,
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const items = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    patient: inv.patient,
    total: inv.total,
    paidAmount: inv.paidAmount,
    balance: inv.total - inv.paidAmount,
    status: inv.status,
    dueDate: inv.dueDate,
    createdAt: inv.createdAt,
    daysOverdue: inv.dueDate
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(inv.dueDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null,
  }));

  const totalOutstanding = items.reduce((sum, i) => sum + i.balance, 0);
  const overdueAmount = items
    .filter((i) => i.status === "OVERDUE" || (i.daysOverdue && i.daysOverdue > 0))
    .reduce((sum, i) => sum + i.balance, 0);

  return {
    invoices: items,
    totalOutstanding,
    overdueAmount,
    count: items.length,
  };
}

// ─── Dentist Revenue Report ─────────────────────────────────────

export async function getDentistRevenueReport(params?: {
  from?: string;
  to?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.REPORTS_READ]);

  const now = new Date();
  const from = params?.from
    ? new Date(params.from)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = params?.to
    ? new Date(params.to + "T23:59:59")
    : new Date();

  // Get completed treatment items within date range with their dentist assignments
  const completedItems = await db.treatmentItem.findMany({
    where: {
      status: "COMPLETED",
      completedDate: { gte: from, lte: to },
      treatmentPlan: { clinicId: ctx.clinicId },
    },
    select: {
      cost: true,
      discount: true,
      dentistId: true,
      procedure: true,
    },
  });

  // Get all clinic dentists
  const dentists = await db.dentistProfile.findMany({
    where: { clinicMember: { clinicId: ctx.clinicId, isActive: true } },
    select: {
      id: true,
      clinicMember: { select: { user: { select: { name: true } } } },
    },
  });

  // Also get completed appointments per dentist
  const appointments = await db.appointment.findMany({
    where: {
      clinicId: ctx.clinicId,
      status: "COMPLETED",
      startTime: { gte: from, lte: to },
      dentistProfileId: { not: null },
    },
    select: {
      dentistProfileId: true,
    },
  });

  const dentistMap = new Map<
    string,
    {
      name: string;
      revenue: number;
      procedureCount: number;
      appointmentCount: number;
    }
  >();

  for (const d of dentists) {
    dentistMap.set(d.id, {
      name: d.clinicMember.user.name || "Unknown",
      revenue: 0,
      procedureCount: 0,
      appointmentCount: 0,
    });
  }

  for (const item of completedItems) {
    if (item.dentistId && dentistMap.has(item.dentistId)) {
      const entry = dentistMap.get(item.dentistId)!;
      entry.revenue += item.cost - item.discount;
      entry.procedureCount += 1;
    }
  }

  // Unassigned revenue
  let unassignedRevenue = 0;
  let unassignedCount = 0;
  for (const item of completedItems) {
    if (!item.dentistId || !dentistMap.has(item.dentistId)) {
      unassignedRevenue += item.cost - item.discount;
      unassignedCount += 1;
    }
  }

  // Appointment counts
  for (const apt of appointments) {
    if (apt.dentistProfileId && dentistMap.has(apt.dentistProfileId)) {
      dentistMap.get(apt.dentistProfileId)!.appointmentCount += 1;
    }
  }

  const dentistData = Array.from(dentistMap.entries()).map(([id, data]) => ({
    id,
    ...data,
  }));

  return {
    dentists: dentistData.sort((a, b) => b.revenue - a.revenue),
    unassigned: { revenue: unassignedRevenue, count: unassignedCount },
    totalRevenue:
      dentistData.reduce((s, d) => s + d.revenue, 0) + unassignedRevenue,
  };
}

// ─── Appointment Utilization Report ─────────────────────────────

export async function getAppointmentUtilization(params?: {
  from?: string;
  to?: string;
}) {
  const ctx = await requireTenantContext();
  requirePermissions(ctx, [PERMISSIONS.REPORTS_READ]);

  const now = new Date();
  const from = params?.from
    ? new Date(params.from)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = params?.to
    ? new Date(params.to + "T23:59:59")
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const statusGroups = await db.appointment.groupBy({
    by: ["status"],
    where: {
      clinicId: ctx.clinicId,
      startTime: { gte: from, lt: to },
    },
    _count: true,
  });

  const typeGroups = await db.appointment.groupBy({
    by: ["type"],
    where: {
      clinicId: ctx.clinicId,
      startTime: { gte: from, lt: to },
    },
    _count: true,
  });

  // Hourly distribution
  const appointments = await db.appointment.findMany({
    where: {
      clinicId: ctx.clinicId,
      startTime: { gte: from, lt: to },
    },
    select: { startTime: true },
  });

  const hourlyMap = new Map<number, number>();
  for (const apt of appointments) {
    const hour = new Date(apt.startTime).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  }

  // Daily distribution (day of week)
  const dayMap = new Map<number, number>();
  for (const apt of appointments) {
    const day = new Date(apt.startTime).getDay();
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const totalAppointments = statusGroups.reduce((s, g) => s + g._count, 0);
  const completedCount =
    statusGroups.find((g) => g.status === "COMPLETED")?._count || 0;
  const noShowCount =
    statusGroups.find((g) => g.status === "NO_SHOW")?._count || 0;
  const cancelledCount =
    statusGroups.find((g) => g.status === "CANCELLED")?._count || 0;

  return {
    byStatus: statusGroups.map((g) => ({
      status: g.status,
      count: g._count,
    })),
    byType: typeGroups
      .filter((g) => g.type)
      .map((g) => ({
        type: g.type || "Other",
        count: g._count,
      })),
    byHour: Array.from(hourlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, count]) => ({
        hour: `${hour.toString().padStart(2, "0")}:00`,
        count,
      })),
    byDay: Array.from(dayMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, count]) => ({
        day: dayNames[day],
        count,
      })),
    total: totalAppointments,
    completed: completedCount,
    noShow: noShowCount,
    cancelled: cancelledCount,
    completionRate:
      totalAppointments > 0
        ? Math.round((completedCount / totalAppointments) * 100)
        : 0,
    noShowRate:
      totalAppointments > 0
        ? Math.round((noShowCount / totalAppointments) * 100)
        : 0,
  };
}
