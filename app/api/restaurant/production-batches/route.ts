import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES, INVENTORY_MOVEMENT_TYPE } from "@/constants";
import { createProductionBatchSchema } from "@/validations/restaurant";
import { writeActivityLog } from "@/lib/activity-log";
import mongoose from "mongoose";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";
import { getProductionBatchModelForDepartment } from "@/lib/department-restaurant";
import { convertToBaseUnitQuantity } from "@/lib/unit-conversion";
import { BadRequestError } from "@/lib/errors";

const SORT_FIELDS = ["productionDate", "batchNumber", "totalInputCost", "createdAt"];

const RESTAURANT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.HEAD_CHEF,
  USER_ROLES.SOUS_CHEF,
  USER_ROLES.KITCHEN_STAFF,
  USER_ROLES.STOREKEEPER,
  USER_ROLES.PROCUREMENT_OFFICER,
  USER_ROLES.ACCOUNTANT,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const ProductionBatchModel = getProductionBatchModelForDepartment("restaurant");
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const query = ProductionBatchModel.find({ tenantId, branchId } as any).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = ProductionBatchModel.countDocuments({ tenantId, branchId } as any);
    const result = await paginate(query, countQuery, { page, limit, sort });
    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const ProductionBatchModel = getProductionBatchModelForDepartment("restaurant");
    const InventoryItemModel = getInventoryItemModelForDepartment("restaurant");
    const InventoryMovementModel =
      getInventoryMovementModelForDepartment("restaurant");
    const data = createProductionBatchSchema.parse(await req.json());
    let totalInputCost = 0;
    let outputBaseQty = Number(data.output.quantityProduced ?? 0);

    for (const input of data.inputs) {
      const item = await InventoryItemModel.findOne({
        _id: new mongoose.Types.ObjectId(input.inventoryItemId),
        tenantId,
        branchId,
      } as any);
      if (!item) continue;
      const converted = convertToBaseUnitQuantity({
        item,
        quantity: Number(input.quantityUsed ?? 0),
        enteredUnit: input.unit,
      });
      if (!converted) {
        throw new BadRequestError(
          `Unit '${input.unit}' is not configured for ${item.name}. Base unit is ${item.unit}.`
        );
      }
      const baseQtyUsed = converted.baseQuantity;
      const baseUnitCost = Number(item.unitCost ?? 0);
      totalInputCost += Number((baseQtyUsed * baseUnitCost).toFixed(2));
      const previousStock = Number(item.currentStock ?? 0);
      const resultingStock = Math.max(0, previousStock - baseQtyUsed);
      item.currentStock = resultingStock;
      await item.save();

      await InventoryMovementModel.create({
        tenantId,
        branchId,
        inventoryItemId: item._id,
        movementType: INVENTORY_MOVEMENT_TYPE.ADJUSTMENT,
        quantity: baseQtyUsed,
        unit: String(item.unit || "unit"),
        previousStock,
        resultingStock,
        reason: `Production batch ${data.batchNumber} input`,
        createdBy: auth.userId,
      } as any);
    }

    if (data.output.inventoryItemId) {
      const outputItem = await InventoryItemModel.findOne({
        _id: new mongoose.Types.ObjectId(data.output.inventoryItemId),
        tenantId,
        branchId,
      } as any);
      if (outputItem) {
        const convertedOutput = convertToBaseUnitQuantity({
          item: outputItem,
          quantity: Number(data.output.quantityProduced ?? 0),
          enteredUnit: data.output.unit,
        });
        if (!convertedOutput) {
          throw new BadRequestError(
            `Unit '${data.output.unit}' is not configured for ${outputItem.name}. Base unit is ${outputItem.unit}.`
          );
        }
        const outputQty = convertedOutput.baseQuantity;
        outputBaseQty = outputQty;
        const unitProductionCost =
          outputQty > 0 ? Math.round((totalInputCost / outputQty) * 100) / 100 : 0;
        const previousStock = Number(outputItem.currentStock ?? 0);
        const resultingStock = previousStock + outputQty;
        outputItem.currentStock = resultingStock;
        outputItem.unitCost = unitProductionCost;
        await outputItem.save();

        await InventoryMovementModel.create({
          tenantId,
          branchId,
          inventoryItemId: outputItem._id,
          movementType: INVENTORY_MOVEMENT_TYPE.RESTOCK,
          quantity: outputQty,
          unit: String(outputItem.unit || "unit"),
          previousStock,
          resultingStock,
          reason: `Production batch ${data.batchNumber} output`,
          createdBy: auth.userId,
        } as any);
      }
    }

    const unitProductionCost =
      outputBaseQty > 0 ? Number((totalInputCost / outputBaseQty).toFixed(2)) : 0;

    const doc = await ProductionBatchModel.create({
      ...data,
      recipeId: data.recipeId ? new mongoose.Types.ObjectId(data.recipeId) : undefined,
      inputs: data.inputs.map((row) => ({
        ...row,
        inventoryItemId: new mongoose.Types.ObjectId(row.inventoryItemId),
      })),
      output: {
        ...data.output,
        inventoryItemId: data.output.inventoryItemId
          ? new mongoose.Types.ObjectId(data.output.inventoryItemId)
          : undefined,
      },
      productionDate: data.productionDate ? new Date(data.productionDate) : new Date(),
      tenantId,
      branchId,
      totalInputCost: Number(totalInputCost.toFixed(2)),
      unitProductionCost,
      createdBy: auth.userId,
    } as Record<string, unknown>);

    await writeActivityLog(req, auth, {
      action: "RESTAURANT_PRODUCTION_BATCH_CREATED",
      resource: "productionBatch",
      resourceId: String(doc._id),
      details: { batchNumber: doc.batchNumber, totalInputCost, unitProductionCost },
    });

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
