import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { updateOrderSchema } from "@/validations/pos";
import {
  BAR_PERMISSIONS,
  DEPARTMENT,
  INVOICE_STATUS,
  PAYMENT_METHOD,
  POS_ORDER_STATUS,
  POS_PAYMENT_STATUS,
  USER_ROLES,
} from "@/constants";
import {
  applyInventoryMovementsForOrder,
  ensureSufficientBarStock,
  postBarOrderToRoomBill,
  resolveBarOrderPricing,
} from "@/lib/bar-service";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getPosOrderModelForDepartment,
  normalizePosDepartment,
} from "@/lib/department-pos";
import { getPaymentModelForDepartment } from "@/lib/department-ledger";
import { getInvoiceModelForDepartment } from "@/lib/department-invoice";

function generateInvoiceNumber(): string {
  return `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function normalizePaymentMethod(raw?: string): string {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value.includes("card")) return PAYMENT_METHOD.CARD;
  if (value.includes("mobile")) return PAYMENT_METHOD.MOBILE_MONEY;
  if (value.includes("bank")) return PAYMENT_METHOD.BANK_TRANSFER;
  return PAYMENT_METHOD.CASH;
}

export const GET = withHandler(
  async (_req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
      USER_ROLES.CASHIER,
      USER_ROLES.WAITER,
      USER_ROLES.HOSTESS,
      USER_ROLES.SUPERVISOR,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BARTENDER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePosDepartment(
      _req.nextUrl.searchParams.get("department")
    );
    const OrderModel = getPosOrderModelForDepartment(department);
    const doc = await OrderModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>)
      .lean();
    if (!doc) throw new NotFoundError("Order");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
      USER_ROLES.CASHIER,
      USER_ROLES.WAITER,
      USER_ROLES.HOSTESS,
      USER_ROLES.SUPERVISOR,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BARTENDER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const OrderModel = getPosOrderModelForDepartment(department);
    const body = updateOrderSchema.parse(await req.json());
    const doc = await OrderModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any);
    if (!doc) throw new NotFoundError("Order");
    const previousStatus = doc.status;
    const previousPaymentStatus = doc.paymentStatus;

    const nextStatus = body.status ?? doc.status;
    const nextItems = (body.items ?? doc.items) as any[];

    if (body.items) {
      await ensureSufficientBarStock({
        tenantId,
        branchId,
        items: body.items as any,
        department,
      });
      const pricing = await resolveBarOrderPricing({
        tenantId,
        branchId,
        items: body.items as any,
        department,
      });
      doc.items = pricing.items as any;
      doc.subtotal = pricing.subtotal;
      doc.tax = pricing.tax;
      doc.totalAmount = pricing.totalAmount;
      doc.appliedRule = pricing.appliedRule ?? undefined;
    }

    if (body.shiftId !== undefined) doc.shiftId = body.shiftId as any;
    if (body.status !== undefined) doc.status = body.status as any;
    if (body.paymentStatus !== undefined) doc.paymentStatus = body.paymentStatus as any;
    if (body.kotStatus !== undefined) doc.kotStatus = body.kotStatus as any;
    if (body.orderChannel !== undefined) doc.orderChannel = body.orderChannel as any;
    if (body.addToRoomBill !== undefined) doc.addToRoomBill = body.addToRoomBill;
    if (body.bookingId !== undefined) doc.bookingId = body.bookingId as any;
    if (body.roomId !== undefined) doc.roomId = body.roomId as any;
    if (body.guestId !== undefined) doc.guestId = body.guestId as any;
    if (body.voidReason !== undefined) doc.voidReason = body.voidReason;
    if (body.tipAmount !== undefined) doc.tipAmount = body.tipAmount;
    if (body.serviceChargeAmount !== undefined) {
      doc.serviceChargeAmount = body.serviceChargeAmount;
    }
    if (body.refundAmount !== undefined) doc.refundAmount = body.refundAmount;
    if (body.refundReason !== undefined) doc.refundReason = body.refundReason;
    if (body.waiterId !== undefined) doc.waiterId = body.waiterId as any;
    if (body.waiterName !== undefined) doc.waiterName = body.waiterName;
    if (body.cashierId !== undefined) doc.cashierId = body.cashierId as any;
    if (body.transferFromTableId !== undefined) {
      doc.transferFromTableId = body.transferFromTableId as any;
    }
    if (body.transferToTableId !== undefined) {
      doc.transferToTableId = body.transferToTableId as any;
    }
    if (body.mergedFromTableIds !== undefined) {
      doc.mergedFromTableIds = body.mergedFromTableIds as any;
    }
    if (body.partialPayments !== undefined) {
      doc.partialPayments = body.partialPayments.map((row) => ({
        ...row,
        paidAt: row.paidAt ? new Date(row.paidAt) : new Date(),
      })) as any;
    }

    if (body.discountAmount !== undefined) {
      const managerRoles = [
        USER_ROLES.TENANT_ADMIN,
        USER_ROLES.BRANCH_MANAGER,
        USER_ROLES.RESTAURANT_MANAGER,
        USER_ROLES.SUPERVISOR,
      ];
      const isManager = managerRoles.includes(auth.role as any);
      if (body.discountAmount > 0 && !isManager && !body.discountApprovedBy) {
        throw new BadRequestError(
          "Discount approval is required for this role"
        );
      }
      doc.discountAmount = body.discountAmount;
      doc.discountReason = body.discountReason;
      if (body.discountApprovedBy !== undefined) {
        doc.discountApprovedBy = body.discountApprovedBy as any;
      }
    }

    const statusChanged = !!body.status && body.status !== previousStatus;
    const shouldDeductStock =
      !doc.stockDeducted &&
      [POS_ORDER_STATUS.SERVED, POS_ORDER_STATUS.COMPLETED].includes(nextStatus as any);
    if (shouldDeductStock) {
      await requirePermissions(
        auth,
        [BAR_PERMISSIONS.STOCK_MANAGE, BAR_PERMISSIONS.ORDER_UPDATE],
        {
          allowRoles: [
            USER_ROLES.TENANT_ADMIN,
            USER_ROLES.BRANCH_MANAGER,
            USER_ROLES.BAR_MANAGER,
            USER_ROLES.BARTENDER,
            USER_ROLES.BAR_CASHIER,
            USER_ROLES.POS_STAFF,
          ],
        }
      );
      await applyInventoryMovementsForOrder({
        tenantId,
        branchId,
        department,
        userId: auth.userId,
        orderId: String(doc._id),
        shiftId: body.shiftId ?? (doc.shiftId ? String(doc.shiftId) : undefined),
        items: nextItems as any,
        movementType: "sale",
        allowNegativeStock: body.allowNegativeStock,
        reason: "Order served/completed",
      });
      doc.stockDeducted = true;
      doc.stockDeductedAt = new Date();
      if (nextStatus === POS_ORDER_STATUS.SERVED) {
        doc.servedAt = new Date();
      }
    }

    const shouldReverseStock =
      doc.stockDeducted &&
      nextStatus === POS_ORDER_STATUS.CANCELLED &&
      (previousStatus !== POS_ORDER_STATUS.CANCELLED || !!body.voidReason);
    if (shouldReverseStock) {
      await requirePermissions(auth, [BAR_PERMISSIONS.ORDER_VOID], {
        allowRoles: [
          USER_ROLES.TENANT_ADMIN,
          USER_ROLES.BRANCH_MANAGER,
          USER_ROLES.BAR_MANAGER,
          USER_ROLES.BAR_CASHIER,
        ],
      });
      if (!body.voidReason && !doc.voidReason) {
        throw new BadRequestError("Void reason is required to cancel a served order");
      }
      const managerRoles = [
        USER_ROLES.TENANT_ADMIN,
        USER_ROLES.BRANCH_MANAGER,
        USER_ROLES.RESTAURANT_MANAGER,
        USER_ROLES.SUPERVISOR,
      ];
      const isManager = managerRoles.includes(auth.role as any);
      if (!isManager && !body.voidApprovedBy && !doc.voidApprovedBy) {
        throw new BadRequestError(
          "Void approval is required for this role"
        );
      }
      if (body.voidApprovedBy !== undefined) {
        doc.voidApprovedBy = body.voidApprovedBy as any;
      }
      await applyInventoryMovementsForOrder({
        tenantId,
        branchId,
        department,
        userId: auth.userId,
        orderId: String(doc._id),
        shiftId: doc.shiftId ? String(doc.shiftId) : undefined,
        items: doc.items as any,
        movementType: "reversal",
        reason: body.voidReason ?? doc.voidReason,
      });
      doc.stockDeducted = false;
    }

    const shouldPostRoomBill =
      doc.addToRoomBill &&
      !!doc.bookingId &&
      !!doc.stockDeducted &&
      !doc.roomChargeId &&
      [POS_ORDER_STATUS.SERVED, POS_ORDER_STATUS.COMPLETED].includes(nextStatus as any);
    if (shouldPostRoomBill) {
      const roomPosting = await postBarOrderToRoomBill({
        tenantId,
        branchId,
        department: department || "bar",
        userId: auth.userId,
        order: {
          _id: doc._id,
          orderNumber: doc.orderNumber,
          bookingId: doc.bookingId ? String(doc.bookingId) : undefined,
          guestId: doc.guestId ? String(doc.guestId) : undefined,
          totalAmount: doc.totalAmount,
        },
      });
      doc.roomChargeId = roomPosting.chargeId as any;
      doc.invoiceId = roomPosting.invoiceId as any;
      doc.postedToRoomAt = new Date();
    }

    const paymentMarkedPaid =
      previousPaymentStatus !== POS_PAYMENT_STATUS.PAID &&
      doc.paymentStatus === POS_PAYMENT_STATUS.PAID;
    if (paymentMarkedPaid) {
      const resolvedDepartment = (department || DEPARTMENT.RESTAURANT) as any;
      const InvoiceModel = getInvoiceModelForDepartment(resolvedDepartment);
      let invoice = doc.invoiceId
        ? await InvoiceModel.findOne({
            _id: doc.invoiceId,
            tenantId,
            branchId,
          } as any)
        : null;
      if (!invoice) {
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
          department: resolvedDepartment,
          bookingId: doc.bookingId,
          guestId: doc.guestId,
          invoiceNumber,
          items: (doc.items ?? []).map((item: any) => ({
            description: item.name,
            category: `posOrder:${String(doc._id)}`,
            quantity: Number(item.quantity ?? 0),
            unitPrice: Number(item.unitPrice ?? 0),
            amount: Number(item.amount ?? 0),
          })),
          subtotal: Number(doc.subtotal ?? doc.totalAmount ?? 0),
          totalAmount: Number(doc.totalAmount ?? 0),
          paidAmount: 0,
          status: INVOICE_STATUS.ISSUED,
          notes: `POS order ${doc.orderNumber}`,
          createdBy: auth.userId,
        } as any);
        doc.invoiceId = invoice._id as any;
      }

      const outstanding = Number(
        ((invoice.totalAmount ?? 0) - (invoice.paidAmount ?? 0)).toFixed(2)
      );
      const amountToCapture = Math.max(0, outstanding);
      if (amountToCapture > 0) {
        const PaymentModel = getPaymentModelForDepartment(resolvedDepartment);
        const existingPayment = await PaymentModel.findOne({
          tenantId,
          branchId,
          invoiceId: invoice._id,
          "metadata.posOrderId": String(doc._id),
          status: "success",
        } as any).lean();
        if (!existingPayment) {
          const lastPartial = Array.isArray(doc.partialPayments)
            ? doc.partialPayments[doc.partialPayments.length - 1]
            : undefined;
          await PaymentModel.create({
            tenantId,
            branchId,
            department: resolvedDepartment,
            invoiceId: invoice._id,
            guestId: doc.guestId,
            amount: amountToCapture,
            paymentMethod: normalizePaymentMethod(lastPartial?.method),
            status: "success",
            processedBy: auth.userId,
            metadata: {
              source: "pos-order",
              posOrderId: String(doc._id),
              orderNumber: doc.orderNumber,
            },
          } as any);
          invoice.paidAmount = Number((Number(invoice.paidAmount ?? 0) + amountToCapture).toFixed(2));
          invoice.status = INVOICE_STATUS.PAID as any;
          await invoice.save();
        }
      }
    }

    await doc.save();

    await writeActivityLog(req, auth, {
      action: statusChanged ? "BAR_ORDER_STATUS_UPDATED" : "BAR_ORDER_UPDATED",
      resource: "posOrder",
      resourceId: String(doc._id),
      details: {
        status: doc.status,
        paymentStatus: doc.paymentStatus,
        orderChannel: doc.orderChannel,
        kotStatus: doc.kotStatus,
        tipAmount: doc.tipAmount,
        serviceChargeAmount: doc.serviceChargeAmount,
        discountAmount: doc.discountAmount,
        stockDeducted: doc.stockDeducted,
        roomChargeId: doc.roomChargeId ? String(doc.roomChargeId) : null,
      },
    });

    return successResponse(doc.toObject());
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
      USER_ROLES.SUPERVISOR,
      USER_ROLES.CASHIER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const OrderModel = getPosOrderModelForDepartment(department);
    const doc = await OrderModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as Record<string, unknown>);
    if (!doc) throw new NotFoundError("Order");
    await writeActivityLog(req, auth, {
      action: "BAR_ORDER_DELETED",
      resource: "posOrder",
      resourceId: String(doc._id),
      details: { orderNumber: doc.orderNumber },
    });
    return noContentResponse();
  },
  { auth: true }
);
