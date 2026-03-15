import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireRoles, requireTenant } from "@/lib/auth-context";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import Tenant from "@/models/tenant/Tenant";
import { updateTenantSchema } from "@/validations/tenant";

export const GET = withHandler(
  async (_req, { auth }) => {
    const tenantId = requireTenant(auth);

    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      throw new NotFoundError("Tenant");
    }

    return successResponse(tenant);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [USER_ROLES.TENANT_ADMIN]);
    const tenantId = requireTenant(auth);

    const body = await req.json();
    const data = updateTenantSchema.parse(body);

    if (data.slug) {
      const existing = await Tenant.findOne({
        slug: data.slug,
        _id: { $ne: tenantId },
      }).lean();
      if (existing) {
        throw new ConflictError("Tenant with this slug already exists");
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!tenant) {
      throw new NotFoundError("Tenant");
    }

    return successResponse(tenant);
  },
  { auth: true }
);
