import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { createdResponse } from "@/lib/api-response";
import { registerSchema } from "@/validations/auth";
import { hashPassword } from "@/lib/password";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { ConflictError } from "@/lib/errors";
import User from "@/models/user/User";

export const POST = withHandler(async (req: NextRequest) => {
  const body = registerSchema.parse(await req.json());
  const existing = await User.findOne({ email: body.email } as any);
  if (existing) throw new ConflictError("Email already registered");

  const hashed = await hashPassword(body.password);
  const user = await User.create({
    ...body,
    password: hashed,
    role: body.role || "customer",
  } as any);

  const payload = {
    userId: user._id.toString(),
    tenantId: user.tenantId?.toString(),
    branchId: user.branchId?.toString(),
    role: user.role,
  };

  return createdResponse({
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ userId: payload.userId }),
  });
});
