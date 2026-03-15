import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { ConflictError, BadRequestError } from "@/lib/errors";
import Room from "@/models/room/Room";
import Floor from "@/models/room/Floor";
import { createRoomSchema } from "@/validations/room";

const SORT_FIELDS = ["roomNumber", "floor", "status", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const { status, roomCategoryId } = Object.fromEntries(
      req.nextUrl.searchParams.entries()
    );

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (roomCategoryId) filter.roomCategoryId = roomCategoryId;

    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = Room.find(filter as Record<string, unknown>).sort(sortObj).populate("roomCategoryId");
    const countQuery = Room.countDocuments(filter as Record<string, unknown>);
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
    const data = createRoomSchema.parse(body);

    if (data.floor !== undefined) {
      const floor = await Floor.findOne({
        tenantId,
        branchId,
        floorNumber: data.floor,
        isActive: true,
      } as Record<string, unknown>).lean();
      if (!floor) {
        throw new BadRequestError(
          "Floor does not exist or is inactive. Create/activate the floor first."
        );
      }
    }

    const existing = await Room.findOne({
      tenantId,
      branchId,
      roomNumber: data.roomNumber,
    } as Record<string, unknown>).lean();
    if (existing) {
      throw new ConflictError("Room with this number already exists");
    }

    const room = await Room.create({
      ...data,
      tenantId,
      branchId,
    } as Record<string, unknown>);

    return createdResponse(room.toObject());
  },
  { auth: true }
);
