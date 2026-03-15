import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError, ConflictError } from "@/lib/errors";
import mongoose from "mongoose";
import Floor from "@/models/room/Floor";
import Room from "@/models/room/Room";
import { updateFloorSchema } from "@/validations/room";

export const GET = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Floor");
    }

    const floor = await Floor.findById(id).lean();
    if (
      !floor ||
      String(floor.tenantId) !== tenantId ||
      String(floor.branchId) !== branchId
    ) {
      throw new NotFoundError("Floor");
    }

    return successResponse(floor);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Floor");
    }

    const body = await req.json();
    const data = updateFloorSchema.parse(body);

    const existingForUpdate = await Floor.findById(id)
      .select("tenantId branchId floorNumber")
      .lean();
    if (
      !existingForUpdate ||
      String(existingForUpdate.tenantId) !== tenantId ||
      String(existingForUpdate.branchId) !== branchId
    ) {
      throw new NotFoundError("Floor");
    }

    if (data.floorNumber !== undefined) {
      const conflict = await Floor.findOne({
        tenantId,
        branchId,
        floorNumber: data.floorNumber,
        _id: { $ne: id },
      } as Record<string, unknown>).lean();
      if (conflict) {
        throw new ConflictError("Floor number already exists");
      }

      const roomsOnCurrentFloor = await Room.countDocuments({
        tenantId,
        branchId,
        floor: existingForUpdate.floorNumber,
        isActive: true,
      } as Record<string, unknown>);
      if (roomsOnCurrentFloor > 0) {
        throw new ConflictError(
          "Cannot change floor number while rooms are assigned. Reassign rooms first."
        );
      }
    }

    const floor = await Floor.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    return successResponse(floor!);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Floor");
    }

    const existingForDelete = await Floor.findById(id)
      .select("tenantId branchId floorNumber")
      .lean();
    if (
      !existingForDelete ||
      String(existingForDelete.tenantId) !== tenantId ||
      String(existingForDelete.branchId) !== branchId
    ) {
      throw new NotFoundError("Floor");
    }

    const roomsOnFloor = await Room.countDocuments({
      tenantId,
      branchId,
      floor: existingForDelete.floorNumber,
      isActive: true,
    } as Record<string, unknown>);
    if (roomsOnFloor > 0) {
      throw new ConflictError(
        "Cannot delete floor while rooms are assigned. Reassign rooms first."
      );
    }

    await Floor.findByIdAndDelete(id);
    return noContentResponse();
  },
  { auth: true }
);
