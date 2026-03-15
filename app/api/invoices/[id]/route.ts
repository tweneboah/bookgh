import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import { updateInvoiceSchema } from "@/validations/billing";
import {
  findInvoiceOneAcross,
  findInvoiceOneAndDeleteAcross,
  findInvoiceOneAndUpdateAcross,
} from "@/lib/department-invoice";

export const GET = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    const department = req.nextUrl.searchParams.get("department");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Invoice");
    }

    const doc = await findInvoiceOneAcross(
      { _id: id, tenantId, branchId },
      department || undefined
    );
    if (!doc) {
      throw new NotFoundError("Invoice");
    }

    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    const department = req.nextUrl.searchParams.get("department");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Invoice");
    }

    const body = await req.json();
    const data = updateInvoiceSchema.parse(body);

    const updatePayload: Record<string, unknown> = { ...data };
    if (data.dueDate !== undefined) {
      updatePayload.dueDate = new Date(data.dueDate);
    }

    const doc = await findInvoiceOneAndUpdateAcross(
      { _id: id, tenantId, branchId },
      { $set: updatePayload },
      department || undefined
    );

    if (!doc) {
      throw new NotFoundError("Invoice");
    }

    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    const department = req.nextUrl.searchParams.get("department");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Invoice");
    }

    const doc = await findInvoiceOneAndDeleteAcross(
      { _id: id, tenantId, branchId },
      department || undefined
    );
    if (!doc) {
      throw new NotFoundError("Invoice");
    }

    return noContentResponse();
  },
  { auth: true }
);
