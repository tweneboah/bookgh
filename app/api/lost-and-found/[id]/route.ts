import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import LostAndFound from "@/models/housekeeping/LostAndFound";
import { updateLostAndFoundSchema } from "@/validations/operations";
import mongoose from "mongoose";

export const GET = withHandler(
  async (_req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await LostAndFound.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>)
      .populate("roomId")
      .populate("foundBy", "firstName lastName email")
      .lean();
    if (!doc) throw new NotFoundError("Lost and found item");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const body = updateLostAndFoundSchema.parse(await req.json());
    const update: Record<string, unknown> = { ...body };
    if (body.roomId === null || body.roomId === undefined) {
      update.roomId = null;
    } else if (typeof body.roomId === "string" && body.roomId.trim() && mongoose.Types.ObjectId.isValid(body.roomId)) {
      update.roomId = new mongoose.Types.ObjectId(body.roomId);
    }
    const doc = await LostAndFound.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as Record<string, unknown>,
      update,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Lost and found item");
    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await LostAndFound.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>);
    if (!doc) throw new NotFoundError("Lost and found item");
    return noContentResponse();
  },
  { auth: true }
);
