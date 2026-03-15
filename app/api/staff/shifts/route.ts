import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import StaffShift from "@/models/staff/StaffShift";
import { createShiftSchema } from "@/validations/staff";
import { USER_ROLES } from "@/constants";

const SORT_FIELDS = ["shiftDate", "startTime", "userId", "createdAt"];

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
    const shiftDate = req.nextUrl.searchParams.get("shiftDate");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (userId) filter.userId = userId;
    if (shiftDate) filter.shiftDate = shiftDate;

    const query = StaffShift.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = StaffShift.countDocuments(
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
    const data = createShiftSchema.parse(body);

    const doc = await StaffShift.create({
      ...data,
      tenantId,
      branchId,
    } as Record<string, unknown>);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
