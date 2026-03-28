import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  HOUSEKEEPING_TASK_TYPE,
  HOUSEKEEPING_STATUS,
  PRIORITY,
  type HousekeepingTaskType,
  type HousekeepingStatus,
  type Priority,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IHousekeepingTask extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  roomId: Schema.Types.ObjectId;
  /** Optional link to the booking that triggered turnover (e.g. checkout). */
  bookingId?: Schema.Types.ObjectId;
  assignedTo?: Schema.Types.ObjectId;
  taskType: HousekeepingTaskType;
  status: HousekeepingStatus;
  priority: Priority;
  notes?: string;
  inspectedBy?: Schema.Types.ObjectId;
  inspectionNotes?: string;
  /** Target time to finish (SLA). */
  dueAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  linenChanged: boolean;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const housekeepingTaskSchema = new Schema<IHousekeepingTask>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    taskType: {
      type: String,
      enum: enumValues(HOUSEKEEPING_TASK_TYPE),
      required: true,
    },
    status: {
      type: String,
      enum: enumValues(HOUSEKEEPING_STATUS),
      default: HOUSEKEEPING_STATUS.PENDING,
    },
    priority: {
      type: String,
      enum: enumValues(PRIORITY),
      default: PRIORITY.NORMAL,
    },
    notes: { type: String },
    inspectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    inspectionNotes: { type: String },
    dueAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    linenChanged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

housekeepingTaskSchema.plugin(tenantPlugin);
housekeepingTaskSchema.plugin(branchPlugin);
housekeepingTaskSchema.plugin(createdByPlugin);

housekeepingTaskSchema.index({ tenantId: 1, branchId: 1 });
housekeepingTaskSchema.index({ tenantId: 1, branchId: 1, status: 1 });
housekeepingTaskSchema.index({ tenantId: 1, branchId: 1, roomId: 1 });
housekeepingTaskSchema.index({ tenantId: 1, branchId: 1, bookingId: 1 });
housekeepingTaskSchema.index({ tenantId: 1, branchId: 1, dueAt: 1 });

/** Drop cached model when schema is stale (e.g. HMR added `bookingId`) — avoids StrictPopulateError on populate. */
if (mongoose.models.HousekeepingTask) {
  const stale =
    process.env.NODE_ENV !== "production" ||
    !mongoose.models.HousekeepingTask.schema.path("bookingId");
  if (stale) {
    delete mongoose.models.HousekeepingTask;
  }
}

const HousekeepingTask: Model<IHousekeepingTask> =
  mongoose.models.HousekeepingTask ||
  mongoose.model<IHousekeepingTask>(
    "HousekeepingTask",
    housekeepingTaskSchema,
    "housekeeping_tasks_accommodation"
  );

export default HousekeepingTask;
