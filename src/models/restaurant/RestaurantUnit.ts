import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";
import { DEPARTMENT } from "@/constants";

export interface IRestaurantUnit extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  department: string;
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
    department: {
      type: String,
      enum: Object.values(DEPARTMENT),
      default: DEPARTMENT.RESTAURANT,
      required: true,
      index: true,
    },
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
  { tenantId: 1, branchId: 1, department: 1, name: 1 },
  { unique: true, name: "tenant_branch_department_name_unique" }
);
restaurantUnitSchema.index({ tenantId: 1, branchId: 1, department: 1, type: 1 });

const existingRestaurantUnitModel =
  mongoose.models.RestaurantUnit as Model<IRestaurantUnit> | undefined;
if (
  existingRestaurantUnitModel &&
  !existingRestaurantUnitModel.schema.path("department")
) {
  existingRestaurantUnitModel.schema.add({
    department: {
      type: String,
      enum: Object.values(DEPARTMENT),
      default: DEPARTMENT.RESTAURANT,
      required: true,
      index: true,
    },
  });
}

const RestaurantUnit: Model<IRestaurantUnit> =
  existingRestaurantUnitModel ||
  mongoose.model<IRestaurantUnit>("RestaurantUnit", restaurantUnitSchema);

export default RestaurantUnit;
