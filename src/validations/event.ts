import { z } from "zod";
import {
  enumValues,
  EVENT_TYPE,
  EVENT_BOOKING_STATUS,
  EVENT_HALL_STATUS,
  EVENT_RESOURCE_TYPE,
  RESOURCE_CONDITION,
  RESOURCE_PRICE_UNIT,
  INSTALLMENT_STATUS,
  PAYMENT_METHOD,
} from "@/constants";

export const createEventHallSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  capacityByLayout: z.object({
    theater: z.number().int().optional(),
    banquet: z.number().int().optional(),
    classroom: z.number().int().optional(),
    uShape: z.number().int().optional(),
  }).optional(),
  layoutTypes: z.array(z.string()).optional(),
  layoutTemplates: z.array(z.object({
    name: z.string().min(1).max(100),
    capacity: z.number().int().min(0),
    imageUrl: z.string().url().optional(),
    caption: z.string().optional(),
  })).optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    caption: z.string().optional(),
  })).optional(),
  hourlyRate: z.number().min(0),
});

export const updateEventHallSchema = createEventHallSchema.partial().extend({
  status: z.enum(enumValues(EVENT_HALL_STATUS) as [string, ...string[]]).optional(),
  isActive: z.boolean().optional(),
});

export const createEventBookingSchema = z.object({
  eventHallId: z.string().min(1),
  clientName: z.string().min(1).max(200),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  guestId: z.string().optional(),
  eventType: z.enum(enumValues(EVENT_TYPE) as [string, ...string[]]),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  expectedAttendees: z.number().int().positive().optional(),
  selectedLayoutName: z.string().max(100).optional(),
  quotedPrice: z.number().min(0).optional(),
  quotationNotes: z.string().optional(),
  installments: z
    .array(
      z.object({
        dueDate: z.string().datetime(),
        amount: z.number().min(0),
        status: z
          .enum(enumValues(INSTALLMENT_STATUS) as [string, ...string[]])
          .optional(),
        paidDate: z.string().datetime().optional(),
      })
    )
    .optional(),
  equipmentBooked: z
    .array(
      z.object({
        resourceId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
  specialRequests: z.string().optional(),
});

export const updateEventBookingSchema = z.object({
  selectedLayoutName: z.string().max(100).optional(),
  status: z.enum(enumValues(EVENT_BOOKING_STATUS) as [string, ...string[]]).optional(),
  agreedPrice: z.number().min(0).optional(),
  depositRequired: z.number().min(0).optional(),
  depositPaid: z.number().min(0).optional(),
  finalSettlementPaid: z.number().min(0).optional(),
  finalSettledAt: z.string().datetime().optional(),
  contractUrl: z.string().url().optional(),
  proposalUrl: z.string().url().optional(),
  quotationNotes: z.string().optional(),
  pricingOverrideReason: z.string().optional(),
  specialRequests: z.string().optional(),
  cancellationReason: z.string().optional(),
  assignedStaff: z.array(z.string()).optional(),
  assignedRooms: z.array(z.string()).optional(),
  charges: z.object({
    hallRental: z.number().optional(),
    catering: z.number().optional(),
    equipment: z.number().optional(),
    decoration: z.number().optional(),
    staffing: z.number().optional(),
    security: z.number().optional(),
    addOns: z.array(z.object({ desc: z.string(), amount: z.number() })).optional(),
  }).optional(),
  billingLineItems: z.array(
    z.object({
      label: z.string().min(1),
      category: z.string().optional(),
      quantity: z.number().min(0),
      unitPrice: z.number().min(0),
      amount: z.number().min(0),
    })
  ).optional(),
  expenseLineItems: z.array(
    z.object({
      category: z.string().min(1),
      description: z.string().optional(),
      amount: z.number().min(0),
      chargeToCustomer: z.boolean().optional(),
      amountToCharge: z.number().min(0).optional(),
    })
  ).optional(),
  installments: z
    .array(
      z.object({
        dueDate: z.string().datetime(),
        amount: z.number().min(0),
        status: z
          .enum(enumValues(INSTALLMENT_STATUS) as [string, ...string[]])
          .optional(),
        paidDate: z.string().datetime().optional(),
        paymentId: z.string().optional(),
      })
    )
    .optional(),
  projectedRevenue: z.number().min(0).optional(),
  budgetedCost: z.number().min(0).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  commissionAmount: z.number().min(0).optional(),
  salesAgentId: z.string().optional(),
  isRecurringContract: z.boolean().optional(),
  recurrencePattern: z.string().optional(),
  totalRevenue: z.number().min(0).optional(),
  totalExpenses: z.number().min(0).optional(),
  netProfit: z.number().optional(),
  outstandingAmount: z.number().optional(),
  cateringDetails: z.object({
    menuType: z.string().optional(),
    headCount: z.number().optional(),
    dietaryRequirements: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  equipmentBooked: z
    .array(
      z.object({
        resourceId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
});

export const createEventResourceSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(enumValues(EVENT_RESOURCE_TYPE) as [string, ...string[]]),
  description: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  unitPrice: z.number().min(0).optional(),
  priceUnit: z.enum(enumValues(RESOURCE_PRICE_UNIT) as [string, ...string[]]).optional(),
  condition: z.enum(enumValues(RESOURCE_CONDITION) as [string, ...string[]]).optional(),
});

export const updateEventResourceSchema = createEventResourceSchema.partial().extend({
  isAvailable: z.boolean().optional(),
});

export const createEventBookingPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(enumValues(PAYMENT_METHOD) as [string, ...string[]]),
  type: z.enum(["deposit", "finalSettlement"]),
  paidAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});
