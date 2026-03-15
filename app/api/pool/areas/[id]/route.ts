import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import PoolArea from "@/models/pool/PoolArea";
import { updatePoolAreaSchema } from "@/validations/pool";
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
      throw new NotFoundError("Pool area");
    }

    const doc = await PoolArea.findOne({ _id: id, tenantId, branchId } as any).lean();
    if (!doc) {
      throw new NotFoundError("Pool area");
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
      throw new NotFoundError("Pool area");
    }

    const body = await req.json();
    const data = updatePoolAreaSchema.parse(body);

    const doc = await PoolArea.findOneAndUpdate(
      { _id: id, tenantId, branchId } as any,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!doc) {
      throw new NotFoundError("Pool area");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "poolArea",
      resourceId: doc._id,
      details: data,
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
      throw new NotFoundError("Pool area");
    }

    const doc = await PoolArea.findOneAndDelete({ _id: id, tenantId, branchId } as any);
    if (!doc) {
      throw new NotFoundError("Pool area");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "poolArea",
      resourceId: doc._id,
      details: { name: doc.name },
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
