import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  BOOKING_STATUS,
  BOOKING_SOURCE,
  ID_TYPE,
  type BookingStatus,
  type BookingSource,
  type IdType,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IBooking extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  guestId: Schema.Types.ObjectId;
  corporateAccountId?: Schema.Types.ObjectId;
  roomId?: Schema.Types.ObjectId;
  roomCategoryId: Schema.Types.ObjectId;
  bookingReference: string;
  checkInDate: Date;
  checkOutDate: Date;
  actualCheckIn?: Date;
  actualCheckOut?: Date;
  numberOfGuests: number;
  numberOfNights?: number;
  status: BookingStatus;
  source: BookingSource;
  specialRequests?: string;
  isGroupBooking: boolean;
  groupId?: string;
  roomRate?: number;
  totalAmount?: number;
  depositRequired?: number;
  depositPaid?: number;
  earlyCheckIn: boolean;
  lateCheckOut: boolean;
  earlyCheckInFee?: number;
  lateCheckOutFee?: number;
  damageCharges: number;
  checkInIdType?: IdType;
  checkInIdNumber?: string;
  checkInIdDocument?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  refundAmount?: number;
  noShowMarkedAt?: Date;
  noShowChargeAmount?: number;
  metadata?: Record<string, unknown>;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    },
    corporateAccountId: { type: Schema.Types.ObjectId, ref: "CorporateAccount" },
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },
    roomCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "RoomCategory",
      required: true,
    },
    bookingReference: { type: String, required: true, unique: true },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    actualCheckIn: { type: Date },
    actualCheckOut: { type: Date },
    numberOfGuests: { type: Number, required: true },
    numberOfNights: { type: Number },
    status: {
      type: String,
      enum: enumValues(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },
    source: {
      type: String,
      enum: enumValues(BOOKING_SOURCE),
      default: BOOKING_SOURCE.WALK_IN,
    },
    specialRequests: { type: String },
    isGroupBooking: { type: Boolean, default: false },
    groupId: { type: String },
    roomRate: { type: Number },
    totalAmount: { type: Number },
    depositRequired: { type: Number },
    depositPaid: { type: Number },
    earlyCheckIn: { type: Boolean, default: false },
    lateCheckOut: { type: Boolean, default: false },
    earlyCheckInFee: { type: Number },
    lateCheckOutFee: { type: Number },
    damageCharges: { type: Number, default: 0 },
    checkInIdType: { type: String, enum: enumValues(ID_TYPE) },
    checkInIdNumber: { type: String },
    checkInIdDocument: { type: String },
    cancellationReason: { type: String },
    cancelledAt: { type: Date },
    refundAmount: { type: Number },
    noShowMarkedAt: { type: Date },
    noShowChargeAmount: { type: Number },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

bookingSchema.plugin(tenantPlugin);
bookingSchema.plugin(branchPlugin);
bookingSchema.plugin(createdByPlugin);

bookingSchema.index({ tenantId: 1, branchId: 1 });
bookingSchema.index({ tenantId: 1, branchId: 1, status: 1 });
bookingSchema.index({ tenantId: 1, branchId: 1, corporateAccountId: 1 });
bookingSchema.index({ tenantId: 1, branchId: 1, checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ tenantId: 1, guestId: 1 });
bookingSchema.index({ bookingReference: 1 }, { unique: true });
bookingSchema.index({
  tenantId: 1,
  branchId: 1,
  roomId: 1,
  checkInDate: 1,
  checkOutDate: 1,
});
bookingSchema.index({ groupId: 1 });

const Booking: Model<IBooking> =
  mongoose.models.Booking ||
  mongoose.model<IBooking>("Booking", bookingSchema, "bookings_accommodation");

export default Booking;
