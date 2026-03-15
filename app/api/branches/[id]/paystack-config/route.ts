import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireTenant, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import { encrypt, decrypt } from "@/lib/encryption";
import mongoose from "mongoose";
import Branch from "@/models/branch/Branch";
import { paystackConfigSchema } from "@/validations/branch";

export const GET = withHandler(
  async (_req: NextRequest, { auth, params }) => {
    const tenantId = requireTenant(auth);
    requireRoles(auth, [USER_ROLES.TENANT_ADMIN, USER_ROLES.SUPER_ADMIN]);

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Branch");
    }

    const branch = await Branch.findOne({ _id: id, tenantId } as any)
      .select("paystackConfig")
      .lean();

    if (!branch) throw new NotFoundError("Branch");

    const config = (branch as any).paystackConfig;
    return successResponse({
      publicKey: config?.publicKey ?? "",
      hasSecretKey: !!config?.secretKeyEncrypted,
      hasWebhookSecret: !!config?.webhookSecretEncrypted,
    });
  },
  { auth: true }
);

export const PUT = withHandler(
  async (req: NextRequest, { auth, params }) => {
    const tenantId = requireTenant(auth);
    requireRoles(auth, [USER_ROLES.TENANT_ADMIN, USER_ROLES.SUPER_ADMIN]);

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Branch");
    }

    const body = await req.json();
    const data = paystackConfigSchema.parse(body);

    const paystackConfig: Record<string, string> = {
      publicKey: data.publicKey,
      secretKeyEncrypted: encrypt(data.secretKey),
    };

    if (data.webhookSecret) {
      paystackConfig.webhookSecretEncrypted = encrypt(data.webhookSecret);
    }

    const branch = await Branch.findOneAndUpdate(
      { _id: id, tenantId } as any,
      { $set: { paystackConfig } },
      { new: true }
    )
      .select("paystackConfig name")
      .lean();

    if (!branch) throw new NotFoundError("Branch");

    return successResponse({
      publicKey: (branch as any).paystackConfig?.publicKey ?? "",
      hasSecretKey: true,
      hasWebhookSecret: !!data.webhookSecret,
      message: "Paystack configuration saved successfully",
    });
  },
  { auth: true }
);
