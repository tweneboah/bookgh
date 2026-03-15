import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import {
  DEPARTMENT,
  INVENTORY_MOVEMENT_TYPE,
  PROCUREMENT_ORDER_STATUS,
  USER_ROLES,
} from "@/constants";
import { receivePurchaseOrderSchema } from "@/validations/procurement";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";
import ActivityLog from "@/models/shared/ActivityLog";
import {
  getPurchaseOrderModelForDepartment,
  getSupplierModelForDepartment,
  normalizeProcurementDepartment,
} from "@/lib/department-procurement";
import mongoose from "mongoose";
import { convertToBaseUnitQuantity } from "@/lib/unit-conversion";

const PROCUREMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.INVENTORY_MANAGER,
  USER_ROLES.STOREKEEPER,
  USER_ROLES.RESTAURANT_MANAGER,
] as const;

async function resolveInventoryItemForReceive({
  linePayload,
  poLine,
  tenantId,
  branchId,
  InventoryItemModel,
  supplierName,
}: {
  linePayload: { inventoryItemId?: string };
  poLine: any;
  tenantId: string;
  branchId: string;
  InventoryItemModel: any;
  supplierName?: string;
}) {
  const candidates = [linePayload.inventoryItemId, poLine.inventoryItemId]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  for (const id of candidates) {
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    const existing = await InventoryItemModel.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any);
    if (existing) {
      poLine.inventoryItemId = existing._id;
      return existing;
    }
  }

  const itemName = String(poLine.itemName ?? "").trim();
  if (!itemName) return null;
  const unit = String(poLine.unit ?? "unit").trim() || "unit";
  const unitCost = Number(poLine.unitCost ?? 0);
  const created = await InventoryItemModel.create({
    tenantId,
    branchId,
    name: itemName,
    category: "Procured",
    unit,
    currentStock: 0,
    minimumStock: 0,
    reorderLevel: 0,
    unitCost: Number.isFinite(unitCost) ? unitCost : 0,
    ...(supplierName?.trim() ? { supplier: supplierName.trim() } : {}),
  } as any);
  poLine.inventoryItemId = created._id;
  return created;
}

export const POST = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const PurchaseOrderModel = getPurchaseOrderModelForDepartment(department);
    const payload = receivePurchaseOrderSchema.parse(await req.json());
    const receiveToDepartment =
      payload.receiveToDepartment ?? DEPARTMENT.RESTAURANT;
    const receiptNumber = `GRN-${Date.now().toString().slice(-8)}`;
    const InventoryItemModel = getInventoryItemModelForDepartment(receiveToDepartment);
    const InventoryMovementModel =
      getInventoryMovementModelForDepartment(receiveToDepartment);
    const po = await PurchaseOrderModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any);
    if (!po) throw new NotFoundError("Purchase order");
    if (po.status === PROCUREMENT_ORDER_STATUS.CANCELLED) {
      throw new BadRequestError("Cannot receive a cancelled purchase order");
    }
    if (po.status === PROCUREMENT_ORDER_STATUS.RECEIVED) {
      throw new BadRequestError("Purchase order already fully received");
    }

    let supplierName: string | undefined;
    if (po.supplierId) {
      const SupplierModel = getSupplierModelForDepartment(department);
      const supplier = await SupplierModel.findOne({
        _id: po.supplierId,
        tenantId,
        branchId,
      } as any).lean();
      if (supplier?.name) supplierName = String(supplier.name).trim();
    }

    const receivedAt = payload.receivedDate ? new Date(payload.receivedDate) : new Date();
    const receiptLines: Array<{
      inventoryItemId: string;
      itemName: string;
      quantity: number;
      unit: string;
      previousStock: number;
      resultingStock: number;
      remainingQuantity: number;
    }> = [];

    for (const linePayload of payload.lines) {
      const poLine = po.lines?.[linePayload.lineIndex];
      if (!poLine) {
        throw new BadRequestError(
          `PO line ${linePayload.lineIndex + 1} was not found on this purchase order`
        );
      }
      const totalQty = Number(poLine.quantity ?? 0);
      const alreadyReceived = Number(poLine.receivedQuantity ?? 0);
      const remaining = Number((totalQty - alreadyReceived).toFixed(4));
      const incomingQty = Number(linePayload.quantity ?? 0);
      if (incomingQty <= 0) continue;
      if (incomingQty > remaining + 0.000001) {
        throw new BadRequestError(
          `Cannot receive ${incomingQty} for ${poLine.itemName}. Remaining: ${remaining}`
        );
      }

      const inventory = await resolveInventoryItemForReceive({
        linePayload,
        poLine,
        tenantId,
        branchId,
        InventoryItemModel,
        supplierName,
      });
      if (!inventory) {
        throw new NotFoundError(`Inventory item for PO line ${linePayload.lineIndex + 1}`);
      }
      if (supplierName && (!inventory.supplier || !String(inventory.supplier).trim())) {
        (inventory as any).supplier = supplierName;
      }
      const converted = convertToBaseUnitQuantity({
        item: inventory,
        quantity: incomingQty,
        enteredUnit: String(poLine.unit ?? inventory.unit ?? "unit"),
      });
      if (!converted) {
        throw new BadRequestError(
          `Unit '${poLine.unit}' is not configured for ${inventory.name}. Base unit is ${inventory.unit}.`
        );
      }
      const baseIncomingQty = converted.baseQuantity;
      const previousStock = Number(inventory.currentStock ?? 0);
      const resultingStock = Number((previousStock + baseIncomingQty).toFixed(4));
      inventory.currentStock = resultingStock;
      inventory.lastRestockedAt = receivedAt;
      await inventory.save();

      poLine.receivedQuantity = Number((alreadyReceived + incomingQty).toFixed(4));

      await InventoryMovementModel.create({
        tenantId,
        branchId,
        inventoryItemId: inventory._id,
        movementType: INVENTORY_MOVEMENT_TYPE.RESTOCK,
        quantity: baseIncomingQty,
        unit: String(inventory.unit ?? "unit"),
        previousStock,
        resultingStock,
        reason: `PO ${po.poNumber} receipt`,
        createdBy: auth.userId,
        metadata: {
          source: "po-receipt",
          receiptType: "partial",
          receiptNumber,
          department: receiveToDepartment,
          purchaseOrderId: po._id,
          poNumber: po.poNumber,
          deliveryNoteNumber: payload.deliveryNoteNumber,
          supplierId: po.supplierId,
          note: payload.notes,
          enteredUnit: String(poLine.unit ?? inventory.unit ?? "unit"),
          enteredQuantity: incomingQty,
          conversionFactor: converted.factor,
        },
        createdAt: receivedAt,
        updatedAt: receivedAt,
      } as any);

      receiptLines.push({
        inventoryItemId: String(inventory._id),
        itemName: String(poLine.itemName ?? ""),
        quantity: baseIncomingQty,
        unit: String(inventory.unit ?? "unit"),
        previousStock,
        resultingStock,
        remainingQuantity: Number((remaining - incomingQty).toFixed(4)),
      });
    }

    if (!receiptLines.length) {
      throw new BadRequestError("No valid receipt lines provided");
    }

    const allReceived = (po.lines ?? []).every(
      (line) =>
        Number((line.receivedQuantity ?? 0).toFixed(4)) >=
        Number((line.quantity ?? 0).toFixed(4))
    );
    po.status = allReceived
      ? PROCUREMENT_ORDER_STATUS.RECEIVED
      : PROCUREMENT_ORDER_STATUS.PARTIALLY_RECEIVED;
    po.receivedDate = allReceived ? receivedAt : po.receivedDate;
    await po.save();

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "purchaseOrder",
      resourceId: po._id,
      details: {
        event: "partialReceive",
        receiptNumber,
        deliveryNoteNumber: payload.deliveryNoteNumber,
        receiveToDepartment,
        receivedAt,
        lines: receiptLines,
      },
    } as any);

    return successResponse({
      purchaseOrderId: String(po._id),
      poNumber: po.poNumber,
      receiptNumber,
      deliveryNoteNumber: payload.deliveryNoteNumber ?? null,
      status: po.status,
      receiveToDepartment,
      receivedAt: receivedAt.toISOString(),
      lines: receiptLines,
    });
  },
  { auth: true }
);
