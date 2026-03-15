import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { createInvoiceSchema } from "@/validations/billing";
import mongoose from "mongoose";
import {
  getInvoiceModelForDepartment,
  getInvoiceModelsForQuery,
} from "@/lib/department-invoice";
import { sortAndPaginateRows } from "@/lib/department-ledger";

const SORT_FIELDS = ["createdAt", "invoiceNumber", "dueDate", "status", "totalAmount"];

function generateInvoiceNumber(): string {
  return `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const { status, bookingId, guestId, department } = Object.fromEntries(
      req.nextUrl.searchParams.entries()
    );

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) filter.bookingId = new mongoose.Types.ObjectId(bookingId);
    if (guestId && mongoose.Types.ObjectId.isValid(guestId)) filter.guestId = new mongoose.Types.ObjectId(guestId);

    const sortObj = parseSortString(sort, SORT_FIELDS);
    let result;
    if (department) {
      const InvoiceModel = getInvoiceModelForDepartment(department);
      const query = InvoiceModel.find(filter as any).sort(sortObj);
      const countQuery = InvoiceModel.countDocuments(filter as any);
      result = await paginate(query, countQuery, { page, limit, sort });
    } else {
      const docsByModel = await Promise.all(
        getInvoiceModelsForQuery().map((model) => model.find(filter as any).lean())
      );
      result = sortAndPaginateRows(
        docsByModel.flat(),
        page,
        limit,
        sortObj as Record<string, unknown>,
        "createdAt"
      );
    }

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createInvoiceSchema.parse(body);
    const department = data.department ?? "accommodation";
    const InvoiceModel = getInvoiceModelForDepartment(department);

    let invoiceNumber = generateInvoiceNumber();
    let exists = await InvoiceModel.exists({ invoiceNumber });
    while (exists) {
      invoiceNumber = generateInvoiceNumber();
      exists = await InvoiceModel.exists({ invoiceNumber });
    }

    const subtotal = data.items.reduce((sum, i) => sum + (i.amount ?? 0), 0);
    const taxTotal = (data.taxBreakdown ?? []).reduce((sum, t) => sum + t.amount, 0);
    const discountTotal = (data.discounts ?? []).reduce((sum, d) => sum + d.amount, 0);
    const totalAmount = data.totalAmount ?? subtotal + taxTotal - discountTotal;

    const createPayload = {
      tenantId,
      branchId,
      department: data.department ?? "accommodation",
      invoiceNumber,
      bookingId: data.bookingId ? new mongoose.Types.ObjectId(data.bookingId) : undefined,
      eventBookingId: data.eventBookingId ? new mongoose.Types.ObjectId(data.eventBookingId) : undefined,
      guestId: data.guestId ? new mongoose.Types.ObjectId(data.guestId) : undefined,
      items: data.items,
      taxBreakdown: data.taxBreakdown ?? [],
      discounts: data.discounts ?? [],
      subtotal,
      totalAmount,
      paidAmount: 0,
      status: "draft" as const,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      notes: data.notes,
      isSplitBill: data.isSplitBill ?? false,
      splitWith: (data.splitWith ?? []).map((id) => new mongoose.Types.ObjectId(id)),
      createdBy: auth.userId,
    };

    const doc = await InvoiceModel.create(createPayload as any);
    return createdResponse(doc.toObject());
  },
  { auth: true }
);
