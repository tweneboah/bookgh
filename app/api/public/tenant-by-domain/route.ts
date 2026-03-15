import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import Tenant from "@/models/tenant/Tenant";
import Branch from "@/models/branch/Branch";
import { TENANT_STATUS } from "@/constants";

/**
 * Resolve tenant by custom domain (e.g. royalpalace.com).
 * Used by middleware to rewrite custom-domain requests to /hotels/[slug].
 * No auth. Returns slug and theme so the hotel page can render with tenant branding.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain || !domain.trim()) {
    throw new NotFoundError("Tenant");
  }

  const normalized = domain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!normalized) {
    throw new NotFoundError("Tenant");
  }

  const tenant = await Tenant.findOne({
    customDomain: normalized,
    status: TENANT_STATUS.ACTIVE,
  })
    .select("_id name slug logo primaryColor accentColor customDomain")
    .lean();

  if (!tenant) {
    throw new NotFoundError("Tenant");
  }

  const branch = await Branch.findOne({
    tenantId: (tenant as any)._id,
    status: "active",
    isPublished: true,
  } as any)
    .select("slug")
    .lean();

  const branchSlug = branch?.slug ?? (tenant as any).slug;
  if (!branchSlug || typeof branchSlug !== "string") {
    throw new NotFoundError("Tenant");
  }

  return successResponse({
    slug: branchSlug,
    tenantId: (tenant as any)._id?.toString?.(),
    name: (tenant as any).name,
    logo: (tenant as any).logo,
    primaryColor: (tenant as any).primaryColor ?? "#5a189a",
    accentColor: (tenant as any).accentColor ?? "#ff6d00",
    customDomain: (tenant as any).customDomain,
  });
}, { auth: false });
