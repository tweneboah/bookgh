import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, ROOM_STATUS, type RoomStatus } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IRoom extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  roomCategoryId: Schema.Types.ObjectId;
  roomNumber: string;
  floor?: number;
  status: RoomStatus;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    roomCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "RoomCategory",
      required: true,
    },
    roomNumber: { type: String, required: true },
    floor: { type: Number },
    status: {
      type: String,
      enum: enumValues(ROOM_STATUS),
      default: ROOM_STATUS.AVAILABLE,
    },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.plugin(tenantPlugin);
roomSchema.plugin(branchPlugin);

roomSchema.index({ tenantId: 1, branchId: 1 });
roomSchema.index({ tenantId: 1, branchId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ tenantId: 1, branchId: 1, status: 1 });
roomSchema.index({ tenantId: 1, branchId: 1, roomCategoryId: 1 });
roomSchema.index({ tenantId: 1, branchId: 1, floor: 1 });

const Room: Model<IRoom> =
  mongoose.models.Room ||
  mongoose.model<IRoom>("Room", roomSchema, "rooms_accommodation");

export default Room;
