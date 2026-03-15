import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import SubscriptionPlan from "@/models/platform/SubscriptionPlan";
import { z } from "zod";
import { subscriptionPlanSchema } from "@/validations/shared";
import mongoose from "mongoose";

const updatePlanSchema = subscriptionPlanSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const GET = withHandler(
  async (_req, { params }) => {
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Subscription plan");
    }

    const plan = await SubscriptionPlan.findById(id).lean();
    if (!plan) {
      throw new NotFoundError("Subscription plan");
    }

    return successResponse(plan);
  }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [USER_ROLES.SUPER_ADMIN]);

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Subscription plan");
    }

    const body = await req.json();
    const data = updatePlanSchema.parse(body);

    const plan = await SubscriptionPlan.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!plan) {
      throw new NotFoundError("Subscription plan");
    }

    return successResponse(plan);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [USER_ROLES.SUPER_ADMIN]);

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Subscription plan");
    }

    const plan = await SubscriptionPlan.findByIdAndDelete(id);

    if (!plan) {
      throw new NotFoundError("Subscription plan");
    }

    return noContentResponse();
  },
  { auth: true }
);
