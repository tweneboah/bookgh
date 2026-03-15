import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireRoles } from "@/lib/auth-context";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { USER_ROLES, TENANT_STATUS } from "@/constants";
import Tenant from "@/models/tenant/Tenant";
import { updateTenantSchema } from "@/validations/tenant";
import mongoose from "mongoose";

export const GET = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [USER_ROLES.SUPER_ADMIN]);

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Tenant");
    }

    const tenant = await Tenant.findById(id).lean();
    if (!tenant) {
      throw new NotFoundError("Tenant");
    }

    return successResponse(tenant);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [USER_ROLES.SUPER_ADMIN]);

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Tenant");
    }

    const body = await req.json();
    console.log("[TenantUpdate] PATCH body (raw)", { id, bodyKeys: Object.keys(body), primaryColor: (body as Record<string, unknown>).primaryColor, accentColor: (body as Record<string, unknown>).accentColor });

    let data: Record<string, unknown>;
    try {
      data = updateTenantSchema.parse(body) as Record<string, unknown>;
    } catch (parseErr) {
      console.error("[TenantUpdate] validation failed", parseErr);
      throw parseErr;
    }
    console.log("[TenantUpdate] parsed data", { primaryColor: data.primaryColor, accentColor: data.accentColor, dataKeys: Object.keys(data) });

    if (data.slug) {
      const existing = await Tenant.findOne({ slug: data.slug, _id: { $ne: id } }).lean();
      if (existing) {
        throw new ConflictError("Tenant with this slug already exists");
      }
    }
    if (data.customDomain != null && data.customDomain.trim() !== "") {
      const normalized = data.customDomain.trim().toLowerCase();
      const existing = await Tenant.findOne({ customDomain: normalized, _id: { $ne: id } }).lean();
      if (existing) {
        throw new ConflictError("Another tenant already uses this custom domain");
      }
    }

    const setPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) setPayload[key] = value;
    }
    console.log("[TenantUpdate] setPayload", { keys: Object.keys(setPayload), primaryColor: setPayload.primaryColor, accentColor: setPayload.accentColor });

    const updateOp = Object.keys(setPayload).length ? { $set: setPayload } : {};
    const oid = new mongoose.Types.ObjectId(id);

    // Use native collection update so theme fields are never stripped (e.g. by cached schema)
    if (Object.keys(updateOp).length > 0) {
      const updateResult = await Tenant.collection.updateOne(
        { _id: oid },
        updateOp
      );
      console.log("[TenantUpdate] collection.updateOne result", { matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount });
    }

    const tenant = await Tenant.findById(id).lean();
    if (!tenant) {
      throw new NotFoundError("Tenant");
    }

    console.log("[TenantUpdate] tenant after save", { _id: (tenant as any)._id, primaryColor: (tenant as any).primaryColor, accentColor: (tenant as any).accentColor });
    return successResponse(tenant);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [USER_ROLES.SUPER_ADMIN]);

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Tenant");
    }

    const tenant = await Tenant.findByIdAndUpdate(
      id,
      {
        $set: {
          status: TENANT_STATUS.SUSPENDED,
          suspendedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!tenant) {
      throw new NotFoundError("Tenant");
    }

    return successResponse({
      message: "Tenant suspended successfully",
      tenant,
    });
  },
  { auth: true }
);
