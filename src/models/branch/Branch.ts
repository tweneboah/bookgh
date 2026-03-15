import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, BRANCH_STATUS, type BranchStatus } from "@/constants";

export interface IBranchImage {
  url: string;
  caption?: string;
  isPrimary?: boolean;
}

export interface IBranchPaystackConfig {
  publicKey?: string;
  secretKeyEncrypted?: string;
  webhookSecretEncrypted?: string;
}

export interface IBranch extends Document {
  tenantId: Schema.Types.ObjectId;
  name: string;
  slug: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
  };
  country?: string;
  region?: string;
  city?: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  googlePlaceId?: string;
  landmark?: string;
  contactEmail?: string;
  contactPhone?: string;
  manager?: Schema.Types.ObjectId;
  status: BranchStatus;
  amenities: string[];
  images: IBranchImage[];
  rating?: number;
  reviewCount: number;
  breakfastIncluded: boolean;
  refundableBooking: boolean;
  paystackConfig?: IBranchPaystackConfig;
  operatingHours?: {
    checkIn?: string;
    checkOut?: string;
  };
  /** Accommodation policies: no-show, cancellation, deposit (per branch) */
  accommodationPolicies?: {
    noShowChargeType?: "none" | "oneNight" | "fullStay";
    noShowMarkAfterHours?: number;
    cancellationFreeUntilHours?: number;
    cancellationChargeType?: "none" | "oneNight" | "percentage" | "fullStay";
    cancellationChargeValue?: number;
    depositType?: "none" | "percentage" | "fixed";
    depositValue?: number;
  };
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true },
    address: {
      street: { type: String },
      city: { type: String },
      region: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },
    country: { type: String },
    region: { type: String },
    city: { type: String },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
    googlePlaceId: { type: String },
    landmark: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    manager: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: enumValues(BRANCH_STATUS),
      default: BRANCH_STATUS.ACTIVE,
    },
    amenities: [{ type: String }],
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    rating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    breakfastIncluded: { type: Boolean, default: false },
    refundableBooking: { type: Boolean, default: false },
    paystackConfig: {
      publicKey: { type: String },
      secretKeyEncrypted: { type: String },
      webhookSecretEncrypted: { type: String },
    },
    operatingHours: {
      checkIn: { type: String },
      checkOut: { type: String },
    },
    accommodationPolicies: {
      noShowChargeType: { type: String, enum: ["none", "oneNight", "fullStay"], default: "none" },
      noShowMarkAfterHours: { type: Number, min: 0, default: 24 },
      cancellationFreeUntilHours: { type: Number, min: 0, default: 24 },
      cancellationChargeType: { type: String, enum: ["none", "oneNight", "percentage", "fullStay"], default: "none" },
      cancellationChargeValue: { type: Number, min: 0, max: 100, default: 0 },
      depositType: { type: String, enum: ["none", "percentage", "fixed"], default: "none" },
      depositValue: { type: Number, min: 0, default: 0 },
    },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

branchSchema.index({ slug: 1 }, { unique: true });
branchSchema.index({ tenantId: 1 });
branchSchema.index({ location: "2dsphere" });
branchSchema.index({ country: 1, region: 1, city: 1 });
branchSchema.index({ status: 1, isPublished: 1 });
branchSchema.index({ amenities: 1 });

const Branch: Model<IBranch> =
  mongoose.models.Branch ||
  mongoose.model<IBranch>("Branch", branchSchema);

export default Branch;
