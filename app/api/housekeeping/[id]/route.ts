import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import HousekeepingTask from "@/models/housekeeping/HousekeepingTask";
import Room from "@/models/room/Room";
import { updateHousekeepingTaskSchema } from "@/validations/operations";
import { HOUSEKEEPING_STATUS, ROOM_STATUS } from "@/constants";

export const GET = withHandler(
  async (_req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await HousekeepingTask.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>)
      .lean();
    if (!doc) throw new NotFoundError("Housekeeping task");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const body = updateHousekeepingTaskSchema.parse(await req.json());
    const doc = await HousekeepingTask.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as Record<string, unknown>,
      body,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Housekeeping task");
    if (
      body.status === HOUSEKEEPING_STATUS.COMPLETED ||
      body.status === HOUSEKEEPING_STATUS.INSPECTED
    ) {
      const roomId = (doc as any).roomId;
      if (roomId) {
        await Room.findOneAndUpdate(
          { _id: roomId, tenantId, branchId } as Record<string, unknown>,
          { $set: { status: ROOM_STATUS.AVAILABLE } }
        );
      }
    }
    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const doc = await HousekeepingTask.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>);
    if (!doc) throw new NotFoundError("Housekeeping task");
    return noContentResponse();
  },
  { auth: true }
);
