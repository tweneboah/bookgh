import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import mongoose from "mongoose";
import { getKitchenUsageModelForDepartment, normalizeMovementDepartment } from "@/lib/department-movement";
import { updateKitchenUsageSchema } from "@/validations/restaurant";
import {
  applyKitchenUsageStockEffects,
  reverseKitchenUsageStockEffects,
} from "@/lib/kitchen-usage-stock";

const RESTAURANT_MOVEMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.STOREKEEPER,
  USER_ROLES.HEAD_CHEF,
  USER_ROLES.SOUS_CHEF,
  USER_ROLES.KITCHEN_STAFF,
] as const;

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_MOVEMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeMovementDepartment(
      req.nextUrl.searchParams.get("department"),
      "restaurant"
    );
    const KitchenUsageModel = getKitchenUsageModelForDepartment(department);
    const body = await req.json();
    const data = updateKitchenUsageSchema.parse(body);

    for (const line of data.lines) {
      if (line.usedQty + line.leftoverQty > line.issuedQty + 0.0001) {
        throw new BadRequestError(
          `For ${line.itemName}: used (${line.usedQty}) + leftover (${line.leftoverQty}) cannot exceed issued (${line.issuedQty})`
        );
      }
    }

    const existing = await KitchenUsageModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
      department,
    } as any).lean();
    if (!existing) throw new NotFoundError("Kitchen usage");

    await reverseKitchenUsageStockEffects({
      doc: { _id: existing._id as mongoose.Types.ObjectId, lines: existing.lines },
      tenantId,
      branchId,
      department,
    });

    const lines = data.lines.map((line) => ({
      inventoryItemId: new mongoose.Types.ObjectId(line.inventoryItemId),
      itemName: line.itemName,
      issuedQty: line.issuedQty,
      usedQty: line.usedQty,
      leftoverQty: line.leftoverQty,
      unit: line.unit,
      note: line.note,
    }));

    const $set: Record<string, unknown> = {
      usageDate: new Date(data.usageDate),
      lines,
    };
    if (data.notes !== undefined) $set.notes = data.notes;
    if (data.stationTransferId) {
      $set.stationTransferId = new mongoose.Types.ObjectId(data.stationTransferId);
    }

    const updated = await KitchenUsageModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId, department } as any,
      { $set },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) throw new NotFoundError("Kitchen usage");

    await applyKitchenUsageStockEffects({
      doc: { _id: updated._id as mongoose.Types.ObjectId, lines: updated.lines },
      tenantId,
      branchId,
      department,
      userId: auth.userId,
    });

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "kitchenUsage",
      resourceId: updated._id,
      details: { usageDate: updated.usageDate, linesCount: updated.lines?.length ?? 0 },
    } as any);

    return successResponse(updated);
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
    const KitchenUsageModel = getKitchenUsageModelForDepartment(department);

    const existing = await KitchenUsageModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
      department,
    } as any).lean();
    if (!existing) throw new NotFoundError("Kitchen usage");

    await reverseKitchenUsageStockEffects({
      doc: { _id: existing._id as mongoose.Types.ObjectId, lines: existing.lines },
      tenantId,
      branchId,
      department,
    });

    await KitchenUsageModel.deleteOne({ _id: params.id, tenantId, branchId, department } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "kitchenUsage",
      resourceId: existing._id,
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
