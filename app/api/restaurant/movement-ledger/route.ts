import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES } from "@/constants";
import {
  getStationMovementModelForDepartment,
  normalizeMovementDepartment,
} from "@/lib/department-movement";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";

const SORT_FIELDS = ["createdAt", "quantity", "fromLocation", "toLocation"];

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
    const StationMovementModel = getStationMovementModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const fromLocation = req.nextUrl.searchParams.get("fromLocation");
    const toLocation = req.nextUrl.searchParams.get("toLocation");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    const filter: Record<string, unknown> = { tenantId, branchId, department };
    if (fromLocation) filter.fromLocation = fromLocation;
    if (toLocation) filter.toLocation = toLocation;
    if (startDate || endDate) {
      filter.createdAt = {
        ...(startDate ? { $gte: new Date(startDate) } : {}),
        ...(endDate ? { $lte: new Date(endDate) } : {}),
      };
    }

    const InventoryItemModel = getInventoryItemModelForDepartment(department);
    const query = StationMovementModel.find(filter as any)
      .populate({
        path: "inventoryItemId",
        model: InventoryItemModel,
        select: "name unit",
      })
      .sort(parseSortString(sort, SORT_FIELDS));
    const countQuery = StationMovementModel.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });
    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);
