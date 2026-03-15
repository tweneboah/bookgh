import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import {
  BAR_PERMISSIONS,
  INVENTORY_MOVEMENT_TYPE,
  POS_ORDER_STATUS,
  USER_ROLES,
} from "@/constants";
import mongoose from "mongoose";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";
import {
  getPosMenuItemModelForDepartment,
  getPosOrderModelForDepartment,
} from "@/lib/department-pos";

function getDateRange(sp: URLSearchParams) {
  const now = new Date();
  const startDate = sp.get("startDate")
    ? new Date(sp.get("startDate")!)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = sp.get("endDate")
    ? new Date(sp.get("endDate")!)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { startDate, endDate };
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BARTENDER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.ACCOUNTANT,
    ]);
    await requirePermissions(auth, [BAR_PERMISSIONS.REPORT_VIEW], {
      allowRoles: [
        USER_ROLES.TENANT_ADMIN,
        USER_ROLES.BRANCH_MANAGER,
        USER_ROLES.BAR_MANAGER,
        USER_ROLES.BAR_CASHIER,
        USER_ROLES.ACCOUNTANT,
      ],
    });

    const { tenantId, branchId } = requireBranch(auth);
    const { startDate, endDate } = getDateRange(req.nextUrl.searchParams);
    const InventoryItemModel = getInventoryItemModelForDepartment("bar");
    const InventoryMovementModel = getInventoryMovementModelForDepartment("bar");
    const OrderModel = getPosOrderModelForDepartment("bar");
    const MenuItemModel = getPosMenuItemModelForDepartment("bar");
    const baseMatch = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      branchId: new mongoose.Types.ObjectId(branchId),
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const liquorConsumptionRaw = await InventoryMovementModel.aggregate([
      {
        $match: {
          ...baseMatch,
          movementType: INVENTORY_MOVEMENT_TYPE.SALE,
        },
      },
      {
        $group: {
          _id: "$inventoryItemId",
          totalConsumed: { $sum: "$quantity" },
          movementCount: { $sum: 1 },
          unit: { $first: "$unit" },
        },
      },
      {
        $lookup: {
          from: InventoryItemModel.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "inventory",
        },
      },
      { $unwind: { path: "$inventory", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          inventoryItemId: "$_id",
          name: "$inventory.name",
          category: "$inventory.category",
          totalConsumed: 1,
          movementCount: 1,
          unit: 1,
        },
      },
      { $sort: { totalConsumed: -1 } },
    ]);

    const salesPerShiftRaw = await OrderModel.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          branchId: new mongoose.Types.ObjectId(branchId),
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: [POS_ORDER_STATUS.SERVED, POS_ORDER_STATUS.COMPLETED] },
        },
      },
      {
        $group: {
          _id: "$shiftId",
          salesAmount: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
          avgTicket: { $avg: "$totalAmount" },
        },
      },
      {
        $lookup: {
          from: "barshifts",
          localField: "_id",
          foreignField: "_id",
          as: "shift",
        },
      },
      { $unwind: { path: "$shift", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          shiftId: "$_id",
          shiftName: { $ifNull: ["$shift.shiftName", "Unassigned Shift"] },
          openedAt: "$shift.openedAt",
          closedAt: "$shift.closedAt",
          salesAmount: { $round: ["$salesAmount", 2] },
          orderCount: 1,
          avgTicket: { $round: ["$avgTicket", 2] },
        },
      },
      { $sort: { salesAmount: -1 } },
    ]);

    const wastageRaw = await InventoryMovementModel.aggregate([
      {
        $match: {
          ...baseMatch,
          movementType: INVENTORY_MOVEMENT_TYPE.WASTAGE,
        },
      },
      {
        $group: {
          _id: "$inventoryItemId",
          totalWasted: { $sum: "$quantity" },
          wasteEvents: { $sum: 1 },
          unit: { $first: "$unit" },
        },
      },
      {
        $lookup: {
          from: InventoryItemModel.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "inventory",
        },
      },
      { $unwind: { path: "$inventory", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          inventoryItemId: "$_id",
          name: "$inventory.name",
          category: "$inventory.category",
          totalWasted: 1,
          wasteEvents: 1,
          unit: 1,
        },
      },
      { $sort: { totalWasted: -1 } },
    ]);

    const orders = await OrderModel.find({
      tenantId,
      branchId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: [POS_ORDER_STATUS.SERVED, POS_ORDER_STATUS.COMPLETED] },
    } as any)
      .select("items")
      .lean();
    const menuItems = await MenuItemModel.find({ tenantId, branchId } as any)
      .select("name recipe")
      .lean();
    const inventory = await InventoryItemModel.find({ tenantId, branchId } as any)
      .select("unitCost")
      .lean();

    const menuMap = new Map(menuItems.map((m: any) => [String(m._id), m]));
    const inventoryCostMap = new Map(
      inventory.map((item: any) => [String(item._id), Number(item.unitCost ?? 0)])
    );
    const productProfitMap = new Map<
      string,
      { productName: string; quantitySold: number; revenue: number; cogs: number }
    >();

    for (const order of orders) {
      for (const item of order.items ?? []) {
        const menu = menuMap.get(String(item.menuItemId));
        const key = String(item.menuItemId);
        if (!menu) continue;
        const recipeCostPerUnit = (menu.recipe ?? []).reduce(
          (sum: number, ingredient: any) =>
            sum +
            Number(ingredient.quantity ?? 0) *
              Number(inventoryCostMap.get(String(ingredient.inventoryItemId)) ?? 0),
          0
        );
        const quantity = Number(item.quantity ?? 0);
        const revenue = Number(item.amount ?? 0);
        const cogs = Number((recipeCostPerUnit * quantity).toFixed(2));
        const row = productProfitMap.get(key) ?? {
          productName: menu.name,
          quantitySold: 0,
          revenue: 0,
          cogs: 0,
        };
        row.quantitySold += quantity;
        row.revenue += revenue;
        row.cogs += cogs;
        productProfitMap.set(key, row);
      }
    }

    const productProfit = Array.from(productProfitMap.values())
      .map((row) => ({
        ...row,
        revenue: Number(row.revenue.toFixed(2)),
        cogs: Number(row.cogs.toFixed(2)),
        profit: Number((row.revenue - row.cogs).toFixed(2)),
      }))
      .sort((a, b) => b.profit - a.profit);

    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      liquorConsumption: liquorConsumptionRaw,
      salesPerShift: salesPerShiftRaw,
      profitPerProduct: productProfit,
      wastage: wastageRaw,
    });
  },
  { auth: true }
);
