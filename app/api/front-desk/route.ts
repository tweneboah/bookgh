import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import Booking from "@/models/booking/Booking";
import "@/models/booking/Guest";
import Room from "@/models/room/Room";
import "@/models/room/RoomCategory";
import mongoose from "mongoose";
import { getPaymentModelForDepartment } from "@/lib/department-ledger";
import { DEPARTMENT } from "@/constants";

export const GET = withHandler(
  async (_req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const twoDaysAgo = new Date(todayStart);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const tId = new mongoose.Types.ObjectId(tenantId);
    const bId = new mongoose.Types.ObjectId(branchId);
    const base = { tenantId: tId, branchId: bId };

    const populateOpts = [
      { path: "guestId", select: "firstName lastName email phone" },
      { path: "roomId", select: "roomNumber floor" },
      { path: "roomCategoryId", select: "name" },
    ];

    const [
      inHouse,
      arrivingToday,
      departingToday,
      departingTomorrow,
      pendingBookings,
      confirmedBookings,
      overdueCheckouts,
      totalRooms,
      occupiedRooms,
      todaysRevenue,
      upcomingWeek,
      recentBookings,
    ] = await Promise.all([
      Booking.find({ ...base, status: "checkedIn" } as any)
        .populate(populateOpts)
        .sort({ checkOutDate: 1 })
        .lean(),

      Booking.find({
        ...base,
        status: { $in: ["confirmed", "pending"] },
        checkInDate: { $gte: todayStart, $lte: todayEnd },
      } as any)
        .populate(populateOpts)
        .sort({ checkInDate: 1 })
        .lean(),

      Booking.find({
        ...base,
        status: "checkedIn",
        checkOutDate: { $gte: todayStart, $lte: todayEnd },
      } as any)
        .populate(populateOpts)
        .sort({ checkOutDate: 1 })
        .lean(),

      Booking.find({
        ...base,
        status: "checkedIn",
        checkOutDate: { $gt: todayEnd, $lte: tomorrowEnd },
      } as any)
        .populate(populateOpts)
        .sort({ checkOutDate: 1 })
        .lean(),

      Booking.countDocuments({ ...base, status: "pending" } as any),
      Booking.countDocuments({ ...base, status: "confirmed" } as any),

      Booking.find({
        ...base,
        status: "checkedIn",
        checkOutDate: { $lt: todayStart },
      } as any)
        .populate(populateOpts)
        .sort({ checkOutDate: 1 })
        .lean(),

      Room.countDocuments({ ...base, isActive: true } as any),
      Room.countDocuments({
        ...base,
        isActive: true,
        status: "occupied",
      } as any),

      Promise.all(
        [getPaymentModelForDepartment(DEPARTMENT.ACCOMMODATION)].map((model) =>
          model.aggregate([
            {
              $match: {
                tenantId: tId,
                branchId: bId,
                status: "success",
                createdAt: { $gte: todayStart, $lte: todayEnd },
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ])
        )
      ),

      Booking.find({
        ...base,
        status: "confirmed",
        checkInDate: {
          $gt: todayEnd,
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      } as any)
        .populate([
          { path: "guestId", select: "firstName lastName" },
          { path: "roomCategoryId", select: "name" },
        ])
        .sort({ checkInDate: 1 })
        .limit(20)
        .lean(),

      Booking.find({
        ...base,
        createdAt: { $gte: twoDaysAgo },
        status: { $nin: ["cancelled", "noShow"] },
      } as any)
        .populate(populateOpts)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return successResponse({
      stats: {
        inHouseCount: inHouse.length,
        arrivingTodayCount: arrivingToday.length,
        departingTodayCount: departingToday.length,
        pendingBookings,
        confirmedBookings,
        overdueCount: overdueCheckouts.length,
        totalRooms,
        occupiedRooms,
        occupancyRate,
        revenueToday: todaysRevenue
          .flat()
          .reduce((sum, row: any) => sum + (row?.total ?? 0), 0),
      },
      inHouse,
      arrivingToday,
      departingToday,
      departingTomorrow,
      overdueCheckouts,
      upcomingWeek,
      recentBookings,
    });
  },
  { auth: true }
);
