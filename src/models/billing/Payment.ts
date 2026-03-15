import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  DEPARTMENT,
  type PaymentMethod,
  type PaymentStatus,
  type Department,
} from "@/constants";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IPayment extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  department: Department;
  invoiceId: Schema.Types.ObjectId;
  guestId?: Schema.Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  paystackReference?: string;
  paystackTransactionId?: string;
  status: PaymentStatus;
  refundAmount?: number;
  refundReference?: string;
  refundReason?: string;
  processedBy?: Schema.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    department: {
      type: String,
      enum: enumValues(DEPARTMENT),
      default: DEPARTMENT.ACCOMMODATION,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    guestId: { type: Schema.Types.ObjectId, ref: "Guest" },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: enumValues(PAYMENT_METHOD),
      required: true,
    },
    paystackReference: { type: String },
    paystackTransactionId: { type: String },
    status: {
      type: String,
      enum: enumValues(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    refundAmount: { type: Number },
    refundReference: { type: String },
    refundReason: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.plugin(tenantPlugin);
paymentSchema.plugin(branchPlugin);

paymentSchema.index({ tenantId: 1, branchId: 1 });
paymentSchema.index({ tenantId: 1, branchId: 1, department: 1 });
paymentSchema.index({ paystackReference: 1 }, { unique: true, sparse: true });
paymentSchema.index({ tenantId: 1, branchId: 1, status: 1 });
paymentSchema.index({ tenantId: 1, branchId: 1, createdAt: 1 });
paymentSchema.index({ tenantId: 1, invoiceId: 1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", paymentSchema);

export default Payment;
