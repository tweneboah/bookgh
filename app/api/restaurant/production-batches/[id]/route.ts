import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import { updateProductionBatchSchema } from "@/validations/restaurant";
import { writeActivityLog } from "@/lib/activity-log";
import mongoose from "mongoose";
import { getProductionBatchModelForDepartment } from "@/lib/department-restaurant";

const RESTAURANT_ROLES = [
  USER_ROLES.TENANT_ADMIN,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.RESTAURANT_MANAGER,
  USER_ROLES.HEAD_CHEF,
  USER_ROLES.SOUS_CHEF,
  USER_ROLES.KITCHEN_STAFF,
  USER_ROLES.STOREKEEPER,
  USER_ROLES.PROCUREMENT_OFFICER,
  USER_ROLES.ACCOUNTANT,
] as const;

export const GET = withHandler(
  async (_req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const ProductionBatchModel = getProductionBatchModelForDepartment("restaurant");
    const doc = await ProductionBatchModel.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    if (!doc) throw new NotFoundError("Production batch");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const ProductionBatchModel = getProductionBatchModelForDepartment("restaurant");
    const data = updateProductionBatchSchema.parse(await req.json());
    const payload: Record<string, unknown> = {
      ...data,
      ...(data.recipeId ? { recipeId: new mongoose.Types.ObjectId(data.recipeId) } : {}),
      ...(data.productionDate ? { productionDate: new Date(data.productionDate) } : {}),
      ...(data.inputs
        ? {
            inputs: data.inputs.map((row) => ({
              ...row,
              inventoryItemId: new mongoose.Types.ObjectId(row.inventoryItemId),
            })),
          }
        : {}),
      ...(data.output
        ? {
            output: {
              ...data.output,
              inventoryItemId: data.output.inventoryItemId
                ? new mongoose.Types.ObjectId(data.output.inventoryItemId)
                : undefined,
            },
          }
        : {}),
    };
    const doc = await ProductionBatchModel.findOneAndUpdate(
      { _id: params.id, tenantId, branchId } as any,
      payload,
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Production batch");
    await writeActivityLog(req, auth, {
      action: "RESTAURANT_PRODUCTION_BATCH_UPDATED",
      resource: "productionBatch",
      resourceId: String(doc._id),
    });
    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [...RESTAURANT_ROLES]);
    const { tenantId, branchId } = requireBranch(auth);
    const ProductionBatchModel = getProductionBatchModelForDepartment("restaurant");
    const doc = await ProductionBatchModel.findOneAndDelete({
      _id: params.id,
      tenantId,
      branchId,
    } as any);
    if (!doc) throw new NotFoundError("Production batch");
    await writeActivityLog(req, auth, {
      action: "RESTAURANT_PRODUCTION_BATCH_DELETED",
      resource: "productionBatch",
      resourceId: String(doc._id),
    });
    return noContentResponse();
  },
  { auth: true }
);
