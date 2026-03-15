import mongoose, { Schema, Document, Model } from "mongoose";
import {
  enumValues,
  EXPENSE_STATUS,
  PAYMENT_METHOD,
  DEPARTMENT,
  type ExpenseStatus,
  type PaymentMethod,
  type Department,
} from "@/constants";
import { tenantPlugin, branchPlugin, createdByPlugin } from "@/lib/plugins";

export interface IExpense extends Document {
  tenantId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  department: Department;
  category: string;
  description: string;
  amount: number;
  date: Date;
  paidTo?: string;
  paymentMethod?: PaymentMethod;
  receiptUrl?: string;
  approvedBy?: Schema.Types.ObjectId;
  status: ExpenseStatus;
  notes?: string;
  /** Chart of Accounts code (e.g. restaurant-food-cost, restaurant-labour, staff-salaries). */
  accountCode?: string;
  /** Staff member this expense is for (e.g. salary payment). */
  staffId?: Schema.Types.ObjectId;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    department: {
      type: String,
      enum: enumValues(DEPARTMENT),
      default: DEPARTMENT.GENERAL,
      required: true,
    },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    paidTo: { type: String },
    paymentMethod: { type: String, enum: enumValues(PAYMENT_METHOD) },
    receiptUrl: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: enumValues(EXPENSE_STATUS),
      default: EXPENSE_STATUS.PENDING,
    },
    notes: { type: String },
    accountCode: { type: String, trim: true },
    staffId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

expenseSchema.plugin(tenantPlugin);
expenseSchema.plugin(branchPlugin);
expenseSchema.plugin(createdByPlugin);

expenseSchema.index({ tenantId: 1, branchId: 1 });
expenseSchema.index({ tenantId: 1, branchId: 1, department: 1 });
expenseSchema.index({ tenantId: 1, branchId: 1, date: 1 });
expenseSchema.index({ tenantId: 1, branchId: 1, category: 1 });
expenseSchema.index({ tenantId: 1, branchId: 1, accountCode: 1 });
expenseSchema.index({ staffId: 1 });

const Expense: Model<IExpense> =
  mongoose.models.Expense ||
  mongoose.model<IExpense>("Expense", expenseSchema);

export default Expense;
