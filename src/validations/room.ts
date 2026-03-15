import { z } from "zod";
import { enumValues, BED_TYPE, ROOM_STATUS, PRICING_RULE_TYPE, MODIFIER_TYPE } from "@/constants";

export const createRoomCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  maxOccupancy: z.number().int().positive(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    caption: z.string().optional(),
  })).optional(),
  bedType: z.enum(enumValues(BED_TYPE) as [string, ...string[]]).optional(),
  roomSize: z.number().positive().optional(),
});

export const updateRoomCategorySchema = createRoomCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createRoomSchema = z.object({
  roomCategoryId: z.string().min(1),
  roomNumber: z.string().min(1).max(20),
  floor: z.number().int().optional(),
  notes: z.string().optional(),
});

export const updateRoomSchema = createRoomSchema.partial().extend({
  status: z.enum(enumValues(ROOM_STATUS) as [string, ...string[]]).optional(),
  isActive: z.boolean().optional(),
});

export const createFloorSchema = z.object({
  floorNumber: z.number().int().min(0),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const updateFloorSchema = createFloorSchema.partial();

export const createPricingRuleSchema = z.object({
  roomCategoryId: z.string().optional(),
  name: z.string().min(1).max(200),
  type: z.enum(enumValues(PRICING_RULE_TYPE) as [string, ...string[]]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  modifierType: z.enum(enumValues(MODIFIER_TYPE) as [string, ...string[]]),
  modifierValue: z.number(),
  priority: z.number().int().optional(),
});

export const updatePricingRuleSchema = createPricingRuleSchema.partial().extend({
  isActive: z.boolean().optional(),
});
