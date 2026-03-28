import mongoose, { Schema, Document, Model } from "mongoose";
import { DEPARTMENT, STOCK_LOCATION, type StockLocation } from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

/** Audit log for each stock movement between locations (Main Store, Kitchen, Front House) */
export interface IStationMovement extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  department?: string;
  stationTransferId?: Schema.Types.ObjectId;
  kitchenUsageId?: Schema.Types.ObjectId;
  inventoryItemId: Schema.Types.ObjectId;
  itemName: string;
  fromLocation: StockLocation;
  toLocation: StockLocation;
  quantity: number;
  unit: string;
  /** For kitchen: used vs leftover breakdown */
  usedQty?: number;
  leftoverQty?: number;
  reason?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stationMovementSchema = new Schema<IStationMovement>(
  {
    department: { type: String, trim: true, default: DEPARTMENT.RESTAURANT },
    stationTransferId: { type: Schema.Types.ObjectId, ref: "StationTransfer" },
    kitchenUsageId: { type: Schema.Types.ObjectId, ref: "KitchenUsage" },
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    itemName: { type: String, required: true, trim: true },
    fromLocation: {
      type: String,
      enum: Object.values(STOCK_LOCATION),
      required: true,
    },
    toLocation: {
      type: String,
      enum: Object.values(STOCK_LOCATION),
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    usedQty: { type: Number, min: 0 },
    leftoverQty: { type: Number, min: 0 },
    reason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

stationMovementSchema.plugin(tenantPlugin);
stationMovementSchema.plugin(branchPlugin);
stationMovementSchema.plugin(createdByPlugin);

stationMovementSchema.index({ tenantId: 1, branchId: 1, department: 1, createdAt: -1 });
stationMovementSchema.index({ tenantId: 1, branchId: 1, stationTransferId: 1 });
stationMovementSchema.index({ tenantId: 1, branchId: 1, fromLocation: 1, toLocation: 1 });

const StationMovement: Model<IStationMovement> =
  mongoose.models.StationMovement ||
  mongoose.model<IStationMovement>("StationMovement", stationMovementSchema);

export default StationMovement;
