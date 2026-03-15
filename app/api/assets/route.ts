import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import Asset from "@/models/maintenance/Asset";
import { createAssetSchema } from "@/validations/operations";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const SORT_FIELDS = ["name", "category", "condition", "createdAt"];
const MAINTENANCE_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.MAINTENANCE_MANAGER,
  USER_ROLES.TECHNICIAN,
  USER_ROLES.MAINTENANCE,
  USER_ROLES.ACCOUNTANT,
  USER_ROLES.FINANCE_MANAGER,
  USER_ROLES.HOTEL_OWNER,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...MAINTENANCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);

    const filter: Record<string, unknown> = { tenantId, branchId };

    const query = Asset.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = Asset.countDocuments(filter as Record<string, unknown>);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...MAINTENANCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createAssetSchema.parse(body);

    const doc = await Asset.create({
      ...data,
      tenantId,
      branchId,
    } as Record<string, unknown>);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "asset",
      resourceId: doc._id,
      details: {
        name: doc.name,
        category: doc.category,
      },
    } as Record<string, unknown>);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
