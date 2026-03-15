import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import User from "@/models/user/User";
import { hashPassword, comparePassword } from "@/lib/password";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const PATCH = withHandler(
  async (req: NextRequest, { auth, params }) => {
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("User");
    }

    // Users can only change their own password
    if (auth.userId !== id) {
      throw new BadRequestError("You can only change your own password");
    }

    const body = await req.json();
    const data = changePasswordSchema.parse(body);

    const user = await User.findById(id)
      .select("+password")
      .lean();

    if (!user) {
      throw new NotFoundError("User");
    }

    const isValid = await comparePassword(
      data.currentPassword,
      (user as { password?: string }).password ?? ""
    );
    if (!isValid) {
      throw new BadRequestError("Current password is incorrect");
    }

    const hashedPassword = await hashPassword(data.newPassword);
    await User.findByIdAndUpdate(id, { password: hashedPassword } as Record<string, unknown>);

    return successResponse({ message: "Password updated" });
  },
  { auth: true }
);
