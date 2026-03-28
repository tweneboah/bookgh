import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError } from "@/lib/errors";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import { supplierSchema } from "@/validations/procurement";
import {
  getPurchaseOrderModelForDepartment,
  getSupplierModelForDepartment,
  normalizeProcurementDepartment,
} from "@/lib/department-procurement";
import mongoose from "mongoose";

const SORT_FIELDS = ["name", "status", "rating", "createdAt"];

const PROCUREMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.INVENTORY_MANAGER,
  USER_ROLES.STOREKEEPER,
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseOptionalNumber(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const SupplierModel = getSupplierModelForDepartment(department);
    const PurchaseOrderModel = getPurchaseOrderModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const q = req.nextUrl.searchParams.get("q");
    const category = req.nextUrl.searchParams.get("category");
    const paymentTerms = req.nextUrl.searchParams.get("paymentTerms");
    const minRating = parseOptionalNumber(req.nextUrl.searchParams.get("minRating"));
    const minOnTimeRate = parseOptionalNumber(
      req.nextUrl.searchParams.get("minOnTimeRate")
    );
    const maxLeadTime = parseOptionalNumber(req.nextUrl.searchParams.get("maxLeadTime"));

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { contactPerson: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }
    if (category) {
      const normalizedCategory = category.trim();
      if (normalizedCategory) {
        filter.categories = {
          $elemMatch: {
            $regex: escapeRegExp(normalizedCategory),
            $options: "i",
          },
        };
      }
    }
    if (paymentTerms) filter.paymentTerms = paymentTerms;
    if (minRating != null) filter.rating = { $gte: minRating };
    if (minOnTimeRate != null) filter.onTimeRate = { $gte: minOnTimeRate };
    if (maxLeadTime != null) filter.leadTimeDays = { $lte: maxLeadTime };

    const query = SupplierModel.find(filter as any).sort(parseSortString(sort, SORT_FIELDS));
    const countQuery = SupplierModel.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });
    const supplierIds = result.items
      .map((supplier: any) => String(supplier._id ?? ""))
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));
    const poStats = supplierIds.length
      ? await PurchaseOrderModel.aggregate([
          {
            $match: {
              tenantId: new mongoose.Types.ObjectId(tenantId),
              branchId: new mongoose.Types.ObjectId(branchId),
              supplierId: { $in: supplierIds },
            },
          },
          {
            $group: {
              _id: "$supplierId",
              totalOrders: { $sum: 1 },
              totalSpend: { $sum: "$totalAmount" },
              lastOrderAt: { $max: "$orderDate" },
            },
          },
        ])
      : [];
    const poStatsMap = new Map(
      poStats.map((row: any) => [String(row._id), row])
    );

    const recentPurchases = supplierIds.length
      ? await PurchaseOrderModel.aggregate([
          {
            $match: {
              tenantId: new mongoose.Types.ObjectId(tenantId),
              branchId: new mongoose.Types.ObjectId(branchId),
              supplierId: { $in: supplierIds },
            },
          },
          { $sort: { orderDate: -1, createdAt: -1 } },
          {
            $project: {
              supplierId: 1,
              poNumber: 1,
              orderDate: 1,
              expectedDate: 1,
              receivedDate: 1,
              status: 1,
              totalAmount: 1,
            },
          },
          {
            $group: {
              _id: "$supplierId",
              orders: { $push: "$$ROOT" },
            },
          },
          {
            $project: {
              _id: 1,
              orders: { $slice: ["$orders", 3] },
            },
          },
        ])
      : [];
    const recentPurchasesMap = new Map(
      recentPurchases.map((row: any) => [String(row._id), row.orders ?? []])
    );
    const items = result.items.map((supplier: any) => {
      const stats = poStatsMap.get(String(supplier._id));
      const orders = recentPurchasesMap.get(String(supplier._id)) ?? [];
      return {
        ...supplier,
        totalOrders: Number(stats?.totalOrders ?? 0),
        totalSpend: Number(stats?.totalSpend ?? 0),
        lastOrderAt: stats?.lastOrderAt ?? null,
        recentPurchaseOrders: orders,
      };
    });

    return successResponse(items, 200, { pagination: result.pagination });
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
    const normalized = {
      ...data,
      blockedUntil: data.blockedUntil ? new Date(data.blockedUntil) : undefined,
      documents: data.documents?.map((doc) => ({
        ...doc,
        expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
      })),
    };
    const duplicate = await SupplierModel.findOne({
      tenantId,
      branchId,
      $or: [
        { name: normalized.name },
        ...(normalized.email ? [{ email: normalized.email }] : []),
        ...(normalized.phone ? [{ phone: normalized.phone }] : []),
      ],
    } as any)
      .select("_id name email phone")
      .lean();
    if (duplicate) {
      throw new BadRequestError(
        `Potential duplicate found: ${duplicate.name}. Open this supplier and update instead of creating a new record.`
      );
    }

    const doc = await SupplierModel.create({
      ...normalized,
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
