import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { refreshTokenSchema } from "@/validations/auth";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/jwt";
import { UnauthorizedError, NotFoundError } from "@/lib/errors";
import User from "@/models/user/User";

export const POST = withHandler(async (req: NextRequest) => {
  const { refreshToken } = refreshTokenSchema.parse(await req.json());

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const user = await User.findById(decoded.userId).lean();
  if (!user || !user.isActive) throw new NotFoundError("User");

  const payload = {
    userId: user._id!.toString(),
    tenantId: user.tenantId?.toString(),
    branchId: user.branchId?.toString(),
    role: user.role,
  };

  return successResponse({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ userId: payload.userId }),
  });
});
