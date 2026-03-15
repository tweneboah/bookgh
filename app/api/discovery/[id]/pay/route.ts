import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { decrypt } from "@/lib/encryption";
import Booking from "@/models/booking/Booking";
import { resolveBranchForDiscoveryId } from "../../resolve-branch";

export const POST = withHandler(async (req: NextRequest, { params }) => {
  const { id } = params;
  const body = await req.json();
  const { bookingReference, callbackUrl } = body;

  if (!bookingReference) {
    throw new BadRequestError("Booking reference is required");
  }

  const resolved = await resolveBranchForDiscoveryId(id);
  if (!resolved) throw new NotFoundError("Hotel");
  const branch = resolved.branch;

  const config = (branch as any).paystackConfig;
  if (!config?.secretKeyEncrypted || !config?.publicKey) {
    throw new BadRequestError(
      "This hotel has not configured online payments yet. Please contact the hotel directly."
    );
  }

  const booking = await Booking.findOne({
    bookingReference,
    branchId: branch._id,
    status: { $in: ["pending", "confirmed"] },
    _bypassTenantCheck: true,
  } as any).lean();

  if (!booking) throw new NotFoundError("Booking");

  const secretKey = decrypt(config.secretKeyEncrypted);
  const amountInPesewas = Math.round((booking as any).totalAmount * 100);

  const paystackRes = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        amount: amountInPesewas,
        currency: "GHS",
        reference: `${bookingReference}-${Date.now().toString(36)}`,
        callback_url:
          callbackUrl || `${req.nextUrl.origin}/booking/callback`,
        metadata: {
          booking_reference: bookingReference,
          branch_id: branch._id!.toString(),
          tenant_id: branch.tenantId.toString(),
          hotel_name: branch.name,
          custom_fields: [
            {
              display_name: "Booking Reference",
              variable_name: "booking_reference",
              value: bookingReference,
            },
            {
              display_name: "Hotel",
              variable_name: "hotel_name",
              value: branch.name,
            },
          ],
        },
      }),
    }
  );

  const paystackData = await paystackRes.json();

  if (!paystackData.status) {
    console.error("Paystack init error:", paystackData);
    throw new BadRequestError(
      paystackData.message || "Failed to initialize payment"
    );
  }

  await Booking.findOneAndUpdate(
    { bookingReference, _bypassTenantCheck: true } as any,
    {
      $set: {
        "metadata.paystackReference": paystackData.data.reference,
        "metadata.paystackAccessCode": paystackData.data.access_code,
        status: "pending",
      },
    }
  );

  return successResponse({
    authorizationUrl: paystackData.data.authorization_url,
    accessCode: paystackData.data.access_code,
    reference: paystackData.data.reference,
    publicKey: config.publicKey,
  });
});
