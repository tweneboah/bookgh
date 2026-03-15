import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { BadRequestError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import PlaygroundBooking from "@/models/playground/PlaygroundBooking";
import PlaygroundArea from "@/models/playground/PlaygroundArea";
import PlaygroundMaintenance from "@/models/playground/PlaygroundMaintenance";
import { createPlaygroundBookingSchema } from "@/validations/playground";
import { PLAYGROUND_BOOKING_STATUS } from "@/models/playground/PlaygroundBooking";
import { PLAYGROUND_AREA_STATUS } from "@/models/playground/PlaygroundArea";
import mongoose from "mongoose";

const SORT_FIELDS = [
  "bookingDate",
  "startTime",
  "endTime",
  "status",
  "amount",
  "createdAt",
];

const PLAYGROUND_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

function timeToMinutes(t: string): number {
  const [h, m] = t.trim().split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

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

function generatePlaygroundBookingReference(): string {
  return `PG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const playgroundAreaId = req.nextUrl.searchParams.get("playgroundAreaId");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (playgroundAreaId) filter.playgroundAreaId = playgroundAreaId;

    const query = PlaygroundBooking.find(filter as any)
      .sort(parseSortString(sort, SORT_FIELDS))
      .populate("playgroundAreaId", "name type capacity");
    const countQuery = PlaygroundBooking.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createPlaygroundBookingSchema.parse(body);

    const playgroundAreaId = new mongoose.Types.ObjectId(data.playgroundAreaId);
    const playgroundArea = await PlaygroundArea.findOne({
      _id: playgroundAreaId,
      tenantId,
      branchId,
    } as any).lean();
    if (!playgroundArea) {
      throw new BadRequestError("Playground area not found");
    }
    if (playgroundArea.status !== PLAYGROUND_AREA_STATUS.OPEN) {
      throw new BadRequestError(
        `Playground area is not available for booking (status: ${playgroundArea.status})`
      );
    }
    if (!playgroundArea.isActive) {
      throw new BadRequestError("Playground area is not active");
    }

    const bookingDate = new Date(data.bookingDate);
    const bookingDateOnly = new Date(
      bookingDate.getFullYear(),
      bookingDate.getMonth(),
      bookingDate.getDate()
    );
    const startTime = data.startTime.trim();
    const endTime = data.endTime.trim();

    if (playgroundArea.openingTime || playgroundArea.closingTime) {
      const open = playgroundArea.openingTime
        ? timeToMinutes(playgroundArea.openingTime)
        : 0;
      const close = playgroundArea.closingTime
        ? timeToMinutes(playgroundArea.closingTime)
        : 24 * 60;
      const s = timeToMinutes(startTime);
      const e = timeToMinutes(endTime);
      if (s < open || e > close) {
        throw new BadRequestError(
          `Booking time must be within area hours (${playgroundArea.openingTime ?? "00:00"}–${playgroundArea.closingTime ?? "24:00"})`
        );
      }
    }

    if (data.numberOfGuests > (playgroundArea.capacity ?? 0)) {
      throw new BadRequestError(
        `Number of guests (${data.numberOfGuests}) exceeds area capacity (${playgroundArea.capacity})`
      );
    }

    const dayStart = new Date(bookingDateOnly);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(bookingDateOnly);
    dayEnd.setHours(23, 59, 59, 999);

    const activeStatuses = [
      PLAYGROUND_BOOKING_STATUS.PENDING,
      PLAYGROUND_BOOKING_STATUS.CONFIRMED,
      PLAYGROUND_BOOKING_STATUS.CHECKED_IN,
    ];
    const sameDayBookings = await PlaygroundBooking.find({
      tenantId,
      branchId,
      playgroundAreaId,
      bookingDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: activeStatuses },
    } as any)
      .select("startTime endTime")
      .lean();

    const hasConflict = sameDayBookings.some(
      (b: { startTime: string; endTime: string }) =>
        timeRangesOverlap(startTime, endTime, b.startTime, b.endTime)
    );
    if (hasConflict) {
      throw new BadRequestError(
        "This time slot overlaps with an existing booking for the same playground area"
      );
    }

    const maintenanceList = await PlaygroundMaintenance.find({
      tenantId,
      branchId,
      playgroundAreaId,
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
        const diffDays = Math.floor(
          (day.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)
        );
        return diffDays % (7 * interval) === 0;
      }
      if (rec.frequency === "monthly")
        return day.getDate() === s.getDate();
      return false;
    }

    const bookingOverlapsMaintenance = maintenanceList.some((m: any) => {
      const sched = m.scheduledDate ? new Date(m.scheduledDate) : null;
      const applies =
        (sched && sched >= dayStart && sched <= dayEnd) ||
        (m.recurrence &&
          sched &&
          isDateInRecurrence(bookingDateOnly, sched, m.recurrence));
      if (!applies) return false;
      const mStart = m.startTime ? timeToMinutes(m.startTime) : 0;
      const mEnd = m.endTime ? timeToMinutes(m.endTime) : 24 * 60;
      const s = timeToMinutes(startTime);
      const e = timeToMinutes(endTime);
      return s < mEnd && mStart < e;
    });

    if (bookingOverlapsMaintenance) {
      throw new BadRequestError(
        "Playground area has scheduled maintenance in this time slot; please choose another date or time"
      );
    }

    let bookingReference = generatePlaygroundBookingReference();
    let exists = await PlaygroundBooking.exists({
      tenantId,
      branchId,
      bookingReference,
    } as any);
    while (exists) {
      bookingReference = generatePlaygroundBookingReference();
      exists = await PlaygroundBooking.exists({
        tenantId,
        branchId,
        bookingReference,
      } as any);
    }

    const bookingEndDateOnly =
      data.bookingEndDate != null && data.bookingEndDate !== ""
        ? new Date(
            new Date(data.bookingEndDate).getFullYear(),
            new Date(data.bookingEndDate).getMonth(),
            new Date(data.bookingEndDate).getDate()
          )
        : undefined;

    const createPayload: Record<string, unknown> = {
      ...data,
      tenantId,
      branchId,
      bookingReference,
      bookingDate: bookingDateOnly,
      createdBy: auth.userId,
    };
    if (bookingEndDateOnly !== undefined) {
      createPayload.bookingEndDate = bookingEndDateOnly;
    }
    const doc = await PlaygroundBooking.create(createPayload as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "playgroundBooking",
      resourceId: doc._id,
      details: {
        bookingReference: doc.bookingReference,
        guestName: doc.guestName,
      },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
