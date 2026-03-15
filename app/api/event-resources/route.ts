import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import EventResource from "@/models/event/EventResource";
import { createEventResourceSchema } from "@/validations/event";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const SORT_FIELDS = ["createdAt", "name", "type", "quantity", "unitPrice"];
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
    const { type } = Object.fromEntries(req.nextUrl.searchParams.entries());

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (type) filter.type = type;

    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = EventResource.find(filter as any).sort(sortObj);
    const countQuery = EventResource.countDocuments(filter as any);
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
    const data = createEventResourceSchema.parse(body);

    const doc = await EventResource.create({
      ...data,
      tenantId,
      branchId,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "eventResource",
      resourceId: doc._id,
      details: { name: doc.name, type: doc.type },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
