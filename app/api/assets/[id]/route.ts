import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import Asset from "@/models/maintenance/Asset";
import { updateAssetSchema } from "@/validations/operations";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const MAINTENANCE_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.MAINTENANCE_MANAGER,
  USER_ROLES.TECHNICIAN,
  USER_ROLES.MAINTENANCE,
  USER_ROLES.ACCOUNTANT,
  USER_ROLES.FINANCE_MANAGER,
  USER_ROLES.HOTEL_OWNER,
] as const;

export const GET = withHandler(
  async (_req, { params, auth }) => {
    requireRoles(auth, [...MAINTENANCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await Asset.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>)
      .lean();
    if (!doc) throw new NotFoundError("Asset");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...MAINTENANCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = updateAssetSchema.parse(await req.json());
    const doc = await Asset.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as Record<string, unknown>,
      body,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Asset");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "asset",
      resourceId: doc._id,
      details: body,
    } as Record<string, unknown>);

    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { params, auth }) => {
    requireRoles(auth, [...MAINTENANCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await Asset.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>);
    if (!doc) throw new NotFoundError("Asset");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "asset",
      resourceId: doc._id,
    } as Record<string, unknown>);

    return noContentResponse();
  },
  { auth: true }
);
