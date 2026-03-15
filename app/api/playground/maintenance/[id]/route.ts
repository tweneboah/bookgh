import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import PlaygroundMaintenance from "@/models/playground/PlaygroundMaintenance";
import { updatePlaygroundMaintenanceSchema } from "@/validations/playground";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const PLAYGROUND_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

export const GET = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Playground maintenance");
    }

    const doc = await PlaygroundMaintenance.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any)
      .populate("playgroundAreaId", "name type")
      .populate("playgroundEquipmentId", "name type status")
      .populate("assignedTo", "name email")
      .lean();
    if (!doc) {
      throw new NotFoundError("Playground maintenance");
    }

    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Playground maintenance");
    }

    const body = await req.json();
    const data = updatePlaygroundMaintenanceSchema.parse(body);

    const updatePayload: Record<string, unknown> = { ...data };
    if (data.scheduledDate) {
      updatePayload.scheduledDate = new Date(data.scheduledDate);
    }
    if (data.completedAt !== undefined) {
      updatePayload.completedAt = data.completedAt
        ? new Date(data.completedAt)
        : null;
    }
    if (data.recurrence !== undefined) {
      updatePayload.recurrence =
        data.recurrence && data.recurrence.frequency !== "none"
          ? {
              ...data.recurrence,
              endDate: data.recurrence.endDate
                ? new Date(data.recurrence.endDate)
                : undefined,
            }
          : undefined;
    }
    if (data.playgroundEquipmentId === null) {
      updatePayload.playgroundEquipmentId = null;
    }

    const doc = await PlaygroundMaintenance.findOneAndUpdate(
      { _id: id, tenantId, branchId } as any,
      { $set: updatePayload },
      { new: true, runValidators: true }
    )
      .populate("playgroundAreaId", "name type")
      .populate("playgroundEquipmentId", "name type status")
      .populate("assignedTo", "name email")
      .lean();

    if (!doc) {
      throw new NotFoundError("Playground maintenance");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "playgroundMaintenance",
      resourceId: doc._id,
      details: { type: (doc as any).type, status: (doc as any).status },
    } as any);

    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Playground maintenance");
    }

    const doc = await PlaygroundMaintenance.findOneAndDelete({
      _id: id,
      tenantId,
      branchId,
    } as any);
    if (!doc) {
      throw new NotFoundError("Playground maintenance");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "playgroundMaintenance",
      resourceId: doc._id,
      details: { type: doc.type },
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
