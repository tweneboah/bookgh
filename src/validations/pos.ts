import { z } from "zod";
import {
  enumValues,
  POS_ORDER_STATUS,
  POS_TABLE_STATUS,
  POS_PAYMENT_STATUS,
  INVENTORY_MOVEMENT_TYPE,
  POS_ORDER_CHANNEL,
  POS_KOT_STATUS,
} from "@/constants";

const recipeSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1).default("unit"),
});

export const createMenuItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().min(1),
  price: z.number().positive(),
  image: z.string().url().optional(),
  allergens: z.array(z.string()).optional(),
  preparationTime: z.number().int().positive().optional(),
  isBarItem: z.boolean().optional(),
  recipe: z.array(recipeSchema).optional(),
  /** Revenue account code for accounting (e.g. restaurant-food, restaurant-beverage). */
  revenueAccountCode: z.string().trim().optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  isAvailable: z.boolean().optional(),
  revenueAccountCode: z.string().trim().optional().nullable(),
});

export const createTableSchema = z.object({
  tableNumber: z.string().min(1).max(20),
  capacity: z.number().int().positive(),
  location: z.string().optional(),
  assignedServerId: z.string().optional(),
});

export const updateTableSchema = createTableSchema.partial().extend({
  status: z.enum(enumValues(POS_TABLE_STATUS) as [string, ...string[]]).optional(),
});

const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().optional(),
  roomId: z.string().optional(),
  bookingId: z.string().optional(),
  guestId: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().min(0),
  tax: z.number().min(0).optional(),
  tipAmount: z.number().min(0).optional(),
  serviceChargeAmount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  orderChannel: z
    .enum(enumValues(POS_ORDER_CHANNEL) as [string, ...string[]])
    .optional(),
  waiterId: z.string().optional(),
  waiterName: z.string().optional(),
  addToRoomBill: z.boolean().optional(),
  shiftId: z.string().optional(),
  paymentStatus: z.enum(enumValues(POS_PAYMENT_STATUS) as [string, ...string[]]).optional(),
  partialPayments: z
    .array(
      z.object({
        method: z.string().min(1),
        amount: z.number().min(0),
        reference: z.string().optional(),
        paidAt: z.string().datetime().optional(),
      })
    )
    .optional(),
  /** Revenue account code for accounting (e.g. restaurant-sales, restaurant-food). */
  revenueAccountCode: z.string().trim().optional(),
});

export const updateOrderSchema = z.object({
  status: z.enum(enumValues(POS_ORDER_STATUS) as [string, ...string[]]).optional(),
  paymentStatus: z.enum(enumValues(POS_PAYMENT_STATUS) as [string, ...string[]]).optional(),
  kotStatus: z.enum(enumValues(POS_KOT_STATUS) as [string, ...string[]]).optional(),
  items: z.array(orderItemSchema).optional(),
  shiftId: z.string().optional(),
  orderChannel: z
    .enum(enumValues(POS_ORDER_CHANNEL) as [string, ...string[]])
    .optional(),
  addToRoomBill: z.boolean().optional(),
  bookingId: z.string().optional(),
  guestId: z.string().optional(),
  roomId: z.string().optional(),
  voidReason: z.string().max(500).optional(),
  tipAmount: z.number().min(0).optional(),
  serviceChargeAmount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  discountReason: z.string().max(500).optional(),
  discountApprovedBy: z.string().optional(),
  refundAmount: z.number().min(0).optional(),
  refundReason: z.string().max(500).optional(),
  voidApprovedBy: z.string().optional(),
  waiterId: z.string().optional(),
  waiterName: z.string().optional(),
  cashierId: z.string().optional(),
  transferFromTableId: z.string().optional(),
  transferToTableId: z.string().optional(),
  mergedFromTableIds: z.array(z.string()).optional(),
  partialPayments: z
    .array(
      z.object({
        method: z.string().min(1),
        amount: z.number().min(0),
        reference: z.string().optional(),
        paidAt: z.string().datetime().optional(),
      })
    )
    .optional(),
  allowNegativeStock: z.boolean().optional(),
});

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  unit: z.string().min(1),
  unitConversions: z
    .array(
      z.object({
        unit: z.string().min(1),
        factor: z.number().positive(),
      })
    )
    .optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().optional(),
      })
    )
    .optional(),
  currentStock: z.number().min(0).optional(),
  minimumStock: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  supplier: z.string().optional(),
  sku: z.string().optional(),
  volumeMl: z.number().min(0).optional(),
  unitsPerBottle: z.number().min(0).optional(),
  isControlled: z.boolean().optional(),
  trackByBottle: z.boolean().optional(),
  mlPerUnit: z.number().min(0).optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const createInventoryMovementSchema = z.object({
  inventoryItemId: z.string().min(1),
  movementType: z.enum(enumValues(INVENTORY_MOVEMENT_TYPE) as [string, ...string[]]),
  quantity: z.number().positive(),
  unit: z.string().min(1).default("unit"),
  reason: z.string().min(1).max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  allowNegativeStock: z.boolean().optional(),
});

export const openBarShiftSchema = z.object({
  shiftName: z.string().min(1).max(120),
  openingCash: z.number().min(0).default(0),
  openingStockSnapshot: z
    .array(
      z.object({
        inventoryItemId: z.string().min(1),
        quantity: z.number().min(0),
      })
    )
    .optional(),
});

export const closeBarShiftSchema = z.object({
  closingCash: z.number().min(0).optional(),
  closingStockSnapshot: z
    .array(
      z.object({
        inventoryItemId: z.string().min(1),
        quantity: z.number().min(0),
      })
    )
    .default([]),
  varianceNotes: z.string().max(1000).optional(),
});
