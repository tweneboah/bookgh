import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export const POOL_BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checkedIn",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "noShow",
} as const;

export type PoolBookingStatus = (typeof POOL_BOOKING_STATUS)[keyof typeof POOL_BOOKING_STATUS];

export interface IPoolBookingAddOn {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface IPoolBookingExpenseLineItem {
  category: string;
  description?: string;
  amount: number;
  /** When true, this cost is billed to the customer (e.g. damage, extra cleaning). */
  chargeToCustomer?: boolean;
  /** Amount to charge the customer; defaults to amount if not set. */
  amountToCharge?: number;
}

export interface IPoolBooking extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  poolAreaId: Schema.Types.ObjectId;
  bookingReference: string;
  guestId?: Schema.Types.ObjectId;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  sessionType?: string;
  addOns?: IPoolBookingAddOn[];
  status: PoolBookingStatus;
  amount: number;
  paidAmount: number;
  /** Expense line items (costs); some may be charged to the customer. */
  expenseLineItems?: IPoolBookingExpenseLineItem[];
  /** Sum of expense line amounts where chargeToCustomer is true (amountToCharge or amount). */
  customerChargesTotal?: number;
  /** Sum of all expense line amounts. */
  totalExpenses?: number;
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const poolBookingSchema = new Schema<IPoolBooking>(
  {
    poolAreaId: {
      type: Schema.Types.ObjectId,
      ref: "PoolArea",
      required: true,
    },
    bookingReference: { type: String, required: true },
    guestId: { type: Schema.Types.ObjectId, ref: "Guest" },
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, trim: true },
    guestPhone: { type: String, trim: true },
    bookingDate: { type: Date, required: true },
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
      enum: Object.values(POOL_BOOKING_STATUS),
      default: POOL_BOOKING_STATUS.PENDING,
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
  { timestamps: true, collection: "pool_bookings" }
);

poolBookingSchema.plugin(tenantPlugin);
poolBookingSchema.plugin(branchPlugin);

poolBookingSchema.index({ tenantId: 1, branchId: 1 });
poolBookingSchema.index({ tenantId: 1, branchId: 1, bookingReference: 1 }, { unique: true });
poolBookingSchema.index({ tenantId: 1, branchId: 1, poolAreaId: 1, bookingDate: 1 });
poolBookingSchema.index({ tenantId: 1, branchId: 1, status: 1 });

const PoolBooking: Model<IPoolBooking> =
  mongoose.models.PoolBooking || mongoose.model<IPoolBooking>("PoolBooking", poolBookingSchema);

export default PoolBooking;
