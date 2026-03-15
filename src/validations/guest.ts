import { z } from "zod";
import { enumValues, ID_TYPE, VIP_TIER } from "@/constants";

export const createGuestSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  idType: z.enum(enumValues(ID_TYPE) as [string, ...string[]]).optional(),
  idNumber: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  vipTier: z.enum(enumValues(VIP_TIER) as [string, ...string[]]).optional(),
  preferences: z.object({
    roomPreference: z.string().optional(),
    dietaryRestrictions: z.string().optional(),
    specialNeeds: z.string().optional(),
    floorPreference: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateGuestSchema = createGuestSchema.partial().extend({
  isBlacklisted: z.boolean().optional(),
  blacklistReason: z.string().optional(),
});

export const addGuestNoteSchema = z.object({
  text: z.string().min(1).max(2000),
});
