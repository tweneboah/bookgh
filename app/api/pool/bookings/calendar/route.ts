import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES } from "@/constants";
import PoolArea from "@/models/pool/PoolArea";
import PoolBooking from "@/models/pool/PoolBooking";
import PoolMaintenance from "@/models/pool/PoolMaintenance";
import mongoose from "mongoose";

const POOL_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const sp = req.nextUrl.searchParams;

    const now = new Date();
    const startDate = sp.get("startDate")
      ? new Date(sp.get("startDate")!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = sp.get("endDate")
      ? new Date(sp.get("endDate")!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const poolAreaIdParam = sp.get("poolAreaId");
    const areaFilter: Record<string, unknown> = { tenantId, branchId, isActive: true };
    if (poolAreaIdParam && mongoose.Types.ObjectId.isValid(poolAreaIdParam)) {
      areaFilter._id = new mongoose.Types.ObjectId(poolAreaIdParam);
    }

    const [areas, bookings, maintenance] = await Promise.all([
      PoolArea.find(areaFilter as any)
        .sort({ name: 1 })
        .select("name type capacity openingTime closingTime status")
        .lean(),
      PoolBooking.find({
        tenantId,
        branchId,
        bookingDate: { $gte: startDate, $lte: endDate },
        status: { $nin: ["cancelled"] },
      } as any)
        .populate("poolAreaId", "name type")
        .sort({ bookingDate: 1, startTime: 1 })
        .lean(),
      PoolMaintenance.find({
        tenantId,
        branchId,
        status: { $in: ["scheduled", "inProgress"] },
        $or: [
          { scheduledDate: { $gte: startDate, $lte: endDate } },
          { "recurrence.frequency": { $in: ["daily", "weekly", "monthly"] } },
        ],
      } as any)
        .populate("poolAreaId", "name type")
        .select("poolAreaId scheduledDate startTime endTime recurrence type description status")
        .lean(),
    ]);

    return successResponse({
      poolAreas: areas,
      bookings,
      maintenance,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  },
  { auth: true }
);
