import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { POS_KOT_STATUS, POS_ORDER_STATUS, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import { getPosOrderModelForDepartment } from "@/lib/department-pos";

const KITCHEN_FLOW_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.HEAD_CHEF,
  USER_ROLES.SOUS_CHEF,
  USER_ROLES.KITCHEN_STAFF,
  USER_ROLES.SUPERVISOR,
] as const;

const SERVICE_FLOW_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.SUPERVISOR,
  USER_ROLES.CASHIER,
  USER_ROLES.WAITER,
] as const;

const ALLOWED_KOT_TRANSITIONS: Record<string, string[]> = {
  [POS_KOT_STATUS.NOT_SENT]: [POS_KOT_STATUS.PREPARING],
  [POS_KOT_STATUS.PENDING]: [POS_KOT_STATUS.PREPARING],
  [POS_KOT_STATUS.PREPARING]: [POS_KOT_STATUS.READY],
  [POS_KOT_STATUS.READY]: [POS_KOT_STATUS.SERVED],
  [POS_KOT_STATUS.SERVED]: [],
};

function hasAnyRole(role: string, allowedRoles: readonly string[]) {
  return allowedRoles.includes(role);
}

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
      USER_ROLES.HEAD_CHEF,
      USER_ROLES.SOUS_CHEF,
      USER_ROLES.KITCHEN_STAFF,
      USER_ROLES.SUPERVISOR,
      USER_ROLES.CASHIER,
      USER_ROLES.WAITER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const OrderModel = getPosOrderModelForDepartment("restaurant");
    const body = (await req.json()) as {
      kotStatus?: (typeof POS_KOT_STATUS)[keyof typeof POS_KOT_STATUS];
    };
    const nextKot = body.kotStatus;
    if (!nextKot) return successResponse(null, 400, { message: "kotStatus is required" });
    const order = await OrderModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any);
    if (!order) throw new NotFoundError("Order");
    if (
      [POS_ORDER_STATUS.CANCELLED, POS_ORDER_STATUS.COMPLETED].includes(
        order.status as any
      )
    ) {
      throw new BadRequestError("Cannot update KDS status for closed orders");
    }

    const currentKot = (order.kotStatus as string) ?? POS_KOT_STATUS.NOT_SENT;
    if (nextKot === currentKot) {
      return successResponse(order.toObject());
    }
    const allowedNext = ALLOWED_KOT_TRANSITIONS[currentKot] ?? [];
    if (!allowedNext.includes(nextKot)) {
      throw new BadRequestError(
        `Invalid KDS transition from '${currentKot}' to '${nextKot}'`
      );
    }
    if (
      [POS_KOT_STATUS.PREPARING, POS_KOT_STATUS.READY].includes(nextKot) &&
      !hasAnyRole(auth.role, KITCHEN_FLOW_ROLES)
    ) {
      throw new ForbiddenError(
        "Only kitchen workflow roles can move orders to preparing/ready"
      );
    }
    if (
      nextKot === POS_KOT_STATUS.SERVED &&
      !hasAnyRole(auth.role, SERVICE_FLOW_ROLES)
    ) {
      throw new ForbiddenError(
        "Only service workflow roles can mark orders as served"
      );
    }

    order.kotStatus = nextKot as any;
    if (nextKot !== POS_KOT_STATUS.NOT_SENT && !order.kotSentAt) {
      order.kotSentAt = new Date();
    }
    if (nextKot === POS_KOT_STATUS.PREPARING) {
      order.status = POS_ORDER_STATUS.PREPARING as any;
    } else if (nextKot === POS_KOT_STATUS.READY) {
      order.status = POS_ORDER_STATUS.READY as any;
    } else if (nextKot === POS_KOT_STATUS.SERVED) {
      order.status = POS_ORDER_STATUS.SERVED as any;
      order.servedAt = new Date();
    }
    await order.save();

    await writeActivityLog(req, auth, {
      action: "RESTAURANT_KDS_STATUS_UPDATED",
      resource: "posOrder",
      resourceId: String(order._id),
      details: { kotStatus: order.kotStatus, orderStatus: order.status },
    });

    return successResponse(order.toObject());
  },
  { auth: true }
);
