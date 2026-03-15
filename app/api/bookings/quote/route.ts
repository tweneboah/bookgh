import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { BOOKING_STATUS, ROOM_STATUS } from "@/constants";
import Booking from "@/models/booking/Booking";
import Room from "@/models/room/Room";
import { resolveRoomRate } from "@/lib/accommodation-rate";
import { getSuggestedDeposit } from "@/lib/accommodation-policies";
import Branch from "@/models/branch/Branch";
import { z } from "zod";

const quoteQuerySchema = z.object({
  checkInDate: z.string().datetime(),
  checkOutDate: z.string().datetime(),
  roomCategoryId: z.string().min(1),
  corporateAccountId: z.string().optional(),
});

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const data = quoteQuerySchema.parse(params);

    const requestedCheckIn = new Date(data.checkInDate);
    const requestedCheckOut = new Date(data.checkOutDate);

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
      checkInDate: { $lt: requestedCheckOut },
      checkOutDate: { $gt: requestedCheckIn },
      roomId: { $exists: true, $ne: null },
    };

    const overlappingBookings = await Booking.find(overlapFilter as Record<string, unknown>)
      .select("roomId")
      .lean();

    const occupiedRoomIds = overlappingBookings
      .map((b) => b.roomId)
      .filter(Boolean);

    const roomFilter: Record<string, unknown> = {
      tenantId,
      branchId,
      isActive: true,
      roomCategoryId: data.roomCategoryId,
      _id: { $nin: occupiedRoomIds },
      status: {
        $nin: [
          ROOM_STATUS.OCCUPIED,
          ROOM_STATUS.MAINTENANCE,
          ROOM_STATUS.OUT_OF_SERVICE,
        ],
      },
    };

    const availableRooms = await Room.find(roomFilter as Record<string, unknown>)
      .populate("roomCategoryId")
      .sort({ roomNumber: 1 })
      .lean();

    const quote = await resolveRoomRate({
      tenantId,
      branchId,
      roomCategoryId: data.roomCategoryId,
      checkInDate: requestedCheckIn,
      checkOutDate: requestedCheckOut,
      corporateAccountId: data.corporateAccountId ?? undefined,
    });

    const branch = await Branch.findOne({ _id: branchId, tenantId } as any)
      .select("accommodationPolicies")
      .lean();
    const suggestedDeposit = getSuggestedDeposit(
      (branch as any)?.accommodationPolicies,
      quote.totalAmount
    );

    return successResponse(
      {
        availableRooms,
        quote: {
          roomRatePerNight: quote.roomRatePerNight,
          totalAmount: quote.totalAmount,
          numberOfNights: quote.numberOfNights,
          basePrice: quote.basePrice,
          corporateDiscountRate: quote.corporateDiscountRate,
          corporateBaseRate: quote.corporateBaseRate,
          suggestedDeposit,
        },
      },
      200,
      {
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
      }
    );
  },
  { auth: true }
);
