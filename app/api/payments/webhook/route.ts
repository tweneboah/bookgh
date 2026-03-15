import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import crypto from "crypto";
import { INVOICE_STATUS } from "@/constants";
import {
  findPaymentOneAcross,
  findPaymentOneAndUpdateAcross,
} from "@/lib/department-ledger";
import { getInvoiceModelForDepartment } from "@/lib/department-invoice";

export const POST = withHandler(
  async (req: NextRequest) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      throw new BadRequestError("Missing x-paystack-signature header");
    }

    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    if (secret) {
      const computed = crypto
        .createHmac("sha512", secret)
        .update(rawBody)
        .digest("hex");
      if (computed !== signature) {
        throw new BadRequestError("Invalid Paystack signature");
      }
    }

    let payload: { event?: string; data?: { reference?: string; status?: string } };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new BadRequestError("Invalid JSON payload");
    }

    const reference = payload?.data?.reference;
    if (!reference) {
      throw new BadRequestError("Missing reference in webhook payload");
    }

    const payment = await findPaymentOneAcross({ paystackReference: reference });
    if (!payment) {
      throw new BadRequestError("Payment not found for reference");
    }

    const status = payload.data?.status;
    if (status === "success" || status === "failed") {
      await findPaymentOneAndUpdateAcross(
        { _id: payment._id },
        { $set: { status: status === "success" ? "success" : "failed" } }
      );

      if (status === "success") {
        const InvoiceModel = getInvoiceModelForDepartment(
          String((payment as any).department ?? "accommodation")
        );
        const invoice = await InvoiceModel.findById((payment as any).invoiceId);
        if (invoice) {
          const updatedPaidAmount = (invoice.paidAmount ?? 0) + (payment as any).amount;
          const totalAmount = invoice.totalAmount ?? 0;
          const newStatus =
            updatedPaidAmount >= totalAmount ? INVOICE_STATUS.PAID : INVOICE_STATUS.PARTIALLY_PAID;
          await InvoiceModel.findByIdAndUpdate((payment as any).invoiceId, {
            $set: { paidAmount: updatedPaidAmount, status: newStatus },
          });
        }
      }
    }

    return successResponse({ received: true });
  },
  { auth: false }
);
