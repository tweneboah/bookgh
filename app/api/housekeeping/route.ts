import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import HousekeepingTask from "@/models/housekeeping/HousekeepingTask";
import {
  createHousekeepingTaskSchema,
} from "@/validations/operations";

const SORT_FIELDS = ["status", "priority", "createdAt", "roomId"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const roomId = req.nextUrl.searchParams.get("roomId");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (roomId) filter.roomId = roomId;

    const query = HousekeepingTask.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = HousekeepingTask.countDocuments(
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
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createHousekeepingTaskSchema.parse(body);

    const doc = await HousekeepingTask.create({
      ...data,
      tenantId,
      branchId,
      createdBy: auth.userId,
    } as Record<string, unknown>);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
