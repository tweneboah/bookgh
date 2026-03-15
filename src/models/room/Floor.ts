import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IFloor extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  floorNumber: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const floorSchema = new Schema<IFloor>(
  {
    floorNumber: { type: Number, required: true, min: 0 },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

floorSchema.plugin(tenantPlugin);
floorSchema.plugin(branchPlugin);

floorSchema.index({ tenantId: 1, branchId: 1 });
floorSchema.index(
  { tenantId: 1, branchId: 1, floorNumber: 1 },
  { unique: true }
);

const Floor: Model<IFloor> =
  mongoose.models.Floor ||
  mongoose.model<IFloor>("Floor", floorSchema, "floors_accommodation");

export default Floor;
