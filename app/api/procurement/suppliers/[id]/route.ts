import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import { updateSupplierSchema } from "@/validations/procurement";
import {
  getSupplierModelForDepartment,
  normalizeProcurementDepartment,
} from "@/lib/department-procurement";

const PROCUREMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.INVENTORY_MANAGER,
  USER_ROLES.STOREKEEPER,
] as const;

export const GET = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const SupplierModel = getSupplierModelForDepartment(department);
    const doc = await SupplierModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    if (!doc) throw new NotFoundError("Supplier");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const SupplierModel = getSupplierModelForDepartment(department);
    const body = updateSupplierSchema.parse(await req.json());
    const normalized = {
      ...body,
      ...(body.blockedUntil ? { blockedUntil: new Date(body.blockedUntil) } : {}),
      ...(body.documents
        ? {
            documents: body.documents.map((doc) => ({
              ...doc,
              expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
            })),
          }
        : {}),
    };
    if (normalized.name || normalized.email || normalized.phone) {
      const duplicate = await SupplierModel.findOne({
        _id: { $ne: params.id },
        tenantId,
        branchId,
        $or: [
          ...(normalized.name ? [{ name: normalized.name }] : []),
          ...(normalized.email ? [{ email: normalized.email }] : []),
          ...(normalized.phone ? [{ phone: normalized.phone }] : []),
        ],
      } as any)
        .select("_id name")
        .lean();
      if (duplicate) {
        throw new BadRequestError(
          `Potential duplicate found: ${duplicate.name}. Merge records before saving this update.`
        );
      }
    }
    const doc = await SupplierModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as any,
      normalized,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Supplier");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "supplier",
      resourceId: doc._id,
      details: normalized,
    } as any);

    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const SupplierModel = getSupplierModelForDepartment(department);
    const doc = await SupplierModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as any);
    if (!doc) throw new NotFoundError("Supplier");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "supplier",
      resourceId: doc._id,
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
