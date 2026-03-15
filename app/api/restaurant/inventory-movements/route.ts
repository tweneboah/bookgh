import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import { NextResponse } from "next/server";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";
import { createRestaurantInventoryMovementSchema } from "@/validations/restaurant";
import { convertToBaseUnitQuantity } from "@/lib/unit-conversion";

const SORT_FIELDS = ["createdAt", "movementType", "quantity"];

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const RESTAURANT_STOCK_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.STOREKEEPER,
  USER_ROLES.PROCUREMENT_OFFICER,
  USER_ROLES.HEAD_CHEF,
  USER_ROLES.SOUS_CHEF,
  USER_ROLES.KITCHEN_STAFF,
  USER_ROLES.ACCOUNTANT,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_STOCK_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const InventoryItemModel = getInventoryItemModelForDepartment("restaurant");
    const InventoryMovementModel = getInventoryMovementModelForDepartment("restaurant");
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const format = (req.nextUrl.searchParams.get("format") ?? "").toLowerCase();
    const inventoryItemId = req.nextUrl.searchParams.get("inventoryItemId");
    const movementType = req.nextUrl.searchParams.get("movementType");
    const source = req.nextUrl.searchParams.get("source");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (inventoryItemId) filter.inventoryItemId = inventoryItemId;
    if (movementType) filter.movementType = movementType;
    if (source) filter["metadata.source"] = source;
    if (startDate || endDate) {
      filter.createdAt = {
        ...(startDate ? { $gte: new Date(startDate) } : {}),
        ...(endDate ? { $lte: new Date(endDate) } : {}),
      };
    }
    if (format === "csv") {
      const rows = await InventoryMovementModel.find(filter as any)
        .sort(parseSortString(sort, SORT_FIELDS))
        .lean();
      const itemIds = rows.map((row) => String(row.inventoryItemId));
      const items = await InventoryItemModel.find({
        _id: { $in: itemIds },
        tenantId,
        branchId,
      } as any)
        .select("name unit")
        .lean();
      const itemMap = new Map(items.map((item) => [String(item._id), item]));
      const header = [
        "Date",
        "Ingredient",
        "Type",
        "Quantity",
        "Unit",
        "PreviousStock",
        "ResultingStock",
        "Reason",
      ];
      const csvRows = rows.map((row) =>
        [
          new Date(row.createdAt).toISOString(),
          itemMap.get(String(row.inventoryItemId))?.name ?? String(row.inventoryItemId),
          row.movementType,
          row.quantity,
          row.unit,
          row.previousStock,
          row.resultingStock,
          row.reason ?? "",
        ]
          .map(escapeCsv)
          .join(",")
      );
      const filename = `restaurant-stock-ledger-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      return new NextResponse([header.join(","), ...csvRows].join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const query = InventoryMovementModel.find(filter as any).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = InventoryMovementModel.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });
    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_STOCK_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const InventoryItemModel = getInventoryItemModelForDepartment("restaurant");
    const InventoryMovementModel = getInventoryMovementModelForDepartment("restaurant");
    const payload = createRestaurantInventoryMovementSchema.parse(await req.json());

    const inventory = await InventoryItemModel.findOne({
      _id: payload.inventoryItemId,
      tenantId,
      branchId,
    } as any);
    if (!inventory) throw new NotFoundError("Inventory item");
    const converted = convertToBaseUnitQuantity({
      item: inventory,
      quantity: payload.quantity,
      enteredUnit: payload.unit,
    });
    if (!converted) {
      throw new BadRequestError(
        `Unit '${payload.unit}' is not configured for ${inventory.name}. Base unit is ${inventory.unit}.`
      );
    }
    const movementQuantity = converted.baseQuantity;

    const previousStock = Number(inventory.currentStock ?? 0);
    const isDeduction = ["sale", "wastage", "closing"].includes(payload.movementType);
    const resultingStock = isDeduction
      ? Number((previousStock - movementQuantity).toFixed(4))
      : Number((previousStock + movementQuantity).toFixed(4));

    if (resultingStock < 0) {
      throw new BadRequestError(
        `Stock cannot be negative for ${inventory.name}. Current ${previousStock}, movement ${payload.quantity}.`
      );
    }

    inventory.currentStock = resultingStock;
    await inventory.save();

    const movement = await InventoryMovementModel.create({
      tenantId,
      branchId,
      inventoryItemId: inventory._id,
      movementType: payload.movementType,
      quantity: movementQuantity,
      unit: String(inventory.unit || "unit"),
      previousStock,
      resultingStock,
      reason: payload.reason,
      metadata: {
        ...(payload.metadata ?? {}),
        enteredUnit: payload.unit,
        enteredQuantity: payload.quantity,
        conversionFactor: converted.factor,
      },
      createdBy: auth.userId,
    } as any);

    await writeActivityLog(req, auth, {
      action: "RESTAURANT_STOCK_MOVEMENT",
      resource: "inventoryMovement",
      resourceId: String(movement._id),
      details: {
        inventoryItemId: String(inventory._id),
        movementType: payload.movementType,
        quantity: movementQuantity,
        unit: String(inventory.unit || "unit"),
        previousStock,
        resultingStock,
      },
    });

    return createdResponse(movement.toObject());
  },
  { auth: true }
);
