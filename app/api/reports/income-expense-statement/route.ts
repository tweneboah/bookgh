import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import {
  USER_ROLES,
  DEPARTMENT,
  EXPENSE_STATUS,
  PAYMENT_STATUS,
  COA_ACCOUNTS,
  COA_TYPE,
} from "@/constants";
import mongoose from "mongoose";
import { getExpenseModelForDepartment, getPaymentModelsForQuery } from "@/lib/department-ledger";
import { getPosOrderModelForDepartment } from "@/lib/department-pos";
import EventBookingPayment from "@/models/event/EventBookingPayment";
import PoolBookingPayment from "@/models/pool/PoolBookingPayment";
import PlaygroundBookingPayment from "@/models/playground/PlaygroundBookingPayment";

function isTruthy(value: string | null | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.ACCOUNTANT,
      USER_ROLES.FINANCE_MANAGER,
      USER_ROLES.HOTEL_OWNER,
      USER_ROLES.RESTAURANT_MANAGER,
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
    const department = (sp.get("department") ?? "").trim() || undefined;
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

    // ─── Income: by COA revenue account (POS orders) + payments (other income)
    const incomeByAccount: { accountCode: string; label: string; amount: number; count: number }[] = [];
    const revenueCodes = COA_ACCOUNTS.filter((a) => a.type === COA_TYPE.REVENUE).map((a) => a.code);
    const revenueLabelByCode: Record<string, string> = {};
    COA_ACCOUNTS.filter((a) => a.type === COA_TYPE.REVENUE).forEach((a) => {
      revenueLabelByCode[a.code] = a.label;
    });

    // POS orders (restaurant / bar) with revenueAccountCode
    const orderDepts = department
      ? [department].filter((d) => d === DEPARTMENT.RESTAURANT || d === DEPARTMENT.BAR)
      : [DEPARTMENT.RESTAURANT, DEPARTMENT.BAR];
    for (const dept of orderDepts) {
      const OrderModel = getPosOrderModelForDepartment(dept);
      const pipeline: mongoose.PipelineStage[] = [
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: "paid",
            ...(department ? {} : {}),
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$revenueAccountCode", "other"] },
            amount: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
      ];
      const rows = await OrderModel.aggregate(pipeline).exec();
      for (const row of rows) {
        const code = row._id ?? "other";
        const label = revenueLabelByCode[code] ?? (code === "other" ? `${dept} – other sales` : code);
        const existing = incomeByAccount.find((i) => i.accountCode === code);
        if (existing) {
          existing.amount += row.amount ?? 0;
          existing.count += row.count ?? 0;
        } else {
          incomeByAccount.push({
            accountCode: code,
            label: revenueLabelByCode[code] ?? label,
            amount: row.amount ?? 0,
            count: row.count ?? 0,
          });
        }
      }
    }

    // Payments (invoice/other income) – single "Payments" line
    const paymentModels = getPaymentModelsForQuery(department);
    for (const PaymentModel of paymentModels) {
      const rows = await PaymentModel.aggregate([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: startDate, $lte: endDate },
            status: paymentStatusMatch,
          },
        },
        { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).exec();
      const sum = rows[0]?.amount ?? 0;
      const count = rows[0]?.count ?? 0;
      if (sum > 0) {
        const existing = incomeByAccount.find((i) => i.accountCode === "payments-income");
        if (existing) {
          existing.amount += sum;
          existing.count += count;
        } else {
          incomeByAccount.push({
            accountCode: "payments-income",
            label: "Payments (invoices / other)",
            amount: sum,
            count,
          });
        }
      }
    }

    // Event booking payments (conference income – not in payments_conference)
    const includeEventPayments = !department || department === DEPARTMENT.CONFERENCE;
    if (includeEventPayments) {
      const eventRows = await EventBookingPayment.aggregate([
        {
          $match: {
            ...baseMatch,
            paidAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).exec();
      const sum = eventRows[0]?.amount ?? 0;
      const count = eventRows[0]?.count ?? 0;
      if (sum > 0) {
        const existing = incomeByAccount.find((i) => i.accountCode === "payments-income");
        if (existing) {
          existing.amount += sum;
          existing.count += count;
        } else {
          incomeByAccount.push({
            accountCode: "payments-income",
            label: "Payments (invoices / event bookings)",
            amount: sum,
            count,
          });
        }
      }
    }

    // Pool booking payments → pool revenue account (pool-bookings)
    const includePoolPayments = !department || department === DEPARTMENT.POOL;
    if (includePoolPayments) {
      const poolRows = await PoolBookingPayment.aggregate([
        {
          $match: {
            ...baseMatch,
            paidAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).exec();
      const sum = poolRows[0]?.amount ?? 0;
      const count = poolRows[0]?.count ?? 0;
      if (sum > 0) {
        const poolRevenueCode = "pool-bookings";
        const existing = incomeByAccount.find((i) => i.accountCode === poolRevenueCode);
        if (existing) {
          existing.amount += sum;
          existing.count += count;
        } else {
          incomeByAccount.push({
            accountCode: poolRevenueCode,
            label: revenueLabelByCode[poolRevenueCode] ?? "Pool – bookings & access",
            amount: sum,
            count,
          });
        }
      }
    }

    // Playground booking payments → playground revenue account (playground-access)
    const includePlaygroundPayments = !department || department === DEPARTMENT.PLAYGROUND;
    if (includePlaygroundPayments) {
      const pgRows = await PlaygroundBookingPayment.aggregate([
        {
          $match: {
            ...baseMatch,
            paidAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]).exec();
      const sum = pgRows[0]?.amount ?? 0;
      const count = pgRows[0]?.count ?? 0;
      if (sum > 0) {
        const pgRevenueCode = "playground-access";
        const existing = incomeByAccount.find((i) => i.accountCode === pgRevenueCode);
        if (existing) {
          existing.amount += sum;
          existing.count += count;
        } else {
          incomeByAccount.push({
            accountCode: pgRevenueCode,
            label: revenueLabelByCode[pgRevenueCode] ?? "Playground – access & bookings",
            amount: sum,
            count,
          });
        }
      }
    }

    // ─── Expenses: by COA expense account
    const expenseByAccount: { accountCode: string; label: string; amount: number; count: number }[] = [];
    const expenseLabelByCode: Record<string, string> = {};
    COA_ACCOUNTS.filter((a) => a.type === COA_TYPE.EXPENSE).forEach((a) => {
      expenseLabelByCode[a.code] = a.label;
    });

    const departmentsToQuery = department
      ? [department]
      : [DEPARTMENT.RESTAURANT, DEPARTMENT.BAR, DEPARTMENT.ACCOMMODATION, DEPARTMENT.CONFERENCE, DEPARTMENT.POOL, DEPARTMENT.PLAYGROUND, DEPARTMENT.MAINTENANCE, DEPARTMENT.GENERAL];
    for (const dept of departmentsToQuery) {
      const ExpenseModel = getExpenseModelForDepartment(dept);
      const rows = await ExpenseModel.aggregate([
        {
          $match: {
            ...baseMatch,
            date: { $gte: startDate, $lte: endDate },
            status: expenseStatusMatch,
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$accountCode", "other"] },
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]).exec();
      for (const row of rows) {
        const code = row._id ?? "other";
        const label = expenseLabelByCode[code] ?? (code === "other" ? `Other (${dept})` : code);
        const existing = expenseByAccount.find((i) => i.accountCode === code);
        if (existing) {
          existing.amount += row.amount ?? 0;
          existing.count += row.count ?? 0;
        } else {
          expenseByAccount.push({
            accountCode: code,
            label: expenseLabelByCode[code] ?? label,
            amount: row.amount ?? 0,
            count: row.count ?? 0,
          });
        }
      }
    }

    const totalIncome = incomeByAccount.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenseByAccount.reduce((s, e) => s + e.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    return successResponse({
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      department: department ?? null,
      incomeByAccount: incomeByAccount
        .filter((i) => i.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .map((i) => ({
          ...i,
          amount: Math.round(i.amount * 100) / 100,
        })),
      expenseByAccount: expenseByAccount
        .filter((e) => e.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .map((e) => ({
          ...e,
          amount: Math.round(e.amount * 100) / 100,
        })),
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
    });
  },
  { auth: true }
);
