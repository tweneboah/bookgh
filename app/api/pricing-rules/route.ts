import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { createPricingRuleSchema } from "@/validations/room";
import {
  getPricingRuleModelForDepartment,
  normalizePricingDepartment,
} from "@/lib/department-pricing";

const SORT_FIELDS = ["name", "priority", "startDate", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePricingDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const PricingRuleModel = getPricingRuleModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const type = req.nextUrl.searchParams.get("type");
    const filter = { tenantId, branchId };
    if (type) {
      (filter as any).type = type;
    }
    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = PricingRuleModel.find(filter as Record<string, unknown>)
      .sort(sortObj)
      .populate("roomCategoryId");
    const countQuery = PricingRuleModel.countDocuments(filter as Record<string, unknown>);
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
    const department = normalizePricingDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const PricingRuleModel = getPricingRuleModelForDepartment(department);
    const body = await req.json();
    const data = createPricingRuleSchema.parse(body);

    const pricingRule = await PricingRuleModel.create({
      ...data,
      tenantId,
      branchId,
    } as Record<string, unknown>);

    return createdResponse(pricingRule.toObject());
  },
  { auth: true }
);
