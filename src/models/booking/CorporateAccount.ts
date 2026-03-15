import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, CORPORATE_STATUS, type CorporateStatus } from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface ICorporateAccount extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  taxId?: string;
  negotiatedRate: number;
  creditLimit?: number;
  currentBalance: number;
  paymentTerms?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  status: CorporateStatus;
  notes?: string;
  totalBookings: number;
  totalSpend: number;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const corporateAccountSchema = new Schema<ICorporateAccount>(
  {
    companyName: { type: String, required: true },
    contactPerson: { type: String, required: true },
    contactEmail: { type: String, required: true, lowercase: true },
    contactPhone: { type: String },
    address: { type: String },
    taxId: { type: String },
    negotiatedRate: { type: Number, required: true, min: 0, max: 100 },
    creditLimit: { type: Number, min: 0 },
    currentBalance: { type: Number, default: 0 },
    paymentTerms: { type: String },
    contractStartDate: { type: Date },
    contractEndDate: { type: Date },
    status: {
      type: String,
      enum: enumValues(CORPORATE_STATUS),
      default: CORPORATE_STATUS.ACTIVE,
    },
    notes: { type: String },
    totalBookings: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
  },
  { timestamps: true }
);

corporateAccountSchema.plugin(tenantPlugin);
corporateAccountSchema.plugin(branchPlugin);
corporateAccountSchema.plugin(createdByPlugin);

corporateAccountSchema.index({ tenantId: 1, branchId: 1 });
corporateAccountSchema.index(
  { tenantId: 1, branchId: 1, companyName: 1 },
  { unique: true }
);
corporateAccountSchema.index({ tenantId: 1, branchId: 1, status: 1 });

const CorporateAccount: Model<ICorporateAccount> =
  mongoose.models.CorporateAccount ||
  mongoose.model<ICorporateAccount>(
    "CorporateAccount",
    corporateAccountSchema,
    "corporate_accounts_accommodation"
  );

export default CorporateAccount;
