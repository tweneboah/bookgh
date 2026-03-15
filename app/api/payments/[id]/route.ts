import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import { updatePaymentSchema } from "@/validations/billing";
import {
  findPaymentOneAcross,
  findPaymentOneAndUpdateAcross,
} from "@/lib/department-ledger";

export const GET = withHandler(
  async (_req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Payment");
    }

    const doc = await findPaymentOneAcross({ _id: id, tenantId, branchId });
    if (!doc) {
      throw new NotFoundError("Payment");
    }

    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Payment");
    }

    const body = await req.json();
    const data = updatePaymentSchema.parse(body);

    const doc = await findPaymentOneAndUpdateAcross(
      { _id: id, tenantId, branchId },
      { $set: data }
    );

    if (!doc) {
      throw new NotFoundError("Payment");
    }

    return successResponse(doc);
  },
  { auth: true }
);
