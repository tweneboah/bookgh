import { z } from "zod";
import { enumValues, USER_ROLES } from "@/constants";

export const registerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  phone: z.string().max(50).optional(),
  role: z.enum(enumValues(USER_ROLES) as [string, ...string[]]).optional(),
  tenantId: z.string().optional(),
  branchId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
