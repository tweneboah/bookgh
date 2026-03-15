import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { updateInventoryItemSchema } from "@/validations/pos";
import { BAR_PERMISSIONS, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";
import {
  getInventoryItemModelsForQuery,
  normalizeInventoryDepartment,
} from "@/lib/department-inventory";

export const GET = withHandler(
  async (_req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BARTENDER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    await requirePermissions(auth, [BAR_PERMISSIONS.REPORT_VIEW], {
      allowRoles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.BRANCH_MANAGER],
    });
    const department = normalizeInventoryDepartment(
      _req.nextUrl.searchParams.get("department")
    );
    let doc: any = null;
    for (const Model of getInventoryItemModelsForQuery(department)) {
      doc = await Model.findOne({
        _id: params.id,
        tenantId,
        branchId,
      } as Record<string, unknown>).lean();
      if (doc) break;
    }
    if (!doc) throw new NotFoundError("Inventory item");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    await requirePermissions(
      auth,
      [BAR_PERMISSIONS.STOCK_MANAGE, BAR_PERMISSIONS.STOCK_ADJUST],
      {
        allowRoles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.BRANCH_MANAGER],
      }
    );
    const body = updateInventoryItemSchema.parse(await req.json());
    const department = normalizeInventoryDepartment(
      req.nextUrl.searchParams.get("department")
    );
    let doc: any = null;
    for (const Model of getInventoryItemModelsForQuery(department)) {
      doc = await Model.findOneAndUpdate(
        { _id: params.id, tenantId, branchId } as Record<string, unknown>,
        body,
        { new: true, runValidators: true }
      ).lean();
      if (doc) break;
    }
    if (!doc) throw new NotFoundError("Inventory item");
    await writeActivityLog(req, auth, {
      action: "BAR_INVENTORY_UPDATED",
      resource: "inventoryItem",
      resourceId: String(doc._id),
      details: {
        updatedFields: Object.keys(body),
      },
    });
    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { params, auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    await requirePermissions(auth, [BAR_PERMISSIONS.STOCK_MANAGE], {
      allowRoles: [USER_ROLES.TENANT_ADMIN, USER_ROLES.BRANCH_MANAGER],
    });
    const department = normalizeInventoryDepartment(
      req.nextUrl.searchParams.get("department")
    );
    let doc: any = null;
    for (const Model of getInventoryItemModelsForQuery(department)) {
      doc = await Model.findOneAndDelete({
        _id: params.id,
        tenantId,
        branchId,
      } as Record<string, unknown>);
      if (doc) break;
    }
    if (!doc) throw new NotFoundError("Inventory item");
    await writeActivityLog(req, auth, {
      action: "BAR_INVENTORY_DELETED",
      resource: "inventoryItem",
      resourceId: String(doc._id),
      details: { name: doc.name },
    });
    return noContentResponse();
  },
  { auth: true }
);
