import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import {
  createRestaurantUnitSchema,
} from "@/validations/restaurant";
import RestaurantUnit from "@/models/restaurant/RestaurantUnit";
import { BadRequestError } from "@/lib/errors";
import { normalizeInventoryDepartment } from "@/lib/department-inventory";
import { DEPARTMENT } from "@/constants";

const SORT_FIELDS = ["name", "type", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const type = req.nextUrl.searchParams.get("type");
    const active = req.nextUrl.searchParams.get("active");
    const department = normalizeInventoryDepartment(
      req.nextUrl.searchParams.get("department"),
      DEPARTMENT.RESTAURANT
    );

    const filter: Record<string, unknown> = { tenantId, branchId, department };
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
    const department = normalizeInventoryDepartment(
      (data as any).department,
      DEPARTMENT.RESTAURANT
    );

    try {
      const doc = await RestaurantUnit.create({
        ...data,
        department,
        tenantId,
        branchId,
        createdBy: auth.userId,
      } as Record<string, unknown>);

      return createdResponse(doc.toObject());
    } catch (err: any) {
      // Handle duplicate (unique index) more nicely
      if (err?.code === 11000) {
        throw new BadRequestError(
          "A unit with this name already exists for this branch and department."
        );
      }
      throw err;
    }
  },
  { auth: true }
);
