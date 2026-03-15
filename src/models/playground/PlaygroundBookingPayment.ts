import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, PAYMENT_METHOD, type PaymentMethod } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IPlaygroundBookingPayment extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  playgroundBookingId: Schema.Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt: Date;
  notes?: string;
  processedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const playgroundBookingPaymentSchema =
  new Schema<IPlaygroundBookingPayment>(
    {
      playgroundBookingId: {
        type: Schema.Types.ObjectId,
        ref: "PlaygroundBooking",
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
    { timestamps: true, collection: "playground_booking_payments" }
  );

playgroundBookingPaymentSchema.plugin(tenantPlugin);
playgroundBookingPaymentSchema.plugin(branchPlugin);

playgroundBookingPaymentSchema.index({
  tenantId: 1,
  branchId: 1,
  playgroundBookingId: 1,
});
playgroundBookingPaymentSchema.index({
  playgroundBookingId: 1,
  paidAt: -1,
});

const PlaygroundBookingPayment: Model<IPlaygroundBookingPayment> =
  mongoose.models.PlaygroundBookingPayment ||
  mongoose.model<IPlaygroundBookingPayment>(
    "PlaygroundBookingPayment",
    playgroundBookingPaymentSchema
  );

export default PlaygroundBookingPayment;
