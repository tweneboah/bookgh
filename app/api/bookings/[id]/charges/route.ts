import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import Booking from "@/models/booking/Booking";
import RoomCharge from "@/models/booking/RoomCharge";
import { createRoomChargeSchema } from "@/validations/room-charge";
import {
  BOOKING_STATUS,
  USER_ROLES,
  INVOICE_STATUS,
  DEPARTMENT,
} from "@/constants";
import mongoose from "mongoose";
import { getInvoiceModelForDepartment } from "@/lib/department-invoice";

export const GET = withHandler(
  async (req, { auth, params }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Booking");

    const booking = await Booking.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any).lean();
    if (!booking) throw new NotFoundError("Booking");

    const charges = await RoomCharge.find({
      tenantId,
      branchId,
      bookingId: id,
    } as any)
      .sort({ createdAt: -1 })
      .populate("addedBy", "firstName lastName")
      .lean();

    const total = charges.reduce((sum, c) => sum + c.totalAmount, 0);

    return successResponse({ charges, total });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.FRONT_DESK,
      USER_ROLES.RESERVATION_OFFICER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError("Booking");

    const booking = await Booking.findOne({
      _id: id,
      tenantId,
      branchId,
    } as any).lean();

    if (!booking) throw new NotFoundError("Booking");

    if (booking.status !== BOOKING_STATUS.CHECKED_IN) {
      throw new BadRequestError(
        "Room charges can only be added to checked-in bookings"
      );
    }

    const body = await req.json();
    const data = createRoomChargeSchema.parse(body);
    const InvoiceModel = getInvoiceModelForDepartment(DEPARTMENT.ACCOMMODATION);
    const totalAmount = data.unitPrice * data.quantity;

    const charge = await RoomCharge.create({
      ...data,
      totalAmount,
      tenantId,
      branchId,
      bookingId: id,
      guestId: booking.guestId,
      addedBy: auth.userId,
    } as any);

    const lineItem = {
      description: data.description?.trim() || `Room charge (${data.chargeType})`,
      category: `roomCharge:${String(charge._id)}`,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      amount: totalAmount,
    };

    let invoice = await InvoiceModel.findOne({
      tenantId,
      branchId,
      bookingId: id,
      status: INVOICE_STATUS.DRAFT,
      notes: "Auto-updated from room charges",
    } as any);

    if (!invoice) {
      function generateInvoiceNumber(): string {
        return `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
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

      invoice = await InvoiceModel.create({
        tenantId,
        branchId,
        department: DEPARTMENT.ACCOMMODATION,
        bookingId: booking._id,
        guestId: booking.guestId,
        invoiceNumber,
        items: [lineItem],
        subtotal: totalAmount,
        totalAmount,
        paidAmount: 0,
        status: INVOICE_STATUS.DRAFT,
        notes: "Auto-updated from room charges",
        createdBy: auth.userId,
      } as any);
    } else {
      const items = [...(invoice.items ?? [])];
      items.push(lineItem as any);
      const subtotal = Number(
        items.reduce((sum, item: any) => sum + (item.amount ?? 0), 0).toFixed(2)
      );
      invoice.items = items as any;
      invoice.subtotal = subtotal;
      invoice.totalAmount = subtotal;
      await invoice.save();
    }

    return createdResponse(charge.toObject());
  },
  { auth: true }
);
