import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { BadRequestError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import PoolBooking from "@/models/pool/PoolBooking";
import PoolArea from "@/models/pool/PoolArea";
import PoolMaintenance from "@/models/pool/PoolMaintenance";
import { createPoolBookingSchema } from "@/validations/pool";
import { POOL_BOOKING_STATUS } from "@/models/pool/PoolBooking";
import { POOL_AREA_STATUS } from "@/models/pool/PoolArea";
import mongoose from "mongoose";

const SORT_FIELDS = [
  "bookingDate",
  "startTime",
  "endTime",
  "status",
  "amount",
  "createdAt",
];

const POOL_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

/** Parse "HH:mm" to minutes since midnight for comparison */
function timeToMinutes(t: string): number {
  const [h, m] = t.trim().split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Check if two time ranges overlap (same day) */
function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

function generatePoolBookingReference(): string {
  return `PL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const poolAreaId = req.nextUrl.searchParams.get("poolAreaId");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (poolAreaId) filter.poolAreaId = poolAreaId;

    const query = PoolBooking.find(filter as any)
      .sort(parseSortString(sort, SORT_FIELDS))
      .populate("poolAreaId", "name type capacity");
    const countQuery = PoolBooking.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createPoolBookingSchema.parse(body);

    const poolAreaId = new mongoose.Types.ObjectId(data.poolAreaId);
    const poolArea = await PoolArea.findOne({
      _id: poolAreaId,
      tenantId,
      branchId,
    } as any).lean();
    if (!poolArea) {
      throw new BadRequestError("Pool area not found");
    }
    if (poolArea.status !== POOL_AREA_STATUS.OPEN) {
      throw new BadRequestError(
        `Pool area is not available for booking (status: ${poolArea.status})`
      );
    }

    const bookingDate = new Date(data.bookingDate);
    const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    const startTime = data.startTime.trim();
    const endTime = data.endTime.trim();

    if (poolArea.openingTime || poolArea.closingTime) {
      const open = poolArea.openingTime ? timeToMinutes(poolArea.openingTime) : 0;
      const close = poolArea.closingTime ? timeToMinutes(poolArea.closingTime) : 24 * 60;
      const s = timeToMinutes(startTime);
      const e = timeToMinutes(endTime);
      if (s < open || e > close) {
        throw new BadRequestError(
          `Booking time must be within pool hours (${poolArea.openingTime ?? "00:00"}–${poolArea.closingTime ?? "24:00"})`
        );
      }
    }

    if (data.numberOfGuests > (poolArea.capacity ?? 0)) {
      throw new BadRequestError(
        `Number of guests (${data.numberOfGuests}) exceeds pool capacity (${poolArea.capacity})`
      );
    }

    const dayStart = new Date(bookingDateOnly);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(bookingDateOnly);
    dayEnd.setHours(23, 59, 59, 999);

    const activeStatuses = [
      POOL_BOOKING_STATUS.PENDING,
      POOL_BOOKING_STATUS.CONFIRMED,
      POOL_BOOKING_STATUS.CHECKED_IN,
    ];
    const sameDayBookings = await PoolBooking.find({
      tenantId,
      branchId,
      poolAreaId,
      bookingDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: activeStatuses },
    } as any)
      .select("startTime endTime")
      .lean();

    const hasConflict = sameDayBookings.some((b: { startTime: string; endTime: string }) =>
      timeRangesOverlap(startTime, endTime, b.startTime, b.endTime)
    );
    if (hasConflict) {
      throw new BadRequestError(
        "This time slot overlaps with an existing booking for the same pool area"
      );
    }

    const maintenanceList = await PoolMaintenance.find({
      tenantId,
      branchId,
      poolAreaId,
      status: { $in: ["scheduled", "inProgress"] },
      $or: [
        { scheduledDate: { $gte: dayStart, $lte: dayEnd } },
        { "recurrence.frequency": { $in: ["daily", "weekly", "monthly"] } },
      ],
    } as any)
      .select("scheduledDate startTime endTime recurrence")
      .lean();

    function isDateInRecurrence(
      d: Date,
      start: Date,
      rec?: { frequency?: string; interval?: number; endDate?: Date } | null
    ): boolean {
      if (!rec || !rec.frequency || rec.frequency === "none") return false;
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      if (day < s) return false;
      if (rec.endDate && day > new Date(rec.endDate)) return false;
      if (rec.frequency === "daily") return true;
      if (rec.frequency === "weekly") {
        const interval = rec.interval ?? 1;
        const diffDays = Math.floor((day.getTime() - s.getTime()) / (24 * 60 * 60 * 1000));
        return diffDays % (7 * interval) === 0;
      }
      if (rec.frequency === "monthly") return day.getDate() === s.getDate();
      return false;
    }

    const bookingOverlapsMaintenance = maintenanceList.some((m: any) => {
      const sched = m.scheduledDate ? new Date(m.scheduledDate) : null;
      const applies =
        (sched && sched >= dayStart && sched <= dayEnd) ||
        (m.recurrence && sched && isDateInRecurrence(bookingDateOnly, sched, m.recurrence));
      if (!applies) return false;
      const mStart = m.startTime ? timeToMinutes(m.startTime) : 0;
      const mEnd = m.endTime ? timeToMinutes(m.endTime) : 24 * 60;
      const s = timeToMinutes(startTime);
      const e = timeToMinutes(endTime);
      return s < mEnd && mStart < e;
    });

    if (bookingOverlapsMaintenance) {
      throw new BadRequestError(
        "Pool area has scheduled maintenance in this time slot; please choose another date or time"
      );
    }

    let bookingReference = generatePoolBookingReference();
    let exists = await PoolBooking.exists({
      tenantId,
      branchId,
      bookingReference,
    } as any);
    while (exists) {
      bookingReference = generatePoolBookingReference();
      exists = await PoolBooking.exists({
        tenantId,
        branchId,
        bookingReference,
      } as any);
    }

    const doc = await PoolBooking.create({
      ...data,
      tenantId,
      branchId,
      bookingReference,
      bookingDate: bookingDateOnly,
      createdBy: auth.userId,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "poolBooking",
      resourceId: doc._id,
      details: { bookingReference: doc.bookingReference, guestName: doc.guestName },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
