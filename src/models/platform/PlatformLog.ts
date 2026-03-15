import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, LOG_LEVEL, type LogLevel } from "@/constants";

export interface IPlatformLog extends Document {
  level: LogLevel;
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
  tenantId?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const platformLogSchema = new Schema<IPlatformLog>(
  {
    level: { type: String, enum: enumValues(LOG_LEVEL), required: true },
    message: { type: String, required: true },
    source: { type: String },
    metadata: { type: Schema.Types.Mixed },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant" },
  },
  { timestamps: true }
);

platformLogSchema.index({ createdAt: -1 });
platformLogSchema.index({ level: 1 });

const PlatformLog: Model<IPlatformLog> =
  mongoose.models.PlatformLog ||
  mongoose.model<IPlatformLog>("PlatformLog", platformLogSchema);

export default PlatformLog;
