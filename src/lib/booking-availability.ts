import { BOOKING_STATUS, ROOM_STATUS } from "@/constants";
import Booking from "@/models/booking/Booking";
import Room from "@/models/room/Room";
import mongoose, { type Types } from "mongoose";

type TenantBranchId = Types.ObjectId | string;

/**
 * Rooms in a category that can be assigned for a stay window, using the same rules as
 * GET /bookings/quote and GET /bookings/availability: excludes rooms tied to overlapping
 * bookings that already have a room assigned, and rooms in maintenance / OOS / occupied.
 *
 * @param excludeBookingId When set, that booking is ignored in the overlap query (e.g. edit flow).
 */
export async function findAvailableRoomsForCategoryStay(params: {
  tenantId: TenantBranchId;
  branchId: TenantBranchId;
  roomCategoryId: string;
  checkInDate: Date;
  checkOutDate: Date;
  excludeBookingId?: string;
}) {
  const { tenantId, branchId, roomCategoryId, checkInDate, checkOutDate, excludeBookingId } =
    params;

  const overlapFilter: Record<string, unknown> = {
    tenantId,
    branchId,
    status: {
      $nin: [
        BOOKING_STATUS.CANCELLED,
        BOOKING_STATUS.CHECKED_OUT,
        BOOKING_STATUS.NO_SHOW,
      ],
    },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
    roomId: { $exists: true, $ne: null },
  };

  if (excludeBookingId && mongoose.Types.ObjectId.isValid(excludeBookingId)) {
    overlapFilter._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
  }

  const overlappingBookings = await Booking.find(overlapFilter)
    .select("roomId")
    .lean();

  const occupiedRoomIds = overlappingBookings.map((b) => b.roomId).filter(Boolean);

  const roomFilter: Record<string, unknown> = {
    tenantId,
    branchId,
    isActive: true,
    roomCategoryId,
    _id: { $nin: occupiedRoomIds },
    status: {
      $nin: [
        ROOM_STATUS.OCCUPIED,
        ROOM_STATUS.CLEANING,
        ROOM_STATUS.MAINTENANCE,
        ROOM_STATUS.OUT_OF_SERVICE,
      ],
    },
  };

  return Room.find(roomFilter as Record<string, unknown>)
    .populate("roomCategoryId")
    .sort({ roomNumber: 1 })
    .lean();
}
