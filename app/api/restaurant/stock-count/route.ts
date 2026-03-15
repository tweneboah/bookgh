import { withHandler } from "@/lib/with-handler";
import { createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { INVENTORY_MOVEMENT_TYPE, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";
import { createRestaurantStockCountSchema } from "@/validations/restaurant";

const RESTAURANT_STOCK_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.STOREKEEPER,
  USER_ROLES.PROCUREMENT_OFFICER,
  USER_ROLES.HEAD_CHEF,
  USER_ROLES.SOUS_CHEF,
  USER_ROLES.KITCHEN_STAFF,
  USER_ROLES.ACCOUNTANT,
] as const;

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_STOCK_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const InventoryItemModel = getInventoryItemModelForDepartment("restaurant");
    const InventoryMovementModel = getInventoryMovementModelForDepartment("restaurant");
    const payload = createRestaurantStockCountSchema.parse(await req.json());
    const countId = `SC-${Date.now()}`;
    const countedAt = payload.countedAt ? new Date(payload.countedAt) : new Date();

    const results: Array<{
      inventoryItemId: string;
      itemName: string;
      unit: string;
      systemStock: number;
      physicalStock: number;
      variance: number;
      movementId: string;
      note?: string;
    }> = [];

    for (const line of payload.lines) {
      const item = await InventoryItemModel.findOne({
        _id: line.inventoryItemId,
        tenantId,
        branchId,
      } as any);
      if (!item) throw new NotFoundError(`Inventory item ${line.inventoryItemId}`);

      const systemStock = Number(item.currentStock ?? 0);
      const physicalStock = Number(line.physicalStock ?? 0);
      const variance = Number((physicalStock - systemStock).toFixed(4));

      item.currentStock = physicalStock;
      await item.save();

      const movement = await InventoryMovementModel.create({
        tenantId,
        branchId,
        inventoryItemId: item._id,
        movementType: INVENTORY_MOVEMENT_TYPE.ADJUSTMENT,
        quantity: Math.abs(variance),
        unit: String(item.unit ?? "unit"),
        previousStock: systemStock,
        resultingStock: physicalStock,
        reason: `Stock count ${countId}`,
        createdBy: auth.userId,
        createdAt: countedAt,
        updatedAt: countedAt,
        metadata: {
          source: "stock-count",
          stockCountId: countId,
          physicalStock,
          systemStock,
          variance,
          note: line.note,
          headerNotes: payload.notes,
        },
      } as any);

      results.push({
        inventoryItemId: String(item._id),
        itemName: String(item.name ?? ""),
        unit: String(item.unit ?? "unit"),
        systemStock,
        physicalStock,
        variance,
        movementId: String(movement._id),
        note: line.note,
      });
    }

    const totals = results.reduce(
      (acc, row) => {
        acc.items += 1;
        acc.netVariance += row.variance;
        acc.totalVarianceAbs += Math.abs(row.variance);
        if (row.variance < 0) acc.lossItems += 1;
        if (row.variance > 0) acc.gainItems += 1;
        return acc;
      },
      { items: 0, lossItems: 0, gainItems: 0, netVariance: 0, totalVarianceAbs: 0 }
    );

    await writeActivityLog(req, auth, {
      action: "RESTAURANT_STOCK_COUNT_COMPLETED",
      resource: "inventoryMovement",
      resourceId: countId,
      details: {
        countedAt,
        notes: payload.notes,
        totals,
      },
    });

    return createdResponse({
      stockCountId: countId,
      countedAt: countedAt.toISOString(),
      totals: {
        ...totals,
        netVariance: Math.round(totals.netVariance * 10000) / 10000,
        totalVarianceAbs: Math.round(totals.totalVarianceAbs * 10000) / 10000,
      },
      rows: results,
    });
  },
  { auth: true }
);
