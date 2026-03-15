import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import Branch from "@/models/branch/Branch";

/**
 * Returns all published branch slugs for sitemap generation.
 * No auth. Used by app/sitemap.ts.
 */
export const GET = withHandler(async () => {
  const branches = await Branch.find({
    status: "active",
    isPublished: true,
    _bypassTenantCheck: true,
  } as any)
    .select("slug")
    .lean();

  const slugs = branches.map((b: any) => b.slug).filter(Boolean);
  return successResponse({ slugs });
}, { auth: false });
