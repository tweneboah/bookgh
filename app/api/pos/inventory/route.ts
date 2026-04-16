import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import { parseSortString, paginate } from "@/lib/pagination";
import { createInventoryItemSchema } from "@/validations/pos";
import { BAR_PERMISSIONS, STOCK_LOCATION, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getInventoryItemModelForDepartment,
  normalizeInventoryDepartment,
} from "@/lib/department-inventory";
import { getLocationStockModelForDepartment } from "@/lib/department-movement";
import { assertRestaurantYieldFieldsWhenUnitsExist } from "@/lib/restaurant-inventory-yield";

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
    // Allow up to 500 rows per page for reporting views (client-side filter/slice on POS inventory).
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      500,
      Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10))
    );
    const sort = req.nextUrl.searchParams.get("sort") || undefined;
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
    if (department === "restaurant" || department === "bar") {
      query = query
        .populate("purchaseUnitId", "name abbreviation type")
        .populate("yieldUnitId", "name abbreviation type");
    }
    const countQuery = InventoryItemModel.countDocuments(
      filter as Record<string, unknown>
    );
    const result = await paginate(query, countQuery, {
      page,
      limit,
      sort: sort ?? undefined,
    });

    // Ensure each item includes supplier (string) for list display
    let items: Record<string, unknown>[] = (result.items as unknown as Record<string, unknown>[]).map(
      (item) => ({
        ...item,
        supplier: item.supplier ?? null,
      })
    );

    if ((department === "restaurant" || department === "bar") && items.length > 0) {
      const ids = items.map((i) => i._id);
      const LocationStockModel = getLocationStockModelForDepartment(department);
      const locRows = await LocationStockModel.find({
        tenantId,
        branchId,
        department,
        inventoryItemId: { $in: ids },
      } as Record<string, unknown>).lean();
      const byItem = new Map<string, { kitchen: number; frontHouse: number }>();
      for (const row of locRows as { inventoryItemId?: unknown; location?: string; quantity?: number }[]) {
        const id = String(row.inventoryItemId);
        if (!byItem.has(id)) byItem.set(id, { kitchen: 0, frontHouse: 0 });
        const e = byItem.get(id)!;
        if (row.location === STOCK_LOCATION.KITCHEN) e.kitchen += Number(row.quantity ?? 0);
        if (row.location === STOCK_LOCATION.FRONT_HOUSE) e.frontHouse += Number(row.quantity ?? 0);
      }
      items = items.map((item) => {
        const id = String(item._id);
        const loc = byItem.get(id) ?? { kitchen: 0, frontHouse: 0 };
        const main = Number(item.currentStock ?? 0);
        return {
          ...item,
          stockByLocation: {
            mainStore: main,
            kitchen: loc.kitchen,
            frontHouse: loc.frontHouse,
          },
          totalOnHandBase: Number((main + loc.kitchen + loc.frontHouse).toFixed(4)),
        };
      });
    }

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
    await assertRestaurantYieldFieldsWhenUnitsExist(tenantId, branchId, department, data);
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
