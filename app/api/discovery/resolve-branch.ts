import mongoose from "mongoose";
import Branch from "@/models/branch/Branch";
import Tenant from "@/models/tenant/Tenant";

/**
 * Resolve discovery id (tenant slug or branch slug/id) to a branch.
 * Used by discovery/[id]/* routes so hotel-centric URLs work.
 */
export async function resolveBranchForDiscoveryId(
  id: string
): Promise<{ branch: any; tenant: any } | null> {
  const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;

  if (!isObjectId) {
    const tenant = await Tenant.findOne({ slug: id, status: "active" }).lean();
    if (tenant) {
      const branch = await Branch.findOne({
        tenantId: tenant._id,
        status: "active",
        isPublished: true,
      } as any)
        .sort({ name: 1 })
        .lean();
      if (branch) {
        return { branch, tenant };
      }
    }
  }

  const branch = await Branch.findOne({
    ...(isObjectId ? { _id: id } : { slug: id }),
    status: "active",
  } as any).lean();
  if (!branch) return null;

  const tenant = await Tenant.findById(branch.tenantId).lean();
  return { branch, tenant };
}
