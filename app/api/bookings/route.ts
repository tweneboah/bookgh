import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { resolveRoomRate } from "@/lib/accommodation-rate";
import { getSuggestedDeposit } from "@/lib/accommodation-policies";
import Branch from "@/models/branch/Branch";
import "@/models/booking/Guest";
import Booking from "@/models/booking/Booking";
import CorporateAccount from "@/models/booking/CorporateAccount";
import "@/models/room/Room";
import RoomCategory from "@/models/room/RoomCategory";
import "@/models/user/User";
import { createBookingSchema } from "@/validations/booking";
import { BOOKING_SOURCE } from "@/constants";
import mongoose from "mongoose";

const SORT_FIELDS = [
  "checkInDate",
  "checkOutDate",
  "status",
  "bookingReference",
  "createdAt",
];

function generateBookingReference(): string {
  return `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const { status, guestId } = Object.fromEntries(
      req.nextUrl.searchParams.entries()
    );

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (guestId) filter.guestId = guestId;

    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = Booking.find(filter as any)
      .sort(sortObj)
      .populate("guestId")
      .populate("corporateAccountId")
      .populate("roomId")
      .populate("roomCategoryId")
      .populate("createdBy", "firstName lastName email");
    const countQuery = Booking.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createBookingSchema.parse(body);

    let bookingReference = generateBookingReference();
    let exists = await Booking.exists({ tenantId, bookingReference });
    while (exists) {
      bookingReference = generateBookingReference();
      exists = await Booking.exists({ tenantId, bookingReference });
    }

    const bookingPayload: Record<string, unknown> = {
      ...data,
      tenantId,
      branchId,
      bookingReference,
      createdBy: auth.userId,
    };

    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);
    const ms = checkOut.getTime() - checkIn.getTime();
    if (ms <= 0) {
      throw new BadRequestError("Check-out date must be after check-in date");
    }

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
      } as any).lean();
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
    } as any).lean();
    if (!roomCategory) {
      throw new NotFoundError("Room category");
    }

    const resolved = await resolveRoomRate({
      tenantId,
      branchId,
      roomCategoryId: data.roomCategoryId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      corporateAccountId: isCorporateBooking ? data.corporateAccountId : undefined,
    });

    bookingPayload.numberOfNights = resolved.numberOfNights;
    bookingPayload.roomRate = resolved.roomRatePerNight;
    bookingPayload.totalAmount = resolved.totalAmount;

    if (data.depositRequired === undefined) {
      const branch = await Branch.findOne({ _id: branchId, tenantId } as any)
        .select("accommodationPolicies")
        .lean();
      const suggested = getSuggestedDeposit(
        (branch as any)?.accommodationPolicies,
        resolved.totalAmount
      );
      if (suggested > 0) bookingPayload.depositRequired = suggested;
    }

    if (isCorporateBooking && data.corporateAccountId) {
      bookingPayload.corporateAccountId = data.corporateAccountId;
      bookingPayload.source = BOOKING_SOURCE.CORPORATE;
      if (resolved.corporateDiscountRate != null && resolved.corporateBaseRate != null) {
        (bookingPayload as any).metadata = {
          corporateRateApplied: true,
          corporateDiscountRate: resolved.corporateDiscountRate,
          corporateBaseRate: resolved.corporateBaseRate,
        };
      }
    }

    const booking = await Booking.create(bookingPayload as any);

    if (isCorporateBooking && data.corporateAccountId) {
      await CorporateAccount.findOneAndUpdate(
        { _id: data.corporateAccountId, tenantId, branchId } as any,
        {
          $inc: {
            totalBookings: 1,
            totalSpend: booking.totalAmount ?? 0,
            currentBalance: booking.totalAmount ?? 0,
          },
        }
      );
    }

    return createdResponse(booking.toObject());
  },
  { auth: true }
);
