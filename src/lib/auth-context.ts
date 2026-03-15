import { NextRequest } from "next/server";
import { verifyAccessToken, type JwtPayload } from "./jwt";
import { UnauthorizedError, ForbiddenError } from "./errors";
import { USER_ROLES, type UserRole } from "@/constants";

export interface AuthContext extends JwtPayload {
  userId: string;
  tenantId?: string;
  branchId?: string;
  role: string;
}

export function extractAuth(req: NextRequest): AuthContext {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const token = header.slice(7);
  try {
    return verifyAccessToken(token) as AuthContext;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export function requireRoles(auth: AuthContext, roles: UserRole[]): void {
  if (!roles.includes(auth.role as UserRole)) {
    throw new ForbiddenError(
      `Role '${auth.role}' is not authorized for this action`
    );
  }
}

export async function requirePermissions(
  auth: AuthContext,
  permissions: string[],
  options?: { allowRoles?: UserRole[] }
): Promise<void> {
  if (options?.allowRoles?.includes(auth.role as UserRole)) return;
  if (permissions.length === 0) return;

  const { default: User } = await import("@/models/user/User");
  const user = await User.findById(auth.userId).select("permissions role").lean();
  if (!user) {
    throw new ForbiddenError("User not found for permission check");
  }

  const userPermissions = new Set((user.permissions ?? []) as string[]);
  const hasPermission = permissions.some((permission) =>
    userPermissions.has(permission)
  );

  if (!hasPermission) {
    throw new ForbiddenError("Missing required permission for this action");
  }
}

export function getRequestMeta(req: NextRequest): {
  ipAddress?: string;
  userAgent?: string;
} {
  return {
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}

export function requireTenant(auth: AuthContext): string {
  if (!auth.tenantId) {
    throw new ForbiddenError("Tenant context required");
  }
  return auth.tenantId;
}

export function requireBranch(auth: AuthContext): {
  tenantId: string;
  branchId: string;
} {
  if (!auth.tenantId) {
    throw new ForbiddenError("Tenant context required");
  }
  if (!auth.branchId) {
    throw new ForbiddenError("Branch context required");
  }
  return { tenantId: auth.tenantId, branchId: auth.branchId };
}

/**
 * Returns tenantId and branchId. For tenantAdmin (and similar tenant-level roles)
 * without a branchId, resolves to the first branch of the tenant so they can
 * perform branch-scoped actions.
 */
export async function resolveBranch(auth: AuthContext): Promise<{
  tenantId: string;
  branchId: string;
}> {
  if (!auth.tenantId) {
    throw new ForbiddenError("Tenant context required");
  }
  if (auth.branchId) {
    return { tenantId: auth.tenantId, branchId: auth.branchId };
  }
  const tenantLevelRoles = [USER_ROLES.TENANT_ADMIN, USER_ROLES.HOTEL_OWNER];
  if (!tenantLevelRoles.includes(auth.role as UserRole)) {
    throw new ForbiddenError("Branch context required");
  }
  const { default: Branch } = await import("@/models/branch/Branch");
  const first = await Branch.findOne({ tenantId: auth.tenantId })
    .select("_id")
    .lean();
  if (!first) {
    throw new ForbiddenError("No branch found for tenant");
  }
  return {
    tenantId: auth.tenantId,
    branchId: String(first._id),
  };
}
