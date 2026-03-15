import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  TRANSFER_STATUS,
  type TransferStatus,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IStockTransferLine {
  inventoryItemId: Schema.Types.ObjectId;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface IStockTransfer extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  transferNumber: string;
  fromBranchId: Schema.Types.ObjectId;
  toBranchId: Schema.Types.ObjectId;
  transferDate: Date;
  expectedArrival?: Date;
  completedAt?: Date;
  requestedBy: Schema.Types.ObjectId;
  approvedBy?: Schema.Types.ObjectId;
  status: TransferStatus;
  lines: IStockTransferLine[];
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineSchema = new Schema<IStockTransferLine>(
  {
    inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    unit: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const stockTransferSchema = new Schema<IStockTransfer>(
  {
    transferNumber: { type: String, required: true, trim: true },
    fromBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    toBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    transferDate: { type: Date, required: true },
    expectedArrival: { type: Date },
    completedAt: { type: Date },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: enumValues(TRANSFER_STATUS),
      default: TRANSFER_STATUS.PENDING,
    },
    lines: { type: [lineSchema], default: [] },
    notes: { type: String },
  },
  { timestamps: true }
);

stockTransferSchema.plugin(tenantPlugin);
stockTransferSchema.plugin(branchPlugin);
stockTransferSchema.plugin(createdByPlugin);

stockTransferSchema.index(
  { tenantId: 1, branchId: 1, transferNumber: 1 },
  { unique: true }
);
stockTransferSchema.index({ tenantId: 1, fromBranchId: 1, toBranchId: 1 });
stockTransferSchema.index({ tenantId: 1, branchId: 1, status: 1 });

const StockTransfer: Model<IStockTransfer> =
  mongoose.models.StockTransfer ||
  mongoose.model<IStockTransfer>("StockTransfer", stockTransferSchema);

export default StockTransfer;
