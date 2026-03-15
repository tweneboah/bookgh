import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import Booking from "@/models/booking/Booking";
import Branch from "@/models/branch/Branch";
import { getNoShowCharge } from "@/lib/accommodation-policies";
import { BOOKING_STATUS } from "@/constants";
import mongoose from "mongoose";

export const POST = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Booking");

    const booking = await Booking.findById(id).lean();
    if (
      !booking ||
      String(booking.tenantId) !== tenantId ||
      String(booking.branchId) !== branchId
    ) {
      throw new NotFoundError("Booking");
    }

    if (booking.status === BOOKING_STATUS.NO_SHOW) {
      throw new BadRequestError("Booking is already marked as no-show");
    }
    if (booking.status === BOOKING_STATUS.CHECKED_IN || booking.status === BOOKING_STATUS.CHECKED_OUT) {
      throw new BadRequestError("Cannot mark checked-in or checked-out booking as no-show");
    }
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new BadRequestError("Cannot mark cancelled booking as no-show");
    }

    const branch = await Branch.findOne({ _id: branchId, tenantId } as any)
      .select("accommodationPolicies")
      .lean();
    const policy = (branch as any)?.accommodationPolicies;
    const chargeAmount = getNoShowCharge(policy, {
      totalAmount: booking.totalAmount ?? 0,
      roomRate: booking.roomRate,
      numberOfNights: booking.numberOfNights ?? 1,
    });

    const updateData: Record<string, unknown> = {
      status: BOOKING_STATUS.NO_SHOW,
      noShowMarkedAt: new Date(),
    };
    if (chargeAmount > 0) {
      updateData.noShowChargeAmount = chargeAmount;
    }

    const updated = await Booking.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("guestId")
      .populate("roomId")
      .populate("roomCategoryId")
      .lean();

    return successResponse(updated);
  },
  { auth: true }
);
