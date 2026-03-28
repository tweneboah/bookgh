import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IRestaurantUnit extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  name: string;
  type: "purchase" | "yield" | "both";
  abbreviation?: string;
  isActive: boolean;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantUnitSchema = new Schema<IRestaurantUnit>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["purchase", "yield", "both"],
      required: true,
      default: "both",
    },
    abbreviation: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

restaurantUnitSchema.plugin(tenantPlugin);
restaurantUnitSchema.plugin(branchPlugin);
restaurantUnitSchema.plugin(createdByPlugin);

restaurantUnitSchema.index(
  { tenantId: 1, branchId: 1, name: 1 },
  { unique: true }
);
restaurantUnitSchema.index({ tenantId: 1, branchId: 1, type: 1 });

const RestaurantUnit: Model<IRestaurantUnit> =
  mongoose.models.RestaurantUnit ||
  mongoose.model<IRestaurantUnit>("RestaurantUnit", restaurantUnitSchema);

export default RestaurantUnit;
