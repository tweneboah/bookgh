import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { BOOKING_STATUS, ROOM_STATUS } from "@/constants";
import Booking from "@/models/booking/Booking";
import Room from "@/models/room/Room";
import { findAvailableRoomsForCategoryStay } from "@/lib/booking-availability";
import { availabilityQuerySchema } from "@/validations/booking";
import mongoose from "mongoose";

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const data = availabilityQuerySchema.parse(params);

    const requestedCheckIn = new Date(data.checkInDate);
    const requestedCheckOut = new Date(data.checkOutDate);

    const excludeBookingId = req.nextUrl.searchParams.get("excludeBookingId");

    let availableRooms;

    if (data.roomCategoryId) {
      availableRooms = await findAvailableRoomsForCategoryStay({
        tenantId,
        branchId,
        roomCategoryId: data.roomCategoryId,
        checkInDate: requestedCheckIn,
        checkOutDate: requestedCheckOut,
        ...(excludeBookingId ? { excludeBookingId } : {}),
      });
    } else {
      const overlapFilter: Record<string, unknown> = {
        tenantId,
        branchId,
        status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.CHECKED_OUT, BOOKING_STATUS.NO_SHOW] },
        checkInDate: { $lt: requestedCheckOut },
        checkOutDate: { $gt: requestedCheckIn },
        roomId: { $exists: true, $ne: null },
      };

      if (excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) {
        overlapFilter._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
      }

      const overlappingBookings = await Booking.find(overlapFilter as Record<string, unknown>)
        .select("roomId")
        .lean();

      const occupiedRoomIds = overlappingBookings
        .map((b) => b.roomId)
        .filter(Boolean);

      availableRooms = await Room.find({
        tenantId,
        branchId,
        isActive: true,
        _id: { $nin: occupiedRoomIds },
        status: {
          $nin: [
            ROOM_STATUS.OCCUPIED,
            ROOM_STATUS.CLEANING,
            ROOM_STATUS.MAINTENANCE,
            ROOM_STATUS.OUT_OF_SERVICE,
          ],
        },
      } as Record<string, unknown>)
        .populate("roomCategoryId")
        .sort({ roomNumber: 1 })
        .lean();
    }

    return successResponse(availableRooms, 200, {
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
    });
  },
  { auth: true }
);
