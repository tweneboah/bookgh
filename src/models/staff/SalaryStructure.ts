import mongoose, { Schema, Document, Model } from "mongoose";
import { tenantPlugin, branchPlugin } from "@/lib/plugins";

export interface ISalaryStructureItem {
  name: string;
  amount?: number;
  percent?: number;
  isPercent: boolean;
}

export interface ISalaryStructure extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  /** Display name e.g. "Waiter – Monthly", "Kitchen Staff" */
  name: string;
  /** Optional department (restaurant, bar, etc.) for filtering */
  department?: string;
  /** Optional role label for display/filtering */
  role?: string;
  /** Base salary per period */
  baseSalary: number;
  /** Overtime multiplier (e.g. 1.5) */
  overtimeRate: number;
  /** Standard deductions (tax, pension, etc.) */
  deductions: ISalaryStructureItem[];
  /** Standard additions (allowances, bonuses) */
  additions: ISalaryStructureItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const structureItemSchema = new Schema<ISalaryStructureItem>(
  {
    name: { type: String, required: true },
    amount: { type: Number, min: 0 },
    percent: { type: Number, min: 0, max: 100 },
    isPercent: { type: Boolean, default: false },
  },
  { _id: false }
);

const salaryStructureSchema = new Schema<ISalaryStructure>(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    role: { type: String, trim: true },
    baseSalary: { type: Number, required: true, min: 0 },
    overtimeRate: { type: Number, default: 1.5, min: 1 },
    deductions: { type: [structureItemSchema], default: [] },
    additions: { type: [structureItemSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

salaryStructureSchema.plugin(tenantPlugin);
salaryStructureSchema.plugin(branchPlugin);

salaryStructureSchema.index({ tenantId: 1, branchId: 1 });
salaryStructureSchema.index({ tenantId: 1, branchId: 1, department: 1 });

const SalaryStructure: Model<ISalaryStructure> =
  mongoose.models.SalaryStructure ||
  mongoose.model<ISalaryStructure>("SalaryStructure", salaryStructureSchema);

export default SalaryStructure;
