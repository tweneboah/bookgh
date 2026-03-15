import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import {
  requireTenant,
  requireRoles,
} from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { ForbiddenError, BadRequestError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import Branch from "@/models/branch/Branch";
import Tenant from "@/models/tenant/Tenant";
import Subscription from "@/models/tenant/Subscription";
import SubscriptionPlan from "@/models/platform/SubscriptionPlan";
import { createBranchSchema } from "@/validations/branch";
import { generateBranchSlug } from "@/lib/slug";

const BRANCH_SORT_FIELDS = [
  "name",
  "slug",
  "status",
  "city",
  "createdAt",
  "isPublished",
];

export const GET = withHandler(
  async (req: NextRequest, { auth }) => {
    const tenantId = requireTenant(auth);

    const { searchParams } = new URL(req.url);
    const paginationParams = parsePagination(searchParams);
    const sort = parseSortString(
      paginationParams.sort,
      BRANCH_SORT_FIELDS
    );

    const filter = { tenantId };
    const query = Branch.find(filter as any).sort(sort);
    const countQuery = Branch.countDocuments(filter as any);

    const result = await paginate(query, countQuery, paginationParams);

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req: NextRequest, { auth }) => {
    const tenantId = requireTenant(auth);
    requireRoles(auth, [USER_ROLES.TENANT_ADMIN, USER_ROLES.SUPER_ADMIN]);

    const body = await req.json();
    const data = createBranchSchema.parse(body);

    // Check subscription limit
    const sub = await Subscription.findOne({ tenantId } as any).lean();
    if (!sub?.planId) {
      throw new BadRequestError("No active subscription");
    }
    const plan = await SubscriptionPlan.findById(sub.planId).lean();
    if (!plan?.limits?.maxBranches) {
      throw new BadRequestError("Invalid subscription plan");
    }
    const currentCount = await Branch.countDocuments({ tenantId } as any);
    if (currentCount >= plan.limits.maxBranches) {
      throw new ForbiddenError("Branch limit reached for your subscription");
    }

    const tenant = await Tenant.findById(tenantId).select("name").lean();
    const tenantName = (tenant as any)?.name ?? "hotel";
    const slug = await generateBranchSlug(tenantName, data.name);

    const branch = await Branch.create({
      ...data,
      slug,
      tenantId,
    } as any);

    return createdResponse(branch.toObject());
  },
  { auth: true }
);
