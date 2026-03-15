import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { updateMenuItemSchema } from "@/validations/pos";
import { BAR_PERMISSIONS, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getPosMenuItemModelForDepartment,
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
      USER_ROLES.HEAD_CHEF,
      USER_ROLES.SOUS_CHEF,
      USER_ROLES.KITCHEN_STAFF,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BARTENDER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePosDepartment(
      _req.nextUrl.searchParams.get("department")
    );
    const MenuItemModel = getPosMenuItemModelForDepartment(department);
    const doc = await MenuItemModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>)
      .lean();
    if (!doc) throw new NotFoundError("Menu item");
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
      USER_ROLES.HEAD_CHEF,
      USER_ROLES.SOUS_CHEF,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    await requirePermissions(auth, [BAR_PERMISSIONS.STOCK_MANAGE], {
      allowRoles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.BRANCH_MANAGER],
    });
    const body = updateMenuItemSchema.parse(await req.json());
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const MenuItemModel = getPosMenuItemModelForDepartment(department);
    const doc = await MenuItemModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as Record<string, unknown>,
      body,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Menu item");
    await writeActivityLog(req, auth, {
      action: "BAR_MENU_ITEM_UPDATED",
      resource: "menuItem",
      resourceId: String(doc._id),
      details: {
        updatedFields: Object.keys(body),
      },
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
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    await requirePermissions(auth, [BAR_PERMISSIONS.STOCK_MANAGE], {
      allowRoles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.BRANCH_MANAGER],
    });
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const MenuItemModel = getPosMenuItemModelForDepartment(department);
    const doc = await MenuItemModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>);
    if (!doc) throw new NotFoundError("Menu item");
    await writeActivityLog(req, auth, {
      action: "BAR_MENU_ITEM_DELETED",
      resource: "menuItem",
      resourceId: String(doc._id),
      details: { name: doc.name },
    });
    return noContentResponse();
  },
  { auth: true }
);
