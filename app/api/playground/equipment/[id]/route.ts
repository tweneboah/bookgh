import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import PlaygroundEquipment from "@/models/playground/PlaygroundEquipment";
import { updatePlaygroundEquipmentSchema } from "@/validations/playground";
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
      throw new NotFoundError("Playground equipment");
    }

    const doc = await PlaygroundEquipment.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any)
      .populate("playgroundAreaId", "name type status capacity")
      .lean();
    if (!doc) {
      throw new NotFoundError("Playground equipment");
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
      throw new NotFoundError("Playground equipment");
    }

    const body = await req.json();
    const data = updatePlaygroundEquipmentSchema.parse(body);
    if (data.lastInspectionDate && typeof data.lastInspectionDate === "string") {
      (data as any).lastInspectionDate = new Date(data.lastInspectionDate);
    }

    const doc = await PlaygroundEquipment.findOneAndUpdate(
      { _id: id, tenantId, branchId } as any,
      { $set: data },
      { new: true, runValidators: true }
    )
      .populate("playgroundAreaId", "name type status")
      .lean();

    if (!doc) {
      throw new NotFoundError("Playground equipment");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "playgroundEquipment",
      resourceId: doc._id,
      details: data,
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
      throw new NotFoundError("Playground equipment");
    }

    const doc = await PlaygroundEquipment.findOneAndDelete({
      _id: id,
      tenantId,
      branchId,
    } as any);
    if (!doc) {
      throw new NotFoundError("Playground equipment");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "playgroundEquipment",
      resourceId: doc._id,
      details: { name: doc.name },
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
