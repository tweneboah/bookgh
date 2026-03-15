/**
 * Accommodation rate resolution: applies pricing rules to room category base price
 * and optional corporate discount. Used for booking creation and quote API.
 */
import { MODIFIER_TYPE } from "@/constants";
import { getPricingRuleModelForDepartment } from "@/lib/department-pricing";
import RoomCategory from "@/models/room/RoomCategory";
import CorporateAccount from "@/models/booking/CorporateAccount";
import mongoose from "mongoose";

export interface ResolveRateInput {
  tenantId: string;
  branchId: string;
  roomCategoryId: string;
  checkInDate: Date;
  checkOutDate: Date;
  corporateAccountId?: string | null;
}

export interface ResolveRateResult {
  roomRatePerNight: number;
  totalAmount: number;
  numberOfNights: number;
  basePrice: number;
  corporateDiscountRate?: number;
  corporateBaseRate?: number;
  breakdown?: { date: string; rate: number; rulesApplied: string[] }[];
}

/**
 * Get pricing rules applicable for a given date and optional room category.
 * Rules are sorted by priority descending (higher priority first).
 */
async function getApplicableRules(
  tenantId: string,
  branchId: string,
  roomCategoryId: string,
  date: Date
): Promise<{ name: string; modifierType: string; modifierValue: number }[]> {
  const PricingRuleModel = getPricingRuleModelForDepartment("accommodation");
  const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const rules = await PricingRuleModel.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    branchId: new mongoose.Types.ObjectId(branchId),
    isActive: true,
    $or: [
      { roomCategoryId: { $exists: false } },
      { roomCategoryId: null },
      { roomCategoryId: new mongoose.Types.ObjectId(roomCategoryId) },
    ],
    $and: [
      {
        $or: [
          { startDate: { $exists: false }, endDate: { $exists: false } },
          { startDate: null, endDate: null },
          {
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay },
          },
        ],
      },
      {
        $or: [
          { daysOfWeek: { $exists: false } },
          { daysOfWeek: { $size: 0 } },
          { daysOfWeek: dayOfWeek },
        ],
      },
    ],
  } as any)
    .sort({ priority: -1 })
    .select("name modifierType modifierValue")
    .lean();

  return rules.map((r: any) => ({
    name: r.name ?? "",
    modifierType: r.modifierType ?? MODIFIER_TYPE.PERCENTAGE,
    modifierValue: Number(r.modifierValue ?? 0),
  }));
}

function applyRule(
  currentRate: number,
  rule: { modifierType: string; modifierValue: number }
): number {
  if (rule.modifierType === MODIFIER_TYPE.FIXED) {
    return Number((currentRate + rule.modifierValue).toFixed(2));
  }
  // percentage: e.g. 10 = +10%, -15 = -15%
  const factor = 1 + rule.modifierValue / 100;
  return Number((currentRate * factor).toFixed(2));
}

/**
 * Resolve room rate for a stay: applies pricing rules per night, then optional corporate discount.
 */
export async function resolveRoomRate(input: ResolveRateInput): Promise<ResolveRateResult> {
  const {
    tenantId,
    branchId,
    roomCategoryId,
    checkInDate,
    checkOutDate,
    corporateAccountId,
  } = input;

  const category = await RoomCategory.findOne({
    _id: roomCategoryId,
    tenantId,
    branchId,
    isActive: true,
  } as any)
    .select("basePrice")
    .lean();

  if (!category) {
    throw new Error("Room category not found");
  }

  const basePrice = Number(category.basePrice ?? 0);
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const ms = checkOut.getTime() - checkIn.getTime();
  const numberOfNights = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (numberOfNights <= 0) {
    return {
      roomRatePerNight: basePrice,
      totalAmount: 0,
      numberOfNights: 0,
      basePrice,
    };
  }

  const breakdown: { date: string; rate: number; rulesApplied: string[] }[] = [];
  let totalForStay = 0;

  for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().slice(0, 10);
    const rules = await getApplicableRules(tenantId, branchId, roomCategoryId, new Date(d));
    let rateForNight = basePrice;
    const rulesApplied: string[] = [];
    for (const rule of rules) {
      rateForNight = applyRule(rateForNight, rule);
      rulesApplied.push(rule.name);
    }
    rateForNight = Math.max(0, rateForNight);
    totalForStay += rateForNight;
    breakdown.push({ date: dateKey, rate: rateForNight, rulesApplied });
  }

  let roomRatePerNight = Number((totalForStay / numberOfNights).toFixed(2));
  let totalAmount = Number(totalForStay.toFixed(2));
  let corporateDiscountRate: number | undefined;
  let corporateBaseRate: number | undefined;

  if (corporateAccountId && mongoose.Types.ObjectId.isValid(corporateAccountId)) {
    const corporate = await CorporateAccount.findOne({
      _id: corporateAccountId,
      tenantId,
      branchId,
      status: "active",
    } as any)
      .select("negotiatedRate")
      .lean();

    if (corporate && Number(corporate.negotiatedRate ?? 0) >= 0) {
      corporateDiscountRate = Number(corporate.negotiatedRate);
      corporateBaseRate = roomRatePerNight;
      const factor = 1 - corporateDiscountRate / 100;
      roomRatePerNight = Number((roomRatePerNight * factor).toFixed(2));
      totalAmount = Number((roomRatePerNight * numberOfNights).toFixed(2));
    }
  }

  return {
    roomRatePerNight,
    totalAmount,
    numberOfNights,
    basePrice,
    corporateDiscountRate,
    corporateBaseRate,
    breakdown: breakdown.length > 0 ? breakdown : undefined,
  };
}
