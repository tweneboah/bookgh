import { withHandler } from "@/lib/with-handler";
import { createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { findAvailableRoomsForCategoryStay } from "@/lib/booking-availability";
import { resolveRoomRate } from "@/lib/accommodation-rate";
import { getSuggestedDeposit } from "@/lib/accommodation-policies";
import Branch from "@/models/branch/Branch";
import Booking from "@/models/booking/Booking";
import CorporateAccount from "@/models/booking/CorporateAccount";
import RoomCategory from "@/models/room/RoomCategory";
import { createGroupBookingsSchema } from "@/validations/booking";
import { BOOKING_SOURCE } from "@/constants";
import mongoose from "mongoose";

function generateBookingReference(): string {
  return `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

async function nextUniqueBookingReference(tenantId: unknown): Promise<string> {
  let bookingReference = generateBookingReference();
  let exists = await Booking.exists({ tenantId, bookingReference } as Record<string, unknown>);
  while (exists) {
    bookingReference = generateBookingReference();
    exists = await Booking.exists({ tenantId, bookingReference } as Record<string, unknown>);
  }
  return bookingReference;
}

export const POST = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createGroupBookingsSchema.parse(body);

    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);
    const ms = checkOut.getTime() - checkIn.getTime();
    if (ms <= 0) {
      throw new BadRequestError("Check-out date must be after check-in date");
    }

    const groupSize = data.groupSize;

    const isCorporateBooking =
      data.source === BOOKING_SOURCE.CORPORATE || !!data.corporateAccountId;

    if (isCorporateBooking) {
      if (
        !data.corporateAccountId ||
        !mongoose.Types.ObjectId.isValid(data.corporateAccountId)
      ) {
        throw new BadRequestError("A valid corporate account is required for corporate bookings");
      }
      const corporateAccount = await CorporateAccount.findOne({
        _id: data.corporateAccountId,
        tenantId,
        branchId,
      } as Record<string, unknown>).lean();
      if (!corporateAccount) {
        throw new NotFoundError("Corporate account");
      }
      if (corporateAccount.status !== "active") {
        throw new BadRequestError("Corporate account is not active");
      }
    }

    const roomCategory = await RoomCategory.findOne({
      _id: data.roomCategoryId,
      tenantId,
      branchId,
      isActive: true,
    } as Record<string, unknown>).lean();
    if (!roomCategory) {
      throw new NotFoundError("Room category");
    }

    const availableRooms = await findAvailableRoomsForCategoryStay({
      tenantId,
      branchId,
      roomCategoryId: data.roomCategoryId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
    });

    if (availableRooms.length < groupSize) {
      throw new BadRequestError(
        `Not enough rooms: need ${groupSize} in this category for these dates, but only ${availableRooms.length} can be assigned (already booked or out of service).`
      );
    }

    const resolved = await resolveRoomRate({
      tenantId,
      branchId,
      roomCategoryId: data.roomCategoryId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      corporateAccountId: isCorporateBooking ? data.corporateAccountId : undefined,
    });

    const branch = await Branch.findOne({ _id: branchId, tenantId } as Record<string, unknown>)
      .select("accommodationPolicies")
      .lean();

    let depositRequired: number | undefined;
    if (data.depositRequired === undefined) {
      const suggested = getSuggestedDeposit(
        (branch as { accommodationPolicies?: unknown })?.accommodationPolicies,
        resolved.totalAmount
      );
      if (suggested > 0) depositRequired = suggested;
    } else {
      depositRequired = data.depositRequired;
    }

    const groupId = data.groupId?.trim() || `GRP-${Date.now().toString(36).toUpperCase()}`;

    const corporateMeta =
      isCorporateBooking &&
      data.corporateAccountId &&
      resolved.corporateDiscountRate != null &&
      resolved.corporateBaseRate != null
        ? {
            corporateRateApplied: true,
            corporateDiscountRate: resolved.corporateDiscountRate,
            corporateBaseRate: resolved.corporateBaseRate,
          }
        : {};

    const basePayload: Record<string, unknown> = {
      guestId: data.guestId,
      roomCategoryId: data.roomCategoryId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: data.numberOfGuests,
      source: data.source ?? BOOKING_SOURCE.WALK_IN,
      specialRequests: data.specialRequests,
      isGroupBooking: true,
      groupId,
      numberOfNights: resolved.numberOfNights,
      roomRate: resolved.roomRatePerNight,
      totalAmount: resolved.totalAmount,
      tenantId,
      branchId,
      createdBy: auth.userId,
    };

    if (depositRequired !== undefined) basePayload.depositRequired = depositRequired;

    if (isCorporateBooking && data.corporateAccountId) {
      basePayload.corporateAccountId = data.corporateAccountId;
      basePayload.source = BOOKING_SOURCE.CORPORATE;
    }

    const createdIds: mongoose.Types.ObjectId[] = [];
    const results: Record<string, unknown>[] = [];

    try {
      for (let i = 0; i < groupSize; i++) {
        const bookingReference = await nextUniqueBookingReference(tenantId);
        const booking = await Booking.create({
          ...basePayload,
          bookingReference,
          metadata: {
            ...corporateMeta,
            groupId,
            groupIndex: i + 1,
            groupSize,
          },
        } as Record<string, unknown>);
        createdIds.push(booking._id as mongoose.Types.ObjectId);
        results.push(booking.toObject() as Record<string, unknown>);
      }

      if (isCorporateBooking && data.corporateAccountId) {
        const perTotal = Number(resolved.totalAmount ?? 0);
        await CorporateAccount.findOneAndUpdate(
          { _id: data.corporateAccountId, tenantId, branchId } as Record<string, unknown>,
          {
            $inc: {
              totalBookings: groupSize,
              totalSpend: perTotal * groupSize,
              currentBalance: perTotal * groupSize,
            },
          }
        );
      }

      return createdResponse({
        groupId,
        count: groupSize,
        bookings: results,
      });
    } catch (err) {
      if (createdIds.length > 0) {
        await Booking.deleteMany({ _id: { $in: createdIds } });
      }
      throw err;
    }
  },
  { auth: true }
);
