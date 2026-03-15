import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { createdResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { z } from "zod";
import mongoose from "mongoose";
import PoolArea from "@/models/pool/PoolArea";
import PoolBooking from "@/models/pool/PoolBooking";
import PoolMaintenance from "@/models/pool/PoolMaintenance";
import { POOL_BOOKING_STATUS } from "@/models/pool/PoolBooking";
import { resolveBranchForDiscoveryId } from "../../resolve-branch";

const publicPoolBookingSchema = z.object({
  poolAreaId: z.string().min(1),
  bookingDate: z.string().min(1),
  startTime: z.string().min(1).max(20),
  endTime: z.string().min(1).max(20),
  numberOfGuests: z.number().int().min(1),
  guest: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  notes: z.string().optional(),
});

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

function generatePoolBookingReference(): string {
  return `PL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Public pool booking. No auth. Creates a pending pool booking for the given slot.
 */
export const POST = withHandler(
  async (req: NextRequest, { params }) => {
    const { id } = params;
    const body = await req.json();
    const data = publicPoolBookingSchema.parse(body);

    const resolved = await resolveBranchForDiscoveryId(id);
    if (!resolved) throw new NotFoundError("Hotel");
    const { branch } = resolved;

    const poolAreaId = new mongoose.Types.ObjectId(data.poolAreaId);
    const poolArea = await PoolArea.findOne({
      _id: poolAreaId,
      tenantId: branch.tenantId,
      branchId: branch._id,
      isActive: true,
      status: "open",
      _bypassTenantCheck: true,
    } as any).lean();

    if (!poolArea) throw new NotFoundError("Pool area");

    const bookingDate = new Date(data.bookingDate + "T00:00:00.000Z");
    if (Number.isNaN(bookingDate.getTime())) {
      throw new BadRequestError("Invalid booking date");
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (bookingDate < now) {
      throw new BadRequestError("Booking date cannot be in the past");
    }

    const startTime = data.startTime.trim();
    const endTime = data.endTime.trim();
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      throw new BadRequestError("End time must be after start time");
    }

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

    const dayStart = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    const dayEnd = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate(), 23, 59, 59, 999);

    const activeStatuses = [
      POOL_BOOKING_STATUS.PENDING,
      POOL_BOOKING_STATUS.CONFIRMED,
      POOL_BOOKING_STATUS.CHECKED_IN,
    ];
    const sameDayBookings = await PoolBooking.find({
      tenantId: branch.tenantId,
      branchId: branch._id,
      poolAreaId,
      bookingDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: activeStatuses },
      _bypassTenantCheck: true,
    } as any)
      .select("startTime endTime")
      .lean();

    const hasConflict = sameDayBookings.some((b: { startTime: string; endTime: string }) =>
      timeRangesOverlap(startTime, endTime, b.startTime, b.endTime)
    );
    if (hasConflict) {
      throw new BadRequestError(
        "This time slot is no longer available. Please choose another time."
      );
    }

    const maintenanceList = await PoolMaintenance.find({
      tenantId: branch.tenantId,
      branchId: branch._id,
      poolAreaId,
      status: { $in: ["scheduled", "inProgress"] },
      $or: [
        { scheduledDate: { $gte: dayStart, $lte: dayEnd } },
        { "recurrence.frequency": { $in: ["daily", "weekly", "monthly"] } },
      ],
      _bypassTenantCheck: true,
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
        (m.recurrence && sched && isDateInRecurrence(dayStart, sched, m.recurrence));
      if (!applies) return false;
      const mStart = m.startTime ? timeToMinutes(m.startTime) : 0;
      const mEnd = m.endTime ? timeToMinutes(m.endTime) : 24 * 60;
      const s = timeToMinutes(startTime);
      const e = timeToMinutes(endTime);
      return s < mEnd && mStart < e;
    });

    if (bookingOverlapsMaintenance) {
      throw new BadRequestError(
        "This time slot has scheduled maintenance. Please choose another date or time."
      );
    }

    const hours = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
    const poolAreaAny = poolArea as any;
    let amount = 0;
    if (poolAreaAny.hourlyRate != null && poolAreaAny.hourlyRate > 0) {
      amount = Math.ceil(hours * 100) / 100 * poolAreaAny.hourlyRate;
    } else if (poolAreaAny.dailyRate != null && poolAreaAny.dailyRate > 0) {
      amount = poolAreaAny.dailyRate;
    }

    let bookingReference = generatePoolBookingReference();
    let exists = await PoolBooking.exists({
      tenantId: branch.tenantId,
      branchId: branch._id,
      bookingReference,
      _bypassTenantCheck: true,
    } as any);
    while (exists) {
      bookingReference = generatePoolBookingReference();
      exists = await PoolBooking.exists({
        tenantId: branch.tenantId,
        branchId: branch._id,
        bookingReference,
        _bypassTenantCheck: true,
      } as any);
    }

    const guestName = `${data.guest.firstName} ${data.guest.lastName}`.trim();

    const doc = await (PoolBooking.create as any)({
      tenantId: branch.tenantId,
      branchId: branch._id,
      poolAreaId,
      bookingReference,
      guestName,
      guestEmail: data.guest.email,
      guestPhone: data.guest.phone,
      bookingDate: dayStart,
      startTime,
      endTime,
      numberOfGuests: data.numberOfGuests,
      status: POOL_BOOKING_STATUS.PENDING,
      amount,
      paidAmount: 0,
      notes: data.notes,
    });

    return createdResponse({
      bookingReference: doc.bookingReference,
      poolAreaName: poolArea.name,
      guestName,
      guestEmail: data.guest.email,
      bookingDate: dayStart,
      startTime,
      endTime,
      numberOfGuests: data.numberOfGuests,
      amount,
      status: doc.status,
    });
  },
  { auth: false }
);
