import { z } from "zod";
import { enumValues, BRANCH_STATUS } from "@/constants";

export const createBranchSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  location: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
  }).optional(),
  googlePlaceId: z.string().optional(),
  landmark: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  manager: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    caption: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })).optional(),
  breakfastIncluded: z.boolean().optional(),
  refundableBooking: z.boolean().optional(),
  operatingHours: z.object({
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
  }).optional(),
  accommodationPolicies: z.object({
    noShowChargeType: z.enum(["none", "oneNight", "fullStay"]).optional(),
    noShowMarkAfterHours: z.number().min(0).optional(),
    cancellationFreeUntilHours: z.number().min(0).optional(),
    cancellationChargeType: z.enum(["none", "oneNight", "percentage", "fullStay"]).optional(),
    cancellationChargeValue: z.number().min(0).max(100).optional(),
    depositType: z.enum(["none", "percentage", "fixed"]).optional(),
    depositValue: z.number().min(0).optional(),
  }).optional(),
  isPublished: z.boolean().optional(),
});

export const updateBranchSchema = createBranchSchema.partial().extend({
  status: z.enum(enumValues(BRANCH_STATUS) as [string, ...string[]]).optional(),
  paystackConfig: z.object({
    publicKey: z.string().optional(),
    secretKey: z.string().optional(),
    webhookSecret: z.string().optional(),
  }).optional(),
});

export const paystackConfigSchema = z.object({
  publicKey: z.string().min(1, "Public key is required"),
  secretKey: z.string().min(1, "Secret key is required"),
  webhookSecret: z.string().optional(),
});
