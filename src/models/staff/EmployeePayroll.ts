import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface IDeduction {
  name: string;
  /** Fixed amount in currency (use when isPercent is false). */
  amount?: number;
  /** Percentage of base salary (0–100, use when isPercent is true). */
  percent?: number;
  isPercent: boolean;
}

export interface IEmployeePayroll extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  /** Reference to standard salary structure (role/department). When set, base/deductions/additions come from structure. */
  salaryStructureId?: Schema.Types.ObjectId;
  /** Legacy: base salary when no structure assigned (optional). */
  baseSalary?: number;
  /** Legacy: overtime rate when no structure (optional). */
  overtimeRate?: number;
  /** Legacy: deductions when no structure (optional). */
  deductions?: IDeduction[];
  /** Preferred payment method for salary. */
  paymentMethod: "bank" | "mobileMoney" | "cash";
  /** Bank account number (for paymentMethod === "bank"). */
  bankAccountNumber?: string;
  /** Bank name. */
  bankName?: string;
  /** Mobile money number (for paymentMethod === "mobileMoney"). */
  momoNumber?: string;
  /** e.g. MTN, Vodafone, AirtelTigo. */
  momoProvider?: string;
  /** Optional payroll ID or employee number for external systems. */
  employeeNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const deductionSchema = new Schema<IDeduction>(
  {
    name: { type: String, required: true },
    amount: { type: Number, min: 0 },
    percent: { type: Number, min: 0, max: 100 },
    isPercent: { type: Boolean, default: false },
  },
  { _id: false }
);

const employeePayrollSchema = new Schema<IEmployeePayroll>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    salaryStructureId: { type: Schema.Types.ObjectId, ref: "SalaryStructure" },
    baseSalary: { type: Number, min: 0, required: false },
    overtimeRate: { type: Number, default: 1.5, min: 1 },
    deductions: { type: [deductionSchema], default: [] },
    paymentMethod: {
      type: String,
      enum: ["bank", "mobileMoney", "cash"],
      default: "cash",
    },
    bankAccountNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    momoNumber: { type: String, trim: true },
    momoProvider: { type: String, trim: true },
    employeeNumber: { type: String, trim: true },
  },
  { timestamps: true }
);

employeePayrollSchema.plugin(tenantPlugin);
employeePayrollSchema.plugin(branchPlugin);

employeePayrollSchema.index({ tenantId: 1, branchId: 1, userId: 1 }, { unique: true });
employeePayrollSchema.index({ tenantId: 1, branchId: 1 });

const EmployeePayroll: Model<IEmployeePayroll> =
  mongoose.models.EmployeePayroll ||
  mongoose.model<IEmployeePayroll>("EmployeePayroll", employeePayrollSchema);

export default EmployeePayroll;
