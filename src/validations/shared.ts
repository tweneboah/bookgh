import { z } from "zod";
import { enumValues, EXPENSE_STATUS, PAYMENT_METHOD, DEPARTMENT, COA_EXPENSE_CODES } from "@/constants";

export const createExpenseSchema = z.object({
  department: z
    .enum(enumValues(DEPARTMENT) as [string, ...string[]])
    .default("general"),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().datetime(),
  paidTo: z.string().optional(),
  paymentMethod: z.enum(enumValues(PAYMENT_METHOD) as [string, ...string[]]).optional(),
  receiptUrl: z.string().url().optional(),
  notes: z.string().optional(),
  accountCode: z.enum(COA_EXPENSE_CODES as [string, ...string[]]).optional().or(z.literal("")),
  staffId: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema
  .omit({ department: true })
  .partial()
  .extend({
    status: z.enum(enumValues(EXPENSE_STATUS) as [string, ...string[]]).optional(),
    approvedBy: z.string().optional(),
    accountCode: z.enum(COA_EXPENSE_CODES as [string, ...string[]]).optional().or(z.literal("")).nullable(),
    staffId: z.string().optional().nullable(),
  });

export const createNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1).max(300),
  message: z.string().min(1).max(2000),
  data: z.record(z.string(), z.unknown()).optional(),
  branchId: z.string().optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
  branchId: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const subscriptionPlanSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().min(0),
  billingCycle: z.enum(["monthly", "yearly"]),
  trialDays: z.number().int().min(0).optional(),
  limits: z.object({
    maxBranches: z.number().int().positive(),
    maxRooms: z.number().int().positive(),
    maxStaff: z.number().int().positive(),
    hasEventModule: z.boolean().optional(),
    hasPosModule: z.boolean().optional(),
    hasApiAccess: z.boolean().optional(),
  }),
  features: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});
