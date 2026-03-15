import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import BarShift from "@/models/pos/BarShift";
import { closeBarShiftSchema } from "@/validations/pos";
import { BAR_PERMISSIONS, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";

export const GET = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const shift = await BarShift.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any).lean();
    if (!shift) throw new NotFoundError("BAR shift");
    return successResponse(shift);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    await requirePermissions(
      auth,
      [BAR_PERMISSIONS.SHIFT_CLOSE, BAR_PERMISSIONS.VARIANCE_APPROVE],
      {
        allowRoles: [
          USER_ROLES.TENANT_ADMIN,
          USER_ROLES.BRANCH_MANAGER,
          USER_ROLES.BAR_MANAGER,
          USER_ROLES.BAR_CASHIER,
        ],
      }
    );

    const payload = closeBarShiftSchema.parse(await req.json());
    const shift = await BarShift.findOne({
      _id: params.id,
      tenantId,
      branchId,
    } as any);
    if (!shift) throw new NotFoundError("BAR shift");
    if (shift.isClosed) {
      throw new BadRequestError("Shift is already closed");
    }

    shift.closingCash = payload.closingCash;
    shift.closedAt = new Date();
    shift.closedBy = auth.userId as any;
    shift.closingStockSnapshot = payload.closingStockSnapshot.map((entry) => ({
      inventoryItemId: entry.inventoryItemId as any,
      quantity: entry.quantity,
    }));
    shift.varianceNotes = payload.varianceNotes;
    shift.isClosed = true;
    await shift.save();

    await writeActivityLog(req, auth, {
      action: "BAR_SHIFT_CLOSED",
      resource: "barShift",
      resourceId: String(shift._id),
      details: {
        closingCash: shift.closingCash,
        varianceNotes: shift.varianceNotes,
      },
    });

    return successResponse(shift.toObject());
  },
  { auth: true }
);
