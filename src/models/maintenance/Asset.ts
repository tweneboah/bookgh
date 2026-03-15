import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, ASSET_CONDITION, type AssetCondition } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IAsset extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  name: string;
  category?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  purchaseCost?: number;
  condition: AssetCondition;
  location?: string;
  warrantyExpiry?: Date;
  nextMaintenanceDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<IAsset>(
  {
    name: { type: String, required: true },
    category: { type: String },
    serialNumber: { type: String },
    purchaseDate: { type: Date },
    purchaseCost: { type: Number },
    condition: {
      type: String,
      enum: enumValues(ASSET_CONDITION),
      default: ASSET_CONDITION.GOOD,
    },
    location: { type: String },
    warrantyExpiry: { type: Date },
    nextMaintenanceDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

assetSchema.plugin(tenantPlugin);
assetSchema.plugin(branchPlugin);

assetSchema.index({ tenantId: 1, branchId: 1 });
assetSchema.index({ tenantId: 1, branchId: 1, nextMaintenanceDate: 1 });

const Asset: Model<IAsset> =
  mongoose.models.Asset ||
  mongoose.model<IAsset>("Asset", assetSchema, "assets_accommodation");

export default Asset;
