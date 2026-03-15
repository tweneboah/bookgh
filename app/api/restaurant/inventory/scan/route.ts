import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { INVENTORY_MOVEMENT_TYPE, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";

const RESTAURANT_STOCK_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.STOREKEEPER,
  USER_ROLES.PROCUREMENT_OFFICER,
  USER_ROLES.HEAD_CHEF,
  USER_ROLES.SOUS_CHEF,
  USER_ROLES.KITCHEN_STAFF,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_STOCK_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const InventoryItemModel = getInventoryItemModelForDepartment("restaurant");
    const sku = req.nextUrl.searchParams.get("sku")?.trim();
    if (!sku) throw new BadRequestError("sku is required");
    const doc = await InventoryItemModel.findOne({ tenantId, branchId, sku } as any).lean();
    if (!doc) throw new NotFoundError("Inventory item");
    return successResponse(doc);
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_STOCK_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const InventoryItemModel = getInventoryItemModelForDepartment("restaurant");
    const InventoryMovementModel = getInventoryMovementModelForDepartment("restaurant");
    const body = (await req.json()) as {
      sku?: string;
      quantity?: number;
      mode?: "add" | "set";
      reason?: string;
    };
    const sku = body.sku?.trim();
    const quantity = Number(body.quantity ?? 0);
    const mode = body.mode ?? "add";
    if (!sku) throw new BadRequestError("sku is required");
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new BadRequestError("quantity must be a positive number");
    }
    const item = await InventoryItemModel.findOne({ tenantId, branchId, sku } as any);
    if (!item) throw new NotFoundError("Inventory item");

    const previousStock = Number(item.currentStock ?? 0);
    const resultingStock =
      mode === "set" ? quantity : previousStock + quantity;
    item.currentStock = resultingStock;
    await item.save();

    await InventoryMovementModel.create({
      tenantId,
      branchId,
      inventoryItemId: item._id,
      movementType: INVENTORY_MOVEMENT_TYPE.ADJUSTMENT,
      quantity: mode === "set" ? Math.abs(resultingStock - previousStock) : quantity,
      unit: String(item.unit ?? "unit"),
      previousStock,
      resultingStock,
      reason: body.reason ?? `Barcode scan (${mode})`,
      createdBy: auth.userId,
      metadata: { sku, mode },
    } as any);

    await writeActivityLog(req, auth, {
      action: "RESTAURANT_BARCODE_STOCK_UPDATED",
      resource: "inventoryItem",
      resourceId: String(item._id),
      details: { sku, mode, quantity, previousStock, resultingStock },
    });

    return successResponse(item.toObject());
  },
  { auth: true }
);
