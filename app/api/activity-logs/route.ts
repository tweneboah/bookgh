import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireTenant } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import ActivityLog from "@/models/shared/ActivityLog";

const SORT_FIELDS = ["createdAt", "action", "resource", "userId"];

export const GET = withHandler(
  async (req, { auth }) => {
    const tenantId = requireTenant(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const userId = req.nextUrl.searchParams.get("userId");
    const resource = req.nextUrl.searchParams.get("resource");

    const filter: Record<string, unknown> = { tenantId };
    if (userId) filter.userId = userId;
    if (resource) filter.resource = resource;

    const query = ActivityLog.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = ActivityLog.countDocuments(
      filter as Record<string, unknown>
    );
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);
