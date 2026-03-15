import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireTenant } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import Notification from "@/models/shared/Notification";

export const PATCH = withHandler(
  async (_req, { params, auth }) => {
    const tenantId = requireTenant(auth);
    const doc = await Notification.findOneAndUpdate(
      {
        _id: params.id,
        tenantId,
        userId: auth.userId,
      } as Record<string, unknown>,
      { isRead: true },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Notification");
    return successResponse(doc);
  },
  { auth: true }
);
