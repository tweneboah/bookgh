import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import PoolArea from "@/models/pool/PoolArea";
import PoolBooking from "@/models/pool/PoolBooking";
import PoolMaintenance from "@/models/pool/PoolMaintenance";
import { POOL_BOOKING_STATUS } from "@/models/pool/PoolBooking";
import { POOL_AREA_STATUS } from "@/models/pool/PoolArea";
import { resolveBranchForDiscoveryId } from "../../resolve-branch";
import mongoose from "mongoose";

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

function generateSlots(
  openMinutes: number,
  closeMinutes: number,
  slotDurationMinutes: number
): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];
  for (let s = openMinutes; s + slotDurationMinutes <= closeMinutes; s += slotDurationMinutes) {
    const e = s + slotDurationMinutes;
    const h1 = Math.floor(s / 60);
    const m1 = s % 60;
    const h2 = Math.floor(e / 60);
    const m2 = e % 60;
    slots.push({
      start: `${String(h1).padStart(2, "0")}:${String(m1).padStart(2, "0")}`,
      end: `${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}`,
    });
  }
  return slots;
}

function isDateInRecurrence(
  date: Date,
  maintenanceStart: Date,
  recurrence?: { frequency: string; interval?: number; endDate?: Date } | null
): boolean {
  if (!recurrence || recurrence.frequency === "none") return false;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(maintenanceStart.getFullYear(), maintenanceStart.getMonth(), maintenanceStart.getDate());
  if (d < start) return false;
  if (recurrence.endDate && d > new Date(recurrence.endDate)) return false;
  if (recurrence.frequency === "daily") return true;
  if (recurrence.frequency === "weekly") {
    const interval = recurrence.interval ?? 1;
    const diffDays = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return diffDays % (7 * interval) === 0;
  }
  if (recurrence.frequency === "monthly") return d.getDate() === start.getDate();
  return false;
}

/**
 * Public pool availability by date for a hotel (tenant/branch).
 * No auth. Used by the tenant's public site for pool booking.
 */
export const GET = withHandler(
  async (req: NextRequest, { params }) => {
    const { id } = params;
    const sp = req.nextUrl.searchParams;
    const poolAreaIdParam = sp.get("poolAreaId");
    const dateParam = sp.get("date");
    const slotDurationMinutes = Math.min(120, Math.max(15, parseInt(sp.get("slotDurationMinutes") ?? "60", 10) || 60));

    if (!dateParam) {
      throw new BadRequestError("Query parameter 'date' (YYYY-MM-DD) is required");
    }

    const date = new Date(dateParam + "T00:00:00.000Z");
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestError("Invalid date");
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (date < now) {
      throw new BadRequestError("Date cannot be in the past");
    }

    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const resolved = await resolveBranchForDiscoveryId(id);
    if (!resolved) throw new NotFoundError("Hotel");
    const { branch } = resolved;
    const tenantOid = branch.tenantId;
    const branchOid = branch._id;

    const areaFilter: Record<string, unknown> = {
      tenantId: tenantOid,
      branchId: branchOid,
      isActive: true,
      status: POOL_AREA_STATUS.OPEN,
      _bypassTenantCheck: true,
    };
    if (poolAreaIdParam && mongoose.Types.ObjectId.isValid(poolAreaIdParam)) {
      areaFilter._id = new mongoose.Types.ObjectId(poolAreaIdParam);
    }

    const areas = await PoolArea.find(areaFilter as any).lean();
    if (areas.length === 0) {
      return successResponse({ date: dateParam, poolAreas: [], availableSlots: {} });
    }

    const areaIds = areas.map((a: any) => a._id);
    const activeStatuses = [
      POOL_BOOKING_STATUS.PENDING,
      POOL_BOOKING_STATUS.CONFIRMED,
      POOL_BOOKING_STATUS.CHECKED_IN,
    ];

    const [bookings, maintenanceList] = await Promise.all([
      PoolBooking.find({
        tenantId: tenantOid,
        branchId: branchOid,
        poolAreaId: { $in: areaIds },
        bookingDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: activeStatuses },
        _bypassTenantCheck: true,
      } as any)
        .select("poolAreaId startTime endTime numberOfGuests")
        .lean(),
      PoolMaintenance.find({
        tenantId: tenantOid,
        branchId: branchOid,
        poolAreaId: { $in: areaIds },
        status: { $in: ["scheduled", "inProgress"] },
        $or: [
          { scheduledDate: { $gte: dayStart, $lte: dayEnd } },
          { "recurrence.frequency": { $in: ["daily", "weekly", "monthly"] } },
        ],
        _bypassTenantCheck: true,
      } as any)
        .select("poolAreaId scheduledDate startTime endTime recurrence")
        .lean(),
    ]);

    const availableSlots: Record<string, Array<{ start: string; end: string; availableCapacity: number }>> = {};

    for (const area of areas) {
      const a = area as any;
      const openMinutes = a.openingTime ? timeToMinutes(a.openingTime) : 0;
      const closeMinutes = a.closingTime ? timeToMinutes(a.closingTime) : 24 * 60;
      const capacity = a.capacity ?? 0;

      const areaBookings = bookings.filter((b: any) => String(b.poolAreaId) === String(a._id));
      const areaMaintenance = maintenanceList.filter((m: any) => {
        if (String(m.poolAreaId) !== String(a._id)) return false;
        const sched = m.scheduledDate ? new Date(m.scheduledDate) : null;
        if (sched && dayStart <= sched && sched <= dayEnd) return true;
        if (m.recurrence && sched) return isDateInRecurrence(dayStart, sched, m.recurrence);
        return false;
      });

      const allSlots = generateSlots(openMinutes, closeMinutes, slotDurationMinutes);
      const available: Array<{ start: string; end: string; availableCapacity: number }> = [];

      for (const slot of allSlots) {
        const overlapsBooking = areaBookings.some((b: any) =>
          timeRangesOverlap(slot.start, slot.end, b.startTime, b.endTime)
        );
        if (overlapsBooking) continue;

        const maintenanceBlocksSlot = areaMaintenance.some((m: any) => {
          const mStart = m.startTime ? timeToMinutes(m.startTime) : 0;
          const mEnd = m.endTime ? timeToMinutes(m.endTime) : 24 * 60;
          const s = timeToMinutes(slot.start);
          const e = timeToMinutes(slot.end);
          return s < mEnd && mStart < e;
        });
        if (maintenanceBlocksSlot) continue;

        const usedInSlot = areaBookings
          .filter((b: any) => timeRangesOverlap(slot.start, slot.end, b.startTime, b.endTime))
          .reduce((sum: number, b: any) => sum + (b.numberOfGuests ?? 0), 0);
        const availableCapacity = Math.max(0, capacity - usedInSlot);
        if (availableCapacity > 0) {
          available.push({ ...slot, availableCapacity });
        }
      }

      availableSlots[String(a._id)] = available;
    }

    return successResponse({
      date: dateParam,
      poolAreas: areas.map((a: any) => ({
        _id: a._id,
        name: a.name,
        type: a.type,
        capacity: a.capacity,
        openingTime: a.openingTime,
        closingTime: a.closingTime,
        hourlyRate: a.hourlyRate,
        dailyRate: a.dailyRate,
      })),
      availableSlots,
    });
  },
  { auth: false }
);
