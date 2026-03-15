import { z } from "zod";
import { enumValues, INVENTORY_MOVEMENT_TYPE } from "@/constants";

const recipeIngredientSchema = z.object({
  inventoryItemId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().min(1),
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
