import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IBarShift extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  shiftName: string;
  openedAt: Date;
  closedAt?: Date;
  openedBy: Schema.Types.ObjectId;
  closedBy?: Schema.Types.ObjectId;
  openingCash: number;
  closingCash?: number;
  openingStockSnapshot: Array<{
    inventoryItemId: Schema.Types.ObjectId;
    quantity: number;
  }>;
  closingStockSnapshot: Array<{
    inventoryItemId: Schema.Types.ObjectId;
    quantity: number;
  }>;
  isClosed: boolean;
  varianceNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockSnapshotSchema = new Schema(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const barShiftSchema = new Schema<IBarShift>(
  {
    shiftName: { type: String, required: true },
    openedAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date },
    openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    openingCash: { type: Number, required: true, min: 0, default: 0 },
    closingCash: { type: Number, min: 0 },
    openingStockSnapshot: { type: [stockSnapshotSchema], default: [] },
    closingStockSnapshot: { type: [stockSnapshotSchema], default: [] },
    isClosed: { type: Boolean, default: false },
    varianceNotes: { type: String },
  },
  { timestamps: true }
);

barShiftSchema.plugin(tenantPlugin);
barShiftSchema.plugin(branchPlugin);

barShiftSchema.index({ tenantId: 1, branchId: 1, openedAt: -1 });
barShiftSchema.index({ tenantId: 1, branchId: 1, isClosed: 1 });

const BarShift: Model<IBarShift> =
  mongoose.models.BarShift || mongoose.model<IBarShift>("BarShift", barShiftSchema);

export default BarShift;
