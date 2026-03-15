import type { NextRequest } from "next/server";
import ActivityLog from "@/models/shared/ActivityLog";
import type { AuthContext } from "@/lib/auth-context";
import { getRequestMeta } from "@/lib/auth-context";

interface ActivityLogPayload {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

export async function writeActivityLog(
  req: NextRequest,
  auth: AuthContext,
  payload: ActivityLogPayload
) {
  const { ipAddress, userAgent } = getRequestMeta(req);
  await ActivityLog.create({
    tenantId: auth.tenantId,
    branchId: auth.branchId,
    userId: auth.userId,
    action: payload.action,
    resource: payload.resource,
    resourceId: payload.resourceId != null ? String(payload.resourceId) : undefined,
    details: payload.details,
    ipAddress,
    userAgent,
  } as Record<string, unknown>);
}
