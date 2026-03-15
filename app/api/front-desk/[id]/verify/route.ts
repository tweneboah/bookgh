import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { requireBranch } from "@/lib/auth-context";
import { decrypt } from "@/lib/encryption";
import Booking from "@/models/booking/Booking";
import Branch from "@/models/branch/Branch";
import {
  getPaymentModelForDepartment,
} from "@/lib/department-ledger";
import { getInvoiceModelForDepartment } from "@/lib/department-invoice";
import { DEPARTMENT } from "@/constants";

function generateInvoiceNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${ts}${rand}`;
}

export const POST = withHandler(
  async (_req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id: bookingId } = params;
    const InvoiceModel = getInvoiceModelForDepartment("accommodation");
    const PaymentModel = getPaymentModelForDepartment(DEPARTMENT.ACCOMMODATION);

    const booking = await Booking.findOne({
      _id: bookingId,
      tenantId,
      branchId,
    } as any);

    if (!booking) throw new NotFoundError("Booking");

    if (booking.status !== "pending") {
      return successResponse({
        verified: true,
        alreadyConfirmed: true,
        status: booking.status,
        bookingReference: booking.bookingReference,
        message:
          booking.status === "confirmed"
            ? "This booking is already confirmed."
            : `Booking status is "${booking.status}".`,
      });
    }

    const reference = (booking.metadata as any)?.paystackReference;
    if (!reference) {
      throw new BadRequestError(
        "No payment reference found for this booking. The guest may not have initiated payment yet."
      );
    }

    const existingPayment = await PaymentModel.findOne({
      paystackReference: reference,
      _bypassTenantCheck: true,
    } as any).lean();

    if (existingPayment) {
      booking.status = "confirmed";
      booking.depositPaid = (existingPayment as any).amount;
      await booking.save();

      return successResponse({
        verified: true,
        alreadyConfirmed: false,
        status: "confirmed",
        bookingReference: booking.bookingReference,
        amountPaid: (existingPayment as any).amount,
        message: "Payment record found. Booking confirmed.",
      });
    }

    const branch = await Branch.findById(branchId).lean();
    if (!branch) throw new NotFoundError("Hotel branch");

    const config = (branch as any).paystackConfig;
    if (!config?.secretKeyEncrypted) {
      throw new BadRequestError("Paystack is not configured for this branch.");
    }

    const secretKey = decrypt(config.secretKeyEncrypted);

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}` },
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return successResponse({
        verified: false,
        status: verifyData.data?.status ?? "failed",
        gatewayResponse: verifyData.data?.gateway_response,
        message:
          verifyData.data?.gateway_response ??
          "Payment has not been completed by the guest.",
      });
    }

    const txData = verifyData.data;
    const amountPaid = txData.amount / 100;

    const doubleCheck = await PaymentModel.findOne({
      paystackReference: reference,
      _bypassTenantCheck: true,
    } as any).lean();

    if (!doubleCheck) {
      const invoice = await (InvoiceModel.create as any)({
        tenantId,
        branchId,
        invoiceNumber: generateInvoiceNumber(),
        bookingId: booking._id,
        guestId: booking.guestId,
        items: [
          {
            description: `Room booking: ${booking.bookingReference}`,
            category: "accommodation",
            quantity: booking.numberOfNights || 1,
            unitPrice: booking.roomRate || amountPaid,
            amount: amountPaid,
          },
        ],
        subtotal: amountPaid,
        totalAmount: amountPaid,
        paidAmount: amountPaid,
        status: "paid",
      });

      await (PaymentModel.create as any)({
        tenantId,
        branchId,
        department: "accommodation",
        invoiceId: invoice._id,
        guestId: booking.guestId,
        amount: amountPaid,
        paymentMethod: "card",
        paystackReference: reference,
        paystackTransactionId: String(txData.id),
        status: "success",
        metadata: {
          channel: txData.channel,
          currency: txData.currency,
          paidAt: txData.paid_at,
          cardType: txData.authorization?.card_type,
          last4: txData.authorization?.last4,
          bank: txData.authorization?.bank,
          source: "admin-verify",
          verifiedBy: auth.userId,
        },
      });
    }

    booking.status = "confirmed";
    booking.depositPaid = amountPaid;
    await booking.save();

    return successResponse({
      verified: true,
      alreadyConfirmed: false,
      status: "confirmed",
      bookingReference: booking.bookingReference,
      amountPaid,
      currency: txData.currency,
      paidAt: txData.paid_at,
      channel: txData.channel,
      message: "Payment verified successfully. Booking confirmed!",
    });
  },
  { auth: true }
);
