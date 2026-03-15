import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { createOrderSchema } from "@/validations/pos";
import { BAR_PERMISSIONS, USER_ROLES, DEPARTMENT, COA_REVENUE_CODES } from "@/constants";
import {
  ensureSufficientBarStock,
  resolveBarOrderPricing,
} from "@/lib/bar-service";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getPosOrderModelForDepartment,
  normalizePosDepartment,
} from "@/lib/department-pos";

const SORT_FIELDS = ["status", "paymentStatus", "totalAmount", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
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
      req.nextUrl.searchParams.get("department")
    );
    const OrderModel = getPosOrderModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const paymentStatus = req.nextUrl.searchParams.get("paymentStatus");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const query = OrderModel.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = OrderModel.countDocuments(
      filter as Record<string, unknown>
    );
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
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
    await requirePermissions(auth, [BAR_PERMISSIONS.ORDER_CREATE], {
      allowRoles: [
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
      ],
    });
    const body = await req.json();
    const data = createOrderSchema.parse(body);
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const OrderModel = getPosOrderModelForDepartment(department);
    await ensureSufficientBarStock({
      tenantId,
      branchId,
      items: data.items as any,
      department,
    });
    const pricing = await resolveBarOrderPricing({
      tenantId,
      branchId,
      items: data.items as any,
      department,
    });

    const orderNumber = `ORD-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const initialPayment =
      Array.isArray(data.partialPayments) && data.partialPayments.length > 0
        ? data.partialPayments.map((p: any) => ({
            method: p.method,
            amount: Number(p.amount ?? 0),
            reference: p.reference,
            paidAt: p.paidAt ? new Date(p.paidAt) : new Date(),
          }))
        : [];
    const isPaidOnCreate = data.paymentStatus === "paid" && initialPayment.length > 0;
    const partialPayments = isPaidOnCreate
      ? initialPayment.map((p: any) => ({
          ...p,
          amount: pricing.totalAmount,
        }))
      : initialPayment;

    const defaultRevenueCode =
      department === DEPARTMENT.RESTAURANT ? "restaurant-sales" : undefined;
    const revenueAccountCode =
      data.revenueAccountCode && COA_REVENUE_CODES.includes(data.revenueAccountCode)
        ? data.revenueAccountCode
        : defaultRevenueCode;

    const doc = await OrderModel.create({
      ...data,
      items: pricing.items,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      totalAmount: pricing.totalAmount,
      tipAmount: data.tipAmount ?? 0,
      serviceChargeAmount: data.serviceChargeAmount ?? 0,
      discountAmount: data.discountAmount ?? 0,
      orderChannel: data.orderChannel ?? "dineIn",
      waiterId: data.waiterId,
      waiterName: data.waiterName,
      partialPayments,
      paymentStatus: data.paymentStatus ?? "unpaid",
      appliedRule: pricing.appliedRule ?? undefined,
      revenueAccountCode,
      tenantId,
      branchId,
      orderNumber,
      createdBy: auth.userId,
    } as Record<string, unknown>);

    await writeActivityLog(req, auth, {
      action: "BAR_ORDER_CREATED",
      resource: "posOrder",
      resourceId: String(doc._id),
      details: {
        orderNumber,
        totalAmount: pricing.totalAmount,
        addToRoomBill: doc.addToRoomBill,
        appliedRule: pricing.appliedRule,
      },
    });

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
