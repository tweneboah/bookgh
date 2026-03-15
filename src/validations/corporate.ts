import { z } from "zod";
import { enumValues, CORPORATE_STATUS } from "@/constants";

export const createCorporateAccountSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactPerson: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  negotiatedRate: z.number().min(0).max(100),
  creditLimit: z.number().min(0).optional(),
  paymentTerms: z.string().optional(),
  contractStartDate: z.string().datetime().optional(),
  contractEndDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const updateCorporateAccountSchema =
  createCorporateAccountSchema.partial().extend({
    status: z
      .enum(enumValues(CORPORATE_STATUS) as [string, ...string[]])
      .optional(),
  });
