import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, ID_TYPE, VIP_TIER, type IdType, type VipTier } from "@/constants";
import { tenantPlugin } from "@/lib/plugins";

export interface IGuestNote {
  text: string;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
}

export interface IGuestPreferences {
  roomPreference?: string;
  dietaryRestrictions?: string;
  specialNeeds?: string;
  floorPreference?: string;
}

export interface IGuest extends Document {
  tenantId: Schema.Types.ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  nationality?: string;
  idType?: IdType;
  idNumber?: string;
  idDocument?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
  };
  vipTier: VipTier;
  isBlacklisted: boolean;
  blacklistReason?: string;
  preferences?: IGuestPreferences;
  notes: IGuestNote[];
  tags: string[];
  totalStays: number;
  totalSpend: number;
  createdAt: Date;
  updatedAt: Date;
}

const guestSchema = new Schema<IGuest>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, lowercase: true },
    phone: { type: String },
    nationality: { type: String },
    idType: { type: String, enum: enumValues(ID_TYPE) },
    idNumber: { type: String },
    idDocument: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      region: { type: String },
      country: { type: String },
    },
    vipTier: {
      type: String,
      enum: enumValues(VIP_TIER),
      default: VIP_TIER.NONE,
    },
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: { type: String },
    preferences: {
      roomPreference: { type: String },
      dietaryRestrictions: { type: String },
      specialNeeds: { type: String },
      floorPreference: { type: String },
    },
    notes: [
      {
        text: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    tags: [{ type: String }],
    totalStays: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
  },
  { timestamps: true }
);

guestSchema.plugin(tenantPlugin);

guestSchema.index({ tenantId: 1 });
guestSchema.index({ tenantId: 1, email: 1 });
guestSchema.index({ tenantId: 1, phone: 1 });
guestSchema.index({ tenantId: 1, isBlacklisted: 1 });

const Guest: Model<IGuest> =
  mongoose.models.Guest ||
  mongoose.model<IGuest>("Guest", guestSchema, "guests_accommodation");

export default Guest;
