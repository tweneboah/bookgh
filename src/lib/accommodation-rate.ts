/**
 * Accommodation rate resolution: applies pricing rules to room category base price
 * and optional corporate discount. Used for booking creation and quote API.
 */
import { format } from "date-fns";
import { MODIFIER_TYPE } from "@/constants";
import { getPricingRuleModelForDepartment } from "@/lib/department-pricing";
import RoomCategory from "@/models/room/RoomCategory";
import CorporateAccount from "@/models/booking/CorporateAccount";
import mongoose from "mongoose";

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface ResolveRateInput {
  tenantId: string;
  branchId: string;
  roomCategoryId: string;
  checkInDate: Date;
  checkOutDate: Date;
  corporateAccountId?: string | null;
}

export interface RateBreakdownStep {
  ruleId: string;
  ruleName: string;
  modifierType: string;
  modifierValue: number;
  rateBefore: number;
  rateAfter: number;
}

export interface RateBreakdownNight {
  date: string;
  dayLabel: string;
  basePrice: number;
  finalRate: number;
  steps: RateBreakdownStep[];
}

/** One row per distinct rule that matched at least one night (for UI summary). */
export interface AppliedRuleSummary {
  id: string;
  name: string;
  type?: string;
  modifierType: string;
  modifierValue: number;
  modifierLabel: string;
  dateRangeLabel: string;
  daysLabel: string;
  categoryScopeLabel: string;
}

export interface ResolveRateResult {
  roomRatePerNight: number;
  totalAmount: number;
  numberOfNights: number;
  basePrice: number;
  categoryName?: string;
  corporateDiscountRate?: number;
  corporateBaseRate?: number;
  breakdown?: RateBreakdownNight[];
  appliedRulesSummary?: AppliedRuleSummary[];
}

function formatModifierLabel(modifierType: string, modifierValue: number): string {
  if (modifierType === MODIFIER_TYPE.FIXED) {
    const sign = modifierValue >= 0 ? "+" : "";
    return `${sign}${modifierValue.toFixed(2)} GHS (fixed)`;
  }
  const sign = modifierValue >= 0 ? "+" : "";
  return `${sign}${modifierValue}%`;
}

function formatDaysOfWeek(days?: number[] | null): string {
  if (!days?.length) return "Every day";
  return days.map((d) => SHORT_DAYS[d] ?? `Day ${d}`).join(", ");
}

function formatDateRange(start?: Date | null, end?: Date | null): string {
  const sOk = start && !Number.isNaN(new Date(start).getTime());
  const eOk = end && !Number.isNaN(new Date(end).getTime());
  if (!sOk && !eOk) return "Any date (no range set)";
  const s = sOk ? format(new Date(start!), "MMM d, yyyy") : "—";
  const e = eOk ? format(new Date(end!), "MMM d, yyyy") : "—";
  return `${s} – ${e}`;
}

function categoryScopeLabel(
  ruleCategoryId: unknown,
  stayCategoryId: string,
  categoryName: string
): string {
  if (ruleCategoryId == null || ruleCategoryId === "") return "All room categories";
  if (String(ruleCategoryId) === String(stayCategoryId)) {
    return `This category (${categoryName})`;
  }
  return "Specific room category";
}

type RuleDoc = {
  _id: mongoose.Types.ObjectId;
  name: string;
  type?: string;
  modifierType: string;
  modifierValue: number;
  startDate?: Date | null;
  endDate?: Date | null;
  daysOfWeek?: number[];
  roomCategoryId?: mongoose.Types.ObjectId | null;
};

/**
 * Get pricing rules applicable for a given date and optional room category.
 * Rules are sorted by priority descending (higher priority first).
 */
async function getApplicableRules(
  tenantId: string,
  branchId: string,
  roomCategoryId: string,
  date: Date
): Promise<RuleDoc[]> {
  const PricingRuleModel = getPricingRuleModelForDepartment("accommodation");
  const dayOfWeek = date.getDay();
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
  } as Record<string, unknown>)
    .sort({ priority: -1 })
    .select(
      "name modifierType modifierValue type startDate endDate daysOfWeek roomCategoryId priority"
    )
    .lean();

  return (rules as RuleDoc[]).map((r) => ({
    ...r,
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
  const factor = 1 + rule.modifierValue / 100;
  return Number((currentRate * factor).toFixed(2));
}

function buildSummaryEntry(
  r: RuleDoc,
  stayCategoryId: string,
  categoryName: string
): AppliedRuleSummary {
  const id = String(r._id);
  return {
    id,
    name: r.name,
    type: r.type,
    modifierType: r.modifierType,
    modifierValue: r.modifierValue,
    modifierLabel: formatModifierLabel(r.modifierType, r.modifierValue),
    dateRangeLabel: formatDateRange(r.startDate, r.endDate),
    daysLabel: formatDaysOfWeek(r.daysOfWeek),
    categoryScopeLabel: categoryScopeLabel(r.roomCategoryId, stayCategoryId, categoryName),
  };
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
  } as Record<string, unknown>)
    .select("basePrice name")
    .lean();

  if (!category) {
    throw new Error("Room category not found");
  }

  const basePrice = Number((category as { basePrice?: number }).basePrice ?? 0);
  const categoryName = String((category as { name?: string }).name ?? "Room category");
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
      categoryName,
    };
  }

  const breakdown: RateBreakdownNight[] = [];
  let totalForStay = 0;
  const rulesMetaById = new Map<string, RuleDoc>();

  for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
    const nightDate = new Date(d);
    const dateKey = nightDate.toISOString().slice(0, 10);
    const dayLabel = SHORT_DAYS[nightDate.getDay()] ?? "?";
    const rules = await getApplicableRules(tenantId, branchId, roomCategoryId, nightDate);
    let rateForNight = basePrice;
    const steps: RateBreakdownStep[] = [];

    for (const rule of rules) {
      const rateBefore = rateForNight;
      rateForNight = applyRule(rateForNight, rule);
      const id = String(rule._id);
      steps.push({
        ruleId: id,
        ruleName: rule.name,
        modifierType: rule.modifierType,
        modifierValue: rule.modifierValue,
        rateBefore,
        rateAfter: rateForNight,
      });
      if (!rulesMetaById.has(id)) {
        rulesMetaById.set(id, rule);
      }
    }
    rateForNight = Math.max(0, rateForNight);
    totalForStay += rateForNight;
    breakdown.push({
      date: dateKey,
      dayLabel,
      basePrice,
      finalRate: rateForNight,
      steps,
    });
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
    } as Record<string, unknown>)
      .select("negotiatedRate")
      .lean();

    if (corporate && Number((corporate as { negotiatedRate?: number }).negotiatedRate ?? 0) >= 0) {
      corporateDiscountRate = Number((corporate as { negotiatedRate?: number }).negotiatedRate);
      corporateBaseRate = roomRatePerNight;
      const factor = 1 - corporateDiscountRate / 100;
      roomRatePerNight = Number((roomRatePerNight * factor).toFixed(2));
      totalAmount = Number((roomRatePerNight * numberOfNights).toFixed(2));
    }
  }

  const appliedRulesSummary =
    rulesMetaById.size > 0
      ? Array.from(rulesMetaById.values()).map((r) =>
          buildSummaryEntry(r, roomCategoryId, categoryName)
        )
      : undefined;

  return {
    roomRatePerNight,
    totalAmount,
    numberOfNights,
    basePrice,
    categoryName,
    corporateDiscountRate,
    corporateBaseRate,
    breakdown: breakdown.length > 0 ? breakdown : undefined,
    appliedRulesSummary,
  };
}
