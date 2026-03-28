import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES } from "@/constants";
import { createRecipeSchema } from "@/validations/restaurant";
import { writeActivityLog } from "@/lib/activity-log";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";
import { getRecipeModelForDepartment } from "@/lib/department-restaurant";
import { convertToBaseUnitQuantity, buildYieldMap, convertChefQtyToBaseQty } from "@/lib/unit-conversion";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import ItemYield from "@/models/restaurant/ItemYield";

const SORT_FIELDS = ["menuItemName", "costPerPortion", "grossMarginPercent", "createdAt"];

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
    const RecipeModel = getRecipeModelForDepartment("restaurant");
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const q = req.nextUrl.searchParams.get("q");
    const filter: Record<string, unknown> = { tenantId, branchId };
    if (q) filter.menuItemName = { $regex: q, $options: "i" };
    const query = RecipeModel.find(filter as any).sort(parseSortString(sort, SORT_FIELDS));
    const countQuery = RecipeModel.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });
    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...RESTAURANT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const RecipeModel = getRecipeModelForDepartment("restaurant");
    const data = createRecipeSchema.parse(await req.json());
    const InventoryItemModel = getInventoryItemModelForDepartment("restaurant");
    const inventoryIds = data.ingredients.map((row) => row.inventoryItemId);
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

    const normalizedIngredients = data.ingredients.map((row) => {
      const inventory = inventoryMap.get(String(row.inventoryItemId));
      if (!inventory) {
        throw new NotFoundError(`Inventory item ${row.inventoryItemId}`);
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
          enteredUnit: row.unit,
        });
        if (!converted) {
          throw new BadRequestError(
            `Unit '${row.unit}' is not configured for ${inventory.name}. Base unit is ${inventory.unit}.`
          );
        }
        baseQuantity = converted.baseQuantity;
        baseUnit = converted.baseUnit;
      }

      const unitCost = Number(inventory.unitCost ?? 0);
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
    const ingredientCost = normalizedIngredients.reduce(
      (sum, row) => sum + Number(row.totalCost ?? 0),
      0
    );
    const overhead = Number(data.overheadCost ?? 0);
    const costPerPortion = Math.round((ingredientCost + overhead) * 100) / 100;
    const sellingPrice = Number(data.sellingPrice ?? 0);
    const grossProfit = Math.round((sellingPrice - costPerPortion) * 100) / 100;
    const grossMarginPercent =
      sellingPrice > 0
        ? Math.round(((grossProfit / sellingPrice) * 100) * 100) / 100
        : 0;

    const doc = await RecipeModel.create({
      ...data,
      ingredients: normalizedIngredients,
      tenantId,
      branchId,
      costPerPortion,
      grossProfit,
      grossMarginPercent,
      createdBy: auth.userId,
    } as Record<string, unknown>);

    await writeActivityLog(req, auth, {
      action: "RESTAURANT_RECIPE_CREATED",
      resource: "recipe",
      resourceId: String(doc._id),
      details: { menuItemName: doc.menuItemName, costPerPortion, grossMarginPercent },
    });

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
