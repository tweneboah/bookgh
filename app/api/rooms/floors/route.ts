import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { ConflictError } from "@/lib/errors";
import Room from "@/models/room/Room";
import Floor from "@/models/room/Floor";
import { createFloorSchema } from "@/validations/room";
import mongoose from "mongoose";

interface FloorAggregate {
  _id: number | null;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
  rooms: Array<{
    _id: mongoose.Types.ObjectId;
    roomNumber: string;
    status: string;
    roomCategoryId: mongoose.Types.ObjectId;
  }>;
}

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";

    const floorFilter: Record<string, unknown> = { tenantId, branchId };
    if (!includeInactive) floorFilter.isActive = true;

    const [floors, grouped] = await Promise.all([
      Floor.find(floorFilter as Record<string, unknown>).sort({ floorNumber: 1 }).lean(),
      Room.aggregate<FloorAggregate>([
        {
          $match: {
            tenantId: new mongoose.Types.ObjectId(tenantId),
            branchId: new mongoose.Types.ObjectId(branchId),
            isActive: true,
          },
        },
        {
          $group: {
            _id: "$floor",
            totalRooms: { $sum: 1 },
            availableRooms: {
              $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] },
            },
            occupiedRooms: {
              $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] },
            },
            cleaningRooms: {
              $sum: { $cond: [{ $eq: ["$status", "cleaning"] }, 1, 0] },
            },
            maintenanceRooms: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["maintenance", "outOfService"]] },
                  1,
                  0,
                ],
              },
            },
            rooms: {
              $push: {
                _id: "$_id",
                roomNumber: "$roomNumber",
                status: "$status",
                roomCategoryId: "$roomCategoryId",
              },
            },
          },
        },
      ]),
    ]);

    const groupedMap = new Map<string, FloorAggregate>();
    for (const item of grouped) {
      const key = item._id == null ? "unassigned" : String(item._id);
      groupedMap.set(key, item);
    }

    const overview = floors.map((floor) => {
      const aggregate = groupedMap.get(String(floor.floorNumber));
      return {
        _id: String(floor._id),
        floor: floor.floorNumber,
        floorNumber: floor.floorNumber,
        name: floor.name,
        description: floor.description,
        isActive: floor.isActive,
        totalRooms: aggregate?.totalRooms ?? 0,
        availableRooms: aggregate?.availableRooms ?? 0,
        occupiedRooms: aggregate?.occupiedRooms ?? 0,
        cleaningRooms: aggregate?.cleaningRooms ?? 0,
        maintenanceRooms: aggregate?.maintenanceRooms ?? 0,
        rooms: aggregate?.rooms ?? [],
      };
    });

    const unassigned = groupedMap.get("unassigned");
    if (unassigned) {
      overview.push({
        _id: "unassigned",
        floor: null,
        floorNumber: null,
        name: "Unassigned",
        description: "Rooms without an assigned floor",
        isActive: true,
        totalRooms: unassigned.totalRooms ?? 0,
        availableRooms: unassigned.availableRooms ?? 0,
        occupiedRooms: unassigned.occupiedRooms ?? 0,
        cleaningRooms: unassigned.cleaningRooms ?? 0,
        maintenanceRooms: unassigned.maintenanceRooms ?? 0,
        rooms: unassigned.rooms ?? [],
      });
    }

    return successResponse(overview);
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createFloorSchema.parse(body);

    const existing = await Floor.findOne({
      tenantId,
      branchId,
      floorNumber: data.floorNumber,
    } as Record<string, unknown>).lean();
    if (existing) {
      throw new ConflictError("Floor number already exists");
    }

    const floor = await Floor.create({
      ...data,
      tenantId,
      branchId,
    } as Record<string, unknown>);

    return createdResponse(floor.toObject());
  },
  { auth: true }
);
