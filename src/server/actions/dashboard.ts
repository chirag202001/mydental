/* ────────────────────────────────────────────────────────────────
   Role-specific dashboard data fetchers.
   Each role gets a tailored view with only the data they need.
   ──────────────────────────────────────────────────────────────── */

import { db } from "@/lib/db";
import { requireTenantContext, type TenantContext } from "@/lib/tenant";

// ─── Helper: Date ranges ──────────────────────────────────────
function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function monthRange() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ─── Owner / Admin Dashboard ──────────────────────────────────
export async function getOwnerDashboardStats() {
  const ctx = await requireTenantContext();
  const { start: todayStart, end: todayEnd } = todayRange();
  const { start: monthStart, end: monthEnd } = monthRange();

  const [
    totalPatients,
    todayAppointments,
    monthRevenue,
    pendingInvoices,
    totalMembers,
    todaySchedule,
    recentPatients,
    monthAppointments,
    completedToday,
  ] = await Promise.all([
    db.patient.count({ where: { clinicId: ctx.clinicId } }),
    db.appointment.count({
      where: {
        clinicId: ctx.clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
      },
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: {
        invoice: { clinicId: ctx.clinicId },
        createdAt: { gte: monthStart, lte: monthEnd },
        isRefund: false,
      },
    }),
    db.invoice.count({
      where: {
        clinicId: ctx.clinicId,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      },
    }),
    db.clinicMember.count({
      where: { clinicId: ctx.clinicId, isActive: true },
    }),
    db.appointment.findMany({
      where: {
        clinicId: ctx.clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
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
      take: 10,
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
    db.appointment.count({
      where: {
        clinicId: ctx.clinicId,
        startTime: { gte: monthStart, lte: monthEnd },
      },
    }),
    db.appointment.count({
      where: {
        clinicId: ctx.clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
        status: "COMPLETED",
      },
    }),
  ]);

  return {
    totalPatients,
    todayAppointments,
    monthRevenue: monthRevenue._sum.amount ?? 0,
    pendingInvoices,
    totalMembers,
    todaySchedule,
    recentPatients,
    monthAppointments,
    completedToday,
  };
}

// ─── Dentist Dashboard ────────────────────────────────────────
export async function getDentistDashboardStats() {
  const ctx = await requireTenantContext();
  const { start: todayStart, end: todayEnd } = todayRange();
  const { start: monthStart, end: monthEnd } = monthRange();

  // Find this user's dentist profile
  const membership = await db.clinicMember.findFirst({
    where: { clinicId: ctx.clinicId, userId: ctx.userId, isActive: true },
    include: { dentistProfile: true },
  });

  const dentistProfileId = membership?.dentistProfile?.id ?? null;

  const appointmentWhere = dentistProfileId
    ? {
        clinicId: ctx.clinicId,
        dentistProfileId,
        startTime: { gte: todayStart, lte: todayEnd },
      }
    : {
        clinicId: ctx.clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
      };

  const [
    myTodayAppointments,
    myTodaySchedule,
    myMonthCompleted,
    myTotalPatients,
    pendingTreatments,
  ] = await Promise.all([
    db.appointment.count({ where: appointmentWhere }),
    db.appointment.findMany({
      where: appointmentWhere,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: { startTime: "asc" },
    }),
    db.appointment.count({
      where: {
        ...appointmentWhere,
        startTime: { gte: monthStart, lte: monthEnd },
        status: "COMPLETED",
      },
    }),
    dentistProfileId
      ? db.appointment
          .findMany({
            where: { clinicId: ctx.clinicId, dentistProfileId },
            select: { patientId: true },
            distinct: ["patientId"],
          })
          .then((r) => r.length)
      : db.patient.count({ where: { clinicId: ctx.clinicId } }),
    db.treatmentPlan.findMany({
      where: {
        clinicId: ctx.clinicId,
        status: { in: ["DRAFT", "PROPOSED", "IN_PROGRESS"] },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        items: { select: { procedure: true, status: true, cost: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const completedToday = myTodaySchedule.filter(
    (a) => a.status === "COMPLETED"
  ).length;
  const inProgressToday = myTodaySchedule.filter(
    (a) => a.status === "IN_TREATMENT"
  ).length;

  return {
    myTodayAppointments,
    myTodaySchedule,
    myMonthCompleted,
    myTotalPatients,
    pendingTreatments,
    completedToday,
    inProgressToday,
  };
}

// ─── Reception Dashboard ──────────────────────────────────────
export async function getReceptionDashboardStats() {
  const ctx = await requireTenantContext();
  const { start: todayStart, end: todayEnd } = todayRange();

  const [
    todayAppointments,
    todaySchedule,
    arrivedCount,
    newPatientsToday,
    recentRegistrations,
    upcomingAppointments,
  ] = await Promise.all([
    db.appointment.count({
      where: {
        clinicId: ctx.clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
      },
    }),
    db.appointment.findMany({
      where: {
        clinicId: ctx.clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
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
    db.appointment.count({
      where: {
        clinicId: ctx.clinicId,
        startTime: { gte: todayStart, lte: todayEnd },
        status: { in: ["ARRIVED", "IN_TREATMENT", "COMPLETED"] },
      },
    }),
    db.patient.count({
      where: {
        clinicId: ctx.clinicId,
        createdAt: { gte: todayStart, lte: todayEnd },
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
        startTime: { gt: todayEnd },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
  ]);

  const waitingCount = todaySchedule.filter(
    (a) => a.status === "ARRIVED"
  ).length;
  const completedCount = todaySchedule.filter(
    (a) => a.status === "COMPLETED"
  ).length;

  return {
    todayAppointments,
    todaySchedule,
    arrivedCount,
    waitingCount,
    completedCount,
    newPatientsToday,
    recentRegistrations,
    upcomingAppointments,
  };
}

// ─── Assistant Dashboard ──────────────────────────────────────
export async function getAssistantDashboardStats() {
  const ctx = await requireTenantContext();
  const { start: todayStart, end: todayEnd } = todayRange();

  const [todaySchedule, allInventoryItems, totalPatients, upcomingAppointments] =
    await Promise.all([
      db.appointment.findMany({
        where: {
          clinicId: ctx.clinicId,
          startTime: { gte: todayStart, lte: todayEnd },
        },
        include: {
          patient: {
            select: { firstName: true, lastName: true },
          },
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
      // Fetch inventory items and filter in JS (Prisma doesn't support field-to-field comparison)
      db.inventoryItem.findMany({
        where: { clinicId: ctx.clinicId },
        select: {
          id: true,
          name: true,
          currentStock: true,
          minStock: true,
          unit: true,
          category: true,
        },
        orderBy: { currentStock: "asc" },
      }),
      db.patient.count({ where: { clinicId: ctx.clinicId } }),
      db.appointment.count({
        where: {
          clinicId: ctx.clinicId,
          startTime: { gt: todayEnd },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
      }),
    ]);

  // Filter low stock items in JS
  const lowStockItems = allInventoryItems
    .filter((item) => item.currentStock <= item.minStock)
    .slice(0, 10);

  return {
    todaySchedule,
    lowStockItems,
    totalPatients,
    upcomingAppointments,
    todayAppointmentCount: todaySchedule.length,
    inTreatmentCount: todaySchedule.filter((a) => a.status === "IN_TREATMENT")
      .length,
  };
}

// ─── Accountant Dashboard ─────────────────────────────────────
export async function getAccountantDashboardStats() {
  const ctx = await requireTenantContext();
  const { start: monthStart, end: monthEnd } = monthRange();
  const { start: todayStart, end: todayEnd } = todayRange();

  const [
    monthRevenue,
    todayRevenue,
    pendingInvoices,
    overdueInvoices,
    totalOutstanding,
    recentPayments,
    invoicesSummary,
  ] = await Promise.all([
    db.payment.aggregate({
      _sum: { amount: true },
      where: {
        invoice: { clinicId: ctx.clinicId },
        createdAt: { gte: monthStart, lte: monthEnd },
        isRefund: false,
      },
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: {
        invoice: { clinicId: ctx.clinicId },
        createdAt: { gte: todayStart, lte: todayEnd },
        isRefund: false,
      },
    }),
    db.invoice.count({
      where: {
        clinicId: ctx.clinicId,
        status: { in: ["SENT", "PARTIALLY_PAID"] },
      },
    }),
    db.invoice.count({
      where: { clinicId: ctx.clinicId, status: "OVERDUE" },
    }),
    db.invoice.aggregate({
      _sum: { total: true, paidAmount: true },
      where: {
        clinicId: ctx.clinicId,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      },
    }),
    db.payment.findMany({
      where: { invoice: { clinicId: ctx.clinicId } },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            patient: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.invoice.groupBy({
      by: ["status"],
      where: { clinicId: ctx.clinicId },
      _count: { id: true },
      _sum: { total: true },
    }),
  ]);

  const outstandingTotal =
    (totalOutstanding._sum.total ?? 0) -
    (totalOutstanding._sum.paidAmount ?? 0);

  return {
    monthRevenue: monthRevenue._sum.amount ?? 0,
    todayRevenue: todayRevenue._sum.amount ?? 0,
    pendingInvoices,
    overdueInvoices,
    outstandingTotal,
    recentPayments,
    invoicesSummary,
  };
}
