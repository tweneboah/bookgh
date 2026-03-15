import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  POS_ORDER_STATUS,
  POS_PAYMENT_STATUS,
  POS_ORDER_CHANNEL,
  POS_KOT_STATUS,
  type PosOrderStatus,
  type PosPaymentStatus,
  type PosOrderChannel,
  type PosKotStatus,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IPOSOrderItem {
  menuItemId: Schema.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  notes?: string;
}

export interface IPOSOrder extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  orderNumber: string;
  tableId?: Schema.Types.ObjectId;
  roomId?: Schema.Types.ObjectId;
  bookingId?: Schema.Types.ObjectId;
  roomChargeId?: Schema.Types.ObjectId;
  invoiceId?: Schema.Types.ObjectId;
  shiftId?: Schema.Types.ObjectId;
  guestId?: Schema.Types.ObjectId;
  items: IPOSOrderItem[];
  subtotal: number;
  tax: number;
  tipAmount: number;
  serviceChargeAmount: number;
  discountAmount: number;
  refundAmount: number;
  totalAmount: number;
  orderChannel: PosOrderChannel;
  kotStatus: PosKotStatus;
  tableGroupId?: string;
  status: PosOrderStatus;
  addToRoomBill: boolean;
  stockDeducted: boolean;
  paymentStatus: PosPaymentStatus;
  partialPayments: {
    method: string;
    amount: number;
    reference?: string;
    paidAt: Date;
  }[];
  waiterId?: Schema.Types.ObjectId;
  waiterName?: string;
  cashierId?: Schema.Types.ObjectId;
  transferFromTableId?: Schema.Types.ObjectId;
  transferToTableId?: Schema.Types.ObjectId;
  mergedFromTableIds: Schema.Types.ObjectId[];
  discountReason?: string;
  discountApprovedBy?: Schema.Types.ObjectId;
  refundReason?: string;
  voidApprovedBy?: Schema.Types.ObjectId;
  voidReason?: string;
  stockDeductedAt?: Date;
  postedToRoomAt?: Date;
  kotSentAt?: Date;
  servedAt?: Date;
  /** When set, a bar pricing rule (e.g. Happy Hour) was applied to this order. */
  appliedRule?: { id: string; name: string };
  /** Revenue account code for accounting (e.g. restaurant-sales, restaurant-food). */
  revenueAccountCode?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const posOrderSchema = new Schema<IPOSOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    tableId: { type: Schema.Types.ObjectId, ref: "POSTable" },
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    roomChargeId: { type: Schema.Types.ObjectId, ref: "RoomCharge" },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    shiftId: { type: Schema.Types.ObjectId, ref: "BarShift" },
    guestId: { type: Schema.Types.ObjectId, ref: "Guest" },
    items: [
      {
        menuItemId: {
          type: Schema.Types.ObjectId,
          ref: "POSMenuItem",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        amount: { type: Number, required: true },
        notes: { type: String },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    tipAmount: { type: Number, default: 0 },
    serviceChargeAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    orderChannel: {
      type: String,
      enum: enumValues(POS_ORDER_CHANNEL),
      default: POS_ORDER_CHANNEL.DINE_IN,
    },
    kotStatus: {
      type: String,
      enum: enumValues(POS_KOT_STATUS),
      default: POS_KOT_STATUS.NOT_SENT,
    },
    tableGroupId: { type: String },
    status: {
      type: String,
      enum: enumValues(POS_ORDER_STATUS),
      default: POS_ORDER_STATUS.PENDING,
    },
    addToRoomBill: { type: Boolean, default: false },
    stockDeducted: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: enumValues(POS_PAYMENT_STATUS),
      default: POS_PAYMENT_STATUS.UNPAID,
    },
    partialPayments: [
      {
        method: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        reference: { type: String },
        paidAt: { type: Date, required: true, default: Date.now },
      },
    ],
    waiterId: { type: Schema.Types.ObjectId, ref: "User" },
    waiterName: { type: String },
    cashierId: { type: Schema.Types.ObjectId, ref: "User" },
    transferFromTableId: { type: Schema.Types.ObjectId, ref: "POSTable" },
    transferToTableId: { type: Schema.Types.ObjectId, ref: "POSTable" },
    mergedFromTableIds: [{ type: Schema.Types.ObjectId, ref: "POSTable" }],
    discountReason: { type: String },
    discountApprovedBy: { type: Schema.Types.ObjectId, ref: "User" },
    refundReason: { type: String },
    voidApprovedBy: { type: Schema.Types.ObjectId, ref: "User" },
    voidReason: { type: String },
    stockDeductedAt: { type: Date },
    postedToRoomAt: { type: Date },
    kotSentAt: { type: Date },
    servedAt: { type: Date },
    appliedRule: {
      id: { type: String },
      name: { type: String },
    },
    revenueAccountCode: { type: String, trim: true },
  },
  { timestamps: true }
);

posOrderSchema.plugin(tenantPlugin);
posOrderSchema.plugin(branchPlugin);
posOrderSchema.plugin(createdByPlugin);

posOrderSchema.index({ tenantId: 1, branchId: 1 });
posOrderSchema.index({ orderNumber: 1 }, { unique: true });
posOrderSchema.index({ tenantId: 1, branchId: 1, status: 1 });

const POSOrder: Model<IPOSOrder> =
  mongoose.models.POSOrder ||
  mongoose.model<IPOSOrder>("POSOrder", posOrderSchema);

export default POSOrder;
