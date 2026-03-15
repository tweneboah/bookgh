import { NextResponse } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import Booking from "@/models/booking/Booking";
import Room from "@/models/room/Room";
import RoomCategory from "@/models/room/RoomCategory";
import { USER_ROLES, BOOKING_STATUS } from "@/constants";
import mongoose from "mongoose";

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const sp = req.nextUrl.searchParams;

    const now = new Date();
    const startDate = sp.get("startDate")
      ? new Date(sp.get("startDate")!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = sp.get("endDate")
      ? new Date(sp.get("endDate")!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const baseFilter = { tenantId, branchId } as any;
    const dateFilter = {
      ...baseFilter,
      checkInDate: { $lte: endDate },
      checkOutDate: { $gte: startDate },
    };

    const [
      totalRooms,
      allBookings,
      cancelledCount,
      noShowCount,
    ] = await Promise.all([
      Room.countDocuments({ ...baseFilter, isActive: true }),
      Booking.find(dateFilter).lean(),
      Booking.countDocuments({
        ...dateFilter,
        status: BOOKING_STATUS.CANCELLED,
      }),
      Booking.countDocuments({
        ...dateFilter,
        status: BOOKING_STATUS.NO_SHOW,
      }),
    ]);

    const totalDays = Math.max(
      1,
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    const totalAvailableRoomNights = totalRooms * totalDays;

    const completedStatuses = [
      BOOKING_STATUS.CHECKED_IN,
      BOOKING_STATUS.CHECKED_OUT,
    ];
    const soldBookings = allBookings.filter((b) =>
      completedStatuses.includes(b.status as any)
    );

    const occupiedRoomNights = soldBookings.reduce(
      (sum, b) => sum + (b.numberOfNights || 1),
      0
    );

    const totalRoomRevenue = soldBookings.reduce(
      (sum, b) => sum + (b.totalAmount || 0),
      0
    );

    const occupancyRate = totalAvailableRoomNights
      ? (occupiedRoomNights / totalAvailableRoomNights) * 100
      : 0;

    const adr = occupiedRoomNights
      ? totalRoomRevenue / occupiedRoomNights
      : 0;

    const revpar = totalAvailableRoomNights
      ? totalRoomRevenue / totalAvailableRoomNights
      : 0;

    const totalBookingsCount = allBookings.length;
    const cancellationRate = totalBookingsCount
      ? (cancelledCount / totalBookingsCount) * 100
      : 0;
    const noShowRate = totalBookingsCount
      ? (noShowCount / totalBookingsCount) * 100
      : 0;

    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const branchOid = new mongoose.Types.ObjectId(branchId);

    const revenueByRoom = await Booking.aggregate([
      {
        $match: {
          tenantId: tenantOid,
          branchId: branchOid,
          checkInDate: { $lte: endDate },
          checkOutDate: { $gte: startDate },
          status: { $in: completedStatuses },
          roomId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$roomId",
          revenue: { $sum: "$totalAmount" },
          bookings: { $sum: 1 },
          nights: { $sum: { $ifNull: ["$numberOfNights", 1] } },
        },
      },
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "_id",
          as: "room",
        },
      },
      { $unwind: { path: "$room", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          roomId: "$_id",
          roomNumber: "$room.roomNumber",
          floor: "$room.floor",
          revenue: 1,
          bookings: 1,
          nights: 1,
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    const dailyRevenue = await Booking.aggregate([
      {
        $match: {
          tenantId: tenantOid,
          branchId: branchOid,
          checkInDate: { $lte: endDate },
          checkOutDate: { $gte: startDate },
          status: { $in: completedStatuses },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$checkInDate" },
          },
          revenue: { $sum: "$totalAmount" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          revenue: 1,
          bookings: 1,
        },
      },
    ]);

    const bySource = await Booking.aggregate([
      {
        $match: {
          tenantId: tenantOid,
          branchId: branchOid,
          checkInDate: { $lte: endDate },
          checkOutDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$source", "walkIn"] },
          bookings: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $in: ["$status", completedStatuses] }, "$totalAmount", 0] } },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          source: "$_id",
          bookings: 1,
          revenue: 1,
          _id: 0,
        },
      },
    ]);

    const categories = await RoomCategory.find({ tenantId: tenantOid, branchId: branchOid, isActive: true } as any)
      .select("_id basePrice name")
      .lean();
    const baseByCategory = new Map(
      (categories as any[]).map((c) => [c._id.toString(), c.basePrice ?? 0])
    );
    let totalAchieved = 0;
    let totalBase = 0;
    let rateVarianceCount = 0;
    for (const b of soldBookings) {
      const nights = b.numberOfNights ?? 1;
      const achieved = (b.totalAmount ?? 0) / nights;
      const catId = (b as any).roomCategoryId?.toString?.();
      const base = catId ? baseByCategory.get(catId) ?? 0 : 0;
      if (base > 0 && achieved > 0) {
        totalAchieved += achieved;
        totalBase += base;
        rateVarianceCount += 1;
      }
    }
    const averageAchievedRate = rateVarianceCount ? totalAchieved / rateVarianceCount : 0;
    const averageBaseRate = rateVarianceCount ? totalBase / rateVarianceCount : 0;
    const rateVariancePercent =
      averageBaseRate > 0
        ? Math.round(((averageAchievedRate - averageBaseRate) / averageBaseRate) * 10000) / 100
        : 0;

    const forecastDays: { date: string; occupiedRooms: number; totalRooms: number; occupancyPct: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let d = 0; d < 7; d++) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() + d);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const overlapping = await Booking.countDocuments({
        tenantId: tenantOid,
        branchId: branchOid,
        roomId: { $exists: true, $ne: null },
        status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.NO_SHOW, BOOKING_STATUS.CHECKED_OUT] },
        checkInDate: { $lte: dayEnd },
        checkOutDate: { $gt: dayStart },
      } as any);
      forecastDays.push({
        date: dayStart.toISOString().slice(0, 10),
        occupiedRooms: overlapping,
        totalRooms,
        occupancyPct: totalRooms ? Math.round((overlapping / totalRooms) * 10000) / 100 : 0,
      });
    }

    const formatCsv = sp.get("format") === "csv";
    if (formatCsv) {
      const rows: string[] = [];
      rows.push("Report,Accommodation");
      rows.push(`Period,${startDate.toISOString().slice(0, 10)},${endDate.toISOString().slice(0, 10)}`);
      rows.push("");
      rows.push("KPIs,Value");
      rows.push(`Total Rooms,${totalRooms}`);
      rows.push(`Occupied Room Nights,${occupiedRoomNights}`);
      rows.push(`Total Room Revenue,${totalRoomRevenue.toFixed(2)}`);
      rows.push(`Occupancy %,${occupancyRate.toFixed(2)}`);
      rows.push(`ADR,${adr.toFixed(2)}`);
      rows.push(`RevPAR,${revpar.toFixed(2)}`);
      rows.push(`Cancellation %,${cancellationRate.toFixed(2)}`);
      rows.push(`No-Show %,${noShowRate.toFixed(2)}`);
      rows.push("");
      rows.push("Date,Revenue,Bookings");
      for (const r of dailyRevenue) {
        rows.push(`${r.date},${(r as any).revenue?.toFixed(2) ?? 0},${(r as any).bookings ?? 0}`);
      }
      rows.push("");
      rows.push("Source,Bookings,Revenue");
      for (const r of bySource) {
        rows.push(`${(r as any).source},${(r as any).bookings},${((r as any).revenue ?? 0).toFixed(2)}`);
      }
      const csv = rows.join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="accommodation-report-${startDate.toISOString().slice(0, 10)}-${endDate.toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDays,
      },
      kpis: {
        totalRooms,
        totalAvailableRoomNights,
        occupiedRoomNights,
        totalRoomRevenue: Math.round(totalRoomRevenue * 100) / 100,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        adr: Math.round(adr * 100) / 100,
        revpar: Math.round(revpar * 100) / 100,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        noShowRate: Math.round(noShowRate * 100) / 100,
        totalBookings: totalBookingsCount,
        cancelledBookings: cancelledCount,
        noShowBookings: noShowCount,
      },
      revenueByRoom,
      dailyRevenue,
      bySource,
      rateVariance: {
        averageBaseRate: Math.round(averageBaseRate * 100) / 100,
        averageAchievedRate: Math.round(averageAchievedRate * 100) / 100,
        variancePercent: rateVariancePercent,
      },
      occupancyForecast: forecastDays,
    });
  },
  { auth: true }
);
