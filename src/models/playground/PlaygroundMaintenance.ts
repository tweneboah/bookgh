import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export const PLAYGROUND_MAINTENANCE_TYPE = {
  INSPECTION: "inspection",
  CLEANING: "cleaning",
  REPAIR: "repair",
  REPLACEMENT: "replacement",
  SAFETY_CHECK: "safetyCheck",
  OTHER: "other",
} as const;

export const PLAYGROUND_MAINTENANCE_STATUS = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  POSTPONED: "postponed",
  CANCELLED: "cancelled",
} as const;

export interface IRecurrenceRule {
  frequency: "none" | "daily" | "weekly" | "monthly";
  interval?: number;
  endDate?: Date;
}

export interface IPlaygroundMaintenance extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  playgroundAreaId: Schema.Types.ObjectId;
  playgroundEquipmentId?: Schema.Types.ObjectId;
  scheduledDate: Date;
  startTime?: string;
  endTime?: string;
  recurrence?: IRecurrenceRule;
  completedAt?: Date;
  type: string;
  description: string;
  status: string;
  assignedTo?: Schema.Types.ObjectId;
  cost?: number;
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const playgroundMaintenanceSchema = new Schema<IPlaygroundMaintenance>(
  {
    playgroundAreaId: {
      type: Schema.Types.ObjectId,
      ref: "PlaygroundArea",
      required: true,
    },
    playgroundEquipmentId: {
      type: Schema.Types.ObjectId,
      ref: "PlaygroundEquipment",
    },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    recurrence: {
      frequency: {
        type: String,
        enum: ["none", "daily", "weekly", "monthly"],
        default: "none",
      },
      interval: { type: Number, min: 1 },
      endDate: { type: Date },
    },
    completedAt: { type: Date },
    type: {
      type: String,
      required: true,
      enum: Object.values(PLAYGROUND_MAINTENANCE_TYPE),
      default: PLAYGROUND_MAINTENANCE_TYPE.INSPECTION,
    },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(PLAYGROUND_MAINTENANCE_STATUS),
      default: PLAYGROUND_MAINTENANCE_STATUS.SCHEDULED,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    cost: { type: Number, min: 0 },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "playground_maintenance" }
);

playgroundMaintenanceSchema.plugin(tenantPlugin);
playgroundMaintenanceSchema.plugin(branchPlugin);

playgroundMaintenanceSchema.index({ tenantId: 1, branchId: 1 });
playgroundMaintenanceSchema.index({ tenantId: 1, branchId: 1, playgroundAreaId: 1 });
playgroundMaintenanceSchema.index({ tenantId: 1, branchId: 1, scheduledDate: 1 });
playgroundMaintenanceSchema.index({ tenantId: 1, branchId: 1, status: 1 });

const PlaygroundMaintenance: Model<IPlaygroundMaintenance> =
  mongoose.models.PlaygroundMaintenance ||
  mongoose.model<IPlaygroundMaintenance>(
    "PlaygroundMaintenance",
    playgroundMaintenanceSchema
  );

export default PlaygroundMaintenance;
