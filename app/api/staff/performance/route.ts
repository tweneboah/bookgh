import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import StaffPerformance from "@/models/staff/StaffPerformance";
import { createPerformanceSchema } from "@/validations/staff";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const SORT_FIELDS = ["reviewDate", "score", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const userId = req.nextUrl.searchParams.get("userId");
    const rating = req.nextUrl.searchParams.get("rating");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (userId) filter.userId = userId;
    if (rating) filter.rating = rating;

    const query = StaffPerformance.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = StaffPerformance.countDocuments(
      filter as Record<string, unknown>
    );
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createPerformanceSchema.parse(body);

    const doc = await StaffPerformance.create({
      ...data,
      tenantId,
      branchId,
      createdBy: auth.userId,
    } as Record<string, unknown>);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "staffPerformance",
      resourceId: doc._id,
      details: {
        targetUserId: data.userId,
        rating: data.rating,
        score: data.score,
      },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
