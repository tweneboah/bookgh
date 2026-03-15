import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export const PLAYGROUND_BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checkedIn",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "noShow",
} as const;

export type PlaygroundBookingStatus =
  (typeof PLAYGROUND_BOOKING_STATUS)[keyof typeof PLAYGROUND_BOOKING_STATUS];

export interface IPlaygroundBookingAddOn {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface IPlaygroundBookingExpenseLineItem {
  category: string;
  description?: string;
  amount: number;
  chargeToCustomer?: boolean;
  amountToCharge?: number;
}

export interface IPlaygroundBooking extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  playgroundAreaId: Schema.Types.ObjectId;
  bookingReference: string;
  guestId?: Schema.Types.ObjectId;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  bookingDate: Date;
  bookingEndDate?: Date;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  sessionType?: string;
  addOns?: IPlaygroundBookingAddOn[];
  status: PlaygroundBookingStatus;
  amount: number;
  paidAmount: number;
  expenseLineItems?: IPlaygroundBookingExpenseLineItem[];
  customerChargesTotal?: number;
  totalExpenses?: number;
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const playgroundBookingSchema = new Schema<IPlaygroundBooking>(
  {
    playgroundAreaId: {
      type: Schema.Types.ObjectId,
      ref: "PlaygroundArea",
      required: true,
    },
    bookingReference: { type: String, required: true },
    guestId: { type: Schema.Types.ObjectId, ref: "Guest" },
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, trim: true },
    guestPhone: { type: String, trim: true },
    bookingDate: { type: Date, required: true },
    bookingEndDate: { type: Date },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    numberOfGuests: { type: Number, required: true, min: 1 },
    sessionType: { type: String, trim: true },
    addOns: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
      },
    ],
    status: {
      type: String,
      enum: Object.values(PLAYGROUND_BOOKING_STATUS),
      default: PLAYGROUND_BOOKING_STATUS.PENDING,
    },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    expenseLineItems: [
      {
        category: { type: String, required: true },
        description: { type: String },
        amount: { type: Number, required: true, min: 0 },
        chargeToCustomer: { type: Boolean, default: false },
        amountToCharge: { type: Number, min: 0 },
      },
    ],
    customerChargesTotal: { type: Number, min: 0 },
    totalExpenses: { type: Number, min: 0 },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "playground_bookings" }
);

playgroundBookingSchema.plugin(tenantPlugin);
playgroundBookingSchema.plugin(branchPlugin);

playgroundBookingSchema.index({ tenantId: 1, branchId: 1 });
playgroundBookingSchema.index(
  { tenantId: 1, branchId: 1, bookingReference: 1 },
  { unique: true }
);
playgroundBookingSchema.index({
  tenantId: 1,
  branchId: 1,
  playgroundAreaId: 1,
  bookingDate: 1,
});
playgroundBookingSchema.index({ tenantId: 1, branchId: 1, status: 1 });

const PlaygroundBooking: Model<IPlaygroundBooking> =
  mongoose.models.PlaygroundBooking ||
  mongoose.model<IPlaygroundBooking>(
    "PlaygroundBooking",
    playgroundBookingSchema
  );

export default PlaygroundBooking;
