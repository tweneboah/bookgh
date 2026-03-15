import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { ConflictError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import Tenant from "@/models/tenant/Tenant";
import { createTenantSchema } from "@/validations/tenant";

const TENANT_SORT_FIELDS = ["name", "slug", "status", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [USER_ROLES.SUPER_ADMIN]);

    const { searchParams } = new URL(req.url);
    const paginationParams = parsePagination(searchParams);
    const sort = parseSortString(
      paginationParams.sort,
      TENANT_SORT_FIELDS
    );

    const query = Tenant.find({}).sort(sort);
    const countQuery = Tenant.countDocuments({});

    const result = await paginate(query, countQuery, paginationParams);

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [USER_ROLES.SUPER_ADMIN]);

    const body = await req.json();
    const data = createTenantSchema.parse(body);

    const existing = await Tenant.findOne({ slug: data.slug }).lean();
    if (existing) {
      throw new ConflictError("Tenant with this slug already exists");
    }

    const tenant = await Tenant.create({
      ...data,
      status: "pending",
    });

    return createdResponse(tenant.toObject());
  },
  { auth: true }
);
