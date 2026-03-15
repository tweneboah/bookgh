import { z } from "zod";

const structureItemSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().min(0).optional(),
  percent: z.number().min(0).max(100).optional(),
  isPercent: z.boolean(),
}).refine(
  (d) => (d.isPercent ? d.percent != null : d.amount != null),
  { message: "Use amount for fixed or percent for percentage" }
);

export const salaryStructureSchema = z.object({
  name: z.string().min(1).max(200),
  department: z.string().trim().optional(),
  role: z.string().trim().optional(),
  baseSalary: z.number().min(0),
  overtimeRate: z.number().min(1).default(1.5),
  deductions: z.array(structureItemSchema).default([]),
  additions: z.array(structureItemSchema).default([]),
  isActive: z.boolean().optional().default(true),
});

export type SalaryStructureInput = z.infer<typeof salaryStructureSchema>;

const deductionSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().min(0).optional(),
  percent: z.number().min(0).max(100).optional(),
  isPercent: z.boolean(),
}).refine(
  (d) => (d.isPercent ? d.percent != null : d.amount != null),
  { message: "Use amount for fixed deduction or percent for percentage" }
);

/** Assign employee to a salary structure and set payment details (account/MoMo). */
export const employeePayrollSchema = z.object({
  userId: z.string().min(1),
  salaryStructureId: z.string().min(1).optional(),
  paymentMethod: z.enum(["bank", "mobileMoney", "cash"]).default("cash"),
  bankAccountNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  momoNumber: z.string().trim().optional(),
  momoProvider: z.string().trim().optional(),
  employeeNumber: z.string().trim().optional(),
  // Legacy: when no structure, allow inline salary/deductions
  baseSalary: z.number().min(0).optional(),
  overtimeRate: z.number().min(1).optional(),
  deductions: z.array(deductionSchema).default([]).optional(),
});

export type EmployeePayrollInput = z.infer<typeof employeePayrollSchema>;
