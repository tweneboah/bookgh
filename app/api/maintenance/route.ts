import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import MaintenanceTicket from "@/models/maintenance/MaintenanceTicket";
import {
  createMaintenanceTicketSchema,
} from "@/validations/operations";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const SORT_FIELDS = ["status", "priority", "scheduledDate", "createdAt"];
const MAINTENANCE_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.MAINTENANCE_MANAGER,
  USER_ROLES.TECHNICIAN,
  USER_ROLES.MAINTENANCE,
  USER_ROLES.ACCOUNTANT,
  USER_ROLES.FINANCE_MANAGER,
  USER_ROLES.HOTEL_OWNER,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...MAINTENANCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const priority = req.nextUrl.searchParams.get("priority");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const query = MaintenanceTicket.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = MaintenanceTicket.countDocuments(
      filter as Record<string, unknown>
    );
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...MAINTENANCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createMaintenanceTicketSchema.parse(body);

    const doc = await MaintenanceTicket.create({
      ...data,
      tenantId,
      branchId,
      reportedBy: auth.userId,
    } as Record<string, unknown>);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "maintenanceTicket",
      resourceId: doc._id,
      details: {
        title: doc.title,
        category: doc.category,
        priority: doc.priority,
      },
    } as Record<string, unknown>);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
