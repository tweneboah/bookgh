import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import PlaygroundEquipment from "@/models/playground/PlaygroundEquipment";
import { createPlaygroundEquipmentSchema } from "@/validations/playground";

const SORT_FIELDS = [
  "name",
  "type",
  "status",
  "lastInspectionDate",
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
    const type = req.nextUrl.searchParams.get("type");
    const playgroundAreaId = req.nextUrl.searchParams.get("playgroundAreaId");
    const q = req.nextUrl.searchParams.get("q");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (playgroundAreaId) filter.playgroundAreaId = playgroundAreaId;
    if (q) filter.name = { $regex: q, $options: "i" };

    const query = PlaygroundEquipment.find(filter as any)
      .populate("playgroundAreaId", "name type status")
      .sort(parseSortString(sort, SORT_FIELDS));
    const countQuery = PlaygroundEquipment.countDocuments(filter as any);
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
    const data = createPlaygroundEquipmentSchema.parse(body);

    const doc = await PlaygroundEquipment.create({
      ...data,
      tenantId,
      branchId,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "playgroundEquipment",
      resourceId: doc._id,
      details: { name: doc.name, type: doc.type },
    } as any);

    const populated = await PlaygroundEquipment.findById(doc._id)
      .populate("playgroundAreaId", "name type status")
      .lean();
    return createdResponse(populated ?? doc.toObject());
  },
  { auth: true }
);
