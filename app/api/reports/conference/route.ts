import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES, EVENT_BOOKING_STATUS, PAYMENT_STATUS, EXPENSE_STATUS, DEPARTMENT } from "@/constants";
import EventBooking from "@/models/event/EventBooking";
import EventBookingPayment from "@/models/event/EventBookingPayment";
import EventHall from "@/models/event/EventHall";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import {
  getExpenseModelForDepartment,
  getPaymentModelForDepartment,
} from "@/lib/department-ledger";

type Row = Record<string, unknown>;

function daysBetween(start: Date, end: Date): number {
  const ms = Math.max(0, end.getTime() - start.getTime());
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.EVENT_MANAGER,
      USER_ROLES.SALES_OFFICER,
      USER_ROLES.OPERATIONS_COORDINATOR,
      USER_ROLES.EVENT_COORDINATOR,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const sp = req.nextUrl.searchParams;

    const now = new Date();
    const startDate = sp.get("startDate")
      ? new Date(sp.get("startDate")!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = sp.get("endDate")
      ? new Date(sp.get("endDate")!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const branchOid = new mongoose.Types.ObjectId(branchId);

    const paymentModel = getPaymentModelForDepartment(DEPARTMENT.CONFERENCE);
    const expenseModel = getExpenseModelForDepartment(DEPARTMENT.CONFERENCE);

    const [bookings, halls, incomeTotals, expenseTotals, eventPaymentTotals] = await Promise.all([
      EventBooking.find({
        tenantId: tenantOid,
        branchId: branchOid,
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      } as Row)
        .select(
          "bookingReference title eventType status eventHallId startDate endDate totalRevenue totalExpenses netProfit outstandingAmount quotedPrice agreedPrice billingLineItems expenseLineItems budgetedCost commissionRate commissionAmount salesAgentId"
        )
        .lean(),
      EventHall.find({ tenantId: tenantOid, branchId: branchOid } as Row)
        .select("name")
        .lean(),
      paymentModel.aggregate([
        {
          $match: {
            tenantId: tenantOid,
            branchId: branchOid,
            department: DEPARTMENT.CONFERENCE,
            status: PAYMENT_STATUS.SUCCESS,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, totalIncome: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      expenseModel.aggregate([
        {
          $match: {
            tenantId: tenantOid,
            branchId: branchOid,
            department: DEPARTMENT.CONFERENCE,
            status: EXPENSE_STATUS.APPROVED,
            date: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, totalExpenses: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      EventBookingPayment.aggregate([
        {
          $match: {
            tenantId: tenantOid,
            branchId: branchOid,
            paidAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, totalIncome: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
    ]);

    const hallNameById = new Map(halls.map((h) => [String(h._id), h.name ?? "Unknown Hall"]));

    const eventRows = bookings.map((booking) => {
      const revenueFromLines =
        (booking.billingLineItems as Array<{ amount?: number }> | undefined)?.reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0
        ) ?? 0;
      const revenue =
        Number(booking.totalRevenue ?? 0) ||
        revenueFromLines ||
        Number(booking.agreedPrice ?? booking.quotedPrice ?? 0);
      const expenseFromLines =
        (booking.expenseLineItems as Array<{ amount?: number }> | undefined)?.reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0
        ) ?? 0;
      const expenses = Number(booking.totalExpenses ?? 0) || expenseFromLines;
      const profit = Number(booking.netProfit ?? revenue - expenses);
      const outstanding = Number(
        booking.outstandingAmount ?? Math.max(0, revenue - Number(booking.agreedPrice ?? booking.quotedPrice ?? 0))
      );
      return {
        id: String(booking._id),
        bookingReference: booking.bookingReference ?? "",
        title: booking.title ?? "Event",
        status: booking.status ?? "",
        eventType: booking.eventType ?? "",
        hallId: booking.eventHallId ? String(booking.eventHallId) : "",
        hallName: hallNameById.get(String(booking.eventHallId)) ?? "Unknown Hall",
        startDate: booking.startDate,
        endDate: booking.endDate,
        revenue: Math.round(revenue * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        outstanding: Math.round(outstanding * 100) / 100,
      };
    });

    const cancelledEvents = eventRows.filter(
      (row) => row.status === EVENT_BOOKING_STATUS.CANCELLED
    );
    const revenuePerEvent = [...eventRows].sort((a, b) => b.revenue - a.revenue);
    const profitPerEvent = [...eventRows].sort((a, b) => b.profit - a.profit);
    const outstandingPayments = eventRows
      .filter((row) => row.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);

    const hallAgg = new Map<
      string,
      { hallName: string; bookings: number; revenue: number; bookedDays: number }
    >();
    for (const row of eventRows) {
      const key = row.hallId || "unknown";
      const existing = hallAgg.get(key) ?? {
        hallName: row.hallName,
        bookings: 0,
        revenue: 0,
        bookedDays: 0,
      };
      if (row.status !== EVENT_BOOKING_STATUS.CANCELLED) {
        existing.bookings += 1;
        existing.revenue += row.revenue;
        existing.bookedDays += daysBetween(new Date(String(row.startDate)), new Date(String(row.endDate)));
      }
      hallAgg.set(key, existing);
    }
    const periodDays = daysBetween(startDate, endDate);
    const hallReports = Array.from(hallAgg.entries()).map(([hallId, row]) => ({
      hallId,
      hallName: row.hallName,
      bookingCount: row.bookings,
      revenue: Math.round(row.revenue * 100) / 100,
      utilizationRate: Math.round((row.bookedDays / periodDays) * 10000) / 100,
    }));
    const mostBookedHall = [...hallReports].sort(
      (a, b) => b.bookingCount - a.bookingCount
    )[0] ?? null;

    const revenueByEventTypeMap = new Map<string, number>();
    for (const row of eventRows) {
      const key = String(row.eventType || "other");
      revenueByEventTypeMap.set(key, (revenueByEventTypeMap.get(key) ?? 0) + row.revenue);
    }
    const revenueByEventType = Array.from(revenueByEventTypeMap.entries()).map(
      ([eventType, revenue]) => ({
        eventType,
        revenue: Math.round(revenue * 100) / 100,
      })
    );

    const totalRevenueEvents = eventRows.reduce((sum, row) => sum + row.revenue, 0);
    const totalExpensesEvents = eventRows.reduce((sum, row) => sum + row.expenses, 0);
    const departmentNetProfit = totalRevenueEvents - totalExpensesEvents;

    const invoiceIncome = incomeTotals[0] ?? { totalIncome: 0, count: 0 };
    const eventIncome = eventPaymentTotals[0] ?? { totalIncome: 0, count: 0 };
    const incomeLedger = {
      totalIncome: Number(invoiceIncome.totalIncome ?? 0) + Number(eventIncome.totalIncome ?? 0),
      count: Number(invoiceIncome.count ?? 0) + Number(eventIncome.count ?? 0),
    };
    const expenseLedger = expenseTotals[0] ?? { totalExpenses: 0, count: 0 };

    const averagePerEvent =
      eventRows.length > 0 ? totalRevenueEvents / eventRows.length : 0;
    const remainingDays = Math.max(1, daysBetween(now, endDate));
    const revenueProjection = Math.round((averagePerEvent / periodDays) * (periodDays + remainingDays) * 100) / 100;

    const budgetVsActual = bookings.map((booking) => {
      const budget = Number(booking.budgetedCost ?? 0);
      const actual = Number(booking.totalExpenses ?? 0);
      return {
        bookingReference: booking.bookingReference ?? "",
        title: booking.title ?? "Event",
        budgetedCost: Math.round(budget * 100) / 100,
        actualCost: Math.round(actual * 100) / 100,
        variance: Math.round((budget - actual) * 100) / 100,
      };
    });

    const commissionTracking = bookings
      .filter((booking) => Number(booking.commissionRate ?? 0) > 0 || Number(booking.commissionAmount ?? 0) > 0)
      .map((booking) => {
        const revenue = Number(
          booking.totalRevenue ?? booking.agreedPrice ?? booking.quotedPrice ?? 0
        );
        const commissionRate = Number(booking.commissionRate ?? 0);
        const commissionAmount = Number(
          booking.commissionAmount ??
            (commissionRate > 0 ? (revenue * commissionRate) / 100 : 0)
        );
        return {
          bookingReference: booking.bookingReference ?? "",
          title: booking.title ?? "Event",
          salesAgentId: booking.salesAgentId ? String(booking.salesAgentId) : "",
          revenue: Math.round(revenue * 100) / 100,
          commissionRate: Math.round(commissionRate * 100) / 100,
          commissionAmount: Math.round(commissionAmount * 100) / 100,
        };
      });

    const format = (sp.get("format") ?? "").toLowerCase();
    if (format === "csv") {
      const header = [
        "BookingReference",
        "Title",
        "Status",
        "EventType",
        "Revenue",
        "Expenses",
        "Profit",
        "Outstanding",
        "BudgetedCost",
        "ActualCost",
        "Variance",
        "CommissionRate",
        "CommissionAmount",
      ];
      const rows = bookings.map((booking) => {
        const row = eventRows.find((ev) => ev.bookingReference === booking.bookingReference);
        const budgetRow = budgetVsActual.find((b) => b.bookingReference === booking.bookingReference);
        const commission = commissionTracking.find((c) => c.bookingReference === booking.bookingReference);
        return [
          booking.bookingReference ?? "",
          booking.title ?? "",
          booking.status ?? "",
          booking.eventType ?? "",
          row?.revenue ?? 0,
          row?.expenses ?? 0,
          row?.profit ?? 0,
          row?.outstanding ?? 0,
          budgetRow?.budgetedCost ?? 0,
          budgetRow?.actualCost ?? 0,
          budgetRow?.variance ?? 0,
          commission?.commissionRate ?? 0,
          commission?.commissionAmount ?? 0,
        ]
          .map(escapeCsv)
          .join(",");
      });
      const filename = `conference-report-${startDate.toISOString().slice(0, 10)}-to-${endDate
        .toISOString()
        .slice(0, 10)}.csv`;
      return new NextResponse([header.join(","), ...rows].join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      eventReports: {
        revenuePerEvent,
        profitPerEvent,
        outstandingPayments,
        cancelledEvents,
      },
      hallReports: {
        utilization: hallReports,
        mostBookedHall,
        revenuePerHall: hallReports.map((row) => ({
          hallId: row.hallId,
          hallName: row.hallName,
          revenue: row.revenue,
        })),
      },
      departmentReports: {
        totalEventRevenue: Math.round(totalRevenueEvents * 100) / 100,
        totalEventExpenses: Math.round(totalExpensesEvents * 100) / 100,
        netDepartmentProfit: Math.round(departmentNetProfit * 100) / 100,
        revenueByEventType,
      },
      ledgers: {
        incomeLedger: {
          totalIncome: Math.round(Number(incomeLedger.totalIncome ?? 0) * 100) / 100,
          count: Number(incomeLedger.count ?? 0),
        },
        expenseLedger: {
          totalExpenses:
            Math.round(Number(expenseLedger.totalExpenses ?? 0) * 100) / 100,
          count: Number(expenseLedger.count ?? 0),
        },
      },
      enterpriseInsights: {
        eventForecasting: {
          averageRevenuePerEvent: Math.round(averagePerEvent * 100) / 100,
          projectedRevenue: revenueProjection,
        },
        occupancyHeatmap: hallReports.map((row) => ({
          hallName: row.hallName,
          utilizationRate: row.utilizationRate,
        })),
      },
      budgetVsActual,
      commissionTracking,
    });
  },
  { auth: true }
);
