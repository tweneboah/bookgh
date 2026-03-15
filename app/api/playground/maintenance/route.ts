import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import PlaygroundMaintenance from "@/models/playground/PlaygroundMaintenance";
import { createPlaygroundMaintenanceSchema } from "@/validations/playground";

const SORT_FIELDS = [
  "scheduledDate",
  "completedAt",
  "type",
  "status",
  "createdAt",
];

const PLAYGROUND_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const playgroundAreaId =
      req.nextUrl.searchParams.get("playgroundAreaId");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (playgroundAreaId) filter.playgroundAreaId = playgroundAreaId;

    const query = PlaygroundMaintenance.find(filter as any)
      .sort(parseSortString(sort, SORT_FIELDS))
      .populate("playgroundAreaId", "name type")
      .populate("playgroundEquipmentId", "name type status")
      .populate("assignedTo", "name email");
    const countQuery = PlaygroundMaintenance.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createPlaygroundMaintenanceSchema.parse(body);

    const doc = await PlaygroundMaintenance.create({
      ...data,
      tenantId,
      branchId,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      recurrence:
        data.recurrence && data.recurrence.frequency !== "none"
          ? {
              ...data.recurrence,
              endDate: data.recurrence.endDate
                ? new Date(data.recurrence.endDate)
                : undefined,
            }
          : undefined,
      createdBy: auth.userId,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "playgroundMaintenance",
      resourceId: doc._id,
      details: { type: doc.type, playgroundAreaId: doc.playgroundAreaId },
    } as any);

    const populated = await PlaygroundMaintenance.findById(doc._id)
      .populate("playgroundAreaId", "name type")
      .populate("playgroundEquipmentId", "name type status")
      .populate("assignedTo", "name email")
      .lean();
    return createdResponse(populated ?? doc.toObject());
  },
  { auth: true }
);
