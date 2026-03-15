import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, LOST_FOUND_STATUS, type LostFoundStatus } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface ILostAndFound extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  roomId?: Schema.Types.ObjectId;
  itemDescription: string;
  foundBy?: Schema.Types.ObjectId;
  foundDate: Date;
  foundLocation?: string;
  status: LostFoundStatus;
  claimedBy?: string;
  claimedDate?: Date;
  images: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const lostAndFoundSchema = new Schema<ILostAndFound>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },
    itemDescription: { type: String, required: true },
    foundBy: { type: Schema.Types.ObjectId, ref: "User" },
    foundDate: { type: Date, required: true },
    foundLocation: { type: String },
    status: {
      type: String,
      enum: enumValues(LOST_FOUND_STATUS),
      default: LOST_FOUND_STATUS.FOUND,
    },
    claimedBy: { type: String },
    claimedDate: { type: Date },
    images: [{ type: String }],
    notes: { type: String },
  },
  { timestamps: true }
);

lostAndFoundSchema.plugin(tenantPlugin);
lostAndFoundSchema.plugin(branchPlugin);

lostAndFoundSchema.index({ tenantId: 1, branchId: 1 });
lostAndFoundSchema.index({ tenantId: 1, branchId: 1, status: 1 });

const LostAndFound: Model<ILostAndFound> =
  mongoose.models.LostAndFound ||
  mongoose.model<ILostAndFound>(
    "LostAndFound",
    lostAndFoundSchema,
    "lost_and_found_accommodation"
  );

export default LostAndFound;
