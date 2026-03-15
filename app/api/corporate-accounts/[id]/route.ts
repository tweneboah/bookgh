import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import CorporateAccount from "@/models/booking/CorporateAccount";
import { updateCorporateAccountSchema } from "@/validations/corporate";
import { USER_ROLES } from "@/constants";
import mongoose from "mongoose";

export const GET = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Corporate account");

    const account = await CorporateAccount.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any).lean();

    if (!account) throw new NotFoundError("Corporate account");
    return successResponse(account);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.FRONT_DESK,
      USER_ROLES.RESERVATION_OFFICER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Corporate account");

    const body = await req.json();
    const data = updateCorporateAccountSchema.parse(body);

    const account = await CorporateAccount.findOneAndUpdate(
      { _id: id, tenantId, branchId } as any,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!account) throw new NotFoundError("Corporate account");
    return successResponse(account);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [USER_ROLES.TENANT_ADMIN, USER_ROLES.BRANCH_MANAGER]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Corporate account");

    const account = await CorporateAccount.findOneAndDelete({
      _id: id,
      tenantId,
      branchId,
    } as any);

    if (!account) throw new NotFoundError("Corporate account");
    return noContentResponse();
  },
  { auth: true }
);
