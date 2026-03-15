import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  INVOICE_STATUS,
  MODIFIER_TYPE,
  DEPARTMENT,
  type InvoiceStatus,
  type Department,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IInvoiceItem {
  description: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface IInvoiceTax {
  label: string;
  rate: number;
  amount: number;
}

export interface IInvoiceDiscount {
  description: string;
  type: "percentage" | "fixed";
  value: number;
  amount: number;
}

export interface IInvoice extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  department: Department;
  invoiceNumber: string;
  bookingId?: Schema.Types.ObjectId;
  eventBookingId?: Schema.Types.ObjectId;
  guestId?: Schema.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal?: number;
  taxBreakdown: IInvoiceTax[];
  discounts: IInvoiceDiscount[];
  totalAmount?: number;
  paidAmount: number;
  balanceDue?: number;
  status: InvoiceStatus;
  dueDate?: Date;
  notes?: string;
  isSplitBill: boolean;
  splitWith: Schema.Types.ObjectId[];
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    department: {
      type: String,
      enum: enumValues(DEPARTMENT),
      default: DEPARTMENT.ACCOMMODATION,
    },
    invoiceNumber: { type: String, required: true, unique: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    eventBookingId: { type: Schema.Types.ObjectId, ref: "EventBooking" },
    guestId: { type: Schema.Types.ObjectId, ref: "Guest" },
    items: [
      {
        description: { type: String, required: true },
        category: { type: String },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number },
    taxBreakdown: [
      {
        label: { type: String, required: true },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    discounts: [
      {
        description: { type: String, required: true },
        type: { type: String, enum: enumValues(MODIFIER_TYPE), required: true },
        value: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number },
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: enumValues(INVOICE_STATUS),
      default: INVOICE_STATUS.DRAFT,
    },
    dueDate: { type: Date },
    notes: { type: String },
    isSplitBill: { type: Boolean, default: false },
    splitWith: [{ type: Schema.Types.ObjectId, ref: "Invoice" }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

invoiceSchema.plugin(tenantPlugin);
invoiceSchema.plugin(branchPlugin);
invoiceSchema.plugin(createdByPlugin);

invoiceSchema.virtual("balanceDue").get(function (this: IInvoice) {
  return (this.totalAmount ?? 0) - (this.paidAmount ?? 0);
});

invoiceSchema.index({ tenantId: 1, branchId: 1 });
invoiceSchema.index({ tenantId: 1, branchId: 1, department: 1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ tenantId: 1, bookingId: 1 });
invoiceSchema.index({ tenantId: 1, eventBookingId: 1 });
invoiceSchema.index({ tenantId: 1, branchId: 1, status: 1 });
invoiceSchema.index({ tenantId: 1, branchId: 1, createdAt: 1 });

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice ||
  mongoose.model<IInvoice>("Invoice", invoiceSchema);

export default Invoice;
