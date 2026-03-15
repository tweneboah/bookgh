import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import Booking from "@/models/booking/Booking";
import CorporateAccount from "@/models/booking/CorporateAccount";
import RoomCharge from "@/models/booking/RoomCharge";
import { BOOKING_SOURCE, DEPARTMENT } from "@/constants";
import mongoose from "mongoose";
import { getPaymentModelsForQuery } from "@/lib/department-ledger";
import { getInvoiceModelForDepartment } from "@/lib/department-invoice";

export const GET = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    const InvoiceModel = getInvoiceModelForDepartment(DEPARTMENT.ACCOMMODATION);
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Booking");

    const booking = await Booking.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any)
      .populate("guestId")
      .populate("roomId")
      .populate("roomCategoryId")
      .lean();

    if (!booking) throw new NotFoundError("Booking");

    const [charges, payments, invoices] = await Promise.all([
      RoomCharge.find({ tenantId, branchId, bookingId: id } as any)
        .sort({ createdAt: 1 })
        .populate("addedBy", "firstName lastName")
        .lean(),
      (async () => {
        const invoiceIds = (
          await InvoiceModel.find({ tenantId, branchId, bookingId: id } as any)
            .select("_id")
            .lean()
        ).map((inv) => inv._id);
        if (invoiceIds.length === 0) return [];
        const rows = await Promise.all(
          getPaymentModelsForQuery(DEPARTMENT.ACCOMMODATION).map((model) =>
            model
              .find({ tenantId, branchId, invoiceId: { $in: invoiceIds } } as any)
              .lean()
          )
        );
        return rows.flat();
      })(),
      InvoiceModel.find({ tenantId, branchId, bookingId: id } as any).lean(),
    ]);

    const roomChargesTotal = charges.reduce((s, c) => s + c.totalAmount, 0);
    const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);

    let roomRate = booking.totalAmount || 0;
    let corporateDiscountRate = 0;
    let corporateBaseRate = 0;
    if (
      booking.source === BOOKING_SOURCE.CORPORATE &&
      booking.corporateAccountId &&
      booking.roomCategoryId
    ) {
      const corporate = await CorporateAccount.findOne({
        _id: booking.corporateAccountId,
        tenantId,
        branchId,
      } as any)
        .select("negotiatedRate")
        .lean();

      const roomCategory = booking.roomCategoryId as any;
      const basePrice =
        typeof roomCategory?.basePrice === "number" ? roomCategory.basePrice : 0;

      if (corporate && basePrice > 0) {
        corporateDiscountRate = corporate.negotiatedRate ?? 0;
        corporateBaseRate = basePrice;
        const nights =
          booking.numberOfNights && booking.numberOfNights > 0
            ? booking.numberOfNights
            : Math.max(
                1,
                Math.ceil(
                  (new Date(booking.checkOutDate).getTime() -
                    new Date(booking.checkInDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );
        roomRate = Number(
          (basePrice * (1 - corporateDiscountRate / 100) * nights).toFixed(2)
        );
      }
    }
    const earlyCheckInFee = booking.earlyCheckInFee || 0;
    const lateCheckOutFee = booking.lateCheckOutFee || 0;
    const damageCharges = booking.damageCharges || 0;
    const depositPaid = booking.depositPaid || 0;

    const totalCharges =
      roomRate +
      earlyCheckInFee +
      lateCheckOutFee +
      damageCharges +
      roomChargesTotal;

    const totalCredits = depositPaid + totalPayments;
    const balanceDue = totalCharges - totalCredits;

    return successResponse({
      booking,
      roomCharges: charges,
      payments,
      invoices,
      summary: {
        roomRate,
        corporateBaseRate,
        corporateDiscountRate,
        earlyCheckInFee,
        lateCheckOutFee,
        damageCharges,
        roomChargesTotal,
        totalCharges,
        depositPaid,
        totalPayments,
        totalCredits,
        balanceDue,
      },
    });
  },
  { auth: true }
);
