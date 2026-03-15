import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import Booking from "@/models/booking/Booking";
import Room from "@/models/room/Room";
import Branch from "@/models/branch/Branch";
import { getCancellationFee } from "@/lib/accommodation-policies";
import { cancelBookingSchema } from "@/validations/booking";
import { BOOKING_STATUS, ROOM_STATUS } from "@/constants";
import mongoose from "mongoose";

export const POST = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Booking");
    }

    const body = await req.json();
    const data = cancelBookingSchema.parse(body);

    const booking = await Booking.findById(id).lean();

    if (
      !booking ||
      String(booking.tenantId) !== tenantId ||
      String(booking.branchId) !== branchId
    ) {
      throw new NotFoundError("Booking");
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new BadRequestError("Booking is already cancelled");
    }

    const cancelledAt = new Date();
    const branch = await Branch.findOne({ _id: branchId, tenantId } as any)
      .select("accommodationPolicies")
      .lean();
    const policy = (branch as any)?.accommodationPolicies;
    const { refund: computedRefund } = getCancellationFee(
      policy,
      {
        checkInDate: booking.checkInDate,
        totalAmount: booking.totalAmount ?? 0,
        roomRate: booking.roomRate,
        numberOfNights: booking.numberOfNights ?? 1,
      },
      cancelledAt
    );
    const refundAmount = data.refundAmount !== undefined ? data.refundAmount : computedRefund;

    const updateData: Record<string, unknown> = {
      cancellationReason: data.cancellationReason,
      cancelledAt,
      status: BOOKING_STATUS.CANCELLED,
      refundAmount,
    };

    if (booking.roomId && booking.status === BOOKING_STATUS.CHECKED_IN) {
      await Room.findByIdAndUpdate(booking.roomId, { $set: { status: ROOM_STATUS.CLEANING } });
    }

    await Booking.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

    const updatedBooking = await Booking.findById(id)
      .populate("guestId")
      .populate("roomId")
      .populate("roomCategoryId")
      .lean();

    return successResponse(updatedBooking);
  },
  { auth: true }
);
