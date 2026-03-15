import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import PoolBooking from "@/models/pool/PoolBooking";
import { POOL_BOOKING_STATUS } from "@/models/pool/PoolBooking";
import mongoose from "mongoose";
import ActivityLog from "@/models/shared/ActivityLog";
import { USER_ROLES } from "@/constants";

const POOL_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

export const POST = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pool booking");
    }

    const booking = await PoolBooking.findOne({ _id: id, tenantId, branchId } as any).lean();
    if (!booking) {
      throw new NotFoundError("Pool booking");
    }

    if (booking.status !== POOL_BOOKING_STATUS.PENDING && booking.status !== POOL_BOOKING_STATUS.CONFIRMED) {
      throw new BadRequestError("Only pending or confirmed bookings can be checked in");
    }

    const updated = await PoolBooking.findByIdAndUpdate(
      id,
      { $set: { status: POOL_BOOKING_STATUS.CHECKED_IN } },
      { new: true, runValidators: true }
    )
      .populate("poolAreaId", "name type capacity")
      .lean();

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "checkIn",
      resource: "poolBooking",
      resourceId: updated!._id,
      details: { bookingReference: (booking as any).bookingReference },
    } as any);

    return successResponse(updated);
  },
  { auth: true }
);
