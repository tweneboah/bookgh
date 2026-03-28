import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  SUPPLIER_STATUS,
  type SupplierStatus,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface ISupplierImage {
  url: string;
  caption?: string;
}

export interface ISupplierDocument {
  url: string;
  name: string;
  documentType?: string;
  expiryDate?: Date;
}

export interface ISupplierBankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  branchName?: string;
}

export interface ISupplier extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  categories: string[];
  images: ISupplierImage[];
  leadTimeDays?: number;
  averageFulfillmentDays?: number;
  onTimeRate?: number;
  rating?: number;
  paymentTerms?: string;
  bankAccount?: ISupplierBankAccount;
  documents: ISupplierDocument[];
  blacklistedReason?: string;
  blockedUntil?: Date;
  status: SupplierStatus;
  notes?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    categories: [{ type: String, trim: true }],
    images: {
      type: [
        {
          url: { type: String, required: true },
          caption: { type: String },
        },
      ],
      default: [],
    },
    leadTimeDays: { type: Number, min: 0 },
    averageFulfillmentDays: { type: Number, min: 0 },
    onTimeRate: { type: Number, min: 0, max: 100 },
    rating: { type: Number, min: 0, max: 5 },
    paymentTerms: { type: String, trim: true },
    bankAccount: {
      bankName: { type: String, trim: true },
      accountName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      swiftCode: { type: String, trim: true },
      branchName: { type: String, trim: true },
    },
    documents: {
      type: [
        {
          url: { type: String, required: true },
          name: { type: String, trim: true },
          documentType: { type: String, trim: true },
          expiryDate: { type: Date },
        },
      ],
      default: [],
    },
    blacklistedReason: { type: String, trim: true },
    blockedUntil: { type: Date },
    status: {
      type: String,
      enum: enumValues(SUPPLIER_STATUS),
      default: SUPPLIER_STATUS.ACTIVE,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

supplierSchema.plugin(tenantPlugin);
supplierSchema.plugin(branchPlugin);
supplierSchema.plugin(createdByPlugin);

supplierSchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });
supplierSchema.index({ tenantId: 1, branchId: 1, status: 1 });

const Supplier: Model<ISupplier> =
  mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", supplierSchema);

export default Supplier;
