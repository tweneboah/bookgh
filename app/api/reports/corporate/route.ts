import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError } from "@/lib/errors";
import Booking from "@/models/booking/Booking";
import CorporateAccount from "@/models/booking/CorporateAccount";
import { USER_ROLES, BOOKING_SOURCE, BOOKING_STATUS } from "@/constants";
import mongoose from "mongoose";

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.ACCOUNTANT,
      USER_ROLES.FRONT_DESK,
      USER_ROLES.RESERVATION_OFFICER,
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

    const corporateAccountId = sp.get("corporateAccountId");
    if (corporateAccountId && !mongoose.Types.ObjectId.isValid(corporateAccountId)) {
      throw new BadRequestError("Invalid corporate account id");
    }

    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const branchOid = new mongoose.Types.ObjectId(branchId);

    const bookingMatch: Record<string, unknown> = {
      tenantId: tenantOid,
      branchId: branchOid,
      source: BOOKING_SOURCE.CORPORATE,
      checkInDate: { $gte: startDate, $lte: endDate },
    };

    if (corporateAccountId) {
      bookingMatch.corporateAccountId = new mongoose.Types.ObjectId(corporateAccountId);
    }

    const accounts = await Booking.aggregate([
      { $match: bookingMatch },
      {
        $lookup: {
          from: "corporateaccounts",
          localField: "corporateAccountId",
          foreignField: "_id",
          as: "corporate",
        },
      },
      { $unwind: { path: "$corporate", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$corporateAccountId",
          corporateAccountId: { $first: "$corporateAccountId" },
          companyName: { $first: { $ifNull: ["$corporate.companyName", "Unassigned"] } },
          negotiatedRate: { $first: { $ifNull: ["$corporate.negotiatedRate", 0] } },
          currentBalance: { $first: { $ifNull: ["$corporate.currentBalance", 0] } },
          status: { $first: { $ifNull: ["$corporate.status", "unknown"] } },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
          avgBookingValue: { $avg: { $ifNull: ["$totalAmount", 0] } },
          confirmed: {
            $sum: { $cond: [{ $eq: ["$status", BOOKING_STATUS.CONFIRMED] }, 1, 0] },
          },
          checkedIn: {
            $sum: { $cond: [{ $eq: ["$status", BOOKING_STATUS.CHECKED_IN] }, 1, 0] },
          },
          checkedOut: {
            $sum: { $cond: [{ $eq: ["$status", BOOKING_STATUS.CHECKED_OUT] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", BOOKING_STATUS.CANCELLED] }, 1, 0] },
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
      {
        $project: {
          _id: 0,
          corporateAccountId: 1,
          companyName: 1,
          negotiatedRate: { $round: ["$negotiatedRate", 2] },
          currentBalance: { $round: ["$currentBalance", 2] },
          status: 1,
          totalBookings: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          avgBookingValue: { $round: ["$avgBookingValue", 2] },
          confirmed: 1,
          checkedIn: 1,
          checkedOut: 1,
          cancelled: 1,
        },
      },
    ]);

    const dailyTrend = await Booking.aggregate([
      { $match: bookingMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$checkInDate" } },
          bookings: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          bookings: 1,
          revenue: { $round: ["$revenue", 2] },
        },
      },
    ]);

    const kpis = accounts.reduce(
      (acc, item) => ({
        totalBookings: acc.totalBookings + (item.totalBookings ?? 0),
        totalRevenue: acc.totalRevenue + (item.totalRevenue ?? 0),
        totalOutstanding: acc.totalOutstanding + (item.currentBalance ?? 0),
      }),
      { totalBookings: 0, totalRevenue: 0, totalOutstanding: 0 }
    );

    const activeAccounts = await CorporateAccount.countDocuments({
      tenantId: tenantOid,
      branchId: branchOid,
      status: "active",
    } as any);

    const avgBookingValue =
      kpis.totalBookings > 0 ? kpis.totalRevenue / kpis.totalBookings : 0;

    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      filters: {
        corporateAccountId: corporateAccountId ?? null,
      },
      kpis: {
        totalBookings: Math.round(kpis.totalBookings),
        totalRevenue: Math.round(kpis.totalRevenue * 100) / 100,
        totalOutstanding: Math.round(kpis.totalOutstanding * 100) / 100,
        activeAccounts,
        avgBookingValue: Math.round(avgBookingValue * 100) / 100,
      },
      accounts,
      dailyTrend,
    });
  },
  { auth: true }
);
