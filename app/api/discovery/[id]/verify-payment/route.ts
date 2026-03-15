import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { decrypt } from "@/lib/encryption";
import Booking from "@/models/booking/Booking";
import { resolveBranchForDiscoveryId } from "../../resolve-branch";
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

export const POST = withHandler(async (req: NextRequest, { params }) => {
  const { id } = params;
  const body = await req.json();
  const { reference } = body;
  const InvoiceModel = getInvoiceModelForDepartment("accommodation");
  const PaymentModel = getPaymentModelForDepartment(DEPARTMENT.ACCOMMODATION);

  if (!reference) {
    throw new BadRequestError("Payment reference is required");
  }

  const resolved = await resolveBranchForDiscoveryId(id);
  if (!resolved) throw new NotFoundError("Hotel");
  const branch = resolved.branch;

  const config = (branch as any).paystackConfig;
  if (!config?.secretKeyEncrypted) {
    throw new BadRequestError("Payment not configured for this hotel");
  }

  const secretKey = decrypt(config.secretKeyEncrypted);

  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    }
  );

  const verifyData = await verifyRes.json();

  if (!verifyData.status || verifyData.data?.status !== "success") {
    return successResponse({
      verified: false,
      status: verifyData.data?.status ?? "failed",
      message: verifyData.data?.gateway_response ?? "Payment not verified",
    });
  }

  const txData = verifyData.data;
  const bookingRef = txData.metadata?.booking_reference;

  if (!bookingRef) {
    throw new BadRequestError("No booking reference in payment metadata");
  }

  const booking = await Booking.findOne({
    bookingReference: bookingRef,
    branchId: branch._id,
    _bypassTenantCheck: true,
  } as any);

  if (!booking) throw new NotFoundError("Booking");

  const amountPaid = txData.amount / 100;

  const existingPayment = await PaymentModel.findOne({
    paystackReference: reference,
    _bypassTenantCheck: true,
  } as any).lean();

  if (!existingPayment) {
    const invoice = await (InvoiceModel.create as any)({
      tenantId: branch.tenantId,
      branchId: branch._id,
      invoiceNumber: generateInvoiceNumber(),
      bookingId: booking._id,
      guestId: booking.guestId,
      items: [
        {
          description: `Room booking: ${bookingRef}`,
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
      tenantId: branch.tenantId,
      branchId: branch._id,
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
      },
    });
  }

  if (booking.status === "pending") {
    booking.status = "confirmed";
    booking.depositPaid = amountPaid;
    await booking.save();
  }

  return successResponse({
    verified: true,
    status: "success",
    bookingReference: bookingRef,
    amountPaid,
    currency: txData.currency,
    paidAt: txData.paid_at,
    channel: txData.channel,
    bookingStatus: booking.status,
  });
});
