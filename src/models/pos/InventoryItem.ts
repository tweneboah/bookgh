import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IInventoryItemImage {
  url: string;
  caption?: string;
}

export interface IInventoryItem extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  name: string;
  category: string;
  unit: string;
  unitConversions?: Array<{ unit: string; factor: number }>;
  images: IInventoryItemImage[];
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  unitCost: number;
  supplier?: string;
  sku?: string;
  volumeMl?: number;
  unitsPerBottle?: number;
  isControlled: boolean;
  trackByBottle: boolean;
  mlPerUnit?: number;
  lastRestockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    unitConversions: {
      type: [
        new Schema(
          {
            unit: { type: String, required: true, trim: true },
            factor: { type: Number, required: true, min: 0.0000001 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          caption: { type: String },
        },
      ],
      default: [],
    },
    currentStock: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    supplier: { type: String },
    sku: { type: String },
    volumeMl: { type: Number, min: 0 },
    unitsPerBottle: { type: Number, min: 0 },
    isControlled: { type: Boolean, default: true },
    trackByBottle: { type: Boolean, default: false },
    mlPerUnit: { type: Number, min: 0 },
    lastRestockedAt: { type: Date },
  },
  { timestamps: true }
);

inventoryItemSchema.plugin(tenantPlugin);
inventoryItemSchema.plugin(branchPlugin);

inventoryItemSchema.index({ tenantId: 1, branchId: 1 });
inventoryItemSchema.index({ tenantId: 1, branchId: 1, category: 1 });

const InventoryItem: Model<IInventoryItem> =
  mongoose.models.InventoryItem ||
  mongoose.model<IInventoryItem>("InventoryItem", inventoryItemSchema);

export default InventoryItem;
