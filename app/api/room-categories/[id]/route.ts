import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError, ConflictError } from "@/lib/errors";
import RoomCategory from "@/models/room/RoomCategory";
import { updateRoomCategorySchema } from "@/validations/room";
import mongoose from "mongoose";

export const GET = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Room category");
    }

    const roomCategory = await RoomCategory.findById(id).lean();

    if (
      !roomCategory ||
      String(roomCategory.tenantId) !== tenantId ||
      String(roomCategory.branchId) !== branchId
    ) {
      throw new NotFoundError("Room category");
    }

    return successResponse(roomCategory);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Room category");
    }

    const body = await req.json();
    const data = updateRoomCategorySchema.parse(body);

    const existingForUpdate = await RoomCategory.findById(id)
      .select("tenantId branchId")
      .lean();
    if (
      !existingForUpdate ||
      String(existingForUpdate.tenantId) !== tenantId ||
      String(existingForUpdate.branchId) !== branchId
    ) {
      throw new NotFoundError("Room category");
    }

    if (data.name) {
      const nameConflict = await RoomCategory.findOne({
        tenantId,
        branchId,
        name: data.name,
        _id: { $ne: id },
      } as Record<string, unknown>).lean();
      if (nameConflict) {
        throw new ConflictError("Room category with this name already exists");
      }
    }

    const roomCategory = await RoomCategory.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();

    return successResponse(roomCategory!);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Room category");
    }

    const existingForDelete = await RoomCategory.findById(id)
      .select("tenantId branchId")
      .lean();
    if (
      !existingForDelete ||
      String(existingForDelete.tenantId) !== tenantId ||
      String(existingForDelete.branchId) !== branchId
    ) {
      throw new NotFoundError("Room category");
    }

    await RoomCategory.findByIdAndDelete(id);
    return noContentResponse();
  },
  { auth: true }
);
