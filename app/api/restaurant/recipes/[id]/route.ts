import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import { updateRecipeSchema } from "@/validations/restaurant";
import { writeActivityLog } from "@/lib/activity-log";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";
import { getRecipeModelForDepartment } from "@/lib/department-restaurant";
import { convertToBaseUnitQuantity, buildYieldMap, convertChefQtyToBaseQty } from "@/lib/unit-conversion";
import ItemYield from "@/models/restaurant/ItemYield";

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
  async (_req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const RecipeModel = getRecipeModelForDepartment("restaurant");
    const doc = await RecipeModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    if (!doc) throw new NotFoundError("Recipe");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const RecipeModel = getRecipeModelForDepartment("restaurant");
    const data = updateRecipeSchema.parse(await req.json());
    const existing = await RecipeModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    if (!existing) throw new NotFoundError("Recipe");

    const InventoryItemModel = getInventoryItemModelForDepartment("restaurant");
    const incomingIngredients = data.ingredients ?? existing.ingredients ?? [];
    const inventoryIds = incomingIngredients.map((row) => String(row.inventoryItemId));
    const inventoryItems = await InventoryItemModel.find({
      _id: { $in: inventoryIds },
      tenantId,
      branchId,
    } as any).lean();
    const inventoryMap = new Map(inventoryItems.map((item: any) => [String(item._id), item]));

    const yieldDocs = await ItemYield.find({ tenantId, branchId, inventoryItemId: { $in: inventoryIds } } as any)
      .populate("fromUnitId", "name abbreviation")
      .populate("toUnitId", "name abbreviation")
      .lean();
    const yieldMap = buildYieldMap(yieldDocs as any[]);

    const ingredients = incomingIngredients.map((row) => {
      const inventory = inventoryMap.get(String(row.inventoryItemId));
      if (!inventory) {
        throw new NotFoundError(`Inventory item ${String(row.inventoryItemId)}`);
      }

      let baseQuantity: number;
      let baseUnit: string;

      if (row.chefUnitId && row.chefQty != null && row.chefQty > 0) {
        const chefConverted = convertChefQtyToBaseQty({
          inventoryItemId: String(row.inventoryItemId),
          chefQty: row.chefQty,
          chefUnitIdOrName: row.chefUnitId,
          item: inventory,
          yieldMap,
        });
        if (chefConverted != null) {
          baseQuantity = chefConverted;
          baseUnit = String(inventory.unit ?? "unit");
        } else {
          baseQuantity = 0;
          baseUnit = String(inventory.unit ?? "unit");
        }
      } else {
        const converted = convertToBaseUnitQuantity({
          item: inventory,
          quantity: Number(row.quantity ?? 0),
          enteredUnit: String(row.unit ?? inventory.unit ?? "unit"),
        });
        if (!converted) {
          throw new BadRequestError(
            `Unit '${row.unit}' is not configured for ${inventory.name}. Base unit is ${inventory.unit}.`
          );
        }
        baseQuantity = converted.baseQuantity;
        baseUnit = converted.baseUnit;
      }

      const unitCost = Number(inventory.unitCost ?? row.unitCost ?? 0);
      const totalCost = Number((baseQuantity * unitCost).toFixed(2));
      return {
        inventoryItemId: row.inventoryItemId,
        name: String(inventory.name ?? row.name ?? "Ingredient"),
        quantity: baseQuantity,
        unit: baseUnit,
        chefUnitId: row.chefUnitId || undefined,
        chefQty: row.chefQty != null && row.chefQty > 0 ? row.chefQty : undefined,
        unitCost,
        totalCost,
      };
    });
    const ingredientCost = ingredients.reduce(
      (sum, row) => sum + Number(row.totalCost ?? 0),
      0
    );
    const overhead = Number(data.overheadCost ?? existing.overheadCost ?? 0);
    const costPerPortion = Math.round((ingredientCost + overhead) * 100) / 100;
    const sellingPrice = Number(data.sellingPrice ?? existing.sellingPrice ?? 0);
    const grossProfit = Math.round((sellingPrice - costPerPortion) * 100) / 100;
    const grossMarginPercent =
      sellingPrice > 0
        ? Math.round(((grossProfit / sellingPrice) * 100) * 100) / 100
        : 0;

    const doc = await RecipeModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as any,
      {
        ...data,
        ingredients,
        costPerPortion,
        grossProfit,
        grossMarginPercent,
      },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Recipe");

    await writeActivityLog(req, auth, {
      action: "RESTAURANT_RECIPE_UPDATED",
      resource: "recipe",
      resourceId: String(doc._id),
      details: { costPerPortion, grossMarginPercent },
    });
    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const RecipeModel = getRecipeModelForDepartment("restaurant");
    const doc = await RecipeModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as any);
    if (!doc) throw new NotFoundError("Recipe");
    await writeActivityLog(req, auth, {
      action: "RESTAURANT_RECIPE_DELETED",
      resource: "recipe",
      resourceId: String(doc._id),
    });
    return noContentResponse();
  },
  { auth: true }
);
