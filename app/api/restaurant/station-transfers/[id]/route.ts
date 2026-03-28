import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { USER_ROLES, STOCK_LOCATION, STATION_TRANSFER_STATUS } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import mongoose from "mongoose";
import {
  getStationTransferModelForDepartment,
  getLocationStockModelForDepartment,
  getStationMovementModelForDepartment,
  normalizeMovementDepartment,
} from "@/lib/department-movement";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";
import { updateStationTransferSchema } from "@/validations/restaurant";

const RESTAURANT_MOVEMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.STOREKEEPER,
  USER_ROLES.PROCUREMENT_OFFICER,
  USER_ROLES.HEAD_CHEF,
  USER_ROLES.SOUS_CHEF,
  USER_ROLES.KITCHEN_STAFF,
] as const;

function toObjectId(value: string) {
  return new mongoose.Types.ObjectId(value);
}

async function applyStationTransferCompletion({
  doc,
  tenantId,
  branchId,
  department,
  userId,
}: {
  doc: any;
  tenantId: string;
  branchId: string;
  department: string;
  userId: string;
}) {
  const InventoryItemModel = getInventoryItemModelForDepartment(department);
  const LocationStockModel = getLocationStockModelForDepartment(department);
  const StationMovementModel = getStationMovementModelForDepartment(department);

  for (const line of doc.lines ?? []) {
    const invId = line.inventoryItemId?._id ?? line.inventoryItemId;
    const qty = Number(line.quantity ?? 0);
    const unit = String(line.unit ?? "unit").trim();
    const itemName = String(line.itemName ?? "").trim();
    if (qty <= 0) continue;

    const fromLoc = doc.fromLocation;
    const toLoc = doc.toLocation;

    // Deduct from source
    if (fromLoc === STOCK_LOCATION.MAIN_STORE) {
      const item = await InventoryItemModel.findOne({
        _id: invId,
        tenantId,
        branchId,
      } as any);
      if (!item) throw new NotFoundError(`Inventory item ${itemName}`);
      const prev = Number(item.currentStock ?? 0);
      const next = Math.max(0, prev - qty);
      if (prev < qty) {
        throw new BadRequestError(
          `Insufficient stock for ${itemName} in Main Store. Available: ${prev} ${unit}, requested: ${qty}`
        );
      }
      item.currentStock = next;
      await item.save();
    } else {
      const locStock = await LocationStockModel.findOne({
        inventoryItemId: invId,
        location: fromLoc,
        tenantId,
        branchId,
        department,
      } as any);
      const prev = locStock ? Number(locStock.quantity ?? 0) : 0;
      if (prev < qty) {
        throw new BadRequestError(
          `Insufficient stock for ${itemName} in ${fromLoc}. Available: ${prev} ${unit}, requested: ${qty}`
        );
      }
      if (locStock) {
        locStock.quantity = Math.max(0, prev - qty);
        await locStock.save();
      }
    }

    // Add to destination
    if (toLoc === STOCK_LOCATION.MAIN_STORE) {
      const item = await InventoryItemModel.findOne({
        _id: invId,
        tenantId,
        branchId,
      } as any);
      if (!item) throw new NotFoundError(`Inventory item ${itemName}`);
      const prev = Number(item.currentStock ?? 0);
      item.currentStock = prev + qty;
      await item.save();
    } else {
      let locStock = await LocationStockModel.findOne({
        inventoryItemId: invId,
        location: toLoc,
        tenantId,
        branchId,
        department,
      } as any);
      if (!locStock) {
        locStock = await LocationStockModel.create({
          tenantId,
          branchId,
          department,
          inventoryItemId: invId,
          location: toLoc,
          quantity: qty,
          unit,
        } as any);
      } else {
        locStock.quantity = Number(locStock.quantity ?? 0) + qty;
        await locStock.save();
      }
    }

    // Audit log
    await StationMovementModel.create({
      tenantId,
      branchId,
      department,
      stationTransferId: doc._id,
      inventoryItemId: invId,
      itemName,
      fromLocation: fromLoc,
      toLocation: toLoc,
      quantity: qty,
      unit,
      usedQty: line.usedQty,
      leftoverQty: line.leftoverQty,
      reason: `Station transfer ${doc.transferNumber}`,
      createdBy: userId,
    } as any);
  }
}

export const GET = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_MOVEMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeMovementDepartment(
      req.nextUrl.searchParams.get("department"),
      "restaurant"
    );
    const StationTransferModel = getStationTransferModelForDepartment(department);
    const doc = await StationTransferModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any)
      .populate("lines.inventoryItemId", "name unit")
      .lean();
    if (!doc) throw new NotFoundError("Station transfer");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_MOVEMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeMovementDepartment(
      req.nextUrl.searchParams.get("department"),
      "restaurant"
    );
    const StationTransferModel = getStationTransferModelForDepartment(department);
    const body = await req.json();
    const data = updateStationTransferSchema.parse(body);

    const before = await StationTransferModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    if (!before) throw new NotFoundError("Station transfer");

    const payload: Record<string, unknown> = {};
    if (data.fromLocation != null) payload.fromLocation = data.fromLocation;
    if (data.toLocation != null) payload.toLocation = data.toLocation;
    if (data.transferDate != null) payload.transferDate = new Date(data.transferDate);
    if (data.status != null) payload.status = data.status;
    if (data.notes != null) payload.notes = data.notes;
    if (data.lines != null) {
      payload.lines = data.lines.map((line) => ({
        inventoryItemId: toObjectId(line.inventoryItemId),
        itemName: line.itemName,
        quantity: line.quantity,
        unit: line.unit,
        usedQty: line.usedQty,
        leftoverQty: line.leftoverQty,
        note: line.note,
      }));
    }

    const doc = await StationTransferModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as any,
      payload,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Station transfer");

    // Complete transfer: apply stock movements
    if (
      before.status !== STATION_TRANSFER_STATUS.COMPLETED &&
      doc.status === STATION_TRANSFER_STATUS.COMPLETED
    ) {
      await applyStationTransferCompletion({
        doc,
        tenantId,
        branchId,
        department,
        userId: auth.userId,
      });
      // Update completedAt
      await StationTransferModel.updateOne(
        { _id: params.id, tenantId, branchId } as any,
        { $set: { completedAt: new Date() } }
      );
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "stationTransfer",
      resourceId: doc._id,
      details: payload,
    } as any);

    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_MOVEMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeMovementDepartment(
      req.nextUrl.searchParams.get("department"),
      "restaurant"
    );
    const StationTransferModel = getStationTransferModelForDepartment(department);
    const doc = await StationTransferModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as any);
    if (!doc) throw new NotFoundError("Station transfer");

    if (doc.status === STATION_TRANSFER_STATUS.COMPLETED) {
      throw new BadRequestError("Cannot delete a completed transfer. Reverse it instead.");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "stationTransfer",
      resourceId: doc._id,
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
