import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { ConflictError } from "@/lib/errors";
import RoomCategory from "@/models/room/RoomCategory";
import { createRoomCategorySchema } from "@/validations/room";

const SORT_FIELDS = ["name", "basePrice", "maxOccupancy", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const filter = { tenantId, branchId };
    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = RoomCategory.find(filter as Record<string, unknown>).sort(sortObj);
    const countQuery = RoomCategory.countDocuments(filter as Record<string, unknown>);
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
    const data = createRoomCategorySchema.parse(body);

    const existing = await RoomCategory.findOne({
      tenantId,
      branchId,
      name: data.name,
    } as Record<string, unknown>).lean();
    if (existing) {
      throw new ConflictError("Room category with this name already exists");
    }

    const roomCategory = await RoomCategory.create({
      ...data,
      tenantId,
      branchId,
    } as Record<string, unknown>);

    return createdResponse(roomCategory.toObject());
  },
  { auth: true }
);
