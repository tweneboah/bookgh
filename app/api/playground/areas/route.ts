import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import PlaygroundArea from "@/models/playground/PlaygroundArea";
import { createPlaygroundAreaSchema } from "@/validations/playground";

const SORT_FIELDS = [
  "name",
  "type",
  "capacity",
  "status",
  "openingTime",
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
    const q = req.nextUrl.searchParams.get("q");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q, $options: "i" };

    const query = PlaygroundArea.find(filter as any).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = PlaygroundArea.countDocuments(filter as any);
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
    console.log("[Playground Areas API] POST body", { bodyKeys: Object.keys(body), hourlyRate: (body as Record<string, unknown>).hourlyRate, dailyRate: (body as Record<string, unknown>).dailyRate });

    const data = createPlaygroundAreaSchema.parse(body);
    console.log("[Playground Areas API] POST parsed data", { dataKeys: Object.keys(data), hourlyRate: (data as Record<string, unknown>).hourlyRate, dailyRate: (data as Record<string, unknown>).dailyRate });

    const createPayload = { ...data, tenantId, branchId };
    console.log("[Playground Areas API] POST createPayload", { createPayloadKeys: Object.keys(createPayload), hourlyRate: (createPayload as Record<string, unknown>).hourlyRate, dailyRate: (createPayload as Record<string, unknown>).dailyRate });

    const doc = await PlaygroundArea.create(createPayload as any);
    console.log("[Playground Areas API] POST doc after create", { docId: doc._id, hourlyRate: (doc as any).hourlyRate, dailyRate: (doc as any).dailyRate });

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "playgroundArea",
      resourceId: doc._id,
      details: { name: doc.name },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
