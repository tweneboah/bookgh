import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import EventHall from "@/models/event/EventHall";
import EventBooking from "@/models/event/EventBooking";
import { USER_ROLES } from "@/constants";

const CONFERENCE_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.EVENT_MANAGER,
  USER_ROLES.SALES_OFFICER,
  USER_ROLES.OPERATIONS_COORDINATOR,
  USER_ROLES.EVENT_COORDINATOR,
  USER_ROLES.ACCOUNTANT,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const sp = req.nextUrl.searchParams;

    const now = new Date();
    const startDate = sp.get("startDate")
      ? new Date(sp.get("startDate")!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = sp.get("endDate")
      ? new Date(sp.get("endDate")!)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [halls, bookings] = await Promise.all([
      EventHall.find({ tenantId, branchId, isActive: true } as any)
        .sort({ name: 1 })
        .select("_id name capacity")
        .lean(),
      EventBooking.find({
        tenantId,
        branchId,
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
        status: { $nin: ["cancelled"] },
      } as any)
        .populate("eventHallId", "name")
        .lean(),
    ]);

    return successResponse({
      halls,
      bookings,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  },
  { auth: true }
);
