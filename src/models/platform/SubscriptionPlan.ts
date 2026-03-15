import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, BILLING_CYCLE, type BillingCycle } from "@/constants";

export interface ISubscriptionPlanLimits {
  maxBranches: number;
  maxRooms: number;
  maxStaff: number;
  hasEventModule: boolean;
  hasPosModule: boolean;
  hasApiAccess: boolean;
}

export interface ISubscriptionPlan extends Document {
  name: string;
  description?: string;
  price: number;
  billingCycle: BillingCycle;
  trialDays: number;
  limits: ISubscriptionPlanLimits;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    billingCycle: {
      type: String,
      enum: enumValues(BILLING_CYCLE),
      required: true,
    },
    trialDays: { type: Number, default: 14 },
    limits: {
      maxBranches: { type: Number, required: true },
      maxRooms: { type: Number, required: true },
      maxStaff: { type: Number, required: true },
      hasEventModule: { type: Boolean, default: false },
      hasPosModule: { type: Boolean, default: false },
      hasApiAccess: { type: Boolean, default: false },
    },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });

const SubscriptionPlan: Model<ISubscriptionPlan> =
  mongoose.models.SubscriptionPlan ||
  mongoose.model<ISubscriptionPlan>("SubscriptionPlan", subscriptionPlanSchema);

export default SubscriptionPlan;
