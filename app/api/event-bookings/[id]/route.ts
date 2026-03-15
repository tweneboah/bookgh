import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import EventBooking from "@/models/event/EventBooking";
import { updateEventBookingSchema } from "@/validations/event";
import { USER_ROLES } from "@/constants";
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

function sumChargeValues(charges?: {
  hallRental?: number;
  catering?: number;
  equipment?: number;
  decoration?: number;
  staffing?: number;
  security?: number;
  addOns?: { amount?: number }[];
}) {
  if (!charges) return 0;
  const topLevel =
    Number(charges.hallRental ?? 0) +
    Number(charges.catering ?? 0) +
    Number(charges.equipment ?? 0) +
    Number(charges.decoration ?? 0) +
    Number(charges.staffing ?? 0) +
    Number(charges.security ?? 0);
  const addOns = (charges.addOns ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );
  return topLevel + addOns;
}

export const GET = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Event booking");
    }

    const doc = await EventBooking.findOne({ _id: id, tenantId, branchId } as any)
      .populate("eventHallId", "name")
      .populate("equipmentBooked.resourceId", "name type unitPrice priceUnit quantity")
      .lean();
    if (!doc) {
      throw new NotFoundError("Event booking");
    }

    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Event booking");
    }

    const body = await req.json();
    const data = updateEventBookingSchema.parse(body);
    const existing = await EventBooking.findOne({ _id: id, tenantId, branchId } as any).lean();
    if (!existing) {
      throw new NotFoundError("Event booking");
    }

    const lineItems = data.billingLineItems ?? existing.billingLineItems ?? [];
    const expenseItems = data.expenseLineItems ?? existing.expenseLineItems ?? [];
    const charges = data.charges ?? existing.charges;

    const lineRevenue = lineItems.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const chargeRevenue = sumChargeValues(charges as any);
    const fallbackRevenue = Number(
      data.agreedPrice ??
        existing.agreedPrice ??
        data.quotedPrice ??
        existing.quotedPrice ??
        0
    );
    const computedRevenue =
      data.totalRevenue ??
      (lineRevenue > 0
        ? lineRevenue
        : chargeRevenue > 0
          ? chargeRevenue
          : fallbackRevenue);

    const computedExpenses =
      data.totalExpenses ??
      expenseItems.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const customerChargesTotal = expenseItems.reduce(
      (sum, row) =>
        row.chargeToCustomer
          ? sum + Number(row.amountToCharge ?? row.amount ?? 0)
          : sum,
      0
    );
    const finalSettlementPaid = Number(
      data.finalSettlementPaid ?? existing.finalSettlementPaid ?? 0
    );
    const depositPaid = Number(data.depositPaid ?? existing.depositPaid ?? 0);
    const totalAmountDue = computedRevenue + customerChargesTotal;
    const computedOutstanding = Number(
      data.outstandingAmount ?? totalAmountDue - (depositPaid + finalSettlementPaid)
    );
    const totalRevenueForProfit = computedRevenue + customerChargesTotal;
    const computedNetProfit = Number(
      data.netProfit ?? totalRevenueForProfit - computedExpenses
    );
    const commissionRate = Number(data.commissionRate ?? existing.commissionRate ?? 0);
    const commissionAmount = Number(
      data.commissionAmount ?? (commissionRate > 0 ? (computedRevenue * commissionRate) / 100 : 0)
    );

    const installments = data.installments
      ? data.installments.map((row) => ({
          dueDate: new Date(row.dueDate),
          amount: row.amount,
          status: row.status ?? "pending",
          paidDate: row.paidDate ? new Date(row.paidDate) : undefined,
          paymentId: row.paymentId
            ? new mongoose.Types.ObjectId(row.paymentId)
            : undefined,
        }))
      : undefined;

    const expenseLineItemsToSet = expenseItems.map(
      (row: { category?: string; description?: string; amount?: number; chargeToCustomer?: boolean; amountToCharge?: number }) => {
        const charge = !!row.chargeToCustomer;
        const chargeAmount = charge ? Number(row.amountToCharge ?? row.amount ?? 0) : 0;
        return {
          category: row.category ?? "",
          description: row.description ?? "",
          amount: Number(row.amount ?? 0),
          chargeToCustomer: charge,
          amountToCharge: chargeAmount,
        };
      }
    );

    const doc = await EventBooking.findOne({ _id: id, tenantId, branchId } as any);
    if (!doc) {
      throw new NotFoundError("Event booking");
    }

    doc.set("expenseLineItems", expenseLineItemsToSet);
    doc.customerChargesTotal = Math.round(customerChargesTotal * 100) / 100;
    doc.totalRevenue = Math.round(computedRevenue * 100) / 100;
    doc.totalExpenses = Math.round(computedExpenses * 100) / 100;
    doc.outstandingAmount = Math.round(computedOutstanding * 100) / 100;
    doc.netProfit = Math.round(computedNetProfit * 100) / 100;
    doc.commissionAmount = Math.round(commissionAmount * 100) / 100;

    if (data.finalSettledAt) doc.finalSettledAt = new Date(data.finalSettledAt);
    if (data.salesAgentId) doc.salesAgentId = new mongoose.Types.ObjectId(data.salesAgentId) as any;
    if (installments) doc.installments = installments as any;
    if (data.depositPaid != null) doc.depositPaid = data.depositPaid;
    if (data.finalSettlementPaid != null) doc.finalSettlementPaid = data.finalSettlementPaid;
    if (data.status != null) doc.status = data.status as any;
    if (data.agreedPrice != null) doc.agreedPrice = data.agreedPrice;
    if (data.quotedPrice != null) doc.quotedPrice = data.quotedPrice;
    if (data.specialRequests != null) doc.specialRequests = data.specialRequests;
    if (data.cancellationReason != null) doc.cancellationReason = data.cancellationReason;
    if (data.contractUrl != null) doc.contractUrl = data.contractUrl;
    if (data.proposalUrl != null) doc.proposalUrl = data.proposalUrl;
    if (data.quotationNotes != null) doc.quotationNotes = data.quotationNotes;
    if (data.pricingOverrideReason != null) doc.pricingOverrideReason = data.pricingOverrideReason;
    if (data.assignedStaff != null) doc.assignedStaff = data.assignedStaff.map((s: string) => new mongoose.Types.ObjectId(s)) as any;
    if (data.assignedRooms != null) doc.assignedRooms = data.assignedRooms.map((r: string) => new mongoose.Types.ObjectId(r)) as any;
    if (data.equipmentBooked != null) {
      doc.set("equipmentBooked", data.equipmentBooked.map(
        (row: { resourceId: string; quantity: number }) => ({
          resourceId: new mongoose.Types.ObjectId(row.resourceId),
          quantity: row.quantity,
        })
      ));
    }
    if (data.charges != null) doc.charges = data.charges as any;
    if (data.billingLineItems != null) doc.billingLineItems = data.billingLineItems as any;
    if (data.projectedRevenue != null) doc.projectedRevenue = data.projectedRevenue;
    if (data.budgetedCost != null) doc.budgetedCost = data.budgetedCost;
    if (data.commissionRate != null) doc.commissionRate = data.commissionRate;
    if (data.salesAgentId != null) doc.salesAgentId = new mongoose.Types.ObjectId(data.salesAgentId) as any;
    if (data.isRecurringContract != null) doc.isRecurringContract = data.isRecurringContract;
    if (data.recurrencePattern != null) doc.recurrencePattern = data.recurrencePattern;

    await doc.save();

    const out = doc.toObject();

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "eventBooking",
      resourceId: doc._id,
      details: { expenseLineItems: expenseLineItemsToSet, customerChargesTotal: doc.customerChargesTotal, totalRevenue: doc.totalRevenue, totalExpenses: doc.totalExpenses, outstandingAmount: doc.outstandingAmount, netProfit: doc.netProfit },
    } as any);

    return successResponse(out);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Event booking");
    }

    const doc = await EventBooking.findOneAndDelete({ _id: id, tenantId, branchId } as any);
    if (!doc) {
      throw new NotFoundError("Event booking");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "eventBooking",
      resourceId: doc._id,
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
