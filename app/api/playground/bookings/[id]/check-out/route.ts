import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import PlaygroundBooking from "@/models/playground/PlaygroundBooking";
import { PLAYGROUND_BOOKING_STATUS } from "@/models/playground/PlaygroundBooking";
import mongoose from "mongoose";
import ActivityLog from "@/models/shared/ActivityLog";
import { USER_ROLES } from "@/constants";

const PLAYGROUND_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

export const POST = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Playground booking");
    }

    const booking = await PlaygroundBooking.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any).lean();
    if (!booking) {
      throw new NotFoundError("Playground booking");
    }

    if (booking.status !== PLAYGROUND_BOOKING_STATUS.CHECKED_IN) {
      throw new BadRequestError(
        "Only checked-in bookings can be checked out"
      );
    }

    const updated = await PlaygroundBooking.findByIdAndUpdate(
      id,
      { $set: { status: PLAYGROUND_BOOKING_STATUS.COMPLETED } },
      { new: true, runValidators: true }
    )
      .populate("playgroundAreaId", "name type capacity")
      .lean();

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "checkOut",
      resource: "playgroundBooking",
      resourceId: updated!._id,
      details: { bookingReference: (booking as any).bookingReference },
    } as any);

    return successResponse(updated);
  },
  { auth: true }
);
