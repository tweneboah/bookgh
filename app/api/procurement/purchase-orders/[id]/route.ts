import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import {
  USER_ROLES,
  PROCUREMENT_ORDER_STATUS,
  INVENTORY_MOVEMENT_TYPE,
  DEPARTMENT,
} from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import { updatePurchaseOrderSchema } from "@/validations/procurement";
import mongoose from "mongoose";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";
import {
  getPurchaseOrderModelForDepartment,
  getSupplierModelForDepartment,
  normalizeProcurementDepartment,
} from "@/lib/department-procurement";
import { convertToBaseUnitQuantity } from "@/lib/unit-conversion";

const PROCUREMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.INVENTORY_MANAGER,
  USER_ROLES.STOREKEEPER,
] as const;

function toObjectId(value: string) {
  return new mongoose.Types.ObjectId(value);
}

async function normalizeIncomingLines(input: {
  lines: Array<any>;
  tenantId: string;
  branchId: string;
  InventoryItemModel: any;
}) {
  const inventoryIds = input.lines
    .map((line) => String(line.inventoryItemId ?? ""))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  const inventoryItems = inventoryIds.length
    ? await input.InventoryItemModel.find({
        _id: { $in: inventoryIds },
        tenantId: input.tenantId,
        branchId: input.branchId,
      } as any)
        .select("_id unit unitCost name")
        .lean()
    : [];
  const inventoryMap = new Map(
    inventoryItems.map((item: any) => [String(item._id), item])
  );
  return input.lines.map((line) => {
    const quantity = Number(line.quantity ?? 0);
    const inventory = line.inventoryItemId
      ? inventoryMap.get(String(line.inventoryItemId))
      : null;
    const unitCost = Number(line.unitCost ?? inventory?.unitCost ?? 0);
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      throw new BadRequestError(
        `Unit cost is required and must be greater than zero for ${line.itemName}.`
      );
    }
    const totalCost = Number((quantity * unitCost).toFixed(2));
    return {
      ...line,
      quantity,
      unitCost,
      totalCost,
      unit: String(line.unit ?? inventory?.unit ?? "unit"),
      itemName: String(line.itemName ?? inventory?.name ?? "Item"),
      inventoryItemId: line.inventoryItemId ? toObjectId(line.inventoryItemId) : undefined,
    };
  });
}

async function resolveInventoryItemForReceipt({
  line,
  tenantId,
  branchId,
  InventoryItemModel,
}: {
  line: any;
  tenantId: string;
  branchId: string;
  InventoryItemModel: any;
}) {
  const lineInventoryId = line.inventoryItemId ? String(line.inventoryItemId) : "";
  if (lineInventoryId && mongoose.Types.ObjectId.isValid(lineInventoryId)) {
    const existing = await InventoryItemModel.findOne({
      _id: lineInventoryId,
      tenantId,
      branchId,
    } as any);
    if (existing) return existing;
  }

  const itemName = String(line.itemName ?? "").trim();
  if (!itemName) return null;
  const unit = String(line.unit ?? "unit").trim() || "unit";
  const unitCost = Number(line.unitCost ?? 0);
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
  } as any);
  line.inventoryItemId = created._id;
  return created;
}

export const GET = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const PurchaseOrderModel = getPurchaseOrderModelForDepartment(department);
    const SupplierModel = getSupplierModelForDepartment(department);
    const doc = await PurchaseOrderModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    if (!doc) throw new NotFoundError("Purchase order");
    const supplier = doc.supplierId
      ? await SupplierModel.findOne({
          _id: doc.supplierId,
          tenantId,
          branchId,
        } as any)
          .select("_id name")
          .lean()
      : null;
    return successResponse({
      ...doc,
      supplierId: supplier ?? doc.supplierId,
    });
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const PurchaseOrderModel = getPurchaseOrderModelForDepartment(department);
    const body = updatePurchaseOrderSchema.parse(await req.json());
    const receiveToDepartment =
      body.receiveToDepartment ?? DEPARTMENT.INVENTORY_PROCUREMENT;
    const InventoryItemModel = getInventoryItemModelForDepartment(receiveToDepartment);
    const InventoryMovementModel =
      getInventoryMovementModelForDepartment(receiveToDepartment);
    const payload = {
      ...body,
      receiveToDepartment: undefined,
      ...(body.supplierId ? { supplierId: toObjectId(body.supplierId) } : {}),
      ...(body.requestedBy ? { requestedBy: toObjectId(body.requestedBy) } : {}),
      ...(body.approvedBy ? { approvedBy: toObjectId(body.approvedBy) } : {}),
      ...(body.orderDate ? { orderDate: new Date(body.orderDate) } : {}),
      ...(body.expectedDate ? { expectedDate: new Date(body.expectedDate) } : {}),
      ...(body.receivedDate ? { receivedDate: new Date(body.receivedDate) } : {}),
      ...(body.lines
        ? {
            lines: await normalizeIncomingLines({
              lines: body.lines,
              tenantId,
              branchId,
              InventoryItemModel,
            }),
          }
        : {}),
    };
    if (payload.lines) {
      const subtotal = Number(
        payload.lines.reduce((sum, line) => sum + Number(line.totalCost ?? 0), 0).toFixed(2)
      );
      const taxAmount = Number(payload.taxAmount ?? 0);
      payload.subtotal = subtotal;
      payload.totalAmount = Number((subtotal + taxAmount).toFixed(2));
    }

    const before = await PurchaseOrderModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    const doc = await PurchaseOrderModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as any,
      payload,
      { new: true, runValidators: true }
    );
    if (!doc) throw new NotFoundError("Purchase order");

    if (
      before?.status !== PROCUREMENT_ORDER_STATUS.RECEIVED &&
      doc.status === PROCUREMENT_ORDER_STATUS.RECEIVED
    ) {
      let lineMappingChanged = false;
      for (const line of doc.lines ?? []) {
        const hadInventoryId = !!line.inventoryItemId;
        const item = await resolveInventoryItemForReceipt({
          line,
          tenantId,
          branchId,
          InventoryItemModel,
        });
        if (!item) continue;
        if (!hadInventoryId && line.inventoryItemId) {
          lineMappingChanged = true;
        }
        const converted = convertToBaseUnitQuantity({
          item,
          quantity: Number(line.quantity ?? 0),
          enteredUnit: String(line.unit ?? item.unit ?? "unit"),
        });
        if (!converted) {
          throw new BadRequestError(
            `Unit '${line.unit}' is not configured for ${item.name}. Base unit is ${item.unit}.`
          );
        }
        const previousStock = Number(item.currentStock ?? 0);
        const resultingStock = previousStock + converted.baseQuantity;
        item.currentStock = resultingStock;
        item.lastRestockedAt = new Date();
        await item.save();

        await InventoryMovementModel.create({
          tenantId,
          branchId,
          inventoryItemId: item._id,
          movementType: INVENTORY_MOVEMENT_TYPE.RESTOCK,
          quantity: converted.baseQuantity,
          unit: String(item.unit ?? "unit"),
          previousStock,
          resultingStock,
          reason: `PO ${doc.poNumber} received`,
          createdBy: auth.userId,
          metadata: {
            purchaseOrderId: doc._id,
            supplierId: doc.supplierId,
            department: receiveToDepartment,
            enteredUnit: String(line.unit ?? item.unit ?? "unit"),
            enteredQuantity: Number(line.quantity ?? 0),
            conversionFactor: converted.factor,
          },
        } as any);
      }
      if (lineMappingChanged) {
        await doc.save();
      }
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "purchaseOrder",
      resourceId: doc._id,
      details: payload,
    } as any);

    return successResponse(doc.toObject());
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const PurchaseOrderModel = getPurchaseOrderModelForDepartment(department);
    const doc = await PurchaseOrderModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as any);
    if (!doc) throw new NotFoundError("Purchase order");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "purchaseOrder",
      resourceId: doc._id,
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
