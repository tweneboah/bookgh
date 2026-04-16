import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES, STATION_TRANSFER_STATUS } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import mongoose from "mongoose";
import {
  getStationTransferModelForDepartment,
  normalizeMovementDepartment,
} from "@/lib/department-movement";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";
import { createStationTransferSchema } from "@/validations/restaurant";
import { stationTransferDebug } from "@/lib/station-transfer-debug";

const SORT_FIELDS = ["transferDate", "createdAt", "status"];

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

function generateTransferNumber(): string {
  return `STF-${Date.now().toString().slice(-8)}`;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_MOVEMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeMovementDepartment(
      req.nextUrl.searchParams.get("department"),
      "restaurant"
    );
    const StationTransferModel = getStationTransferModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const fromLocation = req.nextUrl.searchParams.get("fromLocation");
    const toLocation = req.nextUrl.searchParams.get("toLocation");

    const filter: Record<string, unknown> = { tenantId, branchId, department };
    if (status) filter.status = status;
    if (fromLocation) filter.fromLocation = fromLocation;
    if (toLocation) filter.toLocation = toLocation;

    const InventoryItemModel = getInventoryItemModelForDepartment(department);
    const query = StationTransferModel.find(filter as any)
      .populate({
        path: "lines.inventoryItemId",
        model: InventoryItemModel,
        select: "name unit",
      })
      .sort(parseSortString(sort, SORT_FIELDS));
    const countQuery = StationTransferModel.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });
    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_MOVEMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeMovementDepartment(
      req.nextUrl.searchParams.get("department"),
      "restaurant"
    );
    const StationTransferModel = getStationTransferModelForDepartment(department);
    const body = await req.json();
    const data = createStationTransferSchema.parse(body);

    stationTransferDebug("POST:create:incoming", {
      department,
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
      lineCount: data.lines.length,
      linesPreview: data.lines.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        itemName: l.itemName,
        quantity: l.quantity,
        unit: l.unit,
      })),
      note: "Creates PENDING transfer only — mainStore currentStock changes on PATCH complete, not here",
    });

    const doc = await StationTransferModel.create({
      tenantId,
      branchId,
      department,
      transferNumber: generateTransferNumber(),
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
      transferDate: new Date(data.transferDate),
      status: STATION_TRANSFER_STATUS.PENDING,
      lines: data.lines.map((line) => ({
        inventoryItemId: new mongoose.Types.ObjectId(line.inventoryItemId),
        itemName: line.itemName,
        quantity: line.quantity,
        unit: line.unit,
        usedQty: line.usedQty,
        leftoverQty: line.leftoverQty,
        note: line.note,
      })),
      notes: data.notes,
      createdBy: auth.userId,
    } as any);

    stationTransferDebug("POST:create:stored", {
      _id: String(doc._id),
      transferNumber: doc.transferNumber,
      status: doc.status,
      fromLocation: doc.fromLocation,
      toLocation: doc.toLocation,
    });

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "stationTransfer",
      resourceId: doc._id,
      details: { transferNumber: doc.transferNumber, fromLocation: doc.fromLocation, toLocation: doc.toLocation },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
