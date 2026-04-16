import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES, STOCK_LOCATION } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import {
  getLocationStockModelForDepartment,
  normalizeMovementDepartment,
} from "@/lib/department-movement";
import { updateLocationStockSchema } from "@/validations/restaurant";

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
    const LocationStockModel = getLocationStockModelForDepartment(department);
    const body = await req.json();
    const data = updateLocationStockSchema.parse(body);

    const $set: Record<string, unknown> = { quantity: data.quantity };
    if (data.unit != null) $set.unit = data.unit;

    const doc = await LocationStockModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId, department } as any,
      { $set },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Location stock row");
    if (
      doc.location !== STOCK_LOCATION.KITCHEN &&
      doc.location !== STOCK_LOCATION.FRONT_HOUSE
    ) {
      throw new NotFoundError("Location stock row");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "locationStock",
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
    const LocationStockModel = getLocationStockModelForDepartment(department);

    const res = await LocationStockModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
      department,
    } as any);
    if (!res) throw new NotFoundError("Location stock row");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "locationStock",
      resourceId: res._id,
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
