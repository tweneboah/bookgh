import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { POS_ORDER_STATUS, POS_KOT_STATUS, USER_ROLES } from "@/constants";
import SystemConfig from "@/models/platform/SystemConfig";
import { getPosOrderModelForDepartment } from "@/lib/department-pos";

const DEFAULT_KDS_SLA_MINUTES = 20;

function parseSlaValue(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_KDS_SLA_MINUTES;
  return Math.min(180, Math.max(5, Math.round(num)));
}

export const GET = withHandler(
  async (req, { auth }) => {
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
    const status = req.nextUrl.searchParams.get("kotStatus");
    const filter: Record<string, unknown> = {
      tenantId,
      branchId,
      status: {
        $in: [
          POS_ORDER_STATUS.PENDING,
          POS_ORDER_STATUS.PREPARING,
          POS_ORDER_STATUS.READY,
          POS_ORDER_STATUS.SERVED,
        ],
      },
    };
    if (status) filter.kotStatus = status;
    const rows = await OrderModel.find(filter as any)
      .sort({ createdAt: 1 })
      .lean();
    const slaKey = `restaurant.kds.sla.${tenantId}.${branchId}`;
    const slaConfig = await SystemConfig.findOne({ key: slaKey })
      .select("value")
      .lean();
    return successResponse({
      config: {
        slaMinutes: parseSlaValue(slaConfig?.value),
      },
      lanes: {
        pending: rows.filter((r) =>
          [POS_KOT_STATUS.NOT_SENT, POS_KOT_STATUS.PENDING].includes(
            (r.kotStatus as any) ?? POS_KOT_STATUS.NOT_SENT
          )
        ),
        preparing: rows.filter((r) => r.kotStatus === POS_KOT_STATUS.PREPARING),
        ready: rows.filter((r) => r.kotStatus === POS_KOT_STATUS.READY),
        served: rows.filter((r) => r.kotStatus === POS_KOT_STATUS.SERVED),
      },
      rows,
    });
  },
  { auth: true }
);
