import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireRoles, requireTenant } from "@/lib/auth-context";
import { BadRequestError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import SystemConfig from "@/models/platform/SystemConfig";

const DEFAULT_KDS_SLA_MINUTES = 20;

function buildKey(tenantId: string, branchId: string) {
  return `restaurant.kds.sla.${tenantId}.${branchId}`;
}

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
      USER_ROLES.SUPERVISOR,
    ]);
    const tenantId = requireTenant(auth);
    const branchId = req.nextUrl.searchParams.get("branchId") ?? auth.branchId;
    if (!branchId) throw new BadRequestError("branchId is required");
    const key = buildKey(tenantId, branchId);
    const row = await SystemConfig.findOne({ key }).lean();
    return successResponse({
      tenantId,
      branchId,
      slaMinutes: parseSlaValue(row?.value),
      source: row ? "configured" : "default",
    });
  },
  { auth: true }
);

export const PUT = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
    ]);
    const tenantId = requireTenant(auth);
    const body = (await req.json()) as { branchId?: string; slaMinutes?: number };
    const branchId = body.branchId ?? auth.branchId;
    if (!branchId) throw new BadRequestError("branchId is required");
    const slaMinutes = parseSlaValue(body.slaMinutes);
    const key = buildKey(tenantId, branchId);
    await SystemConfig.findOneAndUpdate(
      { key },
      {
        $set: {
          key,
          value: slaMinutes,
          description: "Restaurant KDS SLA in minutes",
        },
      },
      { upsert: true, new: true }
    );
    return successResponse({ tenantId, branchId, slaMinutes });
  },
  { auth: true }
);
