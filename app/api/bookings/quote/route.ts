import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { findAvailableRoomsForCategoryStay } from "@/lib/booking-availability";
import { resolveRoomRate } from "@/lib/accommodation-rate";
import { getSuggestedDeposit } from "@/lib/accommodation-policies";
import Branch from "@/models/branch/Branch";
import { z } from "zod";

const quoteQuerySchema = z.object({
  checkInDate: z.string().datetime(),
  checkOutDate: z.string().datetime(),
  roomCategoryId: z.string().min(1),
  corporateAccountId: z.string().optional(),
});

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const data = quoteQuerySchema.parse(params);

    const requestedCheckIn = new Date(data.checkInDate);
    const requestedCheckOut = new Date(data.checkOutDate);

    const availableRooms = await findAvailableRoomsForCategoryStay({
      tenantId,
      branchId,
      roomCategoryId: data.roomCategoryId,
      checkInDate: requestedCheckIn,
      checkOutDate: requestedCheckOut,
    });

    const quote = await resolveRoomRate({
      tenantId,
      branchId,
      roomCategoryId: data.roomCategoryId,
      checkInDate: requestedCheckIn,
      checkOutDate: requestedCheckOut,
      corporateAccountId: data.corporateAccountId ?? undefined,
    });

    const branch = await Branch.findOne({ _id: branchId, tenantId } as any)
      .select("accommodationPolicies")
      .lean();
    const suggestedDeposit = getSuggestedDeposit(
      (branch as any)?.accommodationPolicies,
      quote.totalAmount
    );

    return successResponse(
      {
        availableRooms,
        quote: {
          roomRatePerNight: quote.roomRatePerNight,
          totalAmount: quote.totalAmount,
          numberOfNights: quote.numberOfNights,
          basePrice: quote.basePrice,
          categoryName: quote.categoryName,
          corporateDiscountRate: quote.corporateDiscountRate,
          corporateBaseRate: quote.corporateBaseRate,
          suggestedDeposit,
          /** Per-night base → rule steps (modifier + rate after); plus rule scope summary. */
          breakdown: quote.breakdown,
          appliedRulesSummary: quote.appliedRulesSummary,
        },
      },
      200,
      {
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
      }
    );
  },
  { auth: true }
);
