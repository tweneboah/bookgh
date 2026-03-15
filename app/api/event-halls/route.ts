import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import EventHall from "@/models/event/EventHall";
import { createEventHallSchema } from "@/validations/event";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const SORT_FIELDS = ["createdAt", "name", "capacity", "hourlyRate"];
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
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);

    const filter: Record<string, unknown> = { tenantId, branchId };
    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = EventHall.find(filter as any).sort(sortObj);
    const countQuery = EventHall.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createEventHallSchema.parse(body);

    const doc = await EventHall.create({
      ...data,
      tenantId,
      branchId,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "eventHall",
      resourceId: doc._id,
      details: { name: doc.name },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
