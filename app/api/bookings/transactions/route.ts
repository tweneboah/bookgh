import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination } from "@/lib/pagination";
import { getPaymentModelForDepartment } from "@/lib/department-ledger";
import { DEPARTMENT } from "@/constants";
import connectDB from "@/lib/db";
import mongoose from "mongoose";

const INVOICES_ACCOMMODATION = "invoices_accommodation";
const BOOKINGS_ACCOMMODATION = "bookings_accommodation";
const GUESTS_ACCOMMODATION = "guests_accommodation";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GET = withHandler(
  async (req, { auth }) => {
    await connectDB();
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit } = parsePagination(req.nextUrl.searchParams);
    const { status, q, bookingId } = Object.fromEntries(
      req.nextUrl.searchParams.entries()
    );

    const tenantOid = new mongoose.Types.ObjectId(String(tenantId));
    const branchOid = new mongoose.Types.ObjectId(String(branchId));

    const paymentMatch: Record<string, unknown> = {
      tenantId: tenantOid,
      branchId: branchOid,
      department: DEPARTMENT.ACCOMMODATION,
    };
    if (status) paymentMatch.status = status;

    const stages: mongoose.PipelineStage[] = [
      { $match: paymentMatch },
      {
        $lookup: {
          from: INVOICES_ACCOMMODATION,
          localField: "invoiceId",
          foreignField: "_id",
          as: "inv",
        },
      },
      { $unwind: "$inv" },
      { $match: { "inv.bookingId": { $ne: null } } },
    ];

    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      stages.push({
        $match: {
          "inv.bookingId": new mongoose.Types.ObjectId(bookingId),
        },
      });
    }

    stages.push(
      {
        $lookup: {
          from: BOOKINGS_ACCOMMODATION,
          localField: "inv.bookingId",
          foreignField: "_id",
          as: "bk",
        },
      },
      {
        $unwind: { path: "$bk", preserveNullAndEmptyArrays: true },
      }
    );

    const qTrim = q?.trim();
    if (qTrim) {
      stages.push({
        $match: {
          "bk.bookingReference": {
            $regex: escapeRegex(qTrim),
            $options: "i",
          },
        },
      });
    }

    const skip = (page - 1) * limit;

    stages.push({
      $facet: {
        totalCount: [{ $count: "count" }],
        items: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $addFields: {
              effectiveGuestId: { $ifNull: ["$guestId", "$bk.guestId"] },
            },
          },
          {
            $lookup: {
              from: GUESTS_ACCOMMODATION,
              localField: "effectiveGuestId",
              foreignField: "_id",
              as: "guestArr",
            },
          },
          {
            $unwind: { path: "$guestArr", preserveNullAndEmptyArrays: true },
          },
          {
            $project: {
              _id: 1,
              amount: 1,
              paymentMethod: 1,
              status: 1,
              createdAt: 1,
              paystackReference: 1,
              paystackTransactionId: 1,
              metadata: 1,
              invoiceId: "$inv._id",
              invoiceNumber: "$inv.invoiceNumber",
              bookingId: "$inv.bookingId",
              bookingReference: "$bk.bookingReference",
              guest: {
                firstName: "$guestArr.firstName",
                lastName: "$guestArr.lastName",
                email: "$guestArr.email",
              },
            },
          },
        ],
      },
    });

    const PaymentModel = getPaymentModelForDepartment(DEPARTMENT.ACCOMMODATION);
    const agg = await PaymentModel.aggregate(stages);
    const bucket = agg[0] as
      | {
          totalCount?: { count: number }[];
          items?: unknown[];
        }
      | undefined;

    const total = bucket?.totalCount?.[0]?.count ?? 0;
    const items = bucket?.items ?? [];
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return successResponse(items, 200, {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  },
  { auth: true }
);
