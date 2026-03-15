import { z } from "zod";
import { enumValues, INVOICE_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, DEPARTMENT } from "@/constants";

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  category: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  department: z
    .enum(enumValues(DEPARTMENT) as [string, ...string[]])
    .optional(),
  bookingId: z.string().optional(),
  eventBookingId: z.string().optional(),
  guestId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
  taxBreakdown: z.array(z.object({
    label: z.string(),
    rate: z.number(),
    amount: z.number(),
  })).optional(),
  discounts: z.array(z.object({
    description: z.string(),
    type: z.enum(["percentage", "fixed"]),
    value: z.number(),
    amount: z.number(),
  })).optional(),
  totalAmount: z.number().min(0).optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  isSplitBill: z.boolean().optional(),
  splitWith: z.array(z.string()).optional(),
});

export const updateInvoiceSchema = z.object({
  items: z.array(invoiceItemSchema).optional(),
  status: z.enum(enumValues(INVOICE_STATUS) as [string, ...string[]]).optional(),
  notes: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export const createPaymentSchema = z.object({
  department: z
    .enum(enumValues(DEPARTMENT) as [string, ...string[]])
    .optional(),
  invoiceId: z.string().min(1),
  guestId: z.string().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(enumValues(PAYMENT_METHOD) as [string, ...string[]]),
  paystackReference: z.string().optional(),
});

export const updatePaymentSchema = z.object({
  status: z.enum(enumValues(PAYMENT_STATUS) as [string, ...string[]]).optional(),
  refundAmount: z.number().min(0).optional(),
  refundReference: z.string().optional(),
  refundReason: z.string().optional(),
});
