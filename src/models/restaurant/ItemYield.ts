import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IItemYield extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  inventoryItemId: Schema.Types.ObjectId;
  fromUnitId: Schema.Types.ObjectId;
  fromQty: number;
  /** How many base units (e.g. kg) equal one fromUnit (e.g. 1 bag = 25 kg → baseUnitQty = 25). */
  baseUnitQty?: number;
  toUnitId: Schema.Types.ObjectId;
  toQty: number;
  notes?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const itemYieldSchema = new Schema<IItemYield>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    fromUnitId: {
      type: Schema.Types.ObjectId,
      ref: "RestaurantUnit",
      required: true,
    },
    fromQty: { type: Number, required: true, min: 0.0001, default: 1 },
    baseUnitQty: { type: Number, min: 0.0001 },
    toUnitId: {
      type: Schema.Types.ObjectId,
      ref: "RestaurantUnit",
      required: true,
    },
    toQty: { type: Number, required: true, min: 0.0001 },
    notes: { type: String, trim: true },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
  },
  { timestamps: true }
);

itemYieldSchema.plugin(tenantPlugin);
itemYieldSchema.plugin(branchPlugin);
itemYieldSchema.plugin(createdByPlugin);

itemYieldSchema.index(
  { tenantId: 1, branchId: 1, inventoryItemId: 1, fromUnitId: 1, toUnitId: 1 },
  { unique: true }
);
itemYieldSchema.index({ tenantId: 1, branchId: 1, inventoryItemId: 1 });

const existingItemYieldModel = mongoose.models.ItemYield as Model<IItemYield> | undefined;

// Dev/runtime safety: if a stale compiled model is cached without new fields,
// patch the schema in-place so writes like baseUnitQty are not silently dropped.
if (existingItemYieldModel && !existingItemYieldModel.schema.path("baseUnitQty")) {
  existingItemYieldModel.schema.add({
    baseUnitQty: { type: Number, min: 0.0001 },
  });
}

const ItemYield: Model<IItemYield> =
  existingItemYieldModel ||
  mongoose.model<IItemYield>("ItemYield", itemYieldSchema);

export default ItemYield;
