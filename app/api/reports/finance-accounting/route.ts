import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import {
  USER_ROLES,
  EXPENSE_STATUS,
  PAYMENT_STATUS,
  DEPARTMENT,
} from "@/constants";
import mongoose from "mongoose";
import {
  getExpenseModelsForQuery,
  getPaymentModelsForQuery,
} from "@/lib/department-ledger";
import { getInvoiceModelsForQuery } from "@/lib/department-invoice";

function isTruthy(value: string | null | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

type DeptAgg = { _id: string; amount: number };
type DailyAgg = { _id: string; amount: number };

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.ACCOUNTANT,
      USER_ROLES.FINANCE_MANAGER,
      USER_ROLES.HOTEL_OWNER,
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
    const includePending = isTruthy(sp.get("includePending"));

    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const branchOid = new mongoose.Types.ObjectId(branchId);
    const baseMatch = { tenantId: tenantOid, branchId: branchOid };
    const expenseStatusMatch = includePending
      ? { $in: [EXPENSE_STATUS.APPROVED, EXPENSE_STATUS.PENDING] }
      : EXPENSE_STATUS.APPROVED;
    const paymentStatusMatch = includePending
      ? { $in: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.PENDING] }
      : PAYMENT_STATUS.SUCCESS;

    const expenseModels = getExpenseModelsForQuery();
    const paymentModels = getPaymentModelsForQuery();

    const invoiceModels = getInvoiceModelsForQuery();
    const [
      expensesByDepartment,
      revenueByDepartment,
      expenseDaily,
      revenueDaily,
      invoiceTaxSummary,
      invoiceTotals,
    ] = await Promise.all([
      Promise.all(
        expenseModels.map((model) =>
          model.aggregate<DeptAgg>([
            {
              $match: {
                ...baseMatch,
                date: { $gte: startDate, $lte: endDate },
                status: expenseStatusMatch,
              },
            },
            { $group: { _id: "$department", amount: { $sum: "$amount" } } },
          ])
        )
      ).then((rows) => rows.flat()),
      Promise.all(
        paymentModels.map((model) =>
          model.aggregate<DeptAgg>([
            {
              $match: {
                ...baseMatch,
                createdAt: { $gte: startDate, $lte: endDate },
                status: paymentStatusMatch,
              },
            },
            { $group: { _id: "$department", amount: { $sum: "$amount" } } },
          ])
        )
      ).then((rows) => rows.flat()),
      Promise.all(
        expenseModels.map((model) =>
          model.aggregate<DailyAgg>([
            {
              $match: {
                ...baseMatch,
                date: { $gte: startDate, $lte: endDate },
                status: expenseStatusMatch,
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                amount: { $sum: "$amount" },
              },
            },
          ])
        )
      ).then((rows) => rows.flat()),
      Promise.all(
        paymentModels.map((model) =>
          model.aggregate<DailyAgg>([
            {
              $match: {
                ...baseMatch,
                createdAt: { $gte: startDate, $lte: endDate },
                status: paymentStatusMatch,
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                amount: { $sum: "$amount" },
              },
            },
          ])
        )
      ).then((rows) => rows.flat()),
      Promise.all(
        invoiceModels.map((model) =>
          model.aggregate([
            {
              $match: {
                ...baseMatch,
                createdAt: { $gte: startDate, $lte: endDate },
              },
            },
            { $unwind: { path: "$taxBreakdown", preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: "$taxBreakdown.label",
                totalTaxAmount: { $sum: "$taxBreakdown.amount" },
                avgTaxRate: { $avg: "$taxBreakdown.rate" },
              },
            },
            { $sort: { totalTaxAmount: -1 } },
          ])
        )
      ).then((rows) => rows.flat()),
      Promise.all(
        invoiceModels.map((model) =>
          model.aggregate([
            {
              $match: {
                ...baseMatch,
                createdAt: { $gte: startDate, $lte: endDate },
              },
            },
            {
              $group: {
                _id: null,
                totalInvoiced: { $sum: "$totalAmount" },
                totalPaid: { $sum: "$paidAmount" },
                invoiceCount: { $sum: 1 },
              },
            },
          ])
        )
      ).then((rows) => rows.flat()),
    ]);

    const departments = Object.values(DEPARTMENT);
    const departmentComparison = departments.map((dept) => {
      const rev = revenueByDepartment
        .filter((row) => row._id === dept)
        .reduce((sum, row) => sum + (row.amount ?? 0), 0);
      const exp = expensesByDepartment
        .filter((row) => row._id === dept)
        .reduce((sum, row) => sum + (row.amount ?? 0), 0);
      return {
        department: dept,
        revenue: Math.round(rev * 100) / 100,
        expenses: Math.round(exp * 100) / 100,
        profit: Math.round((rev - exp) * 100) / 100,
      };
    });

    const totals = departmentComparison.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.revenue,
        expenses: acc.expenses + row.expenses,
        profit: acc.profit + row.profit,
      }),
      { revenue: 0, expenses: 0, profit: 0 }
    );
    const roundedTotals = {
      revenue: Math.round(totals.revenue * 100) / 100,
      expenses: Math.round(totals.expenses * 100) / 100,
      profit: Math.round(totals.profit * 100) / 100,
    };

    const cashFlowMap = new Map<string, { date: string; inflow: number; outflow: number; net: number }>();
    for (const row of revenueDaily) {
      const existing = cashFlowMap.get(row._id) ?? {
        date: row._id,
        inflow: 0,
        outflow: 0,
        net: 0,
      };
      existing.inflow += Number(row.amount ?? 0);
      cashFlowMap.set(row._id, existing);
    }
    for (const row of expenseDaily) {
      const existing = cashFlowMap.get(row._id) ?? {
        date: row._id,
        inflow: 0,
        outflow: 0,
        net: 0,
      };
      existing.outflow += Number(row.amount ?? 0);
      cashFlowMap.set(row._id, existing);
    }
    const cashFlowSummary = Array.from(cashFlowMap.values())
      .map((row) => ({
        ...row,
        inflow: Math.round(row.inflow * 100) / 100,
        outflow: Math.round(row.outflow * 100) / 100,
        net: Math.round((row.inflow - row.outflow) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const invoiceStats = invoiceTotals.reduce(
      (acc, row) => ({
        totalInvoiced: acc.totalInvoiced + Number(row.totalInvoiced ?? 0),
        totalPaid: acc.totalPaid + Number(row.totalPaid ?? 0),
        invoiceCount: acc.invoiceCount + Number(row.invoiceCount ?? 0),
      }),
      { totalInvoiced: 0, totalPaid: 0, invoiceCount: 0 }
    );

    const taxByTypeMap = new Map<
      string,
      { taxType: string; totalTaxAmount: number; weightedRate: number; count: number }
    >();
    for (const row of invoiceTaxSummary) {
      const taxType = String(row._id || "Unspecified");
      const existing = taxByTypeMap.get(taxType) ?? {
        taxType,
        totalTaxAmount: 0,
        weightedRate: 0,
        count: 0,
      };
      const amount = Number(row.totalTaxAmount ?? 0);
      const avgRate = Number(row.avgTaxRate ?? 0);
      existing.totalTaxAmount += amount;
      existing.weightedRate += avgRate * amount;
      existing.count += 1;
      taxByTypeMap.set(taxType, existing);
    }
    const taxByType = Array.from(taxByTypeMap.values()).map((row) => ({
      taxType: row.taxType,
      totalTaxAmount: Math.round(row.totalTaxAmount * 100) / 100,
      avgTaxRate:
        row.totalTaxAmount > 0
          ? Math.round((row.weightedRate / row.totalTaxAmount) * 100) / 100
          : 0,
    }));

    const taxReports = {
      totalTaxCollected: Math.round(
        taxByType.reduce((sum, row) => sum + row.totalTaxAmount, 0) * 100
      ) / 100,
      byTaxType: taxByType,
    };

    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      mode: includePending ? "operational" : "finance",
      branchProfitability: {
        branchId,
        revenue: roundedTotals.revenue,
        expenses: roundedTotals.expenses,
        profit: roundedTotals.profit,
        profitMargin:
          roundedTotals.revenue > 0
            ? Math.round((roundedTotals.profit / roundedTotals.revenue) * 10000) / 100
            : 0,
      },
      departmentComparison: departmentComparison.filter(
        (row) => row.revenue > 0 || row.expenses > 0
      ),
      cashFlowSummary,
      revenueTrends: cashFlowSummary.map((row) => ({
        date: row.date,
        revenue: row.inflow,
      })),
      taxReports,
      dailyFinancialSummary: {
        averageDailyRevenue:
          cashFlowSummary.length > 0
            ? Math.round((roundedTotals.revenue / cashFlowSummary.length) * 100) / 100
            : 0,
        averageDailyExpenses:
          cashFlowSummary.length > 0
            ? Math.round((roundedTotals.expenses / cashFlowSummary.length) * 100) / 100
            : 0,
      },
      invoices: {
        totalInvoiced: Math.round((invoiceStats.totalInvoiced ?? 0) * 100) / 100,
        totalPaid: Math.round((invoiceStats.totalPaid ?? 0) * 100) / 100,
        totalOutstanding:
          Math.round(
            ((invoiceStats.totalInvoiced ?? 0) - (invoiceStats.totalPaid ?? 0)) * 100
          ) / 100,
        invoiceCount: invoiceStats.invoiceCount ?? 0,
      },
    });
  },
  { auth: true }
);
