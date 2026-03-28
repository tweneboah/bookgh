import mongoose, { Schema, Document, Model } from "mongoose";
import { DEPARTMENT, STOCK_LOCATION, type StockLocation } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface ILocationStock extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  /** Department (e.g. restaurant) for scoping */
  department?: string;
  inventoryItemId: Schema.Types.ObjectId;
  /** Kitchen or Front House only. Main Store uses InventoryItem.currentStock. */
  location: StockLocation;
  quantity: number;
  unit: string;
  /** Optional: chef unit equivalent for display (e.g. "2 bags") */
  chefUnitDisplay?: string;
  createdAt: Date;
  updatedAt: Date;
}

const locationStockSchema = new Schema<ILocationStock>(
  {
    department: { type: String, trim: true, default: DEPARTMENT.RESTAURANT },
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    location: {
      type: String,
      enum: [STOCK_LOCATION.KITCHEN, STOCK_LOCATION.FRONT_HOUSE],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, required: true, trim: true, default: "unit" },
    chefUnitDisplay: { type: String, trim: true },
  },
  { timestamps: true }
);

locationStockSchema.plugin(tenantPlugin);
locationStockSchema.plugin(branchPlugin);

locationStockSchema.index(
  { tenantId: 1, branchId: 1, department: 1, inventoryItemId: 1, location: 1 },
  { unique: true }
);
locationStockSchema.index({ tenantId: 1, branchId: 1, department: 1, location: 1 });

const LocationStock: Model<ILocationStock> =
  mongoose.models.LocationStock ||
  mongoose.model<ILocationStock>("LocationStock", locationStockSchema);

export default LocationStock;
