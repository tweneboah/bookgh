import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import Booking from "@/models/booking/Booking";
import Room from "@/models/room/Room";
import { BOOKING_STATUS } from "@/constants";

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const sp = req.nextUrl.searchParams;

    const now = new Date();
    const startDate = sp.get("startDate")
      ? new Date(sp.get("startDate")!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = sp.get("endDate")
      ? new Date(sp.get("endDate")!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [rooms, bookings] = await Promise.all([
      Room.find({ tenantId, branchId, isActive: true } as any)
        .sort({ floor: 1, roomNumber: 1 })
        .populate("roomCategoryId", "name basePrice")
        .lean(),
      Booking.find({
        tenantId,
        branchId,
        checkInDate: { $lte: endDate },
        checkOutDate: { $gte: startDate },
        status: {
          $in: [
            BOOKING_STATUS.PENDING,
            BOOKING_STATUS.CONFIRMED,
            BOOKING_STATUS.CHECKED_IN,
          ],
        },
      } as any)
        .populate("guestId", "firstName lastName")
        .populate("roomId", "roomNumber")
        .populate("roomCategoryId", "name")
        .lean(),
    ]);

    return successResponse({
      rooms,
      bookings,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  },
  { auth: true }
);
