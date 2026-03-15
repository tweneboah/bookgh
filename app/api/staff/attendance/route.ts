import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import Attendance from "@/models/staff/Attendance";
import { createAttendanceSchema } from "@/validations/staff";
import { USER_ROLES } from "@/constants";

const SORT_FIELDS = ["date", "userId", "status", "createdAt"];

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
    const date = req.nextUrl.searchParams.get("date");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (userId) filter.userId = userId;
    if (date) filter.date = date;

    const query = Attendance.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = Attendance.countDocuments(
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
    const data = createAttendanceSchema.parse(body);

    const doc = await Attendance.create({
      ...data,
      tenantId,
      branchId,
    } as Record<string, unknown>);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
