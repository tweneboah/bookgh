import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, POS_TABLE_STATUS, type PosTableStatus } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IPOSTable extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  tableNumber: string;
  capacity: number;
  status: PosTableStatus;
  location?: string;
  /** User (e.g. waitress/waiter) assigned to this table */
  assignedServerId?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const posTableSchema = new Schema<IPOSTable>(
  {
    tableNumber: { type: String, required: true },
    capacity: { type: Number, required: true },
    status: {
      type: String,
      enum: enumValues(POS_TABLE_STATUS),
      default: POS_TABLE_STATUS.AVAILABLE,
    },
    location: { type: String },
    assignedServerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

posTableSchema.plugin(tenantPlugin);
posTableSchema.plugin(branchPlugin);

posTableSchema.index({ tenantId: 1, branchId: 1 });
posTableSchema.index(
  { tenantId: 1, branchId: 1, tableNumber: 1 },
  { unique: true }
);

const POSTable: Model<IPOSTable> =
  mongoose.models.POSTable ||
  mongoose.model<IPOSTable>("POSTable", posTableSchema);

export default POSTable;
