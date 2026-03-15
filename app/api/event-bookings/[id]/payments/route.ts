import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import EventBooking from "@/models/event/EventBooking";
import EventBookingPayment from "@/models/event/EventBookingPayment";
import { createEventBookingPaymentSchema } from "@/validations/event";
import { USER_ROLES } from "@/constants";
import { EVENT_BOOKING_PAYMENT_TYPE } from "@/models/event/EventBookingPayment";
import ActivityLog from "@/models/shared/ActivityLog";

const CONFERENCE_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.EVENT_MANAGER,
  USER_ROLES.SALES_OFFICER,
  USER_ROLES.OPERATIONS_COORDINATOR,
  USER_ROLES.EVENT_COORDINATOR,
  USER_ROLES.ACCOUNTANT,
] as const;

export const GET = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Event booking");
    }

    const booking = await EventBooking.findOne({ _id: id, tenantId, branchId } as any)
      .select("_id")
      .lean();
    if (!booking) {
      throw new NotFoundError("Event booking");
    }

    const payments = await EventBookingPayment.find({
      eventBookingId: new mongoose.Types.ObjectId(id),
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
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Event booking");
    }

    const booking = await EventBooking.findOne({ _id: id, tenantId, branchId } as any).lean();
    if (!booking) {
      throw new NotFoundError("Event booking");
    }

    const body = await req.json();
    const data = createEventBookingPaymentSchema.parse(body);

    const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
    const doc = await EventBookingPayment.create({
      eventBookingId: new mongoose.Types.ObjectId(id),
      tenantId,
      branchId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      type: data.type as "deposit" | "finalSettlement",
      paidAt,
      notes: data.notes,
      processedBy: auth.userId,
    } as any);

    const allPayments = await EventBookingPayment.find({
      eventBookingId: new mongoose.Types.ObjectId(id),
      tenantId,
      branchId,
    } as any)
      .select("type amount")
      .lean();

    const depositPaid = allPayments
      .filter((p) => p.type === EVENT_BOOKING_PAYMENT_TYPE.DEPOSIT)
      .reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const finalSettlementPaid = allPayments
      .filter((p) => p.type === EVENT_BOOKING_PAYMENT_TYPE.FINAL_SETTLEMENT)
      .reduce((s, p) => s + Number(p.amount ?? 0), 0);

    const totalRevenue =
      Number(booking.totalRevenue ?? booking.agreedPrice ?? booking.quotedPrice ?? 0) || 0;
    const storedCharges = Number((booking as any).customerChargesTotal ?? 0) || 0;
    const expenseItems = (booking as any).expenseLineItems ?? [];
    const derivedCharges = expenseItems
      .filter(
        (r: { chargeToCustomer?: boolean; amountToCharge?: number }) =>
          r.chargeToCustomer === true || (r.amountToCharge != null && Number(r.amountToCharge) > 0)
      )
      .reduce(
        (sum: number, r: { amountToCharge?: number; amount?: number }) =>
          sum + Number(r.amountToCharge ?? r.amount ?? 0),
        0
      );
    const customerCharges = Math.max(storedCharges, derivedCharges);
    const totalAmountDue = totalRevenue + customerCharges;
    const outstandingAmount = Math.round(
      Math.max(0, totalAmountDue - (depositPaid + finalSettlementPaid)) * 100
    ) / 100;

    await EventBooking.updateOne(
      { _id: id, tenantId, branchId } as any,
      {
        $set: {
          depositPaid: Math.round(depositPaid * 100) / 100,
          finalSettlementPaid: Math.round(finalSettlementPaid * 100) / 100,
          outstandingAmount,
        },
      }
    );

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "eventBookingPayment",
      resourceId: doc._id,
      details: {
        eventBookingId: id,
        amount: doc.amount,
        type: doc.type,
        paymentMethod: doc.paymentMethod,
      },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
