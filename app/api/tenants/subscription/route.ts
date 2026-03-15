import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireTenant } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import Subscription from "@/models/tenant/Subscription";
import SubscriptionPlan from "@/models/platform/SubscriptionPlan";

export const GET = withHandler(
  async (_req, { auth }) => {
    const tenantId = requireTenant(auth);

    const subscription = await Subscription.findOne({ tenantId } as any)
      .populate("planId", "name price billingCycle limits features trialDays")
      .lean();

    if (!subscription) {
      const defaultPlan = await SubscriptionPlan.findOne({ isActive: true })
        .sort({ sortOrder: 1 })
        .lean();

      if (!defaultPlan) {
        throw new NotFoundError("Subscription");
      }

      return successResponse({
        status: "trial",
        plan: defaultPlan,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialEndsAt: null,
        message: "No active subscription. Default plan shown.",
      });
    }

    const { planId, ...rest } = subscription;
    return successResponse({ ...rest, plan: planId });
  },
  { auth: true }
);
