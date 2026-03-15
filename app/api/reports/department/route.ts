import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES, DEPARTMENT, EXPENSE_STATUS, PAYMENT_STATUS } from "@/constants";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  getExpenseModelsForQuery,
  getPaymentModelsForQuery,
} from "@/lib/department-ledger";
import { getInvoiceModelsForQuery } from "@/lib/department-invoice";
import EventBookingPayment from "@/models/event/EventBookingPayment";
import PoolBookingPayment from "@/models/pool/PoolBookingPayment";
import PlaygroundBookingPayment from "@/models/playground/PlaygroundBookingPayment";

function canonicalDepartment(value: string | null | undefined): string {
  if (!value) return "";
  return value === "accomodation" ? "accommodation" : value;
}

function isTruthy(value: string | null | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function departmentMatchFilter(value: string | null | undefined): string | { $in: string[] } | undefined {
  const canonical = canonicalDepartment(value);
  if (!canonical) return undefined;
  if (canonical === DEPARTMENT.ACCOMMODATION) {
    return { $in: [DEPARTMENT.ACCOMMODATION, "accomodation"] };
  }
  return canonical;
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
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

    const department = canonicalDepartment(sp.get("department"));
    const departmentFilter = departmentMatchFilter(department);
    const format = (sp.get("format") ?? "").toLowerCase();
    const includePending = isTruthy(sp.get("includePending"));
    const expenseStatusMatch = includePending
      ? { $in: [EXPENSE_STATUS.APPROVED, EXPENSE_STATUS.PENDING] }
      : EXPENSE_STATUS.APPROVED;
    const paymentStatusMatch = includePending
      ? { $in: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.PENDING] }
      : PAYMENT_STATUS.SUCCESS;

    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const branchOid = new mongoose.Types.ObjectId(branchId);

    const baseMatch: Record<string, unknown> = {
      tenantId: tenantOid,
      branchId: branchOid,
    };
    const expenseModels = getExpenseModelsForQuery(department || undefined);
    const paymentModels = getPaymentModelsForQuery(department || undefined);

    // Expense aggregation by department
    const expensesByDept = (
      await Promise.all(
        expenseModels.map((model) =>
          model.aggregate([
            {
              $match: {
                ...baseMatch,
                date: { $gte: startDate, $lte: endDate },
                status: expenseStatusMatch,
                ...(departmentFilter ? { department: departmentFilter } : {}),
              },
            },
            {
              $group: {
                _id: "$department",
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { totalAmount: -1 } },
            { $project: { department: "$_id", totalAmount: 1, count: 1 } },
          ])
        )
      )
    ).flat();

    // Income (payments) aggregation by department
    let incomeByDept = (
      await Promise.all(
        paymentModels.map((model) =>
          model.aggregate([
            {
              $match: {
                ...baseMatch,
                createdAt: { $gte: startDate, $lte: endDate },
                status: paymentStatusMatch,
                ...(departmentFilter ? { department: departmentFilter } : {}),
              },
            },
            {
              $group: {
                _id: "$department",
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { totalAmount: -1 } },
            { $project: { department: "$_id", totalAmount: 1, count: 1 } },
          ])
        )
      )
    ).flat();

    // Include EventBookingPayment for conference (event payments not in payments_conference)
    const includeEventPayments =
      !departmentFilter || canonicalDepartment(departmentFilter) === DEPARTMENT.CONFERENCE;
    if (includeEventPayments) {
      const eventPayments = await EventBookingPayment.aggregate([
        {
          $match: {
            ...baseMatch,
            paidAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: DEPARTMENT.CONFERENCE,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $project: { department: "$_id", totalAmount: 1, count: 1 } },
      ]).exec();
      const existing = incomeByDept.find(
        (r) => canonicalDepartment(r.department) === DEPARTMENT.CONFERENCE
      );
      if (eventPayments[0] && eventPayments[0].totalAmount > 0) {
        if (existing) {
          existing.totalAmount = (existing.totalAmount ?? 0) + (eventPayments[0].totalAmount ?? 0);
          existing.count = (existing.count ?? 0) + (eventPayments[0].count ?? 0);
        } else {
          incomeByDept = [...incomeByDept, eventPayments[0]];
        }
      }
    }

    // Include PoolBookingPayment for pool (pool booking payments not in payments_pool)
    const includePoolPayments =
      !departmentFilter || canonicalDepartment(departmentFilter) === DEPARTMENT.POOL;
    if (includePoolPayments) {
      const poolPayments = await PoolBookingPayment.aggregate([
        {
          $match: {
            ...baseMatch,
            paidAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: DEPARTMENT.POOL,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $project: { department: "$_id", totalAmount: 1, count: 1 } },
      ]).exec();
      const existing = incomeByDept.find(
        (r) => canonicalDepartment(r.department) === DEPARTMENT.POOL
      );
      if (poolPayments[0] && poolPayments[0].totalAmount > 0) {
        if (existing) {
          existing.totalAmount = (existing.totalAmount ?? 0) + (poolPayments[0].totalAmount ?? 0);
          existing.count = (existing.count ?? 0) + (poolPayments[0].count ?? 0);
        } else {
          incomeByDept = [...incomeByDept, poolPayments[0]];
        }
      }
    }

    // Include PlaygroundBookingPayment for playground
    const includePlaygroundPayments =
      !departmentFilter || canonicalDepartment(departmentFilter) === DEPARTMENT.PLAYGROUND;
    if (includePlaygroundPayments) {
      const playgroundPayments = await PlaygroundBookingPayment.aggregate([
        {
          $match: {
            ...baseMatch,
            paidAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: DEPARTMENT.PLAYGROUND,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $project: { department: "$_id", totalAmount: 1, count: 1 } },
      ]).exec();
      const existing = incomeByDept.find(
        (r) => canonicalDepartment(r.department) === DEPARTMENT.PLAYGROUND
      );
      if (playgroundPayments[0] && playgroundPayments[0].totalAmount > 0) {
        if (existing) {
          existing.totalAmount = (existing.totalAmount ?? 0) + (playgroundPayments[0].totalAmount ?? 0);
          existing.count = (existing.count ?? 0) + (playgroundPayments[0].count ?? 0);
        } else {
          incomeByDept = [...incomeByDept, playgroundPayments[0]];
        }
      }
    }

    // Invoice totals by department
    const invoiceModels = getInvoiceModelsForQuery(department || undefined);
    const invoicesByDept = (
      await Promise.all(
        invoiceModels.map((model) =>
          model.aggregate([
            {
              $match: {
                ...baseMatch,
                createdAt: { $gte: startDate, $lte: endDate },
                ...(departmentFilter ? { department: departmentFilter } : {}),
              },
            },
            {
              $group: {
                _id: "$department",
                totalInvoiced: { $sum: "$totalAmount" },
                totalPaid: { $sum: "$paidAmount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { totalInvoiced: -1 } },
            {
              $project: {
                department: "$_id",
                totalInvoiced: 1,
                totalPaid: 1,
                count: 1,
                outstanding: { $subtract: ["$totalInvoiced", "$totalPaid"] },
              },
            },
          ])
        )
      )
    ).flat();

    // Monthly trend for selected department (or all)
    const expenseTrend = (
      await Promise.all(
        expenseModels.map((model) =>
          model.aggregate([
            {
              $match: {
                ...baseMatch,
                date: { $gte: startDate, $lte: endDate },
                status: expenseStatusMatch,
                ...(departmentFilter ? { department: departmentFilter } : {}),
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                amount: { $sum: "$amount" },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { date: "$_id", amount: 1 } },
          ])
        )
      )
    ).flat();

    let incomeTrend = (
      await Promise.all(
        paymentModels.map((model) =>
          model.aggregate([
            {
              $match: {
                ...baseMatch,
                createdAt: { $gte: startDate, $lte: endDate },
                status: paymentStatusMatch,
                ...(departmentFilter ? { department: departmentFilter } : {}),
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                amount: { $sum: "$amount" },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { date: "$_id", amount: 1 } },
          ])
        )
      )
    ).flat();

    if (includeEventPayments) {
      const eventTrend = await EventBookingPayment.aggregate([
        {
          $match: {
            ...baseMatch,
            paidAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", amount: 1 } },
      ]).exec();
      const trendByDate = new Map(incomeTrend.map((r) => [r.date, { ...r }]));
      for (const row of eventTrend) {
        const d = row.date ?? row._id;
        const existing = trendByDate.get(d);
        if (existing) {
          existing.amount = (existing.amount ?? 0) + (row.amount ?? 0);
        } else {
          trendByDate.set(d, { date: d, amount: row.amount ?? 0 });
        }
      }
      incomeTrend = Array.from(trendByDate.values()).sort(
        (a, b) => String(a.date).localeCompare(String(b.date))
      );
    }

    if (includePoolPayments) {
      const poolTrend = await PoolBookingPayment.aggregate([
        {
          $match: {
            ...baseMatch,
            paidAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", amount: 1 } },
      ]).exec();
      const trendByDate = new Map(incomeTrend.map((r) => [r.date, { ...r }]));
      for (const row of poolTrend) {
        const d = row.date ?? row._id;
        const existing = trendByDate.get(d);
        if (existing) {
          existing.amount = (existing.amount ?? 0) + (row.amount ?? 0);
        } else {
          trendByDate.set(d, { date: d, amount: row.amount ?? 0 });
        }
      }
      incomeTrend = Array.from(trendByDate.values()).sort(
        (a, b) => String(a.date).localeCompare(String(b.date))
      );
    }

    // Build per-department summary
    const departments = Object.values(DEPARTMENT);
    const summary = departments.map((dept) => {
      const expRows = expensesByDept.filter(
        (e) => canonicalDepartment(e.department) === dept
      );
      const incRows = incomeByDept.filter(
        (i) => canonicalDepartment(i.department) === dept
      );
      const invRows = invoicesByDept.filter(
        (i) => canonicalDepartment(i.department) === dept
      );
      const totalExpenses = expRows.reduce(
        (sum, row) => sum + (row.totalAmount ?? 0),
        0
      );
      const totalIncome = incRows.reduce(
        (sum, row) => sum + (row.totalAmount ?? 0),
        0
      );
      const totalInvoiced = invRows.reduce(
        (sum, row) => sum + (row.totalInvoiced ?? 0),
        0
      );
      const outstanding = invRows.reduce(
        (sum, row) => sum + (row.outstanding ?? 0),
        0
      );
      const expenseCount = expRows.reduce((sum, row) => sum + (row.count ?? 0), 0);
      const incomeCount = incRows.reduce((sum, row) => sum + (row.count ?? 0), 0);
      const profit = totalIncome - totalExpenses;
      return {
        department: dept,
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        expenseCount,
        incomeCount,
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        outstanding: Math.round(outstanding * 100) / 100,
      };
    });

    const totals = summary.reduce(
      (acc, s) => ({
        totalIncome: acc.totalIncome + s.totalIncome,
        totalExpenses: acc.totalExpenses + s.totalExpenses,
        profit: acc.profit + s.profit,
        totalInvoiced: acc.totalInvoiced + s.totalInvoiced,
        outstanding: acc.outstanding + s.outstanding,
      }),
      { totalIncome: 0, totalExpenses: 0, profit: 0, totalInvoiced: 0, outstanding: 0 }
    );

    const roundedTotals = {
      totalIncome: Math.round(totals.totalIncome * 100) / 100,
      totalExpenses: Math.round(totals.totalExpenses * 100) / 100,
      profit: Math.round(totals.profit * 100) / 100,
      totalInvoiced: Math.round(totals.totalInvoiced * 100) / 100,
      outstanding: Math.round(totals.outstanding * 100) / 100,
    };

    const activeRows = summary.filter((s) => s.totalIncome > 0 || s.totalExpenses > 0);
    const exportRows = activeRows.length > 0 ? activeRows : summary;

    if (format === "csv") {
      const header = [
        "Department",
        "Total Income",
        "Total Expenses",
        "Profit",
        "Total Invoiced",
        "Outstanding",
        "Expense Count",
        "Income Count",
      ];
      const csvRows = [
        header.join(","),
        ...exportRows.map((row) =>
          [
            row.department,
            row.totalIncome,
            row.totalExpenses,
            row.profit,
            row.totalInvoiced,
            row.outstanding,
            row.expenseCount,
            row.incomeCount,
          ]
            .map(escapeCsv)
            .join(",")
        ),
        [
          "TOTAL",
          roundedTotals.totalIncome,
          roundedTotals.totalExpenses,
          roundedTotals.profit,
          roundedTotals.totalInvoiced,
          roundedTotals.outstanding,
          "",
          "",
        ]
          .map(escapeCsv)
          .join(","),
      ];

      const filename = `department-pnl-${startDate.toISOString().slice(0, 10)}-to-${endDate
        .toISOString()
        .slice(0, 10)}.csv`;

      return new NextResponse(csvRows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "pdf") {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([842, 595]); // Landscape A4 points
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
      let y = 560;

      page.drawText("Department Profit & Loss Statement", {
        x: 40,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0.08, 0.1, 0.14),
      });
      y -= 24;

      page.drawText(
        `Period: ${startDate.toISOString().slice(0, 10)} to ${endDate
          .toISOString()
          .slice(0, 10)}${department ? ` | Department: ${department}` : ""}`,
        {
          x: 40,
          y,
          size: 10,
          font,
          color: rgb(0.29, 0.33, 0.37),
        }
      );
      y -= 26;

      const columns = [
        { key: "department", label: "Department", x: 40, width: 120 },
        { key: "totalIncome", label: "Income", x: 170, width: 90 },
        { key: "totalExpenses", label: "Expenses", x: 265, width: 90 },
        { key: "profit", label: "Profit", x: 360, width: 90 },
        { key: "totalInvoiced", label: "Invoiced", x: 455, width: 90 },
        { key: "outstanding", label: "Outstanding", x: 550, width: 90 },
        { key: "expenseCount", label: "Exp#", x: 650, width: 40 },
        { key: "incomeCount", label: "Inc#", x: 700, width: 40 },
      ] as const;

      for (const col of columns) {
        page.drawText(col.label, {
          x: col.x,
          y,
          size: 9,
          font: boldFont,
          color: rgb(0.2, 0.22, 0.26),
        });
      }
      y -= 12;
      page.drawLine({
        start: { x: 40, y },
        end: { x: 780, y },
        thickness: 1,
        color: rgb(0.85, 0.88, 0.91),
      });
      y -= 14;

      const maxRows = 23;
      const rowsToRender = exportRows.slice(0, maxRows);
      for (const row of rowsToRender) {
        const values = {
          department: row.department,
          totalIncome: row.totalIncome.toFixed(2),
          totalExpenses: row.totalExpenses.toFixed(2),
          profit: row.profit.toFixed(2),
          totalInvoiced: row.totalInvoiced.toFixed(2),
          outstanding: row.outstanding.toFixed(2),
          expenseCount: String(row.expenseCount),
          incomeCount: String(row.incomeCount),
        };
        for (const col of columns) {
          page.drawText(values[col.key], {
            x: col.x,
            y,
            size: 9,
            font,
            color: rgb(0.17, 0.2, 0.24),
            maxWidth: col.width,
          });
        }
        y -= 18;
      }

      y -= 2;
      page.drawLine({
        start: { x: 40, y },
        end: { x: 780, y },
        thickness: 1,
        color: rgb(0.85, 0.88, 0.91),
      });
      y -= 14;
      page.drawText(
        `Totals | Income: ${roundedTotals.totalIncome.toFixed(2)} | Expenses: ${roundedTotals.totalExpenses.toFixed(
          2
        )} | Profit: ${roundedTotals.profit.toFixed(2)} | Invoiced: ${roundedTotals.totalInvoiced.toFixed(
          2
        )} | Outstanding: ${roundedTotals.outstanding.toFixed(2)}`,
        {
          x: 40,
          y,
          size: 10,
          font: boldFont,
          color: rgb(0.08, 0.1, 0.14),
        }
      );

      if (exportRows.length > maxRows) {
        page.drawText(
          `Note: Showing first ${maxRows} rows out of ${exportRows.length} departments.`,
          {
            x: 40,
            y: 24,
            size: 8,
            font,
            color: rgb(0.45, 0.5, 0.56),
          }
        );
      }

      const filename = `department-pnl-${startDate.toISOString().slice(0, 10)}-to-${endDate
        .toISOString()
        .slice(0, 10)}.pdf`;
      const bytes = await pdf.save();
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      mode: includePending ? "operational" : "finance",
      totals: roundedTotals,
      departments: summary.filter((s) => s.totalIncome > 0 || s.totalExpenses > 0),
      allDepartments: summary,
      expenseTrend,
      incomeTrend,
    });
  },
  { auth: true }
);
