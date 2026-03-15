import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import EventBooking from "@/models/event/EventBooking";
import EventHall from "@/models/event/EventHall";
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
  async (_req, { auth, params }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Event booking");
    }

    const booking = await EventBooking.findOne({ _id: id, tenantId, branchId } as any)
      .populate("eventHallId")
      .lean();
    if (!booking) {
      throw new NotFoundError("Event booking");
    }

    const hallId = (booking as any).eventHallId?._id ?? (booking as any).eventHallId;
    let hall = null;
    if (hallId) {
      hall = await EventHall.findOne({
        _id: hallId,
        tenantId,
        branchId,
      } as any)
        .select("name description capacity layoutTemplates images")
        .lean();
    }

    return successResponse({ booking, hall });
  },
  { auth: true }
);
