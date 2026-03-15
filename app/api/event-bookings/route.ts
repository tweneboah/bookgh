import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { resolveBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import EventBooking from "@/models/event/EventBooking";
import { createEventBookingSchema } from "@/validations/event";
import mongoose from "mongoose";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";

const SORT_FIELDS = ["createdAt", "startDate", "endDate", "status", "eventType", "bookingReference"];
const CONFERENCE_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.EVENT_MANAGER,
  USER_ROLES.SALES_OFFICER,
  USER_ROLES.OPERATIONS_COORDINATOR,
  USER_ROLES.EVENT_COORDINATOR,
  USER_ROLES.ACCOUNTANT,
] as const;

function generateBookingReference(): string {
  return `EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = await resolveBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const eventType = sp.get("eventType");
    const startDate = sp.get("startDate");
    const endDate = sp.get("endDate");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (eventType) filter.eventType = eventType;
    if (startDate || endDate) {
      const rangeStart = startDate ? (() => { const d = new Date(startDate); d.setHours(0, 0, 0, 0); return d; })() : null;
      const rangeEnd = endDate ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })() : null;
      if (rangeStart && rangeEnd) {
        (filter as any).$and = [
          { startDate: { $lte: rangeEnd } },
          { endDate: { $gte: rangeStart } },
        ];
      } else if (rangeStart) {
        (filter as any).endDate = { $gte: rangeStart };
      } else if (rangeEnd) {
        (filter as any).startDate = { $lte: rangeEnd };
      }
    }

    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = EventBooking.find(filter as any)
      .populate("eventHallId", "name")
      .sort(sortObj);
    const countQuery = EventBooking.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...CONFERENCE_ROLES]);
    const { tenantId, branchId } = await resolveBranch(auth);
    const body = await req.json();
    const data = createEventBookingSchema.parse(body);

    let bookingReference = generateBookingReference();
    let exists = await EventBooking.exists({ tenantId, branchId, bookingReference });
    while (exists) {
      bookingReference = generateBookingReference();
      exists = await EventBooking.exists({ tenantId, branchId, bookingReference });
    }

    const equipmentBooked = (data.equipmentBooked ?? []).map(
      (row: { resourceId: string; quantity: number }) => ({
        resourceId: new mongoose.Types.ObjectId(row.resourceId),
        quantity: row.quantity,
      })
    );

    const doc = await EventBooking.create({
      ...data,
      eventHallId: new mongoose.Types.ObjectId(data.eventHallId),
      guestId: data.guestId ? new mongoose.Types.ObjectId(data.guestId) : undefined,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      equipmentBooked,
      installments: (data.installments ?? []).map((row) => ({
        dueDate: new Date(row.dueDate),
        amount: row.amount,
        status: row.status ?? "pending",
        paidDate: row.paidDate ? new Date(row.paidDate) : undefined,
      })),
      totalRevenue: data.quotedPrice ?? 0,
      totalExpenses: 0,
      netProfit: data.quotedPrice ?? 0,
      outstandingAmount: data.quotedPrice ?? 0,
      tenantId,
      branchId,
      bookingReference,
      createdBy: auth.userId,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "eventBooking",
      resourceId: doc._id,
      details: {
        bookingReference: doc.bookingReference,
        eventType: doc.eventType,
        clientName: doc.clientName,
      },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
