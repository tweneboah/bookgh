import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, ROOM_CHARGE_TYPE, type RoomChargeType } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IRoomCharge extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  bookingId: Schema.Types.ObjectId;
  guestId: Schema.Types.ObjectId;
  chargeType: RoomChargeType;
  description: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  addedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roomChargeSchema = new Schema<IRoomCharge>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    },
    chargeType: {
      type: String,
      enum: enumValues(ROOM_CHARGE_TYPE),
      required: true,
    },
    description: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    totalAmount: { type: Number, required: true, min: 0 },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

roomChargeSchema.plugin(tenantPlugin);
roomChargeSchema.plugin(branchPlugin);

roomChargeSchema.index({ tenantId: 1, branchId: 1, bookingId: 1 });
roomChargeSchema.index({ tenantId: 1, branchId: 1 });

const RoomCharge: Model<IRoomCharge> =
  mongoose.models.RoomCharge ||
  mongoose.model<IRoomCharge>(
    "RoomCharge",
    roomChargeSchema,
    "room_charges_accommodation"
  );

export default RoomCharge;
