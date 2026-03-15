import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES } from "@/constants";
import SubscriptionPlan from "@/models/platform/SubscriptionPlan";
import { subscriptionPlanSchema } from "@/validations/shared";

const PLAN_SORT_FIELDS = ["name", "price", "sortOrder", "createdAt"];

export const GET = withHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const paginationParams = parsePagination(searchParams);
  const sort = parseSortString(
    paginationParams.sort,
    PLAN_SORT_FIELDS
  );

  const filter = { isActive: true };
  const query = SubscriptionPlan.find(filter).sort(sort);
  const countQuery = SubscriptionPlan.countDocuments(filter);

  const result = await paginate(query, countQuery, paginationParams);

  return successResponse(result.items, 200, {
    pagination: result.pagination,
  });
});

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [USER_ROLES.SUPER_ADMIN]);

    const body = await req.json();
    const data = subscriptionPlanSchema.parse(body);

    const plan = await SubscriptionPlan.create(data);

    return createdResponse(plan.toObject());
  },
  { auth: true }
);
