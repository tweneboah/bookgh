import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { createMenuItemSchema } from "@/validations/pos";
import { BAR_PERMISSIONS, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getPosMenuItemModelForDepartment,
  normalizePosDepartment,
} from "@/lib/department-pos";

const SORT_FIELDS = ["name", "category", "price", "createdAt"];

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
      req.nextUrl.searchParams.get("department")
    );
    const MenuItemModel = getPosMenuItemModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const category = req.nextUrl.searchParams.get("category");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (category) filter.category = category;

    const query = MenuItemModel.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = MenuItemModel.countDocuments(
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
      USER_ROLES.HEAD_CHEF,
      USER_ROLES.SOUS_CHEF,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const MenuItemModel = getPosMenuItemModelForDepartment(department);
    await requirePermissions(auth, [BAR_PERMISSIONS.STOCK_MANAGE], {
      allowRoles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.BRANCH_MANAGER],
    });
    const body = await req.json();
    const data = createMenuItemSchema.parse(body);

    const doc = await MenuItemModel.create({
      ...data,
      tenantId,
      branchId,
    } as Record<string, unknown>);

    await writeActivityLog(req, auth, {
      action: "BAR_MENU_ITEM_CREATED",
      resource: "menuItem",
      resourceId: String(doc._id),
      details: {
        name: doc.name,
        category: doc.category,
        isBarItem: doc.isBarItem,
      },
    });

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
