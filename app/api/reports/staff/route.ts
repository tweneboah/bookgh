import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import Attendance from "@/models/staff/Attendance";
import StaffPerformance from "@/models/staff/StaffPerformance";
import User from "@/models/user/User";
import { USER_ROLES, ATTENDANCE_STATUS } from "@/constants";
import mongoose from "mongoose";

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
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

    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const branchOid = new mongoose.Types.ObjectId(branchId);

    const [headcount, attendanceTotals, attendanceByUser, performanceSummary] =
      await Promise.all([
        User.countDocuments({ tenantId: tenantOid, branchId: branchOid, isActive: true } as any),
        Attendance.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              date: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalHours: { $sum: "$hoursWorked" },
            },
          },
        ]),
        Attendance.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              date: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: "$userId",
              totalDays: { $sum: 1 },
              presentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.PRESENT] }, 1, 0],
                },
              },
              lateCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.LATE] }, 1, 0],
                },
              },
              absentCount: {
                $sum: {
                  $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.ABSENT] }, 1, 0],
                },
              },
              totalHours: { $sum: "$hoursWorked" },
            },
          },
          { $sort: { totalHours: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              userId: "$_id",
              userName: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$user.firstName", ""] },
                      " ",
                      { $ifNull: ["$user.lastName", ""] },
                    ],
                  },
                },
              },
              totalDays: 1,
              presentCount: 1,
              lateCount: 1,
              absentCount: 1,
              totalHours: { $round: ["$totalHours", 2] },
            },
          },
        ]),
        StaffPerformance.aggregate([
          {
            $match: {
              tenantId: tenantOid,
              branchId: branchOid,
              reviewDate: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: "$userId",
              averageScore: { $avg: "$score" },
              reviews: { $sum: 1 },
            },
          },
          { $sort: { averageScore: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              userId: "$_id",
              userName: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$user.firstName", ""] },
                      " ",
                      { $ifNull: ["$user.lastName", ""] },
                    ],
                  },
                },
              },
              averageScore: { $round: ["$averageScore", 2] },
              reviews: 1,
            },
          },
        ]),
      ]);

    const totals = attendanceTotals.reduce(
      (acc, row) => {
        const key = row._id as string;
        const value = row.count as number;
        if (key === ATTENDANCE_STATUS.PRESENT) acc.present += value;
        if (key === ATTENDANCE_STATUS.LATE) acc.late += value;
        if (key === ATTENDANCE_STATUS.ABSENT) acc.absent += value;
        if (key === ATTENDANCE_STATUS.HALF_DAY) acc.halfDay += value;
        acc.totalRecords += value;
        acc.totalHours += Number(row.totalHours ?? 0);
        return acc;
      },
      {
        present: 0,
        late: 0,
        absent: 0,
        halfDay: 0,
        totalRecords: 0,
        totalHours: 0,
      }
    );

    return successResponse({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      headcount,
      attendance: {
        ...totals,
        averageHoursPerRecord:
          totals.totalRecords > 0
            ? Math.round((totals.totalHours / totals.totalRecords) * 100) / 100
            : 0,
        attendanceRate:
          totals.totalRecords > 0
            ? Math.round(((totals.present + totals.late + totals.halfDay) / totals.totalRecords) * 10000) / 100
            : 0,
      },
      topAttendance: attendanceByUser,
      topPerformance: performanceSummary,
      salarySummary: {
        available: false,
        message: "Payroll module not enabled yet. Salary summary will appear once payroll is added.",
      },
    });
  },
  { auth: true }
);
