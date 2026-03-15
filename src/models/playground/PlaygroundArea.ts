import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export const PLAYGROUND_AREA_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  MAINTENANCE: "maintenance",
  RESERVED: "reserved",
} as const;

export type PlaygroundAreaStatus =
  (typeof PLAYGROUND_AREA_STATUS)[keyof typeof PLAYGROUND_AREA_STATUS];

export const PLAYGROUND_AREA_TYPE = {
  INDOOR: "indoor",
  OUTDOOR: "outdoor",
  COVERED: "covered",
  KIDS: "kids",
  GENERAL: "general",
  OTHER: "other",
} as const;

export interface IPlaygroundAreaImage {
  url: string;
  caption?: string;
}

export interface IPlaygroundArea extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  type: string;
  capacity: number;
  openingTime?: string;
  closingTime?: string;
  status: PlaygroundAreaStatus;
  /** Price per hour (₵). Used to suggest booking amount. */
  hourlyRate?: number;
  /** Price per day (₵). Optional flat rate for full-day use. */
  dailyRate?: number;
  amenities: string[];
  images: IPlaygroundAreaImage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const playgroundAreaSchema = new Schema<IPlaygroundArea>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    type: { type: String, required: true, default: "outdoor" },
    capacity: { type: Number, required: true, min: 0 },
    openingTime: { type: String },
    closingTime: { type: String },
    status: {
      type: String,
      enum: Object.values(PLAYGROUND_AREA_STATUS),
      default: PLAYGROUND_AREA_STATUS.OPEN,
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
  { timestamps: true, collection: "playground_areas" }
);

playgroundAreaSchema.plugin(tenantPlugin);
playgroundAreaSchema.plugin(branchPlugin);

playgroundAreaSchema.index({ tenantId: 1, branchId: 1 });
playgroundAreaSchema.index({ tenantId: 1, branchId: 1, status: 1 });
playgroundAreaSchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });

const PlaygroundArea: Model<IPlaygroundArea> =
  mongoose.models.PlaygroundArea ||
  mongoose.model<IPlaygroundArea>("PlaygroundArea", playgroundAreaSchema);

export default PlaygroundArea;
