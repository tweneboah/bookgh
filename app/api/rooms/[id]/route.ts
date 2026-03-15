import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError, ConflictError, BadRequestError } from "@/lib/errors";
import mongoose from "mongoose";
import Room from "@/models/room/Room";
import Floor from "@/models/room/Floor";
import Booking from "@/models/booking/Booking";
import { BOOKING_STATUS } from "@/constants";
import { updateRoomSchema } from "@/validations/room";

export const GET = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Room");
    }

    const room = await Room.findById(id).populate("roomCategoryId").lean();

    if (
      !room ||
      String(room.tenantId) !== tenantId ||
      String(room.branchId) !== branchId
    ) {
      throw new NotFoundError("Room");
    }

    return successResponse(room);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Room");
    }

    const body = await req.json();
    const data = updateRoomSchema.parse(body);

    if (data.floor !== undefined) {
      const floor = await Floor.findOne({
        tenantId,
        branchId,
        floorNumber: data.floor,
        isActive: true,
      } as Record<string, unknown>).lean();
      if (!floor) {
        throw new BadRequestError(
          "Floor does not exist or is inactive. Create/activate the floor first."
        );
      }
    }

    const existingForUpdate = await Room.findById(id).select("tenantId branchId").lean();
    if (
      !existingForUpdate ||
      String(existingForUpdate.tenantId) !== tenantId ||
      String(existingForUpdate.branchId) !== branchId
    ) {
      throw new NotFoundError("Room");
    }

    if (data.roomNumber) {
      const numberConflict = await Room.findOne({
        tenantId,
        branchId,
        roomNumber: data.roomNumber,
        _id: { $ne: id },
      } as Record<string, unknown>).lean();
      if (numberConflict) {
        throw new ConflictError("Room with this number already exists");
      }
    }

    // Prevent manual status override when room is linked to an active stay/reservation.
    if (data.status) {
      const activeBooking = await Booking.findOne({
        tenantId,
        branchId,
        roomId: id,
        status: {
          $in: [
            BOOKING_STATUS.PENDING,
            BOOKING_STATUS.CONFIRMED,
            BOOKING_STATUS.CHECKED_IN,
          ],
        },
      } as Record<string, unknown>)
        .select("bookingReference status")
        .lean();

      if (activeBooking) {
        throw new ConflictError(
          `Cannot update room status while booking ${activeBooking.bookingReference} (${activeBooking.status}) is active`
        );
      }
    }

    const room = await Room.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .populate("roomCategoryId")
      .lean();

    return successResponse(room!);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Room");
    }

    const existingForDelete = await Room.findById(id).select("tenantId branchId").lean();
    if (
      !existingForDelete ||
      String(existingForDelete.tenantId) !== tenantId ||
      String(existingForDelete.branchId) !== branchId
    ) {
      throw new NotFoundError("Room");
    }

    await Room.findByIdAndDelete(id);
    return noContentResponse();
  },
  { auth: true }
);
