import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { BadRequestError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import mongoose from "mongoose";
import { getKitchenUsageModelForDepartment, normalizeMovementDepartment } from "@/lib/department-movement";
import { createKitchenUsageSchema } from "@/validations/restaurant";
import { applyKitchenUsageStockEffects } from "@/lib/kitchen-usage-stock";

const SORT_FIELDS = ["usageDate", "createdAt"];

const RESTAURANT_MOVEMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.STOREKEEPER,
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
    const KitchenUsageModel = getKitchenUsageModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);

    const filter: Record<string, unknown> = { tenantId, branchId, department };
    const query = KitchenUsageModel.find(filter as any)
      .populate("stationTransferId", "transferNumber fromLocation toLocation")
      .sort(parseSortString(sort, SORT_FIELDS));
    const countQuery = KitchenUsageModel.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });
    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_MOVEMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeMovementDepartment(
      req.nextUrl.searchParams.get("department"),
      "restaurant"
    );
    const KitchenUsageModel = getKitchenUsageModelForDepartment(department);

    const body = await req.json();
    const data = createKitchenUsageSchema.parse(body);

    for (const line of data.lines) {
      if (line.usedQty + line.leftoverQty > line.issuedQty + 0.0001) {
        throw new BadRequestError(
          `For ${line.itemName}: used (${line.usedQty}) + leftover (${line.leftoverQty}) cannot exceed issued (${line.issuedQty})`
        );
      }
    }

    const doc = await KitchenUsageModel.create({
      tenantId,
      branchId,
      department,
      stationTransferId: data.stationTransferId
        ? new mongoose.Types.ObjectId(data.stationTransferId)
        : undefined,
      usageDate: new Date(data.usageDate),
      lines: data.lines.map((line) => ({
        inventoryItemId: new mongoose.Types.ObjectId(line.inventoryItemId),
        itemName: line.itemName,
        issuedQty: line.issuedQty,
        usedQty: line.usedQty,
        leftoverQty: line.leftoverQty,
        unit: line.unit,
        note: line.note,
      })),
      notes: data.notes,
      createdBy: auth.userId,
    } as any);

    await applyKitchenUsageStockEffects({
      doc: doc as { _id: mongoose.Types.ObjectId; lines?: unknown[] },
      tenantId,
      branchId,
      department,
      userId: auth.userId,
    });

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "kitchenUsage",
      resourceId: doc._id,
      details: { usageDate: doc.usageDate, linesCount: doc.lines?.length ?? 0 },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
