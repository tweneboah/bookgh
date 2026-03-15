import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireTenant, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import mongoose from "mongoose";
import Branch from "@/models/branch/Branch";
import { z } from "zod";

const accommodationPoliciesSchema = z.object({
  noShowChargeType: z.enum(["none", "oneNight", "fullStay"]).optional(),
  noShowMarkAfterHours: z.number().min(0).optional(),
  cancellationFreeUntilHours: z.number().min(0).optional(),
  cancellationChargeType: z.enum(["none", "oneNight", "percentage", "fullStay"]).optional(),
  cancellationChargeValue: z.number().min(0).max(100).optional(),
  depositType: z.enum(["none", "percentage", "fixed"]).optional(),
  depositValue: z.number().min(0).optional(),
});

export const GET = withHandler(
  async (_req, { auth, params }) => {
    const tenantId = requireTenant(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Branch");

    const branch = await Branch.findOne({ _id: id, tenantId } as any)
      .select("accommodationPolicies")
      .lean();
    if (!branch) throw new NotFoundError("Branch");

    return successResponse((branch as any).accommodationPolicies ?? {});
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const tenantId = requireTenant(auth);
    requireRoles(auth, [USER_ROLES.TENANT_ADMIN, USER_ROLES.SUPER_ADMIN]);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Branch");

    const body = await req.json();
    const data = accommodationPoliciesSchema.parse(body);

    const branch = await Branch.findOneAndUpdate(
      { _id: id, tenantId } as any,
      { $set: { accommodationPolicies: data } },
      { new: true, runValidators: true }
    )
      .select("accommodationPolicies")
      .lean();

    if (!branch) throw new NotFoundError("Branch");
    return successResponse((branch as any).accommodationPolicies ?? {});
  },
  { auth: true }
);
