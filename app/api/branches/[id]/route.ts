import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireTenant, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import mongoose from "mongoose";
import Branch from "@/models/branch/Branch";
import Tenant from "@/models/tenant/Tenant";
import { updateBranchSchema } from "@/validations/branch";
import { generateBranchSlug } from "@/lib/slug";

export const GET = withHandler(
  async (_req: NextRequest, { auth, params }) => {
    const tenantId = requireTenant(auth);
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Branch");
    }

    const branch = await Branch.findOne({ _id: id, tenantId } as any).lean();
    if (!branch) {
      throw new NotFoundError("Branch");
    }

    return successResponse(branch);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req: NextRequest, { auth, params }) => {
    const tenantId = requireTenant(auth);
    requireRoles(auth, [USER_ROLES.TENANT_ADMIN, USER_ROLES.SUPER_ADMIN]);

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Branch");
    }

    const body = await req.json();
    const data = updateBranchSchema.parse(body);

    if (data.name) {
      const tenant = await Tenant.findById(tenantId).select("name").lean();
      const tenantName = (tenant as any)?.name ?? "hotel";
      data.slug = await generateBranchSlug(tenantName, data.name, id);
    }

    const branch = await Branch.findOneAndUpdate(
      { _id: id, tenantId } as any,
      { $set: data },
      { new: true, runValidators: true }
    )
      .lean();

    if (!branch) {
      throw new NotFoundError("Branch");
    }

    return successResponse(branch);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req: NextRequest, { auth, params }) => {
    const tenantId = requireTenant(auth);
    requireRoles(auth, [USER_ROLES.TENANT_ADMIN, USER_ROLES.SUPER_ADMIN]);

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Branch");
    }

    const branch = await Branch.findOneAndDelete({ _id: id, tenantId } as any);
    if (!branch) {
      throw new NotFoundError("Branch");
    }

    return noContentResponse();
  },
  { auth: true }
);
