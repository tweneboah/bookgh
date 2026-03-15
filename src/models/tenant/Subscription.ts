import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  type SubscriptionStatus,
} from "@/constants";

export interface ISubscriptionPaymentHistory {
  date: Date;
  amount: number;
  paystackRef?: string;
  status: string;
}

export interface ISubscription extends Document {
  tenantId: Schema.Types.ObjectId;
  planId: Schema.Types.ObjectId;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  paystackSubscriptionCode?: string;
  paystackCustomerCode?: string;
  paymentHistory: ISubscriptionPaymentHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },
    status: {
      type: String,
      enum: enumValues(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.TRIAL,
    },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    trialEndsAt: { type: Date },
    cancelledAt: { type: Date },
    paystackSubscriptionCode: { type: String },
    paystackCustomerCode: { type: String },
    paymentHistory: [
      {
        date: { type: Date, required: true },
        amount: { type: Number, required: true },
        paystackRef: { type: String },
        status: {
          type: String,
          enum: enumValues(PAYMENT_STATUS),
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

subscriptionSchema.index({ tenantId: 1 }, { unique: true });
subscriptionSchema.index({ status: 1 });

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", subscriptionSchema);

export default Subscription;
