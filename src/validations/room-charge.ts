import { z } from "zod";
import { enumValues, ROOM_CHARGE_TYPE } from "@/constants";

export const createRoomChargeSchema = z.object({
  chargeType: z.enum(enumValues(ROOM_CHARGE_TYPE) as [string, ...string[]]),
  description: z.string().min(1).max(500),
  unitPrice: z.number().positive(),
  quantity: z.number().int().positive().default(1),
});
