import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { updateTableSchema } from "@/validations/pos";
import { USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getPosTableModelForDepartment,
  normalizePosDepartment,
} from "@/lib/department-pos";

export const GET = withHandler(
  async (_req, { params, auth }) => {
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
      _req.nextUrl.searchParams.get("department")
    );
    const TableModel = getPosTableModelForDepartment(department);
    const doc = await TableModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>)
      .populate("assignedServerId", "firstName lastName")
      .lean();
    if (!doc) throw new NotFoundError("Table");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
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
    const body = updateTableSchema.parse(await req.json());
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const TableModel = getPosTableModelForDepartment(department);
    const doc = await TableModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as Record<string, unknown>,
      body,
      { new: true, runValidators: true }
    )
      .populate("assignedServerId", "firstName lastName")
      .lean();
    if (!doc) throw new NotFoundError("Table");
    await writeActivityLog(req, auth, {
      action: "RESTAURANT_TABLE_UPDATED",
      resource: "posTable",
      resourceId: String(doc._id),
      details: body,
    });
    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
      USER_ROLES.SUPERVISOR,
      USER_ROLES.CASHIER,
      USER_ROLES.POS_STAFF,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const TableModel = getPosTableModelForDepartment(department);
    const doc = await TableModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>);
    if (!doc) throw new NotFoundError("Table");
    await writeActivityLog(req, auth, {
      action: "RESTAURANT_TABLE_DELETED",
      resource: "posTable",
      resourceId: String(doc._id),
      details: { tableNumber: doc.tableNumber },
    });
    return noContentResponse();
  },
  { auth: true }
);
