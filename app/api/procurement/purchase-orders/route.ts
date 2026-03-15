import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { BadRequestError } from "@/lib/errors";
import {
  USER_ROLES,
} from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import { purchaseOrderSchema } from "@/validations/procurement";
import mongoose from "mongoose";
import {
  getPurchaseOrderModelForDepartment,
  getSupplierModelForDepartment,
  normalizeProcurementDepartment,
} from "@/lib/department-procurement";
import { getInventoryItemModelForDepartment } from "@/lib/department-inventory";

const SORT_FIELDS = ["orderDate", "expectedDate", "totalAmount", "status", "createdAt"];

const PROCUREMENT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.INVENTORY_MANAGER,
  USER_ROLES.STOREKEEPER,
] as const;

function toObjectId(value: string) {
  return new mongoose.Types.ObjectId(value);
}

async function mapPayload(
  data: ReturnType<typeof purchaseOrderSchema.parse>,
  opts: {
    tenantId: string;
    branchId: string;
    InventoryItemModel: any;
  }
) {
  const inventoryIds = data.lines
    .map((line) => String(line.inventoryItemId ?? ""))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  const inventoryItems = inventoryIds.length
    ? await opts.InventoryItemModel.find({
        _id: { $in: inventoryIds },
        tenantId: opts.tenantId,
        branchId: opts.branchId,
      } as any)
        .select("_id unit unitCost name")
        .lean()
    : [];
  const inventoryMap = new Map(
    inventoryItems.map((item: any) => [String(item._id), item])
  );
  const lines = data.lines.map((line) => {
    const quantity = Number(line.quantity ?? 0);
    const inventory = line.inventoryItemId
      ? inventoryMap.get(String(line.inventoryItemId))
      : null;
    const unitCost = Number(line.unitCost ?? inventory?.unitCost ?? 0);
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      throw new BadRequestError(
        `Unit cost is required and must be greater than zero for ${line.itemName}.`
      );
    }
    const totalCost = Number((quantity * unitCost).toFixed(2));
    return {
      ...line,
      quantity,
      unitCost,
      totalCost,
      unit: String(line.unit ?? inventory?.unit ?? "unit"),
      itemName: String(line.itemName ?? inventory?.name ?? "Item"),
      inventoryItemId: line.inventoryItemId ? toObjectId(line.inventoryItemId) : undefined,
    };
  });
  const subtotal = Number(
    lines.reduce((sum, line) => sum + Number(line.totalCost ?? 0), 0).toFixed(2)
  );
  const taxAmount = Number(data.taxAmount ?? 0);
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));
  return {
    ...data,
    supplierId: toObjectId(data.supplierId),
    requestedBy: data.requestedBy,
    approvedBy: data.approvedBy ? toObjectId(data.approvedBy) : undefined,
    orderDate: new Date(data.orderDate),
    expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
    receivedDate: data.receivedDate ? new Date(data.receivedDate) : undefined,
    lines,
    subtotal,
    totalAmount,
  };
}

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const PurchaseOrderModel = getPurchaseOrderModelForDepartment(department);
    const SupplierModel = getSupplierModelForDepartment(department);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const supplierId = req.nextUrl.searchParams.get("supplierId");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      filter.supplierId = new mongoose.Types.ObjectId(supplierId);
    }

    const query = PurchaseOrderModel.find(filter as any).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = PurchaseOrderModel.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });
    const supplierIds = result.items
      .map((row: any) => String(row.supplierId ?? ""))
      .filter(Boolean);
    const suppliers = supplierIds.length
      ? await SupplierModel.find({
          _id: { $in: supplierIds },
          tenantId,
          branchId,
        } as any)
          .select("_id name")
          .lean()
      : [];
    const supplierMap = new Map(
      suppliers.map((supplier: any) => [String(supplier._id), supplier])
    );
    const items = result.items.map((row: any) => ({
      ...row,
      supplierId: supplierMap.get(String(row.supplierId)) ?? row.supplierId,
    }));

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
    const PurchaseOrderModel = getPurchaseOrderModelForDepartment(department);
    const InventoryItemModel = getInventoryItemModelForDepartment(department);
    const body = await req.json();
    const data = purchaseOrderSchema.parse(body);
    const payload = await mapPayload(data, {
      tenantId,
      branchId,
      InventoryItemModel,
    });

    const doc = await PurchaseOrderModel.create({
      ...payload,
      requestedBy: payload.requestedBy
        ? toObjectId(payload.requestedBy)
        : new mongoose.Types.ObjectId(auth.userId),
      tenantId,
      branchId,
      createdBy: auth.userId,
    } as any);

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "create",
      resource: "purchaseOrder",
      resourceId: doc._id,
      details: { poNumber: doc.poNumber, totalAmount: doc.totalAmount },
    } as any);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
