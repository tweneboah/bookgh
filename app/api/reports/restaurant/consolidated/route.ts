import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireRoles, requireTenant } from "@/lib/auth-context";
import {
  USER_ROLES,
  POS_ORDER_STATUS,
  EXPENSE_STATUS,
  PAYMENT_STATUS,
} from "@/constants";
import Branch from "@/models/branch/Branch";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import {
  getExpenseModelForDepartment,
  getPaymentModelForDepartment,
} from "@/lib/department-ledger";
import { getPosOrderModelForDepartment } from "@/lib/department-pos";

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.HOTEL_OWNER,
      USER_ROLES.FINANCE_MANAGER,
      USER_ROLES.ACCOUNTANT,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
    ]);
    const tenantId = requireTenant(auth);
    const sp = req.nextUrl.searchParams;
    const format = (sp.get("format") ?? "").toLowerCase();
    const now = new Date();
    const startDate = sp.get("startDate")
      ? new Date(sp.get("startDate")!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = sp.get("endDate")
      ? new Date(sp.get("endDate")!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const branchFilter =
      auth.role === USER_ROLES.BRANCH_MANAGER && auth.branchId
        ? { _id: new mongoose.Types.ObjectId(auth.branchId) }
        : {};

    const branches = await Branch.find({
      tenantId: tenantOid,
      ...branchFilter,
    } as any)
      .select("name")
      .lean();
    const branchIds = branches.map((b) => b._id);

    const expenseModel = getExpenseModelForDepartment("restaurant");
    const paymentModel = getPaymentModelForDepartment("restaurant");
    const OrderModel = getPosOrderModelForDepartment("restaurant");

    const [salesByBranch, expenseByBranch, paymentByBranch] = await Promise.all([
      OrderModel.aggregate([
        {
          $match: {
            tenantId: tenantOid,
            branchId: { $in: branchIds },
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: POS_ORDER_STATUS.CANCELLED },
          },
        },
        {
          $group: {
            _id: "$branchId",
            sales: { $sum: "$totalAmount" },
            orders: { $sum: 1 },
          },
        },
      ]),
      expenseModel.aggregate([
        {
          $match: {
            tenantId: tenantOid,
            branchId: { $in: branchIds },
            department: "restaurant",
            status: EXPENSE_STATUS.APPROVED,
            date: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$branchId",
            expenses: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      paymentModel.aggregate([
        {
          $match: {
            tenantId: tenantOid,
            branchId: { $in: branchIds },
            department: "restaurant",
            status: PAYMENT_STATUS.SUCCESS,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$branchId",
            payments: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const salesMap = new Map(salesByBranch.map((r) => [String(r._id), r]));
    const expenseMap = new Map(expenseByBranch.map((r) => [String(r._id), r]));
    const paymentMap = new Map(paymentByBranch.map((r) => [String(r._id), r]));

    const branchRows = branches.map((branch) => {
      const key = String(branch._id);
      const sales = Number(salesMap.get(key)?.sales ?? 0);
      const expenses = Number(expenseMap.get(key)?.expenses ?? 0);
      const payments = Number(paymentMap.get(key)?.payments ?? 0);
      const profit = sales - expenses;
      return {
        branchId: key,
        branchName: branch.name ?? key,
        sales: Math.round(sales * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        payments: Math.round(payments * 100) / 100,
        orders: Number(salesMap.get(key)?.orders ?? 0),
      };
    });

    const totals = branchRows.reduce(
      (acc, row) => ({
        sales: acc.sales + row.sales,
        expenses: acc.expenses + row.expenses,
        profit: acc.profit + row.profit,
        payments: acc.payments + row.payments,
        orders: acc.orders + row.orders,
      }),
      { sales: 0, expenses: 0, profit: 0, payments: 0, orders: 0 }
    );

    if (format === "csv") {
      const header = [
        "Branch",
        "Sales",
        "Expenses",
        "Profit",
        "Payments",
        "Orders",
      ];
      const rows = branchRows.map((row) =>
        [
          row.branchName,
          row.sales,
          row.expenses,
          row.profit,
          row.payments,
          row.orders,
        ]
          .map(escapeCsv)
          .join(",")
      );
      const totalsRow = [
        "TOTAL",
        Math.round(totals.sales * 100) / 100,
        Math.round(totals.expenses * 100) / 100,
        Math.round(totals.profit * 100) / 100,
        Math.round(totals.payments * 100) / 100,
        totals.orders,
      ]
        .map(escapeCsv)
        .join(",");
      const filename = `restaurant-consolidated-${startDate
        .toISOString()
        .slice(0, 10)}-to-${endDate.toISOString().slice(0, 10)}.csv`;
      return new NextResponse([header.join(","), ...rows, totalsRow].join("\n"), {
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
      branches: branchRows,
      totals: {
        sales: Math.round(totals.sales * 100) / 100,
        expenses: Math.round(totals.expenses * 100) / 100,
        profit: Math.round(totals.profit * 100) / 100,
        payments: Math.round(totals.payments * 100) / 100,
        orders: totals.orders,
      },
    });
  },
  { auth: true }
);
