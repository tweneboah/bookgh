import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireTenant } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import Guest from "@/models/booking/Guest";
import { updateGuestSchema } from "@/validations/guest";

export const GET = withHandler(
  async (_req, { auth, params }) => {
    const tenantId = requireTenant(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Guest");
    }

    const guest = await Guest.findById(id).lean();

    if (!guest || String(guest.tenantId) !== tenantId) {
      throw new NotFoundError("Guest");
    }

    return successResponse(guest);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const tenantId = requireTenant(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Guest");
    }

    const body = await req.json();
    const data = updateGuestSchema.parse(body);

    const existingForUpdate = await Guest.findById(id).select("tenantId").lean();
    if (!existingForUpdate || String(existingForUpdate.tenantId) !== tenantId) {
      throw new NotFoundError("Guest");
    }

    const guest = await Guest.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();

    return successResponse(guest!);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    const tenantId = requireTenant(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Guest");
    }

    const existingForDelete = await Guest.findById(id).select("tenantId").lean();
    if (!existingForDelete || String(existingForDelete.tenantId) !== tenantId) {
      throw new NotFoundError("Guest");
    }

    await Guest.findByIdAndDelete(id);
    return noContentResponse();
  },
  { auth: true }
);
