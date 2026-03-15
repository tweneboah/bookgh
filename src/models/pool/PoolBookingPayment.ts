import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, PAYMENT_METHOD, type PaymentMethod } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IPoolBookingPayment extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  poolBookingId: Schema.Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt: Date;
  notes?: string;
  processedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const poolBookingPaymentSchema = new Schema<IPoolBookingPayment>(
  {
    poolBookingId: {
      type: Schema.Types.ObjectId,
      ref: "PoolBooking",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: enumValues(PAYMENT_METHOD),
      required: true,
    },
    paidAt: { type: Date, default: () => new Date() },
    notes: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "pool_booking_payments" }
);

poolBookingPaymentSchema.plugin(tenantPlugin);
poolBookingPaymentSchema.plugin(branchPlugin);

poolBookingPaymentSchema.index({ tenantId: 1, branchId: 1, poolBookingId: 1 });
poolBookingPaymentSchema.index({ poolBookingId: 1, paidAt: -1 });

const PoolBookingPayment: Model<IPoolBookingPayment> =
  mongoose.models.PoolBookingPayment ||
  mongoose.model<IPoolBookingPayment>("PoolBookingPayment", poolBookingPaymentSchema);

export default PoolBookingPayment;
