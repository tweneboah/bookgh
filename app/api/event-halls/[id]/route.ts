import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import EventHall from "@/models/event/EventHall";
import { updateEventHallSchema } from "@/validations/event";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const CONFERENCE_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.EVENT_MANAGER,
  USER_ROLES.SALES_OFFICER,
  USER_ROLES.OPERATIONS_COORDINATOR,
  USER_ROLES.EVENT_COORDINATOR,
  USER_ROLES.ACCOUNTANT,
] as const;

export const GET = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Event hall");
    }

    const doc = await EventHall.findOne({ _id: id, tenantId, branchId } as any).lean();
    if (!doc) {
      throw new NotFoundError("Event hall");
    }

    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Event hall");
    }

    const body = await req.json();
    const data = updateEventHallSchema.parse(body);

    const doc = await EventHall.findOneAndUpdate(
      { _id: id, tenantId, branchId } as any,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!doc) {
      throw new NotFoundError("Event hall");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "eventHall",
      resourceId: doc._id,
      details: data,
    } as any);

    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Event hall");
    }

    const doc = await EventHall.findOneAndDelete({ _id: id, tenantId, branchId } as any);
    if (!doc) {
      throw new NotFoundError("Event hall");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "eventHall",
      resourceId: doc._id,
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
