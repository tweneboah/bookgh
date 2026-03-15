import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { createInventoryMovementSchema } from "@/validations/pos";
import { BAR_PERMISSIONS, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { NextResponse } from "next/server";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";

const SORT_FIELDS = ["createdAt", "movementType", "quantity"];

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const InventoryItemModel = getInventoryItemModelForDepartment("bar");
    const InventoryMovementModel = getInventoryMovementModelForDepartment("bar");
    await requirePermissions(auth, [BAR_PERMISSIONS.REPORT_VIEW], {
      allowRoles: [
        USER_ROLES.TENANT_ADMIN,
        USER_ROLES.BRANCH_MANAGER,
        USER_ROLES.BAR_MANAGER,
        USER_ROLES.BARTENDER,
        USER_ROLES.BAR_CASHIER,
        USER_ROLES.ACCOUNTANT,
      ],
    });

    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const inventoryItemId = req.nextUrl.searchParams.get("inventoryItemId");
    const movementType = req.nextUrl.searchParams.get("movementType");
    const source = req.nextUrl.searchParams.get("source");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");
    const filter: Record<string, unknown> = { tenantId, branchId };
    if (inventoryItemId) filter.inventoryItemId = inventoryItemId;
    if (movementType) filter.movementType = movementType;
    if (source) (filter as any)["metadata.source"] = source;
    if (startDate || endDate) {
      let start: Date | null = startDate ? new Date(startDate) : null;
      let end: Date | null = endDate ? new Date(endDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      filter.createdAt = {
        ...(start ? { $gte: start } : {}),
        ...(end ? { $lte: end } : {}),
      } as any;
    }

    const format = (req.nextUrl.searchParams.get("format") ?? "").toLowerCase();
    if (format === "csv") {
      const rows = await InventoryMovementModel.find(filter as any)
        .sort(parseSortString(sort, SORT_FIELDS))
        .lean();
      const itemIds = [...new Set(rows.map((row: any) => String(row.inventoryItemId)))];
      const items = await InventoryItemModel.find({
        _id: { $in: itemIds },
        tenantId,
        branchId,
      } as any)
        .select("name unit")
        .lean();
      const itemMap = new Map(items.map((item: any) => [String(item._id), item]));
      const header = [
        "Date",
        "Item",
        "Type",
        "Quantity",
        "Unit",
        "PreviousStock",
        "ResultingStock",
        "Reason",
      ];
      const csvRows = rows.map((row: any) =>
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
      const filename = `bar-stock-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
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
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const InventoryItemModel = getInventoryItemModelForDepartment("bar");
    const InventoryMovementModel = getInventoryMovementModelForDepartment("bar");
    await requirePermissions(
      auth,
      [BAR_PERMISSIONS.STOCK_MANAGE, BAR_PERMISSIONS.STOCK_ADJUST],
      {
        allowRoles: [
          USER_ROLES.TENANT_ADMIN,
          USER_ROLES.BRANCH_MANAGER,
          USER_ROLES.BAR_MANAGER,
          USER_ROLES.BAR_CASHIER,
        ],
      }
    );

    const payload = createInventoryMovementSchema.parse(await req.json());
    const inventory = await InventoryItemModel.findOne({
      _id: payload.inventoryItemId,
      tenantId,
      branchId,
    } as any);
    if (!inventory) throw new NotFoundError("Inventory item");

    const previousStock = Number(inventory.currentStock ?? 0);
    const isDeduction = ["sale", "wastage", "closing"].includes(payload.movementType);
    const resultingStock = isDeduction
      ? Number((previousStock - payload.quantity).toFixed(4))
      : Number((previousStock + payload.quantity).toFixed(4));

    if (resultingStock < 0 && !payload.allowNegativeStock) {
      throw new BadRequestError(
        `Stock cannot be negative for ${inventory.name}. Current ${previousStock}, attempted ${payload.quantity}.`
      );
    }

    if (resultingStock < 0 && payload.allowNegativeStock) {
      await requirePermissions(auth, [BAR_PERMISSIONS.STOCK_OVERRIDE_NEGATIVE], {
        allowRoles: [
          USER_ROLES.TENANT_ADMIN,
          USER_ROLES.BRANCH_MANAGER,
          USER_ROLES.BAR_MANAGER,
        ],
      });
    }

    inventory.currentStock = resultingStock;
    await inventory.save();

    const movement = await InventoryMovementModel.create({
      tenantId,
      branchId,
      inventoryItemId: inventory._id,
      movementType: payload.movementType,
      quantity: payload.quantity,
      unit: payload.unit,
      previousStock,
      resultingStock,
      reason: payload.reason,
      metadata: payload.metadata,
      createdBy: auth.userId,
    } as any);

    await writeActivityLog(req, auth, {
      action: "BAR_STOCK_MOVEMENT",
      resource: "inventoryMovement",
      resourceId: String(movement._id),
      details: {
        inventoryItemId: String(inventory._id),
        movementType: payload.movementType,
        quantity: payload.quantity,
        previousStock,
        resultingStock,
      },
    });

    return createdResponse(movement.toObject());
  },
  { auth: true }
);
