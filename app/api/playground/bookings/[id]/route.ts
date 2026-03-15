import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import PlaygroundBooking from "@/models/playground/PlaygroundBooking";
import { updatePlaygroundBookingSchema } from "@/validations/playground";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const PLAYGROUND_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
] as const;

export const GET = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Playground booking");
    }

    const doc = await PlaygroundBooking.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any)
      .populate("playgroundAreaId", "name type capacity")
      .lean();
    if (!doc) {
      throw new NotFoundError("Playground booking");
    }

    const d = doc as Record<string, unknown> & {
      expenseLineItems?: unknown[];
      totalExpenses?: number;
    };
    if (!Array.isArray(d.expenseLineItems)) {
      d.expenseLineItems = [];
    }
    if (d.totalExpenses === undefined || d.totalExpenses === null) {
      d.totalExpenses = (d.expenseLineItems as { amount?: number }[]).reduce(
        (s, r) => s + Number(r.amount ?? 0),
        0
      );
    }

    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Playground booking");
    }

    const body = await req.json();
    const data = updatePlaygroundBookingSchema.parse(body);

    const existing = await PlaygroundBooking.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any).lean();
    if (!existing) {
      throw new NotFoundError("Playground booking");
    }

    const expenseItems = data.expenseLineItems ?? existing.expenseLineItems ?? [];
    const totalExpenses =
      data.totalExpenses ??
      expenseItems.reduce(
        (sum: number, row: { amount?: number }) =>
          sum + Number(row.amount ?? 0),
        0
      );
    const customerChargesTotal = expenseItems.reduce(
      (sum: number, row: { chargeToCustomer?: boolean; amountToCharge?: number; amount?: number }) =>
        row.chargeToCustomer
          ? sum + Number(row.amountToCharge ?? row.amount ?? 0)
          : sum,
      0
    );

    const expenseLineItemsToSet = expenseItems.map(
      (row: {
        category?: string;
        description?: string;
        amount?: number;
        chargeToCustomer?: boolean;
        amountToCharge?: number;
      }) => ({
        category: row.category ?? "",
        description: row.description ?? "",
        amount: Number(row.amount ?? 0),
        chargeToCustomer: !!row.chargeToCustomer,
        amountToCharge: row.chargeToCustomer
          ? Number(row.amountToCharge ?? row.amount ?? 0)
          : 0,
      })
    );

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
            if (data.bookingEndDate !== undefined)
              (rest as any).bookingEndDate =
                data.bookingEndDate == null ? null : new Date(data.bookingEndDate);
            return rest;
          })();

    const filter = { _id: id, tenantId, branchId } as any;
    const filterRaw = {
      _id: new mongoose.Types.ObjectId(id),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      branchId: new mongoose.Types.ObjectId(branchId),
    };
    if (data.expenseLineItems !== undefined) {
      const collection = PlaygroundBooking.collection;
      await collection.updateOne(filterRaw, {
        $set: updatePayload as Record<string, unknown>,
      });
    } else {
      await PlaygroundBooking.updateOne(filter, { $set: updatePayload });
    }

    const doc = await PlaygroundBooking.findOne(filter as any)
      .populate("playgroundAreaId", "name type capacity")
      .lean();
    if (!doc) {
      throw new NotFoundError("Playground booking");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "playgroundBooking",
      resourceId: doc._id,
      details: {
        bookingReference: (doc as any).bookingReference,
        customerChargesTotal: (doc as any).customerChargesTotal,
      },
    } as any);

    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [...PLAYGROUND_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Playground booking");
    }

    const doc = await PlaygroundBooking.findOneAndDelete({
      _id: id,
      tenantId,
      branchId,
    } as any);
    if (!doc) {
      throw new NotFoundError("Playground booking");
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "playgroundBooking",
      resourceId: doc._id,
      details: { bookingReference: doc.bookingReference },
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
