import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { resolveRoomRate } from "@/lib/accommodation-rate";
import mongoose from "mongoose";
import "@/models/booking/Guest";
import "@/models/booking/CorporateAccount";
import "@/models/room/Room";
import "@/models/room/RoomCategory";
import "@/models/user/User";
import Booking from "@/models/booking/Booking";
import { updateBookingSchema } from "@/validations/booking";

export const GET = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Booking");
    }

    const booking = await Booking.findById(id)
      .populate("guestId")
      .populate("corporateAccountId")
      .populate("roomId")
      .populate("roomCategoryId")
      .populate("createdBy", "firstName lastName email")
      .lean();

    if (
      !booking ||
      String(booking.tenantId) !== tenantId ||
      String(booking.branchId) !== branchId
    ) {
      throw new NotFoundError("Booking");
    }

    return successResponse(booking);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Booking");
    }

    const body = await req.json();
    const data = updateBookingSchema.parse(body);

    const existing = await Booking.findById(id)
      .select("tenantId branchId checkInDate checkOutDate roomCategoryId corporateAccountId")
      .lean();
    if (
      !existing ||
      String(existing.tenantId) !== tenantId ||
      String(existing.branchId) !== branchId
    ) {
      throw new NotFoundError("Booking");
    }

    const checkIn = data.checkInDate != null ? new Date(data.checkInDate) : new Date((existing as any).checkInDate);
    const checkOut = data.checkOutDate != null ? new Date(data.checkOutDate) : new Date((existing as any).checkOutDate);
    const ms = checkOut.getTime() - checkIn.getTime();
    if (ms <= 0) {
      throw new BadRequestError("Check-out date must be after check-in date");
    }

    const roomCategoryId = data.roomCategoryId ?? (existing as any).roomCategoryId?.toString?.();
    const corporateAccountId = data.corporateAccountId ?? (existing as any).corporateAccountId?.toString?.() ?? undefined;

    const updatePayload = { ...data };
    if (roomCategoryId && (data.checkInDate != null || data.checkOutDate != null || data.roomCategoryId != null)) {
      const resolved = await resolveRoomRate({
        tenantId,
        branchId,
        roomCategoryId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        corporateAccountId: corporateAccountId || undefined,
      });
      updatePayload.numberOfNights = resolved.numberOfNights;
      (updatePayload as any).roomRate = resolved.roomRatePerNight;
      (updatePayload as any).totalAmount = resolved.totalAmount;
    }

    const booking = await Booking.findByIdAndUpdate(id, { $set: updatePayload }, { new: true, runValidators: true })
      .populate("guestId")
      .populate("corporateAccountId")
      .populate("roomId")
      .populate("roomCategoryId")
      .lean();

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    return successResponse(booking);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Booking");
    }

    const existing = await Booking.findById(id).select("tenantId branchId").lean();
    if (
      !existing ||
      String(existing.tenantId) !== tenantId ||
      String(existing.branchId) !== branchId
    ) {
      throw new NotFoundError("Booking");
    }

    await Booking.findByIdAndDelete(id);
    return noContentResponse();
  },
  { auth: true }
);
