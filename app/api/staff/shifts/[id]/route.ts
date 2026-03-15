import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import StaffShift from "@/models/staff/StaffShift";
import { updateShiftSchema } from "@/validations/staff";
import { USER_ROLES } from "@/constants";

export const GET = withHandler(
  async (_req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await StaffShift.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>)
      .lean();
    if (!doc) throw new NotFoundError("Shift");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = updateShiftSchema.parse(await req.json());
    const doc = await StaffShift.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as Record<string, unknown>,
      body,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Shift");
    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await StaffShift.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>);
    if (!doc) throw new NotFoundError("Shift");
    return noContentResponse();
  },
  { auth: true }
);
