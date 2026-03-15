import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, PAYMENT_METHOD, type PaymentMethod } from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export const EVENT_BOOKING_PAYMENT_TYPE = {
  DEPOSIT: "deposit",
  FINAL_SETTLEMENT: "finalSettlement",
} as const;

export type EventBookingPaymentType =
  (typeof EVENT_BOOKING_PAYMENT_TYPE)[keyof typeof EVENT_BOOKING_PAYMENT_TYPE];

const PAYMENT_TYPES = Object.values(EVENT_BOOKING_PAYMENT_TYPE);

export interface IEventBookingPayment extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  eventBookingId: Schema.Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  type: EventBookingPaymentType;
  paidAt: Date;
  notes?: string;
  processedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventBookingPaymentSchema = new Schema<IEventBookingPayment>(
  {
    eventBookingId: {
      type: Schema.Types.ObjectId,
      ref: "EventBooking",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: enumValues(PAYMENT_METHOD),
      required: true,
    },
    type: {
      type: String,
      enum: PAYMENT_TYPES,
      required: true,
    },
    paidAt: { type: Date, default: () => new Date() },
    notes: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

eventBookingPaymentSchema.plugin(tenantPlugin);
eventBookingPaymentSchema.plugin(branchPlugin);

eventBookingPaymentSchema.index({ tenantId: 1, branchId: 1, eventBookingId: 1 });
eventBookingPaymentSchema.index({ eventBookingId: 1, paidAt: -1 });

const EventBookingPayment: Model<IEventBookingPayment> =
  mongoose.models.EventBookingPayment ||
  mongoose.model<IEventBookingPayment>("EventBookingPayment", eventBookingPaymentSchema);

export default EventBookingPayment;
