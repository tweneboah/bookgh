import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireTenant, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { USER_ROLES, BAR_ROLE_DEFAULT_PERMISSIONS } from "@/constants";
import User from "@/models/user/User";
import Branch from "@/models/branch/Branch";
import { registerSchema } from "@/validations/auth";
import { hashPassword } from "@/lib/password";

const USER_SORT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "role",
  "createdAt",
  "isActive",
];

function sanitizeUser(user: Record<string, unknown>) {
  const { password: _p, ...rest } = user;
  return rest;
}

export const GET = withHandler(
  async (req: NextRequest, { auth }) => {
    const tenantId = requireTenant(auth);

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const role = searchParams.get("role");
    const paginationParams = parsePagination(searchParams);
    const sort = parseSortString(
      paginationParams.sort,
      USER_SORT_FIELDS
    );

    const filter: Record<string, unknown> = { tenantId };
    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        throw new BadRequestError("Invalid branchId");
      }
      filter.branchId = branchId;
    }
    if (role) filter.role = role;

    const query = User.find(filter as any).select("-password").sort(sort);
    const countQuery = User.countDocuments(filter as any);

    const result = await paginate(query, countQuery, paginationParams);

    return successResponse(
      result.items.map((u) => sanitizeUser(u as unknown as Record<string, unknown>)),
      200,
      { pagination: result.pagination }
    );
  },
  { auth: true }
);

export const POST = withHandler(
  async (req: NextRequest, { auth }) => {
    const tenantId = requireTenant(auth);
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
      USER_ROLES.SUPER_ADMIN,
    ]);

    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await User.findOne({ email: data.email }).lean();
    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const hashedPassword = await hashPassword(data.password);

    let branchId: string | null = data.branchId ?? null;
    if (auth.role === USER_ROLES.BRANCH_MANAGER && auth.branchId) {
      branchId = auth.branchId;
    } else if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        throw new BadRequestError("Invalid branchId");
      }
      const branch = await Branch.findOne({
        _id: branchId,
        tenantId,
      } as any).lean();
      if (!branch) {
        throw new NotFoundError("Branch");
      }
    }

    const userData: Record<string, unknown> = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: hashedPassword,
      ...(data.phone?.trim() ? { phone: data.phone.trim() } : {}),
      role: data.role ?? USER_ROLES.FRONT_DESK,
      tenantId,
      branchId,
      permissions:
        BAR_ROLE_DEFAULT_PERMISSIONS[data.role ?? USER_ROLES.FRONT_DESK] ?? [],
    };

    const user = await User.create(userData as any);

    const { password: _p, ...userObj } = user.toObject();
    return createdResponse(userObj);
  },
  { auth: true }
);
