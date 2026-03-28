import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import {
  createRestaurantUnitSchema,
} from "@/validations/restaurant";
import RestaurantUnit from "@/models/restaurant/RestaurantUnit";

const SORT_FIELDS = ["name", "type", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const type = req.nextUrl.searchParams.get("type");
    const active = req.nextUrl.searchParams.get("active");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (type) filter.type = type;
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = RestaurantUnit.find(filter).sort(sortObj);
    const countQuery = RestaurantUnit.countDocuments(filter);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createRestaurantUnitSchema.parse(body);

    const doc = await RestaurantUnit.create({
      ...data,
      tenantId,
      branchId,
      createdBy: auth.userId,
    } as Record<string, unknown>);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
