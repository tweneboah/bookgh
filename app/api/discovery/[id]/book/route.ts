import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { createdResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { z } from "zod";
import Room from "@/models/room/Room";
import { resolveBranchForDiscoveryId } from "../../resolve-branch";
import RoomCategory from "@/models/room/RoomCategory";
import Booking from "@/models/booking/Booking";
import Guest from "@/models/booking/Guest";

const publicBookingSchema = z.object({
  roomCategoryId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  numberOfGuests: z.number().int().positive().default(1),
  specialRequests: z.string().optional(),
  guest: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
});

function generateBookingRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `BK-${ts}${rand}`;
}

export const POST = withHandler(async (req: NextRequest, { params }) => {
  const { id } = params;
  const body = await req.json();
  const data = publicBookingSchema.parse(body);

  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);
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

  const category = await RoomCategory.findOne({
    _id: data.roomCategoryId,
    branchId: branch._id,
    isActive: true,
    _bypassTenantCheck: true,
  } as any).lean();

  if (!category) throw new NotFoundError("Room category");

  if (data.numberOfGuests > category.maxOccupancy) {
    throw new BadRequestError(
      `Maximum occupancy for ${category.name} is ${category.maxOccupancy} guests`
    );
  }

  const totalRoomsInCategory = await Room.countDocuments({
    branchId: branch._id,
    roomCategoryId: category._id,
    isActive: true,
    _bypassTenantCheck: true,
  } as any);

  const overlappingCount = await Booking.countDocuments({
    branchId: branch._id,
    roomCategoryId: category._id,
    status: { $nin: ["cancelled", "noShow", "checkedOut"] },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
    _bypassTenantCheck: true,
  } as any);

  if (overlappingCount >= totalRoomsInCategory) {
    throw new BadRequestError(
      "No rooms available for the selected dates. Please try different dates."
    );
  }

  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalAmount = category.basePrice * nights;

  let guest: any = await Guest.findOne({
    tenantId: branch.tenantId,
    email: data.guest.email.toLowerCase(),
    _bypassTenantCheck: true,
  } as any).lean();

  if (!guest) {
    guest = await (Guest.create as any)({
      tenantId: branch.tenantId,
      firstName: data.guest.firstName,
      lastName: data.guest.lastName,
      email: data.guest.email.toLowerCase(),
      phone: data.guest.phone,
    });
  }

  const bookingReference = generateBookingRef();

  const hasPaystack = !!(branch as any).paystackConfig?.publicKey &&
    !!(branch as any).paystackConfig?.secretKeyEncrypted;

  if (!hasPaystack) {
    throw new BadRequestError(
      "This hotel is not yet set up to accept online payments. Please contact the hotel directly to complete your reservation."
    );
  }

  const booking = await (Booking.create as any)({
    tenantId: branch.tenantId,
    branchId: branch._id,
    guestId: guest._id,
    roomCategoryId: category._id,
    bookingReference,
    checkInDate,
    checkOutDate,
    numberOfGuests: data.numberOfGuests,
    numberOfNights: nights,
    status: "pending",
    source: "online",
    roomRate: category.basePrice,
    totalAmount,
    specialRequests: data.specialRequests,
  });

  return createdResponse({
    bookingReference: booking.bookingReference,
    hotelName: branch.name,
    roomCategory: category.name,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    numberOfGuests: booking.numberOfGuests,
    numberOfNights: nights,
    roomRate: category.basePrice,
    totalAmount,
    guestName: `${data.guest.firstName} ${data.guest.lastName}`,
    guestEmail: data.guest.email,
    status: booking.status,
    requiresPayment: true,
    paystackPublicKey: (branch as any).paystackConfig.publicKey,
  });
});
