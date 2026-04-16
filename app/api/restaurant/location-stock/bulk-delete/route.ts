import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import mongoose from "mongoose";
import {
  getLocationStockModelForDepartment,
  normalizeMovementDepartment,
} from "@/lib/department-movement";
import { bulkDeleteByIdsSchema } from "@/validations/restaurant";

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

function toObjectIds(ids: string[]) {
  const out: mongoose.Types.ObjectId[] = [];
  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError(`Invalid id: ${id}`);
    }
    out.push(new mongoose.Types.ObjectId(id));
  }
  return out;
}

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_MOVEMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeMovementDepartment(
      req.nextUrl.searchParams.get("department"),
      "restaurant"
    );
    const body = await req.json();
    const { ids } = bulkDeleteByIdsSchema.parse(body);
    const objectIds = toObjectIds(ids);

    const LocationStockModel = getLocationStockModelForDepartment(department);

    const res = await LocationStockModel.deleteMany({
      _id: { $in: objectIds },
      tenantId,
      branchId,
      department,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "locationStockBulk",
      resourceId: branchId as unknown as string,
      details: { deletedCount: res.deletedCount, requested: ids.length },
    } as any);

    return successResponse({
      deleted: res.deletedCount ?? 0,
      requested: ids.length,
    });
  },
  { auth: true }
);
