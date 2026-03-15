import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export const POOL_AREA_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  MAINTENANCE: "maintenance",
  RESERVED: "reserved",
} as const;

export type PoolAreaStatus = (typeof POOL_AREA_STATUS)[keyof typeof POOL_AREA_STATUS];

export const POOL_AREA_TYPE = {
  MAIN: "main",
  KIDS: "kids",
  HEATED: "heated",
  INFINITY: "infinity",
  INDOOR: "indoor",
  OUTDOOR: "outdoor",
  LAP: "lap",
  OTHER: "other",
} as const;

export interface IPoolAreaImage {
  url: string;
  caption?: string;
}

export interface IPoolArea extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  type: string;
  capacity: number;
  openingTime?: string;
  closingTime?: string;
  status: PoolAreaStatus;
  hourlyRate?: number;
  dailyRate?: number;
  amenities: string[];
  images: IPoolAreaImage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const poolAreaSchema = new Schema<IPoolArea>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    type: { type: String, required: true, default: "main" },
    capacity: { type: Number, required: true, min: 0 },
    openingTime: { type: String },
    closingTime: { type: String },
    status: {
      type: String,
      enum: Object.values(POOL_AREA_STATUS),
      default: POOL_AREA_STATUS.OPEN,
    },
    hourlyRate: { type: Number, min: 0 },
    dailyRate: { type: Number, min: 0 },
    amenities: [{ type: String, trim: true }],
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "pool_areas" }
);

poolAreaSchema.plugin(tenantPlugin);
poolAreaSchema.plugin(branchPlugin);

poolAreaSchema.index({ tenantId: 1, branchId: 1 });
poolAreaSchema.index({ tenantId: 1, branchId: 1, status: 1 });
poolAreaSchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });

const PoolArea: Model<IPoolArea> =
  mongoose.models.PoolArea || mongoose.model<IPoolArea>("PoolArea", poolAreaSchema);

export default PoolArea;
