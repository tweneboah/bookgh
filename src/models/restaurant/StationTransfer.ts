import mongoose, { Schema, Document, Model } from "mongoose";
import {
  DEPARTMENT,
  enumValues,
  STOCK_LOCATION,
  STATION_TRANSFER_STATUS,
  type StockLocation,
  type StationTransferStatus,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IStationTransferLine {
  inventoryItemId: Schema.Types.ObjectId;
  itemName: string;
  quantity: number;
  unit: string;
  /** For kitchen flows: how much was used in preparation */
  usedQty?: number;
  /** For kitchen flows: how much was leftover (returned or kept in kitchen) */
  leftoverQty?: number;
  /** Optional note for this line */
  note?: string;
}

export interface IStationTransfer extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  department?: string;
  transferNumber: string;
  fromLocation: StockLocation;
  toLocation: StockLocation;
  transferDate: Date;
  completedAt?: Date;
  status: StationTransferStatus;
  lines: IStationTransferLine[];
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineSchema = new Schema<IStationTransferLine>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.0001 },
    unit: { type: String, required: true, trim: true },
    usedQty: { type: Number, min: 0 },
    leftoverQty: { type: Number, min: 0 },
    note: { type: String, trim: true },
  },
  { _id: false }
);

const stationTransferSchema = new Schema<IStationTransfer>(
  {
    department: { type: String, trim: true, default: DEPARTMENT.RESTAURANT },
    transferNumber: { type: String, required: true, trim: true },
    fromLocation: {
      type: String,
      enum: enumValues(STOCK_LOCATION),
      required: true,
    },
    toLocation: {
      type: String,
      enum: enumValues(STOCK_LOCATION),
      required: true,
    },
    transferDate: { type: Date, required: true },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: enumValues(STATION_TRANSFER_STATUS),
      default: STATION_TRANSFER_STATUS.PENDING,
    },
    lines: { type: [lineSchema], default: [] },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

stationTransferSchema.plugin(tenantPlugin);
stationTransferSchema.plugin(branchPlugin);
stationTransferSchema.plugin(createdByPlugin);

stationTransferSchema.index(
  { tenantId: 1, branchId: 1, transferNumber: 1 },
  { unique: true }
);
stationTransferSchema.index({ tenantId: 1, branchId: 1, fromLocation: 1, toLocation: 1 });
stationTransferSchema.index({ tenantId: 1, branchId: 1, status: 1 });
stationTransferSchema.index({ tenantId: 1, branchId: 1, transferDate: -1 });

const StationTransfer: Model<IStationTransfer> =
  mongoose.models.StationTransfer ||
  mongoose.model<IStationTransfer>("StationTransfer", stationTransferSchema);

export default StationTransfer;
