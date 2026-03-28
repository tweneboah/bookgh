import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES, STOCK_LOCATION } from "@/constants";
import {
  getLocationStockModelForDepartment,
  normalizeMovementDepartment,
} from "@/lib/department-movement";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";

const RESTAURANT_MOVEMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.STOREKEEPER,
  USER_ROLES.PROCUREMENT_OFFICER,
  USER_ROLES.HEAD_CHEF,
  USER_ROLES.SOUS_CHEF,
  USER_ROLES.KITCHEN_STAFF,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_MOVEMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeMovementDepartment(
      req.nextUrl.searchParams.get("department"),
      "restaurant"
    );
    const location = req.nextUrl.searchParams.get("location");

    const LocationStockModel = getLocationStockModelForDepartment(department);
    const InventoryItemModel = getInventoryItemModelForDepartment(department);

    const filter: Record<string, unknown> = { tenantId, branchId, department };
    if (location && [STOCK_LOCATION.KITCHEN, STOCK_LOCATION.FRONT_HOUSE].includes(location as any)) {
      filter.location = location;
    }

    const locationStocks = await LocationStockModel.find(filter as any)
      .populate("inventoryItemId", "name unit category")
      .lean();

    // Main store: use InventoryItem.currentStock
    const mainStoreFilter = location === STOCK_LOCATION.MAIN_STORE || !location;
    let mainStoreItems: any[] = [];
    if (mainStoreFilter) {
      mainStoreItems = await InventoryItemModel.find({
        tenantId,
        branchId,
        currentStock: { $gt: 0 },
      } as any)
        .select("name unit category currentStock")
        .lean();
    }

    const kitchenItems = locationStocks.filter((s: any) => s.location === STOCK_LOCATION.KITCHEN);
    const frontHouseItems = locationStocks.filter((s: any) => s.location === STOCK_LOCATION.FRONT_HOUSE);

    return successResponse({
      mainStore: mainStoreItems.map((i: any) => ({
        inventoryItemId: i._id,
        itemName: i.name,
        unit: i.unit,
        quantity: i.currentStock,
        location: STOCK_LOCATION.MAIN_STORE,
      })),
      kitchen: kitchenItems.map((s: any) => ({
        inventoryItemId: s.inventoryItemId?._id ?? s.inventoryItemId,
        itemName: s.inventoryItemId?.name ?? "",
        unit: s.unit,
        quantity: s.quantity,
        location: STOCK_LOCATION.KITCHEN,
      })),
      frontHouse: frontHouseItems.map((s: any) => ({
        inventoryItemId: s.inventoryItemId?._id ?? s.inventoryItemId,
        itemName: s.inventoryItemId?.name ?? "",
        unit: s.unit,
        quantity: s.quantity,
        location: STOCK_LOCATION.FRONT_HOUSE,
      })),
    });
  },
  { auth: true }
);
