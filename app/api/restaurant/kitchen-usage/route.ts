import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { BadRequestError } from "@/lib/errors";
import { USER_ROLES, STOCK_LOCATION } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import mongoose from "mongoose";
import {
  getKitchenUsageModelForDepartment,
  getLocationStockModelForDepartment,
  getStationMovementModelForDepartment,
  normalizeMovementDepartment,
} from "@/lib/department-movement";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";
import { createKitchenUsageSchema } from "@/validations/restaurant";

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
    const LocationStockModel = getLocationStockModelForDepartment(department);
    const InventoryItemModel = getInventoryItemModelForDepartment(department);
    const StationMovementModel = getStationMovementModelForDepartment(department);

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

    // Apply stock movements: deduct from Kitchen (used+leftover), add used to Front House, add leftover to Main Store
    for (const line of doc.lines ?? []) {
      const invId = line.inventoryItemId;
      const usedQty = Number(line.usedQty ?? 0);
      const leftoverQty = Number(line.leftoverQty ?? 0);
      const unit = String(line.unit ?? "unit").trim();
      const itemName = String(line.itemName ?? "").trim();
      const totalDeduct = usedQty + leftoverQty;
      if (totalDeduct <= 0) continue;

      // Deduct from Kitchen
      const locStock = await LocationStockModel.findOne({
        inventoryItemId: invId,
        location: STOCK_LOCATION.KITCHEN,
        tenantId,
        branchId,
        department,
      } as any);
      const kitchenPrev = locStock ? Number(locStock.quantity ?? 0) : 0;
      if (kitchenPrev < totalDeduct) {
        throw new BadRequestError(
          `Insufficient kitchen stock for ${itemName}. Available: ${kitchenPrev}, needed: ${totalDeduct}`
        );
      }
      if (locStock) {
        locStock.quantity = Math.max(0, kitchenPrev - totalDeduct);
        await locStock.save();
      }

      // Add used to Front House
      if (usedQty > 0) {
        let fh = await LocationStockModel.findOne({
          inventoryItemId: invId,
          location: STOCK_LOCATION.FRONT_HOUSE,
          tenantId,
          branchId,
          department,
        } as any);
        if (!fh) {
          fh = await LocationStockModel.create({
            tenantId,
            branchId,
            department,
            inventoryItemId: invId,
            location: STOCK_LOCATION.FRONT_HOUSE,
            quantity: usedQty,
            unit,
          } as any);
        } else {
          fh.quantity = Number(fh.quantity ?? 0) + usedQty;
          await fh.save();
        }
        await StationMovementModel.create({
          tenantId,
          branchId,
          department,
          kitchenUsageId: doc._id,
          inventoryItemId: invId,
          itemName,
          fromLocation: STOCK_LOCATION.KITCHEN,
          toLocation: STOCK_LOCATION.FRONT_HOUSE,
          quantity: usedQty,
          unit,
          usedQty,
          reason: `Kitchen usage: used in prep`,
          createdBy: auth.userId,
        } as any);
      }

      // Add leftover to Main Store
      if (leftoverQty > 0) {
        const item = await InventoryItemModel.findOne({
          _id: invId,
          tenantId,
          branchId,
        } as any);
        if (item) {
          item.currentStock = Number(item.currentStock ?? 0) + leftoverQty;
          await item.save();
        }
        await StationMovementModel.create({
          tenantId,
          branchId,
          department,
          kitchenUsageId: doc._id,
          inventoryItemId: invId,
          itemName,
          fromLocation: STOCK_LOCATION.KITCHEN,
          toLocation: STOCK_LOCATION.MAIN_STORE,
          quantity: leftoverQty,
          unit,
          leftoverQty,
          reason: `Kitchen usage: leftover returned`,
          createdBy: auth.userId,
        } as any);
      }
    }

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
