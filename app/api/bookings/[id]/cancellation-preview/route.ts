import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import Booking from "@/models/booking/Booking";
import Branch from "@/models/branch/Branch";
import { getCancellationFee } from "@/lib/accommodation-policies";
import mongoose from "mongoose";

export const GET = withHandler(
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

    const branch = await Branch.findOne({ _id: branchId, tenantId } as any)
      .select("accommodationPolicies")
      .lean();
    const policy = (branch as any)?.accommodationPolicies;
    const cancelledAt = new Date();
    const result = getCancellationFee(
      policy,
      {
        checkInDate: booking.checkInDate,
        totalAmount: booking.totalAmount ?? 0,
        roomRate: booking.roomRate,
        numberOfNights: booking.numberOfNights ?? 1,
      },
      cancelledAt
    );

    return successResponse({
      cancellationFee: result.fee,
      refundAmount: result.refund,
      freeCancel: result.freeCancel,
      totalAmount: booking.totalAmount ?? 0,
    });
  },
  { auth: true }
);
