import "@/models/booking/Booking";
import "@/models/booking/Guest";
import "@/models/user/User";
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
      .populate({
        path: "roomId",
        select: "roomNumber floor status roomCategoryId",
        populate: { path: "roomCategoryId", select: "name" },
      })
      .populate({ path: "assignedTo", select: "firstName lastName email" })
      .populate({ path: "inspectedBy", select: "firstName lastName email" })
      .populate({
        path: "bookingId",
        select: "bookingReference checkOutDate",
        populate: { path: "guestId", select: "firstName lastName email" },
      })
      .lean();
    if (!doc) throw new NotFoundError("Housekeeping task");
    return successResponse(doc);
  },
  { auth: true }
);

function parseOptionalDate(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  return new Date(v);
}

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const raw = updateHousekeepingTaskSchema.parse(await req.json());

    const existing = await HousekeepingTask.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>)
      .select("status startedAt completedAt")
      .lean();
    if (!existing) throw new NotFoundError("Housekeeping task");

    const update: Record<string, unknown> = {};

    if (raw.assignedTo !== undefined) {
      update.assignedTo = raw.assignedTo === null || raw.assignedTo === "" ? null : raw.assignedTo;
    }
    if (raw.status !== undefined) update.status = raw.status;
    if (raw.priority !== undefined) update.priority = raw.priority;
    if (raw.notes !== undefined) update.notes = raw.notes;
    if (raw.inspectedBy !== undefined) {
      update.inspectedBy = raw.inspectedBy === null || raw.inspectedBy === "" ? null : raw.inspectedBy;
    }
    if (raw.inspectionNotes !== undefined) update.inspectionNotes = raw.inspectionNotes;
    if (raw.linenChanged !== undefined) update.linenChanged = raw.linenChanged;

    const due = parseOptionalDate(raw.dueAt as string | null | undefined);
    if (due !== undefined) update.dueAt = due;

    const started = parseOptionalDate(raw.startedAt as string | null | undefined);
    if (started !== undefined) update.startedAt = started;

    const completed = parseOptionalDate(raw.completedAt as string | null | undefined);
    if (completed !== undefined) update.completedAt = completed;

    const nextStatus = (raw.status ?? (existing as { status?: string }).status) as string;
    const prevStatus = (existing as { status?: string }).status;

    if (raw.status === HOUSEKEEPING_STATUS.IN_PROGRESS && prevStatus !== HOUSEKEEPING_STATUS.IN_PROGRESS) {
      if (!update.startedAt && !(existing as { startedAt?: Date }).startedAt) {
        update.startedAt = new Date();
      }
    }

    const becomesDone =
      nextStatus === HOUSEKEEPING_STATUS.COMPLETED ||
      nextStatus === HOUSEKEEPING_STATUS.INSPECTED;
    if (becomesDone && !update.completedAt && !(existing as { completedAt?: Date }).completedAt) {
      update.completedAt = new Date();
    }

    if (Object.keys(update).length === 0) {
      const unchanged = await HousekeepingTask.findOne({
        _id: params.id,
        tenantId,
        branchId,
      } as Record<string, unknown>)
        .populate({
          path: "roomId",
          select: "roomNumber floor status roomCategoryId",
          populate: { path: "roomCategoryId", select: "name" },
        })
        .populate({ path: "assignedTo", select: "firstName lastName email" })
        .populate({ path: "inspectedBy", select: "firstName lastName email" })
        .populate({
          path: "bookingId",
          select: "bookingReference checkOutDate",
          populate: { path: "guestId", select: "firstName lastName email" },
        })
        .lean();
      if (!unchanged) throw new NotFoundError("Housekeeping task");
      return successResponse(unchanged);
    }

    const doc = await HousekeepingTask.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as Record<string, unknown>,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Housekeeping task");

    const roomId = (doc as { roomId?: unknown }).roomId;
    if (roomId) {
      const roomStatusUpdate =
        nextStatus === HOUSEKEEPING_STATUS.COMPLETED ||
        nextStatus === HOUSEKEEPING_STATUS.INSPECTED
          ? ROOM_STATUS.AVAILABLE
          : nextStatus === HOUSEKEEPING_STATUS.PENDING ||
              nextStatus === HOUSEKEEPING_STATUS.IN_PROGRESS
            ? ROOM_STATUS.CLEANING
            : null;

      if (roomStatusUpdate) {
        await Room.findOneAndUpdate(
          { _id: roomId, tenantId, branchId } as Record<string, unknown>,
          { $set: { status: roomStatusUpdate } }
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
