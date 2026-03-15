import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import PoolMaintenance from "@/models/pool/PoolMaintenance";
import { updatePoolMaintenanceSchema } from "@/validations/pool";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const POOL_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

export const GET = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pool maintenance");
    }

    const doc = await PoolMaintenance.findOne({ _id: id, tenantId, branchId } as any)
      .populate("poolAreaId", "name type")
      .populate("assignedTo", "name email")
      .lean();
    if (!doc) {
      throw new NotFoundError("Pool maintenance");
    }

    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pool maintenance");
    }

    const body = await req.json();
    const data = updatePoolMaintenanceSchema.parse(body);

    const updatePayload: Record<string, unknown> = { ...data };
    if (data.scheduledDate) {
      updatePayload.scheduledDate = new Date(data.scheduledDate);
    }
    if (data.completedAt !== undefined) {
      updatePayload.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }
    if (data.recurrence !== undefined) {
      updatePayload.recurrence =
        data.recurrence && data.recurrence.frequency !== "none"
          ? {
              ...data.recurrence,
              endDate: data.recurrence.endDate ? new Date(data.recurrence.endDate) : undefined,
            }
          : undefined;
    }

    const doc = await PoolMaintenance.findOneAndUpdate(
      { _id: id, tenantId, branchId } as any,
      { $set: updatePayload },
      { new: true, runValidators: true }
    )
      .populate("poolAreaId", "name type")
      .populate("assignedTo", "name email")
      .lean();

    if (!doc) {
      throw new NotFoundError("Pool maintenance");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "poolMaintenance",
      resourceId: doc._id,
      details: { type: doc.type, status: doc.status },
    } as any);

    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pool maintenance");
    }

    const doc = await PoolMaintenance.findOneAndDelete({ _id: id, tenantId, branchId } as any);
    if (!doc) {
      throw new NotFoundError("Pool maintenance");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "poolMaintenance",
      resourceId: doc._id,
      details: { type: doc.type },
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
