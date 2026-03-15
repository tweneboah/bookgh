import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IPOSMenuItem extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  category: string;
  price: number;
  image?: string;
  isAvailable: boolean;
  allergens: string[];
  preparationTime?: number;
  isBarItem: boolean;
  /** Revenue account code for accounting (e.g. restaurant-food, restaurant-beverage). */
  revenueAccountCode?: string;
  recipe: {
    inventoryItemId: Schema.Types.ObjectId;
    quantity: number;
    unit: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const posMenuItemSchema = new Schema<IPOSMenuItem>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String },
    isAvailable: { type: Boolean, default: true },
    isBarItem: { type: Boolean, default: false },
    revenueAccountCode: { type: String, trim: true },
    allergens: [{ type: String }],
    preparationTime: { type: Number },
    recipe: [
      {
        inventoryItemId: {
          type: Schema.Types.ObjectId,
          ref: "InventoryItem",
          required: true,
        },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, required: true, trim: true, default: "unit" },
      },
    ],
  },
  { timestamps: true }
);

posMenuItemSchema.plugin(tenantPlugin);
posMenuItemSchema.plugin(branchPlugin);

posMenuItemSchema.index({ tenantId: 1, branchId: 1 });
posMenuItemSchema.index({ tenantId: 1, branchId: 1, category: 1 });

const POSMenuItem: Model<IPOSMenuItem> =
  mongoose.models.POSMenuItem ||
  mongoose.model<IPOSMenuItem>("POSMenuItem", posMenuItemSchema);

export default POSMenuItem;
