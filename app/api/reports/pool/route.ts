import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES } from "@/constants";
import PoolBooking from "@/models/pool/PoolBooking";
import { POOL_BOOKING_STATUS } from "@/models/pool/PoolBooking";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

function getDateRange(sp: URLSearchParams) {
  const now = new Date();
  const startDate = sp.get("startDate")
    ? new Date(sp.get("startDate")!)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = sp.get("endDate")
    ? new Date(sp.get("endDate")!)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { startDate, endDate };
}

function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const sp = req.nextUrl.searchParams;
    const format = sp.get("format");
    const { startDate, endDate } = getDateRange(sp);

    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const branchOid = new mongoose.Types.ObjectId(branchId);

    const completedStatuses = [
      POOL_BOOKING_STATUS.CONFIRMED,
      POOL_BOOKING_STATUS.CHECKED_IN,
      POOL_BOOKING_STATUS.COMPLETED,
    ];

    if (format === "csv") {
      const bookings = await PoolBooking.find({
        tenantId: tenantOid,
        branchId: branchOid,
        bookingDate: { $gte: startDate, $lte: endDate },
      } as any)
        .populate("poolAreaId", "name type")
        .sort({ bookingDate: 1, startTime: 1 })
        .lean();

      const headers = [
        "Booking Reference",
        "Date",
        "Start Time",
        "End Time",
        "Pool Area",
        "Pool Type",
        "Guest Name",
        "Guest Email",
        "Guest Phone",
        "Guests",
        "Session Type",
        "Add-ons",
        "Status",
        "Amount",
        "Paid",
        "Notes",
      ];
      const rows = (bookings as any[]).map((b) => {
        const area = b.poolAreaId;
        const areaName = area?.name ?? "";
        const areaType = area?.type ?? "";
        const addOnsStr =
          Array.isArray(b.addOns) && b.addOns.length > 0
            ? b.addOns
                .map(
                  (a: { name: string; quantity: number; unitPrice: number }) =>
                    `${a.name} x${a.quantity} @ ${a.unitPrice}`
                )
                .join("; ")
            : "";
        return [
          escapeCsvCell(b.bookingReference),
          escapeCsvCell(b.bookingDate ? new Date(b.bookingDate).toISOString().slice(0, 10) : ""),
          escapeCsvCell(b.startTime),
          escapeCsvCell(b.endTime),
          escapeCsvCell(areaName),
          escapeCsvCell(areaType),
          escapeCsvCell(b.guestName),
          escapeCsvCell(b.guestEmail),
          escapeCsvCell(b.guestPhone),
          escapeCsvCell(b.numberOfGuests),
          escapeCsvCell(b.sessionType),
          escapeCsvCell(addOnsStr),
          escapeCsvCell(b.status),
          escapeCsvCell(b.amount),
          escapeCsvCell(b.paidAmount),
          escapeCsvCell(b.notes),
        ];
      });
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="pool-report-${startDate.toISOString().slice(0, 10)}-${endDate.toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const [revenueByArea, totalStats] = await Promise.all([
      PoolBooking.aggregate([
        {
          $match: {
            tenantId: tenantOid,
            branchId: branchOid,
            bookingDate: { $gte: startDate, $lte: endDate },
            status: { $in: completedStatuses },
          },
        },
        {
          $group: {
            _id: "$poolAreaId",
            totalRevenue: { $sum: "$amount" },
            paidAmount: { $sum: "$paidAmount" },
            bookingCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "pool_areas",
            localField: "_id",
            foreignField: "_id",
            as: "area",
          },
        },
        { $unwind: { path: "$area", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            poolAreaId: "$_id",
            poolAreaName: "$area.name",
            poolAreaType: "$area.type",
            totalRevenue: 1,
            paidAmount: 1,
            bookingCount: 1,
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]),
      PoolBooking.aggregate([
        {
          $match: {
            tenantId: tenantOid,
            branchId: branchOid,
            bookingDate: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $cond: [
                  { $in: ["$status", completedStatuses] },
                  "$amount",
                  0,
                ],
              },
            },
            totalPaid: { $sum: "$paidAmount" },
            totalBookings: { $sum: 1 },
            completedBookings: {
              $sum: {
                $cond: [
                  { $in: ["$status", completedStatuses] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const totals = totalStats[0] ?? {
      totalRevenue: 0,
      totalPaid: 0,
      totalBookings: 0,
      completedBookings: 0,
    };

    return successResponse({
      startDate,
      endDate,
      totalRevenue: totals.totalRevenue ?? 0,
      totalPaid: totals.totalPaid ?? 0,
      totalBookings: totals.totalBookings ?? 0,
      completedBookings: totals.completedBookings ?? 0,
      revenueByPoolArea: revenueByArea,
    });
  },
  { auth: true }
);
