import mongoose from "mongoose";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import {
  getPurchaseOrderModelForDepartment,
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
    const PurchaseOrderModel = getPurchaseOrderModelForDepartment(department);
    const supplier = await SupplierModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any)
      .select("_id name")
      .lean();
    if (!supplier) throw new NotFoundError("Supplier");

    const supplierObjectId = new mongoose.Types.ObjectId(params.id);
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const [summary] = await PurchaseOrderModel.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          branchId: branchObjectId,
          supplierId: supplierObjectId,
        },
      },
      {
        $group: {
          _id: "$supplierId",
          totalOrders: { $sum: 1 },
          totalSpend: { $sum: "$totalAmount" },
          avgOrderValue: { $avg: "$totalAmount" },
          lastOrderAt: { $max: "$orderDate" },
        },
      },
    ]);

    const timeline = await ActivityLog.find({
      tenantId,
      branchId,
      $or: [
        { resource: "supplier", resourceId: params.id },
        {
          resource: "purchaseOrder",
          "details.supplierId": params.id,
        },
      ],
    } as any)
      .sort({ createdAt: -1 })
      .limit(50)
      .select("action resource resourceId details createdAt")
      .lean();

    return successResponse({
      supplier,
      summary: {
        totalOrders: Number(summary?.totalOrders ?? 0),
        totalSpend: Number(summary?.totalSpend ?? 0),
        avgOrderValue: Number(summary?.avgOrderValue ?? 0),
        lastOrderAt: summary?.lastOrderAt ?? null,
      },
      timeline,
    });
  },
  { auth: true }
);
