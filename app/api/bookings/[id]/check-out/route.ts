import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import Booking from "@/models/booking/Booking";
import CorporateAccount from "@/models/booking/CorporateAccount";
import Room from "@/models/room/Room";
import RoomCategory from "@/models/room/RoomCategory";
import RoomCharge from "@/models/booking/RoomCharge";
import { checkOutSchema } from "@/validations/booking";
import {
  BOOKING_STATUS,
  BOOKING_SOURCE,
  ROOM_STATUS,
  INVOICE_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  DEPARTMENT,
} from "@/constants";
import mongoose from "mongoose";
import {
  getPaymentModelForDepartment,
} from "@/lib/department-ledger";
import { getInvoiceModelForDepartment } from "@/lib/department-invoice";

function generateInvoiceNumber(): string {
  return `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const POST = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Booking");
    }

    const body = await req.json();
    const data = checkOutSchema.parse(body);
    const InvoiceModel = getInvoiceModelForDepartment(DEPARTMENT.ACCOMMODATION);

    const booking = await Booking.findById(id).lean();

    if (
      !booking ||
      String(booking.tenantId) !== tenantId ||
      String(booking.branchId) !== branchId
    ) {
      throw new NotFoundError("Booking");
    }

    if (booking.status !== BOOKING_STATUS.CHECKED_IN) {
      throw new BadRequestError("Booking is not checked in");
    }

    const [roomCharges, existingInvoices] = await Promise.all([
      RoomCharge.find({ tenantId, branchId, bookingId: id } as any).lean(),
      InvoiceModel.find({ tenantId, branchId, bookingId: id } as any)
        .select("_id")
        .lean(),
    ]);

    const invoiceIds = existingInvoices.map((inv) => inv._id);
    const previousPayments = invoiceIds.length
      ? await getPaymentModelForDepartment(DEPARTMENT.ACCOMMODATION)
          .find({
            tenantId,
            branchId,
            invoiceId: { $in: invoiceIds },
            status: PAYMENT_STATUS.SUCCESS,
          } as any)
          .lean()
      : [];

    let roomRate = booking.totalAmount || 0;
    if (
      booking.source === BOOKING_SOURCE.CORPORATE &&
      booking.corporateAccountId &&
      booking.roomCategoryId
    ) {
      const [corporate, roomCategory] = await Promise.all([
        CorporateAccount.findOne({
          _id: booking.corporateAccountId,
          tenantId,
          branchId,
        } as any)
          .select("negotiatedRate")
          .lean(),
        RoomCategory.findOne({
          _id: booking.roomCategoryId,
          tenantId,
          branchId,
        } as any)
          .select("basePrice")
          .lean(),
      ]);

      if (corporate && roomCategory?.basePrice) {
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
          (
            roomCategory.basePrice *
            (1 - (corporate.negotiatedRate ?? 0) / 100) *
            nights
          ).toFixed(2)
        );
      }
    }
    const earlyCheckInFee = booking.earlyCheckInFee || 0;
    const roomChargesTotal = roomCharges.reduce((sum, ch) => sum + (ch.totalAmount || 0), 0);
    const totalPayments = previousPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const depositPaid = booking.depositPaid || 0;

    const previousDamageCharges = booking.damageCharges || 0;
    const previousLateCheckOutFee = booking.lateCheckOutFee || 0;
    const finalDamageCharges = data.damageCharges ?? previousDamageCharges;
    const finalLateCheckOutFee = data.lateCheckOutFee ?? previousLateCheckOutFee;

    const totalCharges =
      roomRate + earlyCheckInFee + finalLateCheckOutFee + finalDamageCharges + roomChargesTotal;
    const totalCredits = depositPaid + totalPayments;
    const finalBalanceDue = totalCharges - totalCredits;

    const updateData: Record<string, unknown> = {
      actualCheckOut: new Date(),
      status: BOOKING_STATUS.CHECKED_OUT,
    };
    if (data.damageCharges !== undefined) {
      updateData.damageCharges = data.damageCharges;
    }
    if (data.lateCheckOutFee !== undefined) {
      updateData.lateCheckOutFee = data.lateCheckOutFee;
    }

    let settlementInvoice: Record<string, unknown> | null = null;
    let settlementPayment: Record<string, unknown> | null = null;

    if (finalBalanceDue > 0) {
      const balanceBeforeCheckoutAdjustments =
        roomRate +
        earlyCheckInFee +
        previousLateCheckOutFee +
        previousDamageCharges +
        roomChargesTotal -
        totalCredits;

      const invoiceItems: Array<{
        description: string;
        category: string;
        quantity: number;
        unitPrice: number;
        amount: number;
      }> = [];

      if (balanceBeforeCheckoutAdjustments > 0) {
        invoiceItems.push({
          description: `Outstanding folio balance (${booking.bookingReference})`,
          category: "accommodation",
          quantity: 1,
          unitPrice: Number(balanceBeforeCheckoutAdjustments.toFixed(2)),
          amount: Number(balanceBeforeCheckoutAdjustments.toFixed(2)),
        });
      }

      if (data.damageCharges && data.damageCharges > 0) {
        invoiceItems.push({
          description: "Damage charges",
          category: "accommodation",
          quantity: 1,
          unitPrice: data.damageCharges,
          amount: data.damageCharges,
        });
      }

      if (data.lateCheckOutFee && data.lateCheckOutFee > 0) {
        invoiceItems.push({
          description: "Late check-out fee",
          category: "accommodation",
          quantity: 1,
          unitPrice: data.lateCheckOutFee,
          amount: data.lateCheckOutFee,
        });
      }

      if (invoiceItems.length === 0) {
        invoiceItems.push({
          description: `Checkout settlement (${booking.bookingReference})`,
          category: "accommodation",
          quantity: 1,
          unitPrice: Number(finalBalanceDue.toFixed(2)),
          amount: Number(finalBalanceDue.toFixed(2)),
        });
      }

      const subtotal = Number(
        invoiceItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
      );

      let invoiceNumber = generateInvoiceNumber();
      let exists = await InvoiceModel.exists({
        tenantId,
        branchId,
        invoiceNumber,
      } as any);
      while (exists) {
        invoiceNumber = generateInvoiceNumber();
        exists = await InvoiceModel.exists({
          tenantId,
          branchId,
          invoiceNumber,
        } as any);
      }

      const invoice = await InvoiceModel.create({
        tenantId,
        branchId,
        department: DEPARTMENT.ACCOMMODATION,
        invoiceNumber,
        bookingId: booking._id,
        guestId: booking.guestId,
        items: invoiceItems,
        subtotal,
        totalAmount: subtotal,
        paidAmount: subtotal,
        status: INVOICE_STATUS.PAID,
        notes: "Auto-generated during checkout reconciliation",
        createdBy: auth.userId,
      } as any);

      const paymentModel = getPaymentModelForDepartment(DEPARTMENT.ACCOMMODATION);
      const payment = await paymentModel.create({
        tenantId,
        branchId,
        department: DEPARTMENT.ACCOMMODATION,
        invoiceId: invoice._id,
        guestId: booking.guestId,
        amount: subtotal,
        paymentMethod: data.paymentMethod ?? PAYMENT_METHOD.CASH,
        status: PAYMENT_STATUS.SUCCESS,
        processedBy: auth.userId,
        metadata: {
          source: "checkout",
          bookingId: String(booking._id),
          bookingReference: booking.bookingReference,
        },
      } as any);

      settlementInvoice = invoice.toObject();
      settlementPayment = payment.toObject();
    }

    if (booking.roomId) {
      await Room.findByIdAndUpdate(booking.roomId, { $set: { status: ROOM_STATUS.CLEANING } });
    }

    await Booking.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

    const updatedBooking = await Booking.findById(id)
      .populate("guestId")
      .populate("roomId")
      .populate("roomCategoryId")
      .lean();

    return successResponse({
      booking: updatedBooking,
      settlementInvoice,
      settlementPayment,
      finalBalanceDue: Number(finalBalanceDue.toFixed(2)),
    });
  },
  { auth: true }
);
