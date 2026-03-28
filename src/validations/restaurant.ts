import { z } from "zod";
import {
  enumValues,
  INVENTORY_MOVEMENT_TYPE,
  STOCK_LOCATION,
  STATION_TRANSFER_STATUS,
} from "@/constants";

const recipeIngredientSchema = z.object({
  inventoryItemId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  chefUnitId: z.string().optional(),
  chefQty: z.number().min(0).optional(),
  unitCost: z.number().min(0),
  totalCost: z.number().min(0),
});

export const createRecipeSchema = z.object({
  menuItemId: z.string().min(1),
  menuItemName: z.string().min(1),
  ingredients: z.array(recipeIngredientSchema).min(1),
  preparationInstructions: z.string().optional(),
  productionTimeMinutes: z.number().min(0).optional(),
  overheadCost: z.number().min(0).optional(),
  sellingPrice: z.number().min(0),
});

export const updateRecipeSchema = createRecipeSchema.partial();

const productionInputSchema = z.object({
  inventoryItemId: z.string().min(1),
  itemName: z.string().min(1),
  quantityUsed: z.number().min(0),
  unit: z.string().min(1),
  unitCost: z.number().min(0),
  totalCost: z.number().min(0),
});

const productionOutputSchema = z.object({
  inventoryItemId: z.string().optional(),
  itemName: z.string().min(1),
  quantityProduced: z.number().positive(),
  unit: z.string().min(1),
});

export const createProductionBatchSchema = z.object({
  batchNumber: z.string().min(1),
  recipeId: z.string().optional(),
  recipeName: z.string().min(1),
  inputs: z.array(productionInputSchema).min(1),
  output: productionOutputSchema,
  productionDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const updateProductionBatchSchema = createProductionBatchSchema.partial();

export const createRestaurantInventoryMovementSchema = z.object({
  inventoryItemId: z.string().min(1),
  movementType: z.enum(enumValues(INVENTORY_MOVEMENT_TYPE) as [string, ...string[]]),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  reason: z.string().min(1).max(500),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const stockCountLineSchema = z.object({
  inventoryItemId: z.string().min(1),
  physicalStock: z.number().min(0),
  note: z.string().max(300).optional(),
});

export const createRestaurantStockCountSchema = z.object({
  countedAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  lines: z.array(stockCountLineSchema).min(1),
});

// ─── Restaurant Units (dynamic chef/store units) ──────────
export const createRestaurantUnitSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: z.enum(["purchase", "yield", "both"]).default("both"),
  abbreviation: z.string().max(20).trim().optional(),
});

export const updateRestaurantUnitSchema = createRestaurantUnitSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ─── Item Yield Mappings (e.g. 1 small bag → 20 plates) ──
export const createItemYieldSchema = z.object({
  inventoryItemId: z.string().min(1),
  fromUnitId: z.string().min(1),
  fromQty: z.number().positive().default(1),
  baseUnitQty: z.number().positive(),
  toUnitId: z.string().min(1),
  toQty: z.number().positive(),
  notes: z.string().max(500).trim().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
});

export const updateItemYieldSchema = createItemYieldSchema.partial();

// ─── Movement Flow (Main Store → Kitchen → Front House) ───
const stationTransferLineSchema = z.object({
  inventoryItemId: z.string().min(1),
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  usedQty: z.number().min(0).optional(),
  leftoverQty: z.number().min(0).optional(),
  note: z.string().max(200).optional(),
});

const stationTransferBaseSchema = z.object({
  fromLocation: z.enum(enumValues(STOCK_LOCATION) as [string, ...string[]]),
  toLocation: z.enum(enumValues(STOCK_LOCATION) as [string, ...string[]]),
  transferDate: z.string().datetime(),
  lines: z.array(stationTransferLineSchema).min(1),
  notes: z.string().max(500).optional(),
});

export const createStationTransferSchema = stationTransferBaseSchema.refine(
  (d) => d.fromLocation !== d.toLocation,
  { message: "From and to locations must differ", path: ["toLocation"] }
);

export const updateStationTransferSchema = stationTransferBaseSchema
  .partial()
  .extend({
    status: z.enum(enumValues(STATION_TRANSFER_STATUS) as [string, ...string[]]).optional(),
  });

const kitchenUsageLineSchema = z.object({
  inventoryItemId: z.string().min(1),
  itemName: z.string().min(1),
  issuedQty: z.number().min(0),
  usedQty: z.number().min(0),
  leftoverQty: z.number().min(0),
  unit: z.string().min(1),
  note: z.string().max(200).optional(),
});

export const createKitchenUsageSchema = z.object({
  stationTransferId: z.string().optional(),
  usageDate: z.string().datetime(),
  lines: z.array(kitchenUsageLineSchema).min(1),
  notes: z.string().max(500).optional(),
});
