import mongoose, { Schema, Document, Model } from "mongoose";
import { DEPARTMENT } from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IKitchenUsageLine {
  inventoryItemId: Schema.Types.ObjectId;
  itemName: string;
  /** Quantity issued to kitchen (from the original transfer) */
  issuedQty: number;
  /** Quantity used in preparation (moved to front house) */
  usedQty: number;
  /** Quantity leftover (returned to main store or kept in kitchen) */
  leftoverQty: number;
  unit: string;
  note?: string;
}

export interface IKitchenUsage extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  department?: string;
  /** Reference to the station transfer that issued items to kitchen */
  stationTransferId?: Schema.Types.ObjectId;
  usageDate: Date;
  lines: IKitchenUsageLine[];
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineSchema = new Schema<IKitchenUsageLine>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    itemName: { type: String, required: true, trim: true },
    issuedQty: { type: Number, required: true, min: 0 },
    usedQty: { type: Number, required: true, min: 0 },
    leftoverQty: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
  },
  { _id: false }
);

const kitchenUsageSchema = new Schema<IKitchenUsage>(
  {
    department: { type: String, trim: true, default: DEPARTMENT.RESTAURANT },
    stationTransferId: { type: Schema.Types.ObjectId, ref: "StationTransfer" },
    usageDate: { type: Date, required: true },
    lines: { type: [lineSchema], default: [] },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

kitchenUsageSchema.plugin(tenantPlugin);
kitchenUsageSchema.plugin(branchPlugin);
kitchenUsageSchema.plugin(createdByPlugin);

kitchenUsageSchema.index({ tenantId: 1, branchId: 1, department: 1, usageDate: -1 });
kitchenUsageSchema.index({ tenantId: 1, branchId: 1, stationTransferId: 1 });

const KitchenUsage: Model<IKitchenUsage> =
  mongoose.models.KitchenUsage ||
  mongoose.model<IKitchenUsage>("KitchenUsage", kitchenUsageSchema);

export default KitchenUsage;
