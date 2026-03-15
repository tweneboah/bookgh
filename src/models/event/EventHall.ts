import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, EVENT_HALL_STATUS, type EventHallStatus } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IEventHallImage {
  url: string;
  caption?: string;
}

export interface IEventHallCapacityByLayout {
  theater?: number;
  banquet?: number;
  classroom?: number;
  uShape?: number;
}

export interface IEventHallLayoutTemplate {
  name: string;
  capacity: number;
  imageUrl?: string;
  caption?: string;
}

export interface IEventHall extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  capacity?: number;
  capacityByLayout?: IEventHallCapacityByLayout;
  layoutTypes: string[];
  layoutTemplates?: IEventHallLayoutTemplate[];
  amenities: string[];
  images: IEventHallImage[];
  hourlyRate?: number;
  dailyRate?: number;
  weekendRate?: number;
  equipmentBaseRate?: number;
  status: EventHallStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventHallSchema = new Schema<IEventHall>(
  {
    name: { type: String, required: true },
    description: { type: String },
    capacity: { type: Number },
    capacityByLayout: {
      theater: { type: Number },
      banquet: { type: Number },
      classroom: { type: Number },
      uShape: { type: Number },
    },
    layoutTypes: [{ type: String }],
    layoutTemplates: [
      {
        name: { type: String, required: true },
        capacity: { type: Number, required: true, min: 0 },
        imageUrl: { type: String },
        caption: { type: String },
      },
    ],
    amenities: [{ type: String }],
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String },
      },
    ],
    hourlyRate: { type: Number },
    dailyRate: { type: Number },
    weekendRate: { type: Number },
    equipmentBaseRate: { type: Number },
    status: {
      type: String,
      enum: enumValues(EVENT_HALL_STATUS),
      default: EVENT_HALL_STATUS.AVAILABLE,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

eventHallSchema.plugin(tenantPlugin);
eventHallSchema.plugin(branchPlugin);

eventHallSchema.index({ tenantId: 1, branchId: 1 });
eventHallSchema.index({ tenantId: 1, branchId: 1, status: 1 });
eventHallSchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });

const EventHall: Model<IEventHall> =
  mongoose.models.EventHall ||
  mongoose.model<IEventHall>("EventHall", eventHallSchema);

export default EventHall;
