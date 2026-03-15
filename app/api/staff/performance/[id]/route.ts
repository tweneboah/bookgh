import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import StaffPerformance from "@/models/staff/StaffPerformance";
import { updatePerformanceSchema } from "@/validations/staff";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const ALLOWED = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.HR_MANAGER,
] as const;

export const GET = withHandler(
  async (_req, { params, auth }) => {
    requireRoles(auth, [...ALLOWED]);
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await StaffPerformance.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>).lean();
    if (!doc) throw new NotFoundError("Performance record");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...ALLOWED]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = updatePerformanceSchema.parse(await req.json());
    const doc = await StaffPerformance.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as Record<string, unknown>,
      body,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Performance record");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "staffPerformance",
      resourceId: doc._id,
      details: body,
    } as any);

    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { params, auth }) => {
    requireRoles(auth, [...ALLOWED]);
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await StaffPerformance.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>);
    if (!doc) throw new NotFoundError("Performance record");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "staffPerformance",
      resourceId: doc._id,
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
