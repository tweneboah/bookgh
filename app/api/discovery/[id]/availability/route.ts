import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import Room from "@/models/room/Room";
import RoomCategory from "@/models/room/RoomCategory";
import Booking from "@/models/booking/Booking";
import { resolveBranchForDiscoveryId } from "../../resolve-branch";

export const GET = withHandler(async (req: NextRequest, { params }) => {
  const { id } = params;
  const sp = req.nextUrl.searchParams;
  const checkIn = sp.get("checkIn");
  const checkOut = sp.get("checkOut");
  const roomCategoryId = sp.get("roomCategoryId");

  if (!checkIn || !checkOut) {
    throw new BadRequestError("checkIn and checkOut dates are required");
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    throw new BadRequestError("Invalid date format");
  }
  if (checkInDate < now) {
    throw new BadRequestError("Check-in date cannot be in the past");
  }
  if (checkOutDate <= checkInDate) {
    throw new BadRequestError("Check-out must be after check-in");
  }

  const resolved = await resolveBranchForDiscoveryId(id);
  if (!resolved) throw new NotFoundError("Hotel");
  const branch = resolved.branch;

  const categoryFilter: Record<string, unknown> = {
    branchId: branch._id,
    isActive: true,
    _bypassTenantCheck: true,
  };
  if (roomCategoryId) categoryFilter._id = roomCategoryId;

  const categories = await RoomCategory.find(categoryFilter as any)
    .select("name basePrice maxOccupancy images")
    .lean();

  const results = await Promise.all(
    categories.map(async (cat) => {
      const totalRooms = await Room.countDocuments({
        branchId: branch._id,
        roomCategoryId: cat._id,
        isActive: true,
        _bypassTenantCheck: true,
      } as any);

      const overlapping = await Booking.find({
        branchId: branch._id,
        roomCategoryId: cat._id,
        status: { $nin: ["cancelled", "noShow"] },
        checkInDate: { $lt: checkOutDate },
        checkOutDate: { $gt: checkInDate },
        _bypassTenantCheck: true,
      } as any)
        .select("roomId")
        .lean();

      const bookedRoomIds = new Set(
        overlapping
          .filter((b) => b.roomId)
          .map((b) => b.roomId!.toString())
      );

      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const available = totalRooms - bookedRoomIds.size;

      return {
        _id: cat._id,
        name: cat.name,
        basePrice: cat.basePrice,
        maxOccupancy: cat.maxOccupancy,
        image: (cat as any).images?.[0]?.url ?? null,
        totalRooms,
        available: Math.max(0, available),
        nights,
        totalPrice: cat.basePrice * nights,
      };
    })
  );

  return successResponse(results);
});
