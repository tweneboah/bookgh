import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import User from "@/models/user/User";

export const GET = withHandler(
  async (_req, { auth }) => {
    const user = await User.findById(auth.userId).lean();
    if (!user) throw new NotFoundError("User");

    return successResponse({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    });
  },
  { auth: true }
);
