import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import Booking from "@/models/booking/Booking";
import Guest from "@/models/booking/Guest";
import Room from "@/models/room/Room";
import { checkInSchema } from "@/validations/booking";
import {
  BOOKING_STATUS,
  ROOM_STATUS,
  DEPARTMENT,
  INVOICE_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from "@/constants";
import { getPaymentModelForDepartment } from "@/lib/department-ledger";
import { getInvoiceModelForDepartment } from "@/lib/department-invoice";
import mongoose from "mongoose";

function generateInvoiceNumber(): string {
  return `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const POST = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Booking");
    }

    const body = await req.json();
    const data = checkInSchema.parse(body);

    const booking = await Booking.findById(id).lean();

    if (
      !booking ||
      String(booking.tenantId) !== tenantId ||
      String(booking.branchId) !== branchId
    ) {
      throw new NotFoundError("Booking");
    }

    if (booking.status !== BOOKING_STATUS.PENDING && booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw new BadRequestError("Booking cannot be checked in");
    }

    const room = await Room.findById(data.roomId).lean();

    if (
      !room ||
      String(room.tenantId) !== tenantId ||
      String(room.branchId) !== branchId
    ) {
      throw new NotFoundError("Room");
    }

    if (room.status !== ROOM_STATUS.AVAILABLE && room.status !== ROOM_STATUS.RESERVED) {
      const roomCode = room.roomNumber ? `Room ${room.roomNumber}` : "Selected room";
      const currentStatus = String(room.status ?? "unknown").replace(/([A-Z])/g, " $1").trim().toLowerCase();
      throw new BadRequestError(
        `${roomCode} cannot be checked in because it is currently ${currentStatus}. ` +
          "Choose an available/reserved room or refresh availability and try again."
      );
    }

    const previousDeposit = Number(booking.depositPaid ?? 0);
    const newTotalDeposit =
      data.depositPaid !== undefined && data.depositPaid !== null
        ? Number(data.depositPaid)
        : previousDeposit;
    const collectedNow = Math.round(Math.max(0, newTotalDeposit - previousDeposit) * 100) / 100;

    const paymentModel = getPaymentModelForDepartment(DEPARTMENT.ACCOMMODATION);

    if (collectedNow > 0) {
      const existingLedger = await paymentModel
        .findOne({
          tenantId,
          branchId,
          status: PAYMENT_STATUS.SUCCESS,
          "metadata.source": "checkIn",
          "metadata.bookingId": String(id),
        } as any)
        .lean();

      if (!existingLedger) {
        const InvoiceModel = getInvoiceModelForDepartment(DEPARTMENT.ACCOMMODATION);

        let invoiceNumber = generateInvoiceNumber();
        let exists = await InvoiceModel.exists({
          tenantId,
          branchId,
          invoiceNumber,
        } as any);
        while (exists) {
          invoiceNumber = generateInvoiceNumber();
          exists = await InvoiceModel.exists({
            tenantId,
            branchId,
            invoiceNumber,
          } as any);
        }

        const invoice = await InvoiceModel.create({
          tenantId,
          branchId,
          department: DEPARTMENT.ACCOMMODATION,
          invoiceNumber,
          bookingId: booking._id,
          guestId: booking.guestId,
          items: [
            {
              description: `Deposit at check-in (${booking.bookingReference})`,
              category: "accommodation",
              quantity: 1,
              unitPrice: collectedNow,
              amount: collectedNow,
            },
          ],
          subtotal: collectedNow,
          totalAmount: collectedNow,
          paidAmount: collectedNow,
          status: INVOICE_STATUS.PAID,
          notes: "Recorded when guest checked in",
          createdBy: auth.userId,
        } as any);

        await paymentModel.create({
          tenantId,
          branchId,
          department: DEPARTMENT.ACCOMMODATION,
          invoiceId: invoice._id,
          guestId: booking.guestId,
          amount: collectedNow,
          paymentMethod: data.paymentMethod ?? PAYMENT_METHOD.CASH,
          status: PAYMENT_STATUS.SUCCESS,
          processedBy: auth.userId,
          metadata: {
            source: "checkIn",
            bookingId: String(booking._id),
            bookingReference: booking.bookingReference,
          },
        } as any);
      }
    }

    const updateData: Record<string, unknown> = {
      roomId: data.roomId,
      actualCheckIn: new Date(),
      status: BOOKING_STATUS.CHECKED_IN,
    };
    if (data.depositPaid !== undefined) {
      updateData.depositPaid = data.depositPaid;
    }
    if (data.idType) {
      updateData.checkInIdType = data.idType;
    }
    if (data.idNumber) {
      updateData.checkInIdNumber = data.idNumber;
    }
    if (data.idDocument) {
      updateData.checkInIdDocument = data.idDocument;
    }

    await Promise.all([
      Booking.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }),
      Room.findByIdAndUpdate(data.roomId, { $set: { status: ROOM_STATUS.OCCUPIED } }),
      (data.idType || data.idNumber || data.idDocument) &&
        Guest.findByIdAndUpdate(
          booking.guestId,
          {
            $set: {
              ...(data.idType ? { idType: data.idType } : {}),
              ...(data.idNumber ? { idNumber: data.idNumber } : {}),
              ...(data.idDocument ? { idDocument: data.idDocument } : {}),
            },
          },
          { runValidators: true }
        ),
    ]);

    const updatedBooking = await Booking.findById(id)
      .populate("guestId")
      .populate("roomId")
      .populate("roomCategoryId")
      .lean();

    return successResponse(updatedBooking);
  },
  { auth: true }
);
