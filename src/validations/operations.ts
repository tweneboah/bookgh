import { z } from "zod";
import {
  enumValues,
  HOUSEKEEPING_TASK_TYPE,
  HOUSEKEEPING_STATUS,
  PRIORITY,
  LOST_FOUND_STATUS,
  MAINTENANCE_CATEGORY,
  MAINTENANCE_STATUS,
  ASSET_CONDITION,
} from "@/constants";

// ─── Housekeeping ────────────────────────────────────────
export const createHousekeepingTaskSchema = z.object({
  roomId: z.string().min(1),
  assignedTo: z.string().optional(),
  taskType: z.enum(enumValues(HOUSEKEEPING_TASK_TYPE) as [string, ...string[]]),
  priority: z.enum(enumValues(PRIORITY) as [string, ...string[]]).optional(),
  notes: z.string().optional(),
});

export const updateHousekeepingTaskSchema = z.object({
  assignedTo: z.string().optional(),
  status: z.enum(enumValues(HOUSEKEEPING_STATUS) as [string, ...string[]]).optional(),
  priority: z.enum(enumValues(PRIORITY) as [string, ...string[]]).optional(),
  notes: z.string().optional(),
  inspectedBy: z.string().optional(),
  inspectionNotes: z.string().optional(),
  linenChanged: z.boolean().optional(),
});

// ─── Lost & Found ────────────────────────────────────────
export const createLostAndFoundSchema = z.object({
  roomId: z.string().optional(),
  itemDescription: z.string().min(1).max(500),
  foundDate: z.string().datetime(),
  foundLocation: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  notes: z.string().optional(),
});

export const updateLostAndFoundSchema = z.object({
  status: z.enum(enumValues(LOST_FOUND_STATUS) as [string, ...string[]]).optional(),
  claimedBy: z.string().optional(),
  notes: z.string().optional(),
  itemDescription: z.string().min(1).max(500).optional(),
  roomId: z.string().nullable().optional(),
  foundDate: z.string().datetime().optional(),
  foundLocation: z.string().optional(),
  images: z.array(z.string().url()).optional(),
});

// ─── Maintenance ─────────────────────────────────────────
export const createMaintenanceTicketSchema = z.object({
  roomId: z.string().optional(),
  assetId: z.string().optional(),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  category: z.enum(enumValues(MAINTENANCE_CATEGORY) as [string, ...string[]]),
  priority: z.enum(enumValues(PRIORITY) as [string, ...string[]]).optional(),
  assignedTo: z.string().optional(),
  estimatedCost: z.number().min(0).optional(),
  scheduledDate: z.string().datetime().optional(),
  isPreventive: z.boolean().optional(),
  images: z.array(z.string().url()).optional(),
});

export const updateMaintenanceTicketSchema = z.object({
  status: z.enum(enumValues(MAINTENANCE_STATUS) as [string, ...string[]]).optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(enumValues(PRIORITY) as [string, ...string[]]).optional(),
  actualCost: z.number().min(0).optional(),
  scheduledDate: z.string().datetime().optional(),
});

// ─── Asset ───────────────────────────────────────────────
export const createAssetSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  purchaseCost: z.number().min(0).optional(),
  condition: z.enum(enumValues(ASSET_CONDITION) as [string, ...string[]]).optional(),
  location: z.string().optional(),
  warrantyExpiry: z.string().datetime().optional(),
  nextMaintenanceDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();
