import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import {
  USER_ROLES,
  INVENTORY_MOVEMENT_TYPE,
  PROCUREMENT_ORDER_STATUS,
} from "@/constants";
import PurchaseOrder from "@/models/procurement/PurchaseOrder";
import Supplier from "@/models/procurement/Supplier";
import mongoose from "mongoose";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.INVENTORY_MANAGER,
      USER_ROLES.STOREKEEPER,
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
    const InventoryItemModel =
      getInventoryItemModelForDepartment("inventoryProcurement");
    const InventoryMovementModel =
      getInventoryMovementModelForDepartment("inventoryProcurement");

    const [inventoryTotals, lowStockItems, consumption, poStats, supplierPerf] =
      await Promise.all([
        InventoryItemModel.aggregate([
          { $match: { tenantId: tenantOid, branchId: branchOid } },
          {
            $group: {
              _id: null,
              totalItems: { $sum: 1 },
              stockValue: { $sum: { $multiply: ["$currentStock", "$unitCost"] } },
            },
          },
        ]),
        InventoryItemModel.find({
          tenantId: tenantOid,
          branchId: branchOid,
          $expr: {
            $and: [
              { $gt: ["$reorderLevel", 0] },
              { $lte: ["$currentStock", "$reorderLevel"] },
            ],
          },
        } as any)
          .select("name currentStock reorderLevel category")
          .limit(20)
          .lean(),
        InventoryMovementModel.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              movementType: {
                $in: [
                  INVENTORY_MOVEMENT_TYPE.SALE,
                  INVENTORY_MOVEMENT_TYPE.WASTAGE,
                  INVENTORY_MOVEMENT_TYPE.ADJUSTMENT,
                ],
              },
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: "$inventoryItemId",
              quantity: { $sum: "$quantity" },
            },
          },
          { $sort: { quantity: -1 } },
          { $limit: 15 },
          {
            $lookup: {
              from: InventoryItemModel.collection.name,
              localField: "_id",
              foreignField: "_id",
              as: "item",
            },
          },
          { $unwind: { path: "$item", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              inventoryItemId: "$_id",
              itemName: "$item.name",
              quantity: { $round: ["$quantity", 2] },
              unit: "$item.unit",
            },
          },
        ]),
        PurchaseOrder.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              orderDate: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalAmount: { $sum: "$totalAmount" },
            },
          },
        ]),
        PurchaseOrder.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              orderDate: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: "$supplierId",
              orders: { $sum: 1 },
              totalSpend: { $sum: "$totalAmount" },
              fulfilledOrders: {
                $sum: {
                  $cond: [{ $eq: ["$status", PROCUREMENT_ORDER_STATUS.RECEIVED] }, 1, 0],
                },
              },
            },
          },
          { $sort: { totalSpend: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "suppliers",
              localField: "_id",
              foreignField: "_id",
              as: "supplier",
            },
          },
          { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              supplierId: "$_id",
              supplierName: "$supplier.name",
              orders: 1,
              totalSpend: { $round: ["$totalSpend", 2] },
              fulfillmentRate: {
                $round: [
                  {
                    $cond: [
                      { $gt: ["$orders", 0] },
                      { $multiply: [{ $divide: ["$fulfilledOrders", "$orders"] }, 100] },
                      0,
                    ],
                  },
                  2,
                ],
              },
            },
          },
        ]),
      ]);

    const statusSummary = poStats.reduce(
      (acc, row) => {
        acc[row._id as string] = {
          count: row.count ?? 0,
          totalAmount: Math.round((row.totalAmount ?? 0) * 100) / 100,
        };
        return acc;
      },
      {} as Record<string, { count: number; totalAmount: number }>
    );

    const supplierCount = await Supplier.countDocuments({
      tenantId: tenantOid,
      branchId: branchOid,
    } as any);

    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      stockValuation: {
        totalItems: inventoryTotals[0]?.totalItems ?? 0,
        stockValue: Math.round((inventoryTotals[0]?.stockValue ?? 0) * 100) / 100,
      },
      lowStockAlerts: {
        count: lowStockItems.length,
        items: lowStockItems,
      },
      consumptionReport: consumption,
      supplierPerformance: {
        supplierCount,
        topSuppliers: supplierPerf,
      },
      purchaseOrders: {
        statusSummary,
      },
    });
  },
  { auth: true }
);
