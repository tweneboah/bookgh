import { z } from "zod";
import {
  enumValues,
  SUPPLIER_STATUS,
  PROCUREMENT_ORDER_STATUS,
  TRANSFER_STATUS,
  DEPARTMENT,
} from "@/constants";

export const supplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  categories: z.array(z.string()).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().optional(),
      })
    )
    .optional(),
  leadTimeDays: z.number().min(0).optional(),
  averageFulfillmentDays: z.number().min(0).optional(),
  onTimeRate: z.number().min(0).max(100).optional(),
  rating: z.number().min(0).max(5).optional(),
  status: z.enum(enumValues(SUPPLIER_STATUS) as [string, ...string[]]).optional(),
  notes: z.string().optional(),
});

export const purchaseOrderLineSchema = z.object({
  inventoryItemId: z.string().min(1).optional(),
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitCost: z.number().min(0).optional(),
  totalCost: z.number().min(0).optional(),
});

export const purchaseOrderSchema = z.object({
  poNumber: z.string().min(1),
  supplierId: z.string().min(1),
  orderDate: z.string().datetime(),
  expectedDate: z.string().datetime().optional(),
  receivedDate: z.string().datetime().optional(),
  requestedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  sourceDepartment: z
    .enum(enumValues(DEPARTMENT) as [string, ...string[]])
    .default(DEPARTMENT.INVENTORY_PROCUREMENT),
  lines: z.array(purchaseOrderLineSchema).min(1),
  subtotal: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  status: z
    .enum(enumValues(PROCUREMENT_ORDER_STATUS) as [string, ...string[]])
    .optional(),
  notes: z.string().optional(),
});

export const transferLineSchema = z.object({
  inventoryItemId: z.string().min(1),
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
});

export const stockTransferSchema = z.object({
  transferNumber: z.string().min(1),
  fromBranchId: z.string().min(1),
  toBranchId: z.string().min(1),
  transferDate: z.string().datetime(),
  expectedArrival: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  requestedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  status: z.enum(enumValues(TRANSFER_STATUS) as [string, ...string[]]).optional(),
  lines: z.array(transferLineSchema).min(1),
  notes: z.string().optional(),
});

export const updateSupplierSchema = supplierSchema.partial();
export const updatePurchaseOrderSchema = purchaseOrderSchema.partial().extend({
  receiveToDepartment: z
    .enum(enumValues(DEPARTMENT) as [string, ...string[]])
    .optional(),
});
export const receivePurchaseOrderSchema = z.object({
  receiveToDepartment: z
    .enum(enumValues(DEPARTMENT) as [string, ...string[]])
    .default(DEPARTMENT.RESTAURANT),
  lines: z
    .array(
      z.object({
        lineIndex: z.number().int().min(0),
        quantity: z.number().positive(),
        inventoryItemId: z.string().min(1).optional(),
      })
    )
    .min(1),
  receivedDate: z.string().datetime().optional(),
  deliveryNoteNumber: z.string().min(1).max(120).optional(),
  notes: z.string().max(500).optional(),
});
export const updateStockTransferSchema = stockTransferSchema.partial();
