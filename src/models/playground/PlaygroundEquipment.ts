import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export const PLAYGROUND_EQUIPMENT_TYPE = {
  SLIDE: "slide",
  SEESAW: "seesaw",
  SWING: "swing",
  CLIMBING: "climbing",
  SANDBOX: "sandbox",
  SPRING_RIDER: "springRider",
  PLAY_HOUSE: "playHouse",
  MONKEY_BARS: "monkeyBars",
  OTHER: "other",
} as const;

export const PLAYGROUND_EQUIPMENT_STATUS = {
  AVAILABLE: "available",
  IN_USE: "inUse",
  MAINTENANCE: "maintenance",
  OUT_OF_ORDER: "outOfOrder",
  REMOVED: "removed",
} as const;

export type PlaygroundEquipmentStatus =
  (typeof PLAYGROUND_EQUIPMENT_STATUS)[keyof typeof PLAYGROUND_EQUIPMENT_STATUS];

export interface IPlaygroundEquipment extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  playgroundAreaId: Schema.Types.ObjectId;
  name: string;
  type: string;
  description?: string;
  status: PlaygroundEquipmentStatus;
  lastInspectionDate?: Date;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const playgroundEquipmentSchema = new Schema<IPlaygroundEquipment>(
  {
    playgroundAreaId: {
      type: Schema.Types.ObjectId,
      ref: "PlaygroundArea",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: Object.values(PLAYGROUND_EQUIPMENT_TYPE),
      default: PLAYGROUND_EQUIPMENT_TYPE.OTHER,
    },
    description: { type: String },
    status: {
      type: String,
      enum: Object.values(PLAYGROUND_EQUIPMENT_STATUS),
      default: PLAYGROUND_EQUIPMENT_STATUS.AVAILABLE,
    },
    lastInspectionDate: { type: Date },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "playground_equipment" }
);

playgroundEquipmentSchema.plugin(tenantPlugin);
playgroundEquipmentSchema.plugin(branchPlugin);

playgroundEquipmentSchema.index({ tenantId: 1, branchId: 1 });
playgroundEquipmentSchema.index({ tenantId: 1, branchId: 1, playgroundAreaId: 1 });
playgroundEquipmentSchema.index({ tenantId: 1, branchId: 1, status: 1 });
playgroundEquipmentSchema.index({ tenantId: 1, branchId: 1, type: 1 });

const PlaygroundEquipment: Model<IPlaygroundEquipment> =
  mongoose.models.PlaygroundEquipment ||
  mongoose.model<IPlaygroundEquipment>(
    "PlaygroundEquipment",
    playgroundEquipmentSchema
  );

export default PlaygroundEquipment;
