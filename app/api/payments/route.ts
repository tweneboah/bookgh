import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { createPaymentSchema } from "@/validations/billing";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { DEPARTMENT, INVOICE_STATUS } from "@/constants";
import mongoose from "mongoose";
import {
  getPaymentModelForDepartment,
  getPaymentModelsForQuery,
  sortAndPaginateRows,
} from "@/lib/department-ledger";
import {
  findInvoiceOneAcross,
  getInvoiceModelForDepartment,
} from "@/lib/department-invoice";
import EventBookingPayment from "@/models/event/EventBookingPayment";
import EventBooking from "@/models/event/EventBooking";
import PoolBookingPayment from "@/models/pool/PoolBookingPayment";
import PoolBooking from "@/models/pool/PoolBooking";
import PlaygroundBookingPayment from "@/models/playground/PlaygroundBookingPayment";
import PlaygroundBooking from "@/models/playground/PlaygroundBooking";

const SORT_FIELDS = ["createdAt", "amount", "status"];

/** Transform EventBookingPayment to payment-like shape for unified display. */
function toEventPaymentRow(
  doc: { _id: unknown; amount: number; paymentMethod: string; paidAt?: Date; createdAt: Date; type?: string },
  bookingRef?: string
) {
  return {
    _id: doc._id,
    department: DEPARTMENT.CONFERENCE,
    invoiceId: null,
    eventBookingId: (doc as any).eventBookingId,
    source: "eventBooking" as const,
    eventPaymentType: (doc as any).type,
    bookingReference: bookingRef,
    amount: doc.amount,
    paymentMethod: doc.paymentMethod,
    status: "success" as const,
    createdAt: doc.paidAt ?? doc.createdAt,
  };
}

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const { status, invoiceId, department } = Object.fromEntries(
      req.nextUrl.searchParams.entries()
    );

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (invoiceId && mongoose.Types.ObjectId.isValid(invoiceId)) {
      filter.invoiceId = new mongoose.Types.ObjectId(invoiceId);
    }

    const sortObj = parseSortString(sort, SORT_FIELDS);
    let result;
    if (department === DEPARTMENT.CONFERENCE) {
      const paymentModels = getPaymentModelsForQuery(department);
      const invoicePayments = await Promise.all(
        paymentModels.map((model) => model.find(filter as any).lean())
      );
      const invoiceRows = invoicePayments.flat();

      const eventFilter: Record<string, unknown> = { tenantId, branchId };
      let eventRows: any[] = [];
      const includeEventPayments = !invoiceId && (!status || status === "success");
      if (includeEventPayments) {
        const eventPayments = await EventBookingPayment.find(eventFilter as any)
          .sort({ paidAt: -1, createdAt: -1 })
          .lean();
        const bookingIds = [...new Set(eventPayments.map((p: any) => String(p.eventBookingId)))];
        const bookings = await EventBooking.find({
          _id: { $in: bookingIds.map((id) => new mongoose.Types.ObjectId(id)) },
          tenantId,
          branchId,
        } as any)
          .select("_id bookingReference")
          .lean();
        const bookingMap = Object.fromEntries(
          (bookings as any[]).map((b) => [String(b._id), b.bookingReference])
        );
        eventRows = eventPayments.map((p: any) =>
          toEventPaymentRow(p, bookingMap[String(p.eventBookingId)])
        );
      }

      const merged = [...invoiceRows, ...eventRows];
      result = sortAndPaginateRows(
        merged,
        page,
        limit,
        sortObj as Record<string, unknown>,
        "createdAt"
      );
    } else if (department === DEPARTMENT.POOL) {
      const paymentModels = getPaymentModelsForQuery(department);
      const invoicePayments = await Promise.all(
        paymentModels.map((model) => model.find(filter as any).lean())
      );
      const invoiceRows = invoicePayments.flat();

      let poolBookingRows: any[] = [];
      const includePoolPayments = !invoiceId && (!status || status === "success");
      if (includePoolPayments) {
        const poolPayments = await PoolBookingPayment.find(
          { tenantId, branchId } as any
        )
          .sort({ paidAt: -1, createdAt: -1 })
          .lean();
        const bookingIds = [...new Set(poolPayments.map((p: any) => String(p.poolBookingId)))];
        const bookings = await PoolBooking.find({
          _id: { $in: bookingIds.map((id) => new mongoose.Types.ObjectId(id)) },
          tenantId,
          branchId,
        } as any)
          .select("_id bookingReference")
          .lean();
        const bookingMap = Object.fromEntries(
          (bookings as any[]).map((b) => [String(b._id), b.bookingReference])
        );
        poolBookingRows = poolPayments.map((p: any) => ({
          _id: p._id,
          department: DEPARTMENT.POOL,
          invoiceId: null,
          poolBookingId: p.poolBookingId,
          source: "poolBooking" as const,
          bookingReference: bookingMap[String(p.poolBookingId)],
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          status: "success" as const,
          createdAt: p.paidAt ?? p.createdAt,
        }));
      }

      const merged = [...invoiceRows, ...poolBookingRows];
      result = sortAndPaginateRows(
        merged,
        page,
        limit,
        sortObj as Record<string, unknown>,
        "createdAt"
      );
    } else if (department === DEPARTMENT.PLAYGROUND) {
      const paymentModels = getPaymentModelsForQuery(department);
      const invoicePayments = await Promise.all(
        paymentModels.map((model) => model.find(filter as any).lean())
      );
      const invoiceRows = invoicePayments.flat();

      let playgroundBookingRows: any[] = [];
      const includePlaygroundPayments = !invoiceId && (!status || status === "success");
      if (includePlaygroundPayments) {
        const playgroundPayments = await PlaygroundBookingPayment.find(
          { tenantId, branchId } as any
        )
          .sort({ paidAt: -1, createdAt: -1 })
          .lean();
        const bookingIds = [...new Set(playgroundPayments.map((p: any) => String(p.playgroundBookingId)))];
        const bookings = await PlaygroundBooking.find({
          _id: { $in: bookingIds.map((id) => new mongoose.Types.ObjectId(id)) },
          tenantId,
          branchId,
        } as any)
          .select("_id bookingReference")
          .lean();
        const bookingMap = Object.fromEntries(
          (bookings as any[]).map((b) => [String(b._id), b.bookingReference])
        );
        playgroundBookingRows = playgroundPayments.map((p: any) => ({
          _id: p._id,
          department: DEPARTMENT.PLAYGROUND,
          invoiceId: null,
          playgroundBookingId: p.playgroundBookingId,
          source: "playgroundBooking" as const,
          bookingReference: bookingMap[String(p.playgroundBookingId)],
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          status: "success" as const,
          createdAt: p.paidAt ?? p.createdAt,
        }));
      }

      const merged = [...invoiceRows, ...playgroundBookingRows];
      result = sortAndPaginateRows(
        merged,
        page,
        limit,
        sortObj as Record<string, unknown>,
        "createdAt"
      );
    } else if (department) {
      const paymentModels = getPaymentModelsForQuery(department);
      if (paymentModels.length === 1) {
        const query = paymentModels[0].find(filter as any).sort(sortObj);
        const countQuery = paymentModels[0].countDocuments(filter as any);
        result = await paginate(query, countQuery, { page, limit, sort });
      } else {
        const docsByModel = await Promise.all(
          paymentModels.map((model) => model.find(filter as any).lean())
        );
        result = sortAndPaginateRows(
          docsByModel.flat(),
          page,
          limit,
          sortObj as Record<string, unknown>,
          "createdAt"
        );
      }
    } else {
      const docsByModel = await Promise.all(
        getPaymentModelsForQuery().map((model) =>
          model.find(filter as any).lean()
        )
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
    const data = createPaymentSchema.parse(body);

    const invoiceId = new mongoose.Types.ObjectId(data.invoiceId);
    const invoice = await findInvoiceOneAcross({ _id: invoiceId, tenantId, branchId });
    if (!invoice) {
      throw new NotFoundError("Invoice");
    }
    const resolvedDepartment = invoice.department ?? "accommodation";
    if (data.department && data.department !== resolvedDepartment) {
      throw new BadRequestError(
        "Payment department must match the linked invoice department"
      );
    }

    const isPaystackPending = !!data.paystackReference;
    const paymentModel = getPaymentModelForDepartment(resolvedDepartment);
    const doc = await paymentModel.create({
      tenantId,
      branchId,
      department: resolvedDepartment,
      invoiceId,
      guestId: data.guestId ? new mongoose.Types.ObjectId(data.guestId) : undefined,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paystackReference: data.paystackReference,
      status: isPaystackPending ? "pending" : "success",
      processedBy: auth.userId,
    } as any);

    if (!isPaystackPending) {
      const updatedPaidAmount = (invoice.paidAmount ?? 0) + data.amount;
      const totalAmount = invoice.totalAmount ?? 0;
      const newStatus =
        updatedPaidAmount >= totalAmount ? INVOICE_STATUS.PAID : INVOICE_STATUS.PARTIALLY_PAID;
      const InvoiceModel = getInvoiceModelForDepartment(resolvedDepartment);
      await InvoiceModel.findByIdAndUpdate(invoiceId, {
        $set: { paidAmount: updatedPaidAmount, status: newStatus },
      });
    }

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
