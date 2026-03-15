import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES } from "@/constants";
import PlaygroundArea from "@/models/playground/PlaygroundArea";
import PlaygroundBooking from "@/models/playground/PlaygroundBooking";
import PlaygroundMaintenance from "@/models/playground/PlaygroundMaintenance";
import mongoose from "mongoose";

const PLAYGROUND_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const sp = req.nextUrl.searchParams;

    const now = new Date();
    const startDate = sp.get("startDate")
      ? new Date(sp.get("startDate")!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = sp.get("endDate")
      ? new Date(sp.get("endDate")!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const playgroundAreaIdParam = sp.get("playgroundAreaId");
    const areaFilter: Record<string, unknown> = {
      tenantId,
      branchId,
      isActive: true,
    };
    if (
      playgroundAreaIdParam &&
      mongoose.Types.ObjectId.isValid(playgroundAreaIdParam)
    ) {
      areaFilter._id = new mongoose.Types.ObjectId(playgroundAreaIdParam);
    }

    const [areas, bookings, maintenance] = await Promise.all([
      PlaygroundArea.find(areaFilter as any)
        .sort({ name: 1 })
        .select("name type capacity openingTime closingTime status")
        .lean(),
      PlaygroundBooking.find({
        tenantId,
        branchId,
        bookingDate: { $gte: startDate, $lte: endDate },
        status: { $nin: ["cancelled"] },
      } as any)
        .populate("playgroundAreaId", "name type")
        .sort({ bookingDate: 1, startTime: 1 })
        .lean(),
      PlaygroundMaintenance.find({
        tenantId,
        branchId,
        status: { $in: ["scheduled", "inProgress"] },
        $or: [
          { scheduledDate: { $gte: startDate, $lte: endDate } },
          { "recurrence.frequency": { $in: ["daily", "weekly", "monthly"] } },
        ],
      } as any)
        .populate("playgroundAreaId", "name type")
        .select(
          "playgroundAreaId scheduledDate startTime endTime recurrence type description status"
        )
        .lean(),
    ]);

    return successResponse({
      playgroundAreas: areas,
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
