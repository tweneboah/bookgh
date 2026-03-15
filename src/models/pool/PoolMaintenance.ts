import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export const POOL_MAINTENANCE_TYPE = {
  CLEANING: "cleaning",
  CHEMICAL: "chemical",
  EQUIPMENT: "equipment",
  INSPECTION: "inspection",
  REPAIR: "repair",
  FILTER: "filter",
  OTHER: "other",
} as const;

export const POOL_MAINTENANCE_STATUS = {
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

export interface IPoolMaintenance extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  poolAreaId: Schema.Types.ObjectId;
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
  chemicalReadings?: {
    pH?: number;
    chlorine?: number;
    alkalinity?: number;
    notes?: string;
  };
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const poolMaintenanceSchema = new Schema<IPoolMaintenance>(
  {
    poolAreaId: {
      type: Schema.Types.ObjectId,
      ref: "PoolArea",
      required: true,
    },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    recurrence: {
      frequency: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
      interval: { type: Number, min: 1 },
      endDate: { type: Date },
    },
    completedAt: { type: Date },
    type: {
      type: String,
      required: true,
      enum: Object.values(POOL_MAINTENANCE_TYPE),
      default: POOL_MAINTENANCE_TYPE.CLEANING,
    },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(POOL_MAINTENANCE_STATUS),
      default: POOL_MAINTENANCE_STATUS.SCHEDULED,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    cost: { type: Number, min: 0 },
    chemicalReadings: {
      pH: { type: Number },
      chlorine: { type: Number },
      alkalinity: { type: Number },
      notes: { type: String },
    },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "pool_maintenance" }
);

poolMaintenanceSchema.plugin(tenantPlugin);
poolMaintenanceSchema.plugin(branchPlugin);

poolMaintenanceSchema.index({ tenantId: 1, branchId: 1 });
poolMaintenanceSchema.index({ tenantId: 1, branchId: 1, poolAreaId: 1 });
poolMaintenanceSchema.index({ tenantId: 1, branchId: 1, scheduledDate: 1 });
poolMaintenanceSchema.index({ tenantId: 1, branchId: 1, status: 1 });

const PoolMaintenance: Model<IPoolMaintenance> =
  mongoose.models.PoolMaintenance ||
  mongoose.model<IPoolMaintenance>("PoolMaintenance", poolMaintenanceSchema);

export default PoolMaintenance;
