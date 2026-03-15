import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IProductionInput {
  inventoryItemId: Schema.Types.ObjectId;
  itemName: string;
  quantityUsed: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface IProductionOutput {
  inventoryItemId?: Schema.Types.ObjectId;
  itemName: string;
  quantityProduced: number;
  unit: string;
}

export interface IProductionBatch extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  batchNumber: string;
  recipeId?: Schema.Types.ObjectId;
  recipeName: string;
  inputs: IProductionInput[];
  output: IProductionOutput;
  productionDate: Date;
  notes?: string;
  totalInputCost: number;
  unitProductionCost: number;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inputSchema = new Schema<IProductionInput>(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    itemName: { type: String, required: true },
    quantityUsed: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const outputSchema = new Schema<IProductionOutput>(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
    itemName: { type: String, required: true },
    quantityProduced: { type: Number, required: true, min: 0.0001 },
    unit: { type: String, required: true },
  },
  { _id: false }
);

const productionBatchSchema = new Schema<IProductionBatch>(
  {
    batchNumber: { type: String, required: true, trim: true },
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe" },
    recipeName: { type: String, required: true },
    inputs: { type: [inputSchema], default: [] },
    output: { type: outputSchema, required: true },
    productionDate: { type: Date, required: true, default: Date.now },
    notes: { type: String },
    totalInputCost: { type: Number, required: true, min: 0 },
    unitProductionCost: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

productionBatchSchema.plugin(tenantPlugin);
productionBatchSchema.plugin(branchPlugin);
productionBatchSchema.plugin(createdByPlugin);

productionBatchSchema.index({ tenantId: 1, branchId: 1, batchNumber: 1 }, { unique: true });
productionBatchSchema.index({ tenantId: 1, branchId: 1, productionDate: -1 });

const ProductionBatch: Model<IProductionBatch> =
  mongoose.models.ProductionBatch ||
  mongoose.model<IProductionBatch>("ProductionBatch", productionBatchSchema);

export default ProductionBatch;
