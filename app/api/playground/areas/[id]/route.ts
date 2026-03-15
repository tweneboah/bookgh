import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import PlaygroundArea from "@/models/playground/PlaygroundArea";
import { updatePlaygroundAreaSchema } from "@/validations/playground";
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
      throw new NotFoundError("Playground area");
    }

    const doc = await PlaygroundArea.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any).lean();
    if (!doc) {
      throw new NotFoundError("Playground area");
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
      throw new NotFoundError("Playground area");
    }

    const body = await req.json();
    console.log("[Playground Areas API] PATCH body", { id, bodyKeys: Object.keys(body), hourlyRate: (body as Record<string, unknown>).hourlyRate, dailyRate: (body as Record<string, unknown>).dailyRate });

    const data = updatePlaygroundAreaSchema.parse(body);
    console.log("[Playground Areas API] PATCH parsed data", { dataKeys: Object.keys(data), hourlyRate: (data as Record<string, unknown>).hourlyRate, dailyRate: (data as Record<string, unknown>).dailyRate });

    // Build update object: omit undefined so we don't overwrite with undefined; include 0 and null
    const setPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        setPayload[key] = value;
      }
    }
    console.log("[Playground Areas API] PATCH setPayload", { setPayloadKeys: Object.keys(setPayload), hourlyRate: setPayload.hourlyRate, dailyRate: setPayload.dailyRate });

    const doc = await PlaygroundArea.findOneAndUpdate(
      { _id: id, tenantId, branchId } as any,
      { $set: setPayload },
      { new: true, runValidators: true }
    ).lean();

    if (!doc) {
      throw new NotFoundError("Playground area");
    }

    console.log("[Playground Areas API] PATCH doc after update", { docId: (doc as any)._id, hourlyRate: (doc as any).hourlyRate, dailyRate: (doc as any).dailyRate });

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "playgroundArea",
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
      throw new NotFoundError("Playground area");
    }

    const doc = await PlaygroundArea.findOneAndDelete({
      _id: id,
      tenantId,
      branchId,
    } as any);
    if (!doc) {
      throw new NotFoundError("Playground area");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "playgroundArea",
      resourceId: doc._id,
      details: { name: doc.name },
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
