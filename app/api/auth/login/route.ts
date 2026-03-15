import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { loginSchema } from "@/validations/auth";
import { comparePassword } from "@/lib/password";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { UnauthorizedError } from "@/lib/errors";
import User from "@/models/user/User";

export const POST = withHandler(async (req: NextRequest) => {
  const { email, password } = loginSchema.parse(await req.json());

  const user = await User.findOne({ email }).select("+password");
  if (!user || !user.isActive) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new UnauthorizedError("Invalid credentials");

  user.lastLogin = new Date();
  await user.save();

  const payload = {
    userId: user._id.toString(),
    tenantId: user.tenantId?.toString(),
    branchId: user.branchId?.toString(),
    role: user.role,
  };

  return successResponse({
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
    },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ userId: payload.userId }),
  });
});
