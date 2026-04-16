import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError } from "@/lib/errors";
import { USER_ROLES, STATION_TRANSFER_STATUS } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import mongoose from "mongoose";
import {
  getStationTransferModelForDepartment,
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
      throw new BadRequestError(`Invalid transfer id: ${id}`);
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

    const StationTransferModel = getStationTransferModelForDepartment(department);
    const found = await StationTransferModel.find({
      _id: { $in: objectIds },
      tenantId,
      branchId,
    } as any).lean();

    const foundIds = new Set(found.map((d: any) => String(d._id)));
    const notFound = ids.filter((id) => !foundIds.has(id)).length;

    const completed = found.filter(
      (d: any) => d.status === STATION_TRANSFER_STATUS.COMPLETED
    );
    const deletable = found.filter(
      (d: any) => d.status !== STATION_TRANSFER_STATUS.COMPLETED
    );

    if (deletable.length > 0) {
      await StationTransferModel.deleteMany({
        _id: { $in: deletable.map((d: any) => d._id) },
        tenantId,
        branchId,
      } as any);
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "stationTransferBulk",
      resourceId: branchId as unknown as string,
      details: {
        deleted: deletable.length,
        skippedCompleted: completed.length,
        skippedNotFound: notFound,
        ids: deletable.map((d: any) => String(d._id)),
      },
    } as any);

    return successResponse({
      deleted: deletable.length,
      skippedCompleted: completed.length,
      skippedNotFound: notFound,
    });
  },
  { auth: true }
);
