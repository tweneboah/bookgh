import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { createInventoryItemSchema } from "@/validations/pos";
import { BAR_PERMISSIONS, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getInventoryItemModelForDepartment,
  normalizeInventoryDepartment,
} from "@/lib/department-inventory";

const SORT_FIELDS = ["name", "category", "currentStock", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BARTENDER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    await requirePermissions(auth, [BAR_PERMISSIONS.REPORT_VIEW], {
      allowRoles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.BRANCH_MANAGER],
    });
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const category = req.nextUrl.searchParams.get("category");
    const department = normalizeInventoryDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const InventoryItemModel = getInventoryItemModelForDepartment(department);

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (category) filter.category = category;

    let query = InventoryItemModel.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    if (department === "restaurant") {
      query = query
        .populate("purchaseUnitId", "name abbreviation type")
        .populate("yieldUnitId", "name abbreviation type");
    }
    const countQuery = InventoryItemModel.countDocuments(
      filter as Record<string, unknown>
    );
    const result = await paginate(query, countQuery, { page, limit, sort });

    // Ensure each item includes supplier (string) for list display
    const items = result.items.map((item: Record<string, unknown>) => ({
      ...item,
      supplier: item.supplier ?? null,
    }));

    return successResponse(items, 200, {
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
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    await requirePermissions(
      auth,
      [BAR_PERMISSIONS.STOCK_MANAGE, BAR_PERMISSIONS.STOCK_ADJUST],
      {
        allowRoles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.BRANCH_MANAGER],
      }
    );
    const body = await req.json();
    const data = createInventoryItemSchema.parse(body);
    const department = normalizeInventoryDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const InventoryItemModel = getInventoryItemModelForDepartment(department);

    const doc = await InventoryItemModel.create({
      ...data,
      tenantId,
      branchId,
    } as Record<string, unknown>);

    await writeActivityLog(req, auth, {
      action: "BAR_INVENTORY_CREATED",
      resource: "inventoryItem",
      resourceId: String(doc._id),
      details: {
        name: doc.name,
        category: doc.category,
        department,
      },
    });

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
