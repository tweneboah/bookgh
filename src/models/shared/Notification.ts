import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin } from "@/lib/plugins";

export interface INotification extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId?: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

notificationSchema.plugin(tenantPlugin);

notificationSchema.index({ tenantId: 1, userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: 1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
