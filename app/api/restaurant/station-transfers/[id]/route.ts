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
import { stationTransferDebug } from "@/lib/station-transfer-debug";

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

/** Resolve line inventory ref from lean or populated subdocs */
function inventoryItemIdFromLine(line: { inventoryItemId?: unknown }) {
  const raw = (line.inventoryItemId as { _id?: unknown } | undefined)?._id ?? line.inventoryItemId;
  if (raw == null) return null;
  if (raw instanceof mongoose.Types.ObjectId) return raw;
  try {
    return new mongoose.Types.ObjectId(String(raw));
  } catch {
    return null;
  }
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

  stationTransferDebug("applyStationTransferCompletion:start", {
    transferId: String(doc._id),
    transferNumber: doc.transferNumber,
    department,
    inventoryCollection: InventoryItemModel.collection.name,
    locationStockCollection: LocationStockModel.collection.name,
    fromLocation: doc.fromLocation,
    toLocation: doc.toLocation,
    lineCount: (doc.lines ?? []).length,
  });

  for (const line of doc.lines ?? []) {
    const invId = inventoryItemIdFromLine(line);
    const qty = Number(line.quantity ?? 0);
    const unit = String(line.unit ?? "unit").trim();
    const itemName = String(line.itemName ?? "").trim();
    if (qty <= 0) {
      stationTransferDebug("line:skip", { reason: "qty<=0", qty, itemName });
      continue;
    }
    if (!invId) {
      throw new BadRequestError("Transfer line is missing inventory item");
    }

    const fromLoc = doc.fromLocation;
    const toLoc = doc.toLocation;

    stationTransferDebug("line", {
      itemName,
      invId: String(invId),
      qty,
      unit,
      fromLoc,
      toLoc,
      mainStoreConstant: STOCK_LOCATION.MAIN_STORE,
      fromMatchesMainStore: fromLoc === STOCK_LOCATION.MAIN_STORE,
    });

    // Deduct from source
    if (fromLoc === STOCK_LOCATION.MAIN_STORE) {
      const item = await InventoryItemModel.findOne({
        _id: invId,
        tenantId,
        branchId,
      } as any);
      stationTransferDebug("mainStore:findOne", {
        found: !!item,
        invId: String(invId),
        currentStock: item ? Number(item.currentStock ?? 0) : null,
      });
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
      stationTransferDebug("mainStore:deduct:saved", {
        invId: String(invId),
        prev,
        next,
        collection: InventoryItemModel.collection.name,
      });
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
      stationTransferDebug("locationStock:deduct", {
        fromLoc,
        invId: String(invId),
        prev,
        after: locStock ? Number(locStock.quantity ?? 0) : null,
      });
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
      stationTransferDebug("locationStock:add", {
        toLoc,
        invId: String(invId),
        quantityAfter: Number(locStock.quantity ?? 0),
      });
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

  stationTransferDebug("applyStationTransferCompletion:done", {
    transferId: String(doc._id),
    linesProcessed: (doc.lines ?? []).length,
  });
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
    stationTransferDebug("PATCH:incoming", {
      transferId: String(params.id),
      department,
      bodyKeys: Object.keys(body ?? {}),
      parsedStatus: data.status ?? null,
      note: "Inventory updates only when status becomes completed and applyStationTransferCompletion runs",
    });

    const before = await StationTransferModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    if (!before) throw new NotFoundError("Station transfer");

    if (
      data.status === STATION_TRANSFER_STATUS.COMPLETED &&
      before.status !== STATION_TRANSFER_STATUS.COMPLETED &&
      (!Array.isArray(before.lines) || before.lines.length === 0)
    ) {
      throw new BadRequestError("Cannot complete a transfer with no line items");
    }

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
      { returnDocument: "after", runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Station transfer");

    // Complete transfer: apply stock movements
    if (
      before.status !== STATION_TRANSFER_STATUS.COMPLETED &&
      doc.status === STATION_TRANSFER_STATUS.COMPLETED
    ) {
      // Partial updates (e.g. status-only PATCH) can return a lean doc where nested `lines`
      // is missing or empty in some Mongoose versions; always fall back to the pre-update row.
      const lines =
        Array.isArray(doc.lines) && doc.lines.length > 0
          ? doc.lines
          : before.lines ?? [];
      const linesSource =
        Array.isArray(doc.lines) && doc.lines.length > 0 ? "doc" : "before";
      stationTransferDebug("PATCH:complete:transition", {
        transferId: String(params.id),
        department,
        tenantId: String(tenantId),
        branchId: String(branchId),
        beforeStatus: before.status,
        afterStatus: doc.status,
        payloadKeys: Object.keys(payload),
        docLinesLen: Array.isArray(doc.lines) ? doc.lines.length : "not-array",
        beforeLinesLen: Array.isArray(before.lines) ? before.lines.length : "not-array",
        linesSource,
        resolvedLinesLen: lines.length,
        firstLineInvPreview: lines[0]
          ? {
              rawInventoryItemId: lines[0].inventoryItemId,
              quantity: lines[0].quantity,
            }
          : null,
      });
      const snapshot = {
        ...doc,
        _id: doc._id,
        lines,
        fromLocation: doc.fromLocation ?? before.fromLocation,
        toLocation: doc.toLocation ?? before.toLocation,
      };
      await applyStationTransferCompletion({
        doc: snapshot,
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
    } else if (data.status === STATION_TRANSFER_STATUS.COMPLETED) {
      stationTransferDebug("PATCH:complete:skipped", {
        transferId: String(params.id),
        beforeStatus: before.status,
        docStatus: doc.status,
        reason:
          before.status === STATION_TRANSFER_STATUS.COMPLETED
            ? "already_completed"
            : doc.status !== STATION_TRANSFER_STATUS.COMPLETED
              ? "update_did_not_set_completed"
              : "unknown",
      });
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
