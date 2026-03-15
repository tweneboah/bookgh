import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { createTableSchema } from "@/validations/pos";
import { USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getPosTableModelForDepartment,
  normalizePosDepartment,
} from "@/lib/department-pos";

const SORT_FIELDS = ["tableNumber", "status", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
      USER_ROLES.CASHIER,
      USER_ROLES.WAITER,
      USER_ROLES.HOSTESS,
      USER_ROLES.SUPERVISOR,
      USER_ROLES.POS_STAFF,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const TableModel = getPosTableModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;

    const query = TableModel.find(filter as Record<string, unknown>)
      .populate("assignedServerId", "firstName lastName")
      .sort(parseSortString(sort, SORT_FIELDS));
    const countQuery = TableModel.countDocuments(
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
      USER_ROLES.RESTAURANT_MANAGER,
      USER_ROLES.SUPERVISOR,
      USER_ROLES.CASHIER,
      USER_ROLES.HOSTESS,
      USER_ROLES.POS_STAFF,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const TableModel = getPosTableModelForDepartment(department);
    const body = await req.json();
    const data = createTableSchema.parse(body);
    const { assignedServerId, ...rest } = data;
    const doc = await TableModel.create({
      ...rest,
      tenantId,
      branchId,
      ...(assignedServerId ? { assignedServerId } : {}),
    } as Record<string, unknown>);

    await writeActivityLog(req, auth, {
      action: "RESTAURANT_TABLE_CREATED",
      resource: "posTable",
      resourceId: String(doc._id),
      details: { tableNumber: doc.tableNumber, capacity: doc.capacity },
    });

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
