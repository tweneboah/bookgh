import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireTenant, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES, BAR_ROLE_DEFAULT_PERMISSIONS } from "@/constants";
import mongoose from "mongoose";
import User from "@/models/user/User";
import { updateUserSchema } from "@/validations/shared";

function sanitizeUser(user: Record<string, unknown>) {
  const { password: _p, ...rest } = user;
  return rest;
}

export const GET = withHandler(
  async (_req: NextRequest, { auth, params }) => {
    const tenantId = requireTenant(auth);
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("User");
    }

    const user = await User.findOne({ _id: id, tenantId } as any)
      .select("-password")
      .lean();
    if (!user) {
      throw new NotFoundError("User");
    }

    return successResponse(sanitizeUser(user as unknown as Record<string, unknown>));
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req: NextRequest, { auth, params }) => {
    const tenantId = requireTenant(auth);
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.SUPER_ADMIN,
    ]);
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("User");
    }

    const body = await req.json();
    const data = updateUserSchema.parse(body);
    const payload = {
      ...data,
      ...(data.role && !data.permissions
        ? { permissions: BAR_ROLE_DEFAULT_PERMISSIONS[data.role] ?? [] }
        : {}),
    };

    const user = await User.findOneAndUpdate(
      { _id: id, tenantId } as any,
      { $set: payload },
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean();

    if (!user) {
      throw new NotFoundError("User");
    }

    return successResponse(sanitizeUser(user as unknown as Record<string, unknown>));
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req: NextRequest, { auth, params }) => {
    const tenantId = requireTenant(auth);
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.SUPER_ADMIN,
    ]);
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("User");
    }

    const user = await User.findOneAndUpdate(
      { _id: id, tenantId } as any,
      { $set: { isActive: false } },
      { new: true }
    )
      .select("-password")
      .lean();

    if (!user) {
      throw new NotFoundError("User");
    }

    return noContentResponse();
  },
  { auth: true }
);
