import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, BED_TYPE, type BedType } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IRoomCategoryImage {
  url: string;
  caption?: string;
}

export interface IRoomCategory extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  basePrice: number;
  maxOccupancy: number;
  amenities: string[];
  images: IRoomCategoryImage[];
  bedType?: BedType;
  roomSize?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomCategorySchema = new Schema<IRoomCategory>(
  {
    name: { type: String, required: true },
    description: { type: String },
    basePrice: { type: Number, required: true },
    maxOccupancy: { type: Number, required: true },
    amenities: [{ type: String }],
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String },
      },
    ],
    bedType: { type: String, enum: enumValues(BED_TYPE) },
    roomSize: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomCategorySchema.plugin(tenantPlugin);
roomCategorySchema.plugin(branchPlugin);

roomCategorySchema.index({ tenantId: 1, branchId: 1 });
roomCategorySchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });

const RoomCategory: Model<IRoomCategory> =
  mongoose.models.RoomCategory ||
  mongoose.model<IRoomCategory>(
    "RoomCategory",
    roomCategorySchema,
    "room_categories_accommodation"
  );

export default RoomCategory;
