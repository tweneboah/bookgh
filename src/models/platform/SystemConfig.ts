import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemConfig extends Document {
  key: string;
  value: Schema.Types.Mixed;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

const SystemConfig: Model<ISystemConfig> =
  mongoose.models.SystemConfig ||
  mongoose.model<ISystemConfig>("SystemConfig", systemConfigSchema);

export default SystemConfig;
