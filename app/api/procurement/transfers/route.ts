import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { USER_ROLES } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import { stockTransferSchema } from "@/validations/procurement";
import mongoose from "mongoose";
import {
  getStockTransferModelForDepartment,
  normalizeProcurementDepartment,
} from "@/lib/department-procurement";

const SORT_FIELDS = ["transferDate", "expectedArrival", "status", "createdAt"];
const PROCUREMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.INVENTORY_MANAGER,
  USER_ROLES.STOREKEEPER,
] as const;

function toObjectId(value: string) {
  return new mongoose.Types.ObjectId(value);
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const StockTransferModel = getStockTransferModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;

    const query = StockTransferModel.find(filter as any).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = StockTransferModel.countDocuments(filter as any);
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
    const StockTransferModel = getStockTransferModelForDepartment(department);
    const body = await req.json();
    const data = stockTransferSchema.parse(body);

    const doc = await StockTransferModel.create({
      transferNumber: data.transferNumber,
      fromBranchId: toObjectId(data.fromBranchId),
      toBranchId: toObjectId(data.toBranchId),
      transferDate: new Date(data.transferDate),
      expectedArrival: data.expectedArrival
        ? new Date(data.expectedArrival)
        : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      requestedBy: data.requestedBy
        ? toObjectId(data.requestedBy)
        : new mongoose.Types.ObjectId(auth.userId),
      approvedBy: data.approvedBy ? toObjectId(data.approvedBy) : undefined,
      status: data.status,
      lines: data.lines.map((line) => ({
        ...line,
        inventoryItemId: toObjectId(line.inventoryItemId),
      })),
      notes: data.notes,
      tenantId,
      branchId,
      createdBy: auth.userId,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "stockTransfer",
      resourceId: doc._id,
      details: { transferNumber: doc.transferNumber, status: doc.status },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
