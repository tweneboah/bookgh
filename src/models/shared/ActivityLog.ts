import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin } from "@/lib/plugins";

export interface IActivityLog extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId?: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

activityLogSchema.plugin(tenantPlugin);

activityLogSchema.index({ tenantId: 1, createdAt: -1 });
activityLogSchema.index({ tenantId: 1, userId: 1 });
activityLogSchema.index({ tenantId: 1, resource: 1, resourceId: 1 });

// Delete cached model so schema changes (e.g. resourceId String) apply after hot reload
if (mongoose.models.ActivityLog) {
  mongoose.deleteModel("ActivityLog");
}
const ActivityLog: Model<IActivityLog> =
  mongoose.model<IActivityLog>("ActivityLog", activityLogSchema);

export default ActivityLog;
