import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import Attendance from "@/models/staff/Attendance";
import { updateAttendanceSchema } from "@/validations/staff";
import { USER_ROLES } from "@/constants";

export const GET = withHandler(
  async (_req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await Attendance.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>)
      .lean();
    if (!doc) throw new NotFoundError("Attendance");
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
    const body = updateAttendanceSchema.parse(await req.json());
    const doc = await Attendance.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as Record<string, unknown>,
      body,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Attendance");
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
    const doc = await Attendance.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>);
    if (!doc) throw new NotFoundError("Attendance");
    return noContentResponse();
  },
  { auth: true }
);
