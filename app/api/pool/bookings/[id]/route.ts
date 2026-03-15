import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import PoolBooking from "@/models/pool/PoolBooking";
import { updatePoolBookingSchema } from "@/validations/pool";
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

    const doc = await PoolBooking.findOne({ _id: id, tenantId, branchId } as any)
      .populate("poolAreaId", "name type capacity")
      .lean();
    if (!doc) {
      throw new NotFoundError("Pool booking");
    }

    // Normalize: ensure expenseLineItems is always an array (older docs may not have the field)
    const d = doc as Record<string, unknown> & { expenseLineItems?: unknown[]; totalExpenses?: number };
    if (!Array.isArray(d.expenseLineItems)) {
      d.expenseLineItems = [];
    }
    if (d.totalExpenses === undefined || d.totalExpenses === null) {
      d.totalExpenses = (d.expenseLineItems as { amount?: number }[]).reduce((s, r) => s + Number(r.amount ?? 0), 0);
    }

    // [PoolExpenses] Debug GET: what we return for this booking
    console.log("[PoolExpenses] GET", {
      id,
      expenseLineItemsLength: d.expenseLineItems.length,
      expenseLineItems: d.expenseLineItems,
      totalExpenses: d.totalExpenses,
    });

    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pool booking");
    }

    const body = await req.json();

    // [PoolExpenses] Debug PATCH: raw body
    console.log("[PoolExpenses] PATCH body (raw)", { id, bodyKeys: Object.keys(body), expenseLineItemsInBody: "expenseLineItems" in body, bodyExpenseLineItems: (body as { expenseLineItems?: unknown }).expenseLineItems });

    const data = updatePoolBookingSchema.parse(body);

    const existing = await PoolBooking.findOne({ _id: id, tenantId, branchId } as any).lean();
    if (!existing) {
      throw new NotFoundError("Pool booking");
    }

    const expenseItems = data.expenseLineItems ?? existing.expenseLineItems ?? [];
    console.log("[PoolExpenses] PATCH after parse", { id, dataExpenseLineItems: data.expenseLineItems, expenseItemsLength: expenseItems.length, totalExpensesFromBody: data.totalExpenses });
    const totalExpenses = data.totalExpenses ?? expenseItems.reduce((sum: number, row: { amount?: number }) => sum + Number(row.amount ?? 0), 0);
    const customerChargesTotal = expenseItems.reduce(
      (sum: number, row: { chargeToCustomer?: boolean; amountToCharge?: number; amount?: number }) =>
        row.chargeToCustomer ? sum + Number(row.amountToCharge ?? row.amount ?? 0) : sum,
      0
    );

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

    // When client sends expenseLineItems, update only expense-related fields so we never $set undefined.
    const updatePayload: Record<string, unknown> =
      data.expenseLineItems !== undefined
        ? {
            expenseLineItems: expenseLineItemsToSet,
            customerChargesTotal: Math.round(customerChargesTotal * 100) / 100,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
          }
        : (() => {
            const rest = { ...data };
            delete (rest as any).expenseLineItems;
            delete (rest as any).totalExpenses;
            if (data.bookingDate) (rest as any).bookingDate = new Date(data.bookingDate);
            return rest;
          })();

    const takingExpenseBranch = data.expenseLineItems !== undefined;
    console.log("[PoolExpenses] PATCH updatePayload", { id, takingExpenseBranch, updatePayloadKeys: Object.keys(updatePayload), expenseLineItemsInPayload: "expenseLineItems" in updatePayload, updatePayload });

    const filter = { _id: id, tenantId, branchId } as any;
    const filterRaw = {
      _id: new mongoose.Types.ObjectId(id),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      branchId: new mongoose.Types.ObjectId(branchId),
    };
    if (takingExpenseBranch) {
      // Use raw MongoDB update so expense fields are never stripped by Mongoose
      const collection = PoolBooking.collection;
      const updateResult = await collection.updateOne(filterRaw, { $set: updatePayload as Record<string, unknown> });
      if (updateResult.matchedCount === 0) {
        throw new NotFoundError("Pool booking");
      }
      console.log("[PoolExpenses] PATCH updateResult (raw)", { id, matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount });
    } else {
      const updateResult = await PoolBooking.updateOne(filter, { $set: updatePayload });
      if (updateResult.matchedCount === 0) {
        throw new NotFoundError("Pool booking");
      }
      console.log("[PoolExpenses] PATCH updateResult", { id, matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount });
    }

    const doc = await PoolBooking.findOne(filter as any)
      .populate("poolAreaId", "name type capacity")
      .lean();
    if (!doc) {
      throw new NotFoundError("Pool booking");
    }

    const docExp = doc as { expenseLineItems?: unknown[]; totalExpenses?: number };
    console.log("[PoolExpenses] PATCH doc after update", { id, expenseLineItemsLength: Array.isArray(docExp.expenseLineItems) ? docExp.expenseLineItems.length : 0, expenseLineItems: docExp.expenseLineItems, totalExpenses: docExp.totalExpenses });

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "poolBooking",
      resourceId: doc._id,
      details: { bookingReference: (doc as any).bookingReference, expenseLineItems: expenseLineItemsToSet, customerChargesTotal: (doc as any).customerChargesTotal },
    } as any);

    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...POOL_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Pool booking");
    }

    const doc = await PoolBooking.findOneAndDelete({ _id: id, tenantId, branchId } as any);
    if (!doc) {
      throw new NotFoundError("Pool booking");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "poolBooking",
      resourceId: doc._id,
      details: { bookingReference: doc.bookingReference },
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
