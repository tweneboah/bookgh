import { z } from "zod";
import { enumValues, PAYMENT_METHOD } from "@/constants";
import { POOL_AREA_STATUS, POOL_AREA_TYPE } from "@/models/pool/PoolArea";
import { POOL_BOOKING_STATUS } from "@/models/pool/PoolBooking";
import { POOL_MAINTENANCE_TYPE, POOL_MAINTENANCE_STATUS } from "@/models/pool/PoolMaintenance";
import type { PoolAreaStatus } from "@/models/pool/PoolArea";
import type { PoolBookingStatus } from "@/models/pool/PoolBooking";

const poolAreaStatusValues = Object.values(POOL_AREA_STATUS) as [PoolAreaStatus, ...PoolAreaStatus[]];
const poolAreaTypeValues = Object.values(POOL_AREA_TYPE) as [string, ...string[]];
const poolBookingStatusValues = Object.values(POOL_BOOKING_STATUS) as [PoolBookingStatus, ...PoolBookingStatus[]];
const poolMaintenanceTypeValues = Object.values(POOL_MAINTENANCE_TYPE) as [string, ...string[]];
const poolMaintenanceStatusValues = Object.values(POOL_MAINTENANCE_STATUS) as [string, ...string[]];

export const createPoolAreaSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(poolAreaTypeValues),
  capacity: z.number().int().min(0),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  status: z.enum(poolAreaStatusValues).optional(),
  hourlyRate: z.number().min(0).optional(),
  dailyRate: z.number().min(0).optional(),
  amenities: z.array(z.string().trim()).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().optional(),
      })
    )
    .optional(),
  isActive: z.boolean().optional(),
});

export const updatePoolAreaSchema = createPoolAreaSchema.partial();

const poolBookingAddOnSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

export const createPoolBookingSchema = z.object({
  poolAreaId: z.string().min(1),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional(),
  guestId: z.string().optional(),
  bookingDate: z.string().datetime(),
  startTime: z.string().min(1).max(20),
  endTime: z.string().min(1).max(20),
  numberOfGuests: z.number().int().min(1),
  sessionType: z.string().max(100).optional(),
  addOns: z.array(poolBookingAddOnSchema).optional(),
  amount: z.number().min(0),
  paidAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(poolBookingStatusValues).optional(),
});

export const createPoolBookingPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(enumValues(PAYMENT_METHOD) as [string, ...string[]]),
  paidAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

const poolBookingExpenseLineItemSchema = z.object({
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  chargeToCustomer: z.boolean().optional(),
  amountToCharge: z.number().min(0).optional(),
});

export const updatePoolBookingSchema = z.object({
  guestName: z.string().min(1).max(200).optional(),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional(),
  bookingDate: z.string().datetime().optional(),
  startTime: z.string().min(1).max(20).optional(),
  endTime: z.string().min(1).max(20).optional(),
  numberOfGuests: z.number().int().min(1).optional(),
  sessionType: z.string().max(100).optional(),
  addOns: z.array(poolBookingAddOnSchema).optional(),
  amount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  expenseLineItems: z.array(poolBookingExpenseLineItemSchema).optional(),
  totalExpenses: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(poolBookingStatusValues).optional(),
});

const recurrenceSchema = z.object({
  frequency: z.enum(["none", "daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).optional(),
  endDate: z.string().datetime().optional(),
});

export const createPoolMaintenanceSchema = z.object({
  poolAreaId: z.string().min(1),
  scheduledDate: z.string().datetime(),
  startTime: z.string().max(20).optional(),
  endTime: z.string().max(20).optional(),
  recurrence: recurrenceSchema.optional(),
  completedAt: z.string().datetime().optional(),
  type: z.enum(poolMaintenanceTypeValues),
  description: z.string().min(1).max(500),
  status: z.enum(poolMaintenanceStatusValues).optional(),
  assignedTo: z.string().optional(),
  cost: z.number().min(0).optional(),
  chemicalReadings: z
    .object({
      pH: z.number().min(0).max(14).optional(),
      chlorine: z.number().min(0).optional(),
      alkalinity: z.number().min(0).optional(),
      notes: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export const updatePoolMaintenanceSchema = z.object({
  scheduledDate: z.string().datetime().optional(),
  startTime: z.string().max(20).optional(),
  endTime: z.string().max(20).optional(),
  recurrence: recurrenceSchema.optional(),
  completedAt: z.string().datetime().optional(),
  type: z.enum(poolMaintenanceTypeValues).optional(),
  description: z.string().min(1).max(500).optional(),
  status: z.enum(poolMaintenanceStatusValues).optional(),
  assignedTo: z.string().optional(),
  cost: z.number().min(0).optional(),
  chemicalReadings: z
    .object({
      pH: z.number().min(0).max(14).optional(),
      chlorine: z.number().min(0).optional(),
      alkalinity: z.number().min(0).optional(),
      notes: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});
