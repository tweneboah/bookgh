import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import {
  USER_ROLES,
  POS_ORDER_STATUS,
  EXPENSE_STATUS,
  PAYMENT_STATUS,
} from "@/constants";
import mongoose from "mongoose";
import { getExpenseModelForDepartment, getPaymentModelForDepartment } from "@/lib/department-ledger";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";
import { getRecipeModelForDepartment } from "@/lib/department-restaurant";
import {
  getPosMenuItemModelForDepartment,
  getPosOrderModelForDepartment,
} from "@/lib/department-pos";

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
      USER_ROLES.CASHIER,
      USER_ROLES.SUPERVISOR,
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

    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const branchOid = new mongoose.Types.ObjectId(branchId);
    const InventoryItemModel = getInventoryItemModelForDepartment("restaurant");
    const InventoryMovementModel = getInventoryMovementModelForDepartment("restaurant");
    const OrderModel = getPosOrderModelForDepartment("restaurant");
    const MenuItemModel = getPosMenuItemModelForDepartment("restaurant");
    const RecipeModel = getRecipeModelForDepartment("restaurant");

    const expenseModel = getExpenseModelForDepartment("restaurant");
    const paymentModel = getPaymentModelForDepartment("restaurant");

    const [salesRows, waiterSales, shiftSales, topItems, cancelledRows, expenseRows, paymentRows, inventoryValuation, movementSummary, recentDailySales, menuItems, recipes] =
      await Promise.all([
        OrderModel.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              createdAt: { $gte: startDate, $lte: endDate },
              status: { $ne: POS_ORDER_STATUS.CANCELLED },
            },
          },
          {
            $group: {
              _id: "$orderChannel",
              sales: { $sum: "$totalAmount" },
              tips: { $sum: "$tipAmount" },
              tax: { $sum: "$tax" },
              orders: { $sum: 1 },
              avgOrderValue: { $avg: "$totalAmount" },
            },
          },
        ]),
        OrderModel.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              createdAt: { $gte: startDate, $lte: endDate },
              status: { $ne: POS_ORDER_STATUS.CANCELLED },
            },
          },
          {
            $group: {
              _id: { waiterId: "$waiterId", waiterName: "$waiterName" },
              sales: { $sum: "$totalAmount" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { sales: -1 } },
          { $limit: 15 },
        ]),
        OrderModel.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              createdAt: { $gte: startDate, $lte: endDate },
              status: { $ne: POS_ORDER_STATUS.CANCELLED },
            },
          },
          {
            $group: {
              _id: "$shiftId",
              sales: { $sum: "$totalAmount" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { sales: -1 } },
        ]),
        OrderModel.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              createdAt: { $gte: startDate, $lte: endDate },
              status: { $ne: POS_ORDER_STATUS.CANCELLED },
            },
          },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.name",
              quantity: { $sum: "$items.quantity" },
              sales: { $sum: "$items.amount" },
            },
          },
          { $sort: { quantity: -1 } },
          { $limit: 20 },
        ]),
        OrderModel.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              createdAt: { $gte: startDate, $lte: endDate },
              status: POS_ORDER_STATUS.CANCELLED,
            },
          },
          {
            $project: {
              orderNumber: 1,
              voidReason: 1,
              totalAmount: 1,
              createdAt: 1,
            },
          },
          { $sort: { createdAt: -1 } },
        ]),
        expenseModel.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              department: "restaurant",
              status: EXPENSE_STATUS.APPROVED,
              date: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: "$category",
              amount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { amount: -1 } },
        ]),
        paymentModel.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              department: "restaurant",
              status: PAYMENT_STATUS.SUCCESS,
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              amount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ]),
        InventoryItemModel.aggregate([
          { $match: { tenantId: tenantOid, branchId: branchOid } },
          {
            $group: {
              _id: null,
              value: { $sum: { $multiply: ["$currentStock", "$unitCost"] } },
            },
          },
        ]),
        InventoryMovementModel.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $project: {
              movementType: 1,
              quantity: 1,
              delta: {
                $subtract: [
                  { $ifNull: ["$resultingStock", 0] },
                  { $ifNull: ["$previousStock", 0] },
                ],
              },
            },
          },
          {
            $group: {
              _id: "$movementType",
              quantity: { $sum: "$quantity" },
              signedDelta: { $sum: "$delta" },
              count: { $sum: 1 },
            },
          },
        ]),
        OrderModel.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              createdAt: {
                $gte: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000),
                $lte: endDate,
              },
              status: { $ne: POS_ORDER_STATUS.CANCELLED },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              sales: { $sum: "$totalAmount" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        MenuItemModel.find({ tenantId: tenantOid, branchId: branchOid } as any)
          .select("name price")
          .lean(),
        RecipeModel.find({ tenantId: tenantOid, branchId: branchOid } as any)
          .select("menuItemId menuItemName costPerPortion grossMarginPercent")
          .lean(),
      ]);

    const totalSales = salesRows.reduce((sum, row) => sum + Number(row.sales ?? 0), 0);
    const totalTips = salesRows.reduce((sum, row) => sum + Number(row.tips ?? 0), 0);
    const totalTax = salesRows.reduce((sum, row) => sum + Number(row.tax ?? 0), 0);
    const totalOrders = salesRows.reduce((sum, row) => sum + Number(row.orders ?? 0), 0);
    const totalExpenses = expenseRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const cogs = expenseRows
      .filter((row) =>
        /(food|ingredient|purchase|cogs|waste|spoilage)/i.test(String(row._id ?? ""))
      )
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const grossProfit = totalSales - totalExpenses;
    const grossMarginPercent = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    const foodCostPercent = totalSales > 0 ? (cogs / totalSales) * 100 : 0;

    const streamMap = new Map<string, number>();
    for (const row of salesRows) {
      const key = String(row._id || "unknown");
      streamMap.set(key, Number(row.sales ?? 0));
    }

    const paymentTotals = paymentRows[0] ?? { amount: 0, count: 0 };
    const movementMap = new Map(
      movementSummary.map((row) => [String(row._id), row])
    );
    const totalPurchased = Number(movementMap.get("restock")?.quantity ?? 0);
    const totalConsumed = Number(movementMap.get("sale")?.quantity ?? 0);
    const totalWastage = Number(movementMap.get("wastage")?.quantity ?? 0);
    const adjustmentSigned = Number(movementMap.get("adjustment")?.signedDelta ?? 0);
    const adjustmentQty = Number(movementMap.get("adjustment")?.quantity ?? 0);
    const recipeByMenuItem = new Map(
      recipes.map((r) => [String(r.menuItemId), r])
    );
    const menuItemByName = new Map(menuItems.map((m) => [String(m.name), m]));
    const maxQty = Math.max(
      1,
      ...topItems.map((row) => Number(row.quantity ?? 0))
    );
    const menuEngineering = topItems.map((row) => {
      const itemName = String(row._id ?? "Unknown");
      const menuItem = menuItemByName.get(itemName);
      const recipe = menuItem
        ? recipeByMenuItem.get(String(menuItem._id))
        : undefined;
      const marginPercent = Number(recipe?.grossMarginPercent ?? 0);
      const popularityScore = Number(row.quantity ?? 0) / maxQty;
      const isHighMargin = marginPercent >= 60;
      const isHighPopularity = popularityScore >= 0.6;
      const classification = isHighMargin
        ? isHighPopularity
          ? "star"
          : "puzzle"
        : isHighPopularity
          ? "plowhorse"
          : "dog";
      return {
        itemName,
        quantity: Number(row.quantity ?? 0),
        sales: Math.round(Number(row.sales ?? 0) * 100) / 100,
        grossMarginPercent: Math.round(marginPercent * 100) / 100,
        popularityScore: Math.round(popularityScore * 10000) / 100,
        classification,
      };
    });
    const recentSalesSorted = [...recentDailySales].sort((a, b) =>
      String(a._id).localeCompare(String(b._id))
    );
    const avgRecentDailySales =
      recentSalesSorted.length > 0
        ? recentSalesSorted.reduce((sum, row) => sum + Number(row.sales ?? 0), 0) /
          recentSalesSorted.length
        : 0;
    const demandForecasting = {
      dailySeries: recentSalesSorted.map((row) => ({
        date: row._id,
        sales: Math.round(Number(row.sales ?? 0) * 100) / 100,
        orders: Number(row.orders ?? 0),
      })),
      averageDailySales: Math.round(avgRecentDailySales * 100) / 100,
      projectedNext7DaysSales:
        Math.round(avgRecentDailySales * 7 * 100) / 100,
    };

    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      dailySummary: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        totalOrders,
      },
      monthlySummary: {
        revenueSummary: Math.round(totalSales * 100) / 100,
        foodCostPercentage: Math.round(foodCostPercent * 100) / 100,
        profitMargin: Math.round(grossMarginPercent * 100) / 100,
        inventoryValuation: Math.round(Number(inventoryValuation[0]?.value ?? 0) * 100) / 100,
        expenseBreakdown: expenseRows.map((row) => ({
          category: row._id,
          amount: Math.round(Number(row.amount ?? 0) * 100) / 100,
          count: Number(row.count ?? 0),
        })),
      },
      performanceMetrics: {
        cogs: Math.round(cogs * 100) / 100,
        grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
        averageOrderValue: totalOrders > 0 ? Math.round((totalSales / totalOrders) * 100) / 100 : 0,
        salesPerWaiter: waiterSales.map((row) => ({
          waiterId: row._id?.waiterId ? String(row._id.waiterId) : "",
          waiterName: row._id?.waiterName || "Unassigned",
          sales: Math.round(Number(row.sales ?? 0) * 100) / 100,
          orders: Number(row.orders ?? 0),
        })),
        salesPerShift: shiftSales.map((row) => ({
          shiftId: row._id ? String(row._id) : "",
          sales: Math.round(Number(row.sales ?? 0) * 100) / 100,
          orders: Number(row.orders ?? 0),
        })),
      },
      fohReports: {
        topSellingItems: topItems.map((row) => ({
          itemName: row._id,
          quantity: Number(row.quantity ?? 0),
          sales: Math.round(Number(row.sales ?? 0) * 100) / 100,
        })),
        cancelledVoidReport: cancelledRows,
        taxSummary: Math.round(totalTax * 100) / 100,
        tipSummary: Math.round(totalTips * 100) / 100,
      },
      accounting: {
        revenueStreams: {
          dineInRevenue: Math.round(Number(streamMap.get("dineIn") ?? 0) * 100) / 100,
          takeawayRevenue: Math.round(Number(streamMap.get("takeaway") ?? 0) * 100) / 100,
          roomChargeRevenue: Math.round(Number(streamMap.get("roomService") ?? 0) * 100) / 100,
          otherRevenue: Math.round(
            (totalSales -
              Number(streamMap.get("dineIn") ?? 0) -
              Number(streamMap.get("takeaway") ?? 0) -
              Number(streamMap.get("roomService") ?? 0)) *
              100
          ) / 100,
          paymentLedgerTotal: Math.round(Number(paymentTotals.amount ?? 0) * 100) / 100,
          paymentLedgerCount: Number(paymentTotals.count ?? 0),
        },
        netProfit: Math.round(grossProfit * 100) / 100,
      },
      bohStockControl: {
        totalPurchased: Math.round(totalPurchased * 10000) / 10000,
        totalConsumed: Math.round(totalConsumed * 10000) / 10000,
        totalWastage: Math.round(totalWastage * 10000) / 10000,
        adjustmentQuantity: Math.round(adjustmentQty * 10000) / 10000,
        adjustmentSigned: Math.round(adjustmentSigned * 10000) / 10000,
        wastagePercent:
          totalConsumed > 0
            ? Math.round((totalWastage / totalConsumed) * 10000) / 100
            : 0,
      },
      enterpriseInsights: {
        demandForecasting,
        menuEngineering,
      },
    });
  },
  { auth: true }
);
