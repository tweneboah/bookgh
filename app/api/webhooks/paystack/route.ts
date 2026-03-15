import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import Branch from "@/models/branch/Branch";
import Booking from "@/models/booking/Booking";
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

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const branchId = event.data?.metadata?.branch_id;

    if (!branchId) {
      return NextResponse.json({ received: true });
    }

    await connectDB();

    const branch = await Branch.findById(branchId).lean();
    if (!branch) {
      return NextResponse.json({ received: true });
    }

    const config = (branch as any).paystackConfig;
    if (config?.webhookSecretEncrypted) {
      const webhookSecret = decrypt(config.webhookSecretEncrypted);
      const hash = crypto
        .createHmac("sha512", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (hash !== signature) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else if (config?.secretKeyEncrypted) {
      const secretKey = decrypt(config.secretKeyEncrypted);
      const hash = crypto
        .createHmac("sha512", secretKey)
        .update(rawBody)
        .digest("hex");

      if (hash !== signature) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    if (event.event === "charge.success") {
      const txData = event.data;
      const bookingRef = txData.metadata?.booking_reference;

      if (!bookingRef) {
        return NextResponse.json({ received: true });
      }

      const booking = await Booking.findOne({
        bookingReference: bookingRef,
        branchId: branch._id,
        _bypassTenantCheck: true,
      } as any);

      if (!booking) {
        return NextResponse.json({ received: true });
      }

      const amountPaid = txData.amount / 100;
      const reference = txData.reference;
      const PaymentModel = getPaymentModelForDepartment(DEPARTMENT.ACCOMMODATION);

      const existingPayment = await PaymentModel.findOne({
        paystackReference: reference,
        _bypassTenantCheck: true,
      } as any).lean();

      if (!existingPayment) {
        const InvoiceModel = getInvoiceModelForDepartment("accommodation");
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
            source: "webhook",
          },
        });
      }

      if (booking.status === "pending") {
        booking.status = "confirmed";
        booking.depositPaid = amountPaid;
        await booking.save();
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json({ received: true });
  }
}
