import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import PoolArea from "@/models/pool/PoolArea";
import { createPoolAreaSchema } from "@/validations/pool";

const SORT_FIELDS = ["name", "type", "capacity", "status", "hourlyRate", "dailyRate", "createdAt"];

const POOL_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const q = req.nextUrl.searchParams.get("q");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q, $options: "i" };

    const query = PoolArea.find(filter as any).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = PoolArea.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createPoolAreaSchema.parse(body);

    const doc = await PoolArea.create({
      ...data,
      tenantId,
      branchId,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "poolArea",
      resourceId: doc._id,
      details: { name: doc.name },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
