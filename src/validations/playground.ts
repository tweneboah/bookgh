import { z } from "zod";
import {
  enumValues,
  PAYMENT_METHOD,
  PLAYGROUND_AREA_STATUS,
  PLAYGROUND_AREA_TYPE,
  PLAYGROUND_BOOKING_STATUS,
  PLAYGROUND_EQUIPMENT_TYPE,
  PLAYGROUND_EQUIPMENT_STATUS,
  PLAYGROUND_MAINTENANCE_TYPE,
  PLAYGROUND_MAINTENANCE_STATUS,
} from "@/constants";

const playgroundAreaStatusValues = Object.values(PLAYGROUND_AREA_STATUS) as [
  string,
  ...string[],
];
const playgroundAreaTypeValues = Object.values(PLAYGROUND_AREA_TYPE) as [
  string,
  ...string[],
];
const playgroundEquipmentTypeValues = Object.values(
  PLAYGROUND_EQUIPMENT_TYPE
) as [string, ...string[]];
const playgroundEquipmentStatusValues = Object.values(
  PLAYGROUND_EQUIPMENT_STATUS
) as [string, ...string[]];
const playgroundMaintenanceTypeValues = Object.values(
  PLAYGROUND_MAINTENANCE_TYPE
) as [string, ...string[]];
const playgroundMaintenanceStatusValues = Object.values(
  PLAYGROUND_MAINTENANCE_STATUS
) as [string, ...string[]];
const playgroundBookingStatusValues = Object.values(
  PLAYGROUND_BOOKING_STATUS
) as [string, ...string[]];

export const createPlaygroundAreaSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(playgroundAreaTypeValues),
  capacity: z.number().int().min(0),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  status: z.enum(playgroundAreaStatusValues).optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  dailyRate: z.coerce.number().min(0).optional(),
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

export const updatePlaygroundAreaSchema = createPlaygroundAreaSchema.partial();

export const createPlaygroundEquipmentSchema = z.object({
  playgroundAreaId: z.string().min(1),
  name: z.string().min(1).max(200),
  type: z.enum(playgroundEquipmentTypeValues),
  description: z.string().optional(),
  status: z.enum(playgroundEquipmentStatusValues).optional(),
  lastInspectionDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updatePlaygroundEquipmentSchema =
  createPlaygroundEquipmentSchema.partial();

const recurrenceSchema = z.object({
  frequency: z.enum(["none", "daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).optional(),
  endDate: z.string().datetime().optional(),
});

export const createPlaygroundMaintenanceSchema = z.object({
  playgroundAreaId: z.string().min(1),
  playgroundEquipmentId: z.string().optional(),
  scheduledDate: z.string().datetime(),
  startTime: z.string().max(20).optional(),
  endTime: z.string().max(20).optional(),
  recurrence: recurrenceSchema.optional(),
  completedAt: z.string().datetime().optional(),
  type: z.enum(playgroundMaintenanceTypeValues),
  description: z.string().min(1).max(500),
  status: z.enum(playgroundMaintenanceStatusValues).optional(),
  assignedTo: z.string().optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updatePlaygroundMaintenanceSchema = z.object({
  scheduledDate: z.string().datetime().optional(),
  startTime: z.string().max(20).optional(),
  endTime: z.string().max(20).optional(),
  recurrence: recurrenceSchema.optional(),
  completedAt: z.string().datetime().optional(),
  type: z.enum(playgroundMaintenanceTypeValues).optional(),
  description: z.string().min(1).max(500).optional(),
  status: z.enum(playgroundMaintenanceStatusValues).optional(),
  assignedTo: z.string().optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
  playgroundEquipmentId: z.string().optional().nullable(),
});

const playgroundBookingAddOnSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

const playgroundBookingExpenseLineItemSchema = z.object({
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  chargeToCustomer: z.boolean().optional(),
  amountToCharge: z.number().min(0).optional(),
});

export const createPlaygroundBookingSchema = z
  .object({
    playgroundAreaId: z.string().min(1),
    guestName: z.string().min(1).max(200),
    guestEmail: z.string().email().optional().or(z.literal("")),
    guestPhone: z.string().optional(),
    guestId: z.string().optional(),
    bookingDate: z.string().datetime(),
    bookingEndDate: z.string().datetime().optional(),
    startTime: z.string().min(1).max(20),
    endTime: z.string().min(1).max(20),
    numberOfGuests: z.number().int().min(1),
    sessionType: z.string().max(100).optional(),
    addOns: z.array(playgroundBookingAddOnSchema).optional(),
    amount: z.number().min(0),
    paidAmount: z.number().min(0).optional(),
    notes: z.string().optional(),
    status: z.enum(playgroundBookingStatusValues).optional(),
  })
  .refine(
    (d) => {
      if (!d.bookingEndDate) return true;
      return new Date(d.bookingEndDate) >= new Date(d.bookingDate);
    },
    { message: "End date must be on or after start date", path: ["bookingEndDate"] }
  );

export const createPlaygroundBookingPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(enumValues(PAYMENT_METHOD) as [string, ...string[]]),
  paidAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const updatePlaygroundBookingSchema = z.object({
  guestName: z.string().min(1).max(200).optional(),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestPhone: z.string().optional(),
  bookingDate: z.string().datetime().optional(),
  bookingEndDate: z.string().datetime().optional().nullable(),
  startTime: z.string().min(1).max(20).optional(),
  endTime: z.string().min(1).max(20).optional(),
  numberOfGuests: z.number().int().min(1).optional(),
  sessionType: z.string().max(100).optional(),
  addOns: z.array(playgroundBookingAddOnSchema).optional(),
  amount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  expenseLineItems: z.array(playgroundBookingExpenseLineItemSchema).optional(),
  totalExpenses: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(playgroundBookingStatusValues).optional(),
});
