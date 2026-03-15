import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { parsePagination } from "@/lib/pagination";
import User from "@/models/user/User";
import Guest from "@/models/booking/Guest";
import Booking from "@/models/booking/Booking";
import Branch from "@/models/branch/Branch";
import Tenant from "@/models/tenant/Tenant";
import RoomCategory from "@/models/room/RoomCategory";

export const GET = withHandler(
  async (req: NextRequest, { auth }) => {
    const sp = req.nextUrl.searchParams;
    const { page, limit } = parsePagination(sp);
    const skip = (page - 1) * limit;

    const user = await User.findById(auth.userId).select("email").lean();
    if (!user?.email) {
      return successResponse([], 200, {
        pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });
    }

    const guests = await Guest.find({
      email: user.email.toLowerCase(),
      _bypassTenantCheck: true,
    } as any)
      .select("_id")
      .lean();

    if (guests.length === 0) {
      return successResponse([], 200, {
        pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });
    }

    const guestIds = guests.map((g) => g._id);

    const filter = {
      guestId: { $in: guestIds },
      _bypassTenantCheck: true,
    };

    const [bookings, total] = await Promise.all([
      Booking.find(filter as any)
        .populate("branchId", "name slug city country images")
        .populate("roomCategoryId", "name basePrice")
        .populate("guestId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter as any),
    ]);

    const tenantIds = [...new Set(bookings.map((b: any) => b.tenantId?.toString()).filter(Boolean))];
    const tenants = await Tenant.find({ _id: { $in: tenantIds } } as any)
      .select("name logo")
      .lean();

    const tenantMap = new Map(tenants.map((t: any) => [t._id.toString(), t]));

    const results = bookings.map((b: any) => ({
      ...b,
      tenant: tenantMap.get(b.tenantId?.toString()) ?? null,
    }));

    const totalPages = Math.ceil(total / limit);

    return successResponse(results, 200, {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  },
  { auth: true }
);
