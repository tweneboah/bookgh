import { z } from "zod";
import {
  enumValues,
  BOOKING_STATUS,
  BOOKING_SOURCE,
  PAYMENT_METHOD,
  ID_TYPE,
} from "@/constants";

export const createBookingSchema = z.object({
  guestId: z.string().min(1),
  corporateAccountId: z.string().optional(),
  roomCategoryId: z.string().min(1),
  roomId: z.string().optional(),
  checkInDate: z.string().datetime(),
  checkOutDate: z.string().datetime(),
  numberOfGuests: z.number().int().positive(),
  source: z.enum(enumValues(BOOKING_SOURCE) as [string, ...string[]]).optional(),
  specialRequests: z.string().optional(),
  isGroupBooking: z.boolean().optional(),
  groupId: z.string().optional(),
  roomRate: z.number().positive().optional(),
  totalAmount: z.number().positive().optional(),
  depositRequired: z.number().min(0).optional(),
});

/** Same fields as a single booking plus how many parallel rooms to book (2–50). */
export const createGroupBookingsSchema = createBookingSchema.extend({
  groupSize: z.coerce.number().int().min(2).max(50),
});

export const updateBookingSchema = z.object({
  corporateAccountId: z.string().optional(),
  roomCategoryId: z.string().min(1).optional(),
  roomId: z.string().optional(),
  checkInDate: z.string().datetime().optional(),
  checkOutDate: z.string().datetime().optional(),
  numberOfGuests: z.number().int().positive().optional(),
  source: z.enum(enumValues(BOOKING_SOURCE) as [string, ...string[]]).optional(),
  isGroupBooking: z.boolean().optional(),
  groupId: z.string().optional(),
  status: z.enum(enumValues(BOOKING_STATUS) as [string, ...string[]]).optional(),
  specialRequests: z.string().optional(),
  roomRate: z.number().positive().optional(),
  totalAmount: z.number().positive().optional(),
  earlyCheckIn: z.boolean().optional(),
  lateCheckOut: z.boolean().optional(),
  earlyCheckInFee: z.number().min(0).optional(),
  lateCheckOutFee: z.number().min(0).optional(),
});

export const checkInSchema = z.object({
  roomId: z.string().min(1),
  depositPaid: z.number().min(0).optional(),
  /** How the amount collected at check-in was received (defaults to cash on the server). */
  paymentMethod: z
    .enum(enumValues(PAYMENT_METHOD) as [string, ...string[]])
    .optional(),
  idType: z.enum(enumValues(ID_TYPE) as [string, ...string[]]).optional(),
  idNumber: z.string().min(3).optional(),
  idDocument: z.string().url().optional(),
});

export const checkOutSchema = z.object({
  damageCharges: z.number().min(0).optional(),
  lateCheckOutFee: z.number().min(0).optional(),
  paymentMethod: z
    .enum(enumValues(PAYMENT_METHOD) as [string, ...string[]])
    .optional(),
});

export const cancelBookingSchema = z.object({
  cancellationReason: z.string().min(1),
  refundAmount: z.number().min(0).optional(),
});

export const availabilityQuerySchema = z.object({
  checkInDate: z.string().datetime(),
  checkOutDate: z.string().datetime(),
  roomCategoryId: z.string().optional(),
  excludeBookingId: z.string().optional(),
});
