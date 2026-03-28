import "@/models/booking/Booking";
import "@/models/booking/Guest";
import "@/models/user/User";
import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import HousekeepingTask from "@/models/housekeeping/HousekeepingTask";
import Room from "@/models/room/Room";
import {
  createHousekeepingTaskSchema,
} from "@/validations/operations";
import { HOUSEKEEPING_STATUS } from "@/constants";
import mongoose from "mongoose";

const SORT_FIELDS = ["status", "priority", "createdAt", "roomId", "dueAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const roomId = req.nextUrl.searchParams.get("roomId");
    const floor = req.nextUrl.searchParams.get("floor");
    const overdue = req.nextUrl.searchParams.get("overdue");
    const assignedTo = req.nextUrl.searchParams.get("assignedTo");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) filter.roomId = roomId;
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) filter.assignedTo = assignedTo;

    if (overdue === "1" || overdue === "true") {
      filter.status = {
        $in: [HOUSEKEEPING_STATUS.PENDING, HOUSEKEEPING_STATUS.IN_PROGRESS],
      };
      filter.dueAt = { $lt: new Date() };
    }

    if (floor != null && floor !== "" && !Number.isNaN(Number(floor))) {
      const roomIdsOnFloor = await Room.find({
        tenantId,
        branchId,
        floor: Number(floor),
      } as Record<string, unknown>)
        .distinct("_id");
      filter.roomId = { $in: roomIdsOnFloor };
    }

    const query = HousekeepingTask.find(filter as Record<string, unknown>)
      .populate({
        path: "roomId",
        select: "roomNumber floor status roomCategoryId",
        populate: { path: "roomCategoryId", select: "name" },
      })
      .populate({ path: "assignedTo", select: "firstName lastName email" })
      .populate({ path: "inspectedBy", select: "firstName lastName email" })
      .populate({
        path: "bookingId",
        select: "bookingReference checkOutDate",
        populate: { path: "guestId", select: "firstName lastName" },
      })
      .sort(parseSortString(sort, SORT_FIELDS));

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
    const { dueAt: dueAtStr, ...fields } = data;

    const doc = await HousekeepingTask.create({
      ...fields,
      tenantId,
      branchId,
      createdBy: auth.userId,
      ...(dueAtStr ? { dueAt: new Date(dueAtStr) } : {}),
    } as Record<string, unknown>);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
