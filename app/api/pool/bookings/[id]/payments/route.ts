import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import PoolBooking from "@/models/pool/PoolBooking";
import PoolBookingPayment from "@/models/pool/PoolBookingPayment";
import { createPoolBookingPaymentSchema } from "@/validations/pool";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const POOL_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

export const GET = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pool booking");
    }

    const booking = await PoolBooking.findOne({ _id: id, tenantId, branchId } as any)
      .select("_id")
      .lean();
    if (!booking) {
      throw new NotFoundError("Pool booking");
    }

    const payments = await PoolBookingPayment.find({
      poolBookingId: new mongoose.Types.ObjectId(id),
      tenantId,
      branchId,
    } as any)
      .sort({ paidAt: -1, createdAt: -1 })
      .populate("processedBy", "name email")
      .lean();

    return successResponse(payments);
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pool booking");
    }

    const booking = await PoolBooking.findOne({ _id: id, tenantId, branchId } as any).lean();
    if (!booking) {
      throw new NotFoundError("Pool booking");
    }

    const body = await req.json();
    const data = createPoolBookingPaymentSchema.parse(body);

    const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
    const doc = await PoolBookingPayment.create({
      poolBookingId: new mongoose.Types.ObjectId(id),
      tenantId,
      branchId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paidAt,
      notes: data.notes,
      processedBy: auth.userId,
    } as any);

    const allPayments = await PoolBookingPayment.find({
      poolBookingId: new mongoose.Types.ObjectId(id),
      tenantId,
      branchId,
    } as any)
      .select("amount")
      .lean();

    const paidAmount = allPayments.reduce(
      (s, p) => s + Number(p.amount ?? 0),
      0
    );

    await PoolBooking.updateOne(
      { _id: id, tenantId, branchId } as any,
      {
        $set: {
          paidAmount: Math.round(paidAmount * 100) / 100,
        },
      }
    );

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "poolBookingPayment",
      resourceId: doc._id,
      details: {
        poolBookingId: id,
        amount: doc.amount,
        paymentMethod: doc.paymentMethod,
      },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
