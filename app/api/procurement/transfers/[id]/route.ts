import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES, TRANSFER_STATUS } from "@/constants";
import ActivityLog from "@/models/shared/ActivityLog";
import { updateStockTransferSchema } from "@/validations/procurement";
import mongoose from "mongoose";
import {
  getInventoryItemModelForDepartment,
  getInventoryMovementModelForDepartment,
} from "@/lib/department-inventory";
import {
  getStockTransferModelForDepartment,
  normalizeProcurementDepartment,
} from "@/lib/department-procurement";

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
  async (req, { params, auth }) => {
    requireRoles(auth, [...PROCUREMENT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizeProcurementDepartment(
      req.nextUrl.searchParams.get("department")
    );
    const StockTransferModel = getStockTransferModelForDepartment(department);
    const doc = await StockTransferModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    if (!doc) throw new NotFoundError("Transfer");
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
    const StockTransferModel = getStockTransferModelForDepartment(department);
    const InventoryItemModel = getInventoryItemModelForDepartment(department);
    const InventoryMovementModel = getInventoryMovementModelForDepartment(department);
    const body = updateStockTransferSchema.parse(await req.json());
    const payload = {
      ...body,
      ...(body.fromBranchId ? { fromBranchId: toObjectId(body.fromBranchId) } : {}),
      ...(body.toBranchId ? { toBranchId: toObjectId(body.toBranchId) } : {}),
      ...(body.transferDate ? { transferDate: new Date(body.transferDate) } : {}),
      ...(body.expectedArrival ? { expectedArrival: new Date(body.expectedArrival) } : {}),
      ...(body.completedAt ? { completedAt: new Date(body.completedAt) } : {}),
      ...(body.requestedBy ? { requestedBy: toObjectId(body.requestedBy) } : {}),
      ...(body.approvedBy ? { approvedBy: toObjectId(body.approvedBy) } : {}),
      ...(body.lines
        ? {
            lines: body.lines.map((line) => ({
              ...line,
              inventoryItemId: toObjectId(line.inventoryItemId),
            })),
          }
        : {}),
    };

    const before = await StockTransferModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    const doc = await StockTransferModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as any,
      payload,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Transfer");

    if (
      before?.status !== TRANSFER_STATUS.COMPLETED &&
      doc.status === TRANSFER_STATUS.COMPLETED
    ) {
      for (const line of doc.lines ?? []) {
        const sourceItem = await InventoryItemModel.findOne({
          _id: line.inventoryItemId,
          tenantId,
          branchId: doc.fromBranchId,
        } as any);
        if (sourceItem) {
          const previousStock = Number(sourceItem.currentStock ?? 0);
          const resultingStock = Math.max(0, previousStock - Number(line.quantity ?? 0));
          sourceItem.currentStock = resultingStock;
          await sourceItem.save();
          await InventoryMovementModel.create({
            tenantId,
            branchId: doc.fromBranchId,
            inventoryItemId: sourceItem._id,
            movementType: "adjustment",
            quantity: Number(line.quantity ?? 0),
            unit: String(sourceItem.unit ?? line.unit ?? "unit"),
            previousStock,
            resultingStock,
            reason: `Transfer OUT ${doc.transferNumber}`,
            createdBy: auth.userId,
            metadata: { transferId: doc._id, direction: "out" },
          } as any);
        }

        const destinationItem = await InventoryItemModel.findOne({
          _id: line.inventoryItemId,
          tenantId,
          branchId: doc.toBranchId,
        } as any);
        if (destinationItem) {
          const previousStock = Number(destinationItem.currentStock ?? 0);
          const resultingStock = previousStock + Number(line.quantity ?? 0);
          destinationItem.currentStock = resultingStock;
          await destinationItem.save();
          await InventoryMovementModel.create({
            tenantId,
            branchId: doc.toBranchId,
            inventoryItemId: destinationItem._id,
            movementType: "adjustment",
            quantity: Number(line.quantity ?? 0),
            unit: String(destinationItem.unit ?? line.unit ?? "unit"),
            previousStock,
            resultingStock,
            reason: `Transfer IN ${doc.transferNumber}`,
            createdBy: auth.userId,
            metadata: { transferId: doc._id, direction: "in" },
          } as any);
        }
      }
    }

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "update",
      resource: "stockTransfer",
      resourceId: doc._id,
      details: payload,
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
    const StockTransferModel = getStockTransferModelForDepartment(department);
    const doc = await StockTransferModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as any);
    if (!doc) throw new NotFoundError("Transfer");

    await ActivityLog.create({
      tenantId,
      branchId,
      userId: auth.userId,
      action: "delete",
      resource: "stockTransfer",
      resourceId: doc._id,
    } as any);

    return noContentResponse();
  },
  { auth: true }
);
