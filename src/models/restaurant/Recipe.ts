import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IRecipeIngredient {
  inventoryItemId: Schema.Types.ObjectId;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface IRecipe extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  menuItemId: Schema.Types.ObjectId;
  menuItemName: string;
  ingredients: IRecipeIngredient[];
  preparationInstructions?: string;
  productionTimeMinutes?: number;
  overheadCost?: number;
  costPerPortion: number;
  sellingPrice: number;
  grossProfit: number;
  grossMarginPercent: number;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ingredientSchema = new Schema<IRecipeIngredient>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const recipeSchema = new Schema<IRecipe>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: "POSMenuItem", required: true },
    menuItemName: { type: String, required: true },
    ingredients: { type: [ingredientSchema], default: [] },
    preparationInstructions: { type: String },
    productionTimeMinutes: { type: Number, min: 0 },
    overheadCost: { type: Number, min: 0, default: 0 },
    costPerPortion: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    grossProfit: { type: Number, required: true },
    grossMarginPercent: { type: Number, required: true },
  },
  { timestamps: true }
);

recipeSchema.plugin(tenantPlugin);
recipeSchema.plugin(branchPlugin);
recipeSchema.plugin(createdByPlugin);

recipeSchema.index({ tenantId: 1, branchId: 1, menuItemId: 1 }, { unique: true });

const Recipe: Model<IRecipe> =
  mongoose.models.Recipe || mongoose.model<IRecipe>("Recipe", recipeSchema);

export default Recipe;
