import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import {
  getStationMovementModelForDepartment,
  normalizeMovementDepartment,
} from "@/lib/department-movement";
import { updateStationMovementSchema } from "@/validations/restaurant";

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

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_MOVEMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeMovementDepartment(
      req.nextUrl.searchParams.get("department"),
      "restaurant"
    );
    const StationMovementModel = getStationMovementModelForDepartment(department);
    const body = await req.json();
    const data = updateStationMovementSchema.parse(body);

    const $set: Record<string, string> = {};
    if (data.itemName != null && data.itemName.trim().length > 0) {
      $set.itemName = data.itemName.trim();
    }
    if (data.reason != null && data.reason.trim().length > 0) {
      $set.reason = data.reason.trim();
    }

    const doc = await StationMovementModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId, department } as any,
      { $set },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Movement ledger row");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "stationMovement",
      resourceId: doc._id,
      details: $set,
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
    const StationMovementModel = getStationMovementModelForDepartment(department);

    const res = await StationMovementModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
      department,
    } as any);
    if (!res) throw new NotFoundError("Movement ledger row");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "stationMovement",
      resourceId: res._id,
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
