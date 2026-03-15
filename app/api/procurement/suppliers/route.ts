import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import { supplierSchema } from "@/validations/procurement";
import {
  getSupplierModelForDepartment,
  normalizeProcurementDepartment,
} from "@/lib/department-procurement";

const SORT_FIELDS = ["name", "status", "rating", "createdAt"];

const PROCUREMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.INVENTORY_MANAGER,
  USER_ROLES.STOREKEEPER,
] as const;

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const SupplierModel = getSupplierModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const q = req.nextUrl.searchParams.get("q");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q, $options: "i" };

    const query = SupplierModel.find(filter as any).sort(parseSortString(sort, SORT_FIELDS));
    const countQuery = SupplierModel.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const SupplierModel = getSupplierModelForDepartment(department);
    const body = await req.json();
    const data = supplierSchema.parse(body);

    const doc = await SupplierModel.create({
      ...data,
      tenantId,
      branchId,
      createdBy: auth.userId,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "supplier",
      resourceId: doc._id,
      details: { name: doc.name },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
