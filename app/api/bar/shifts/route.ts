import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requirePermissions, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import BarShift from "@/models/pos/BarShift";
import { openBarShiftSchema } from "@/validations/pos";
import { BAR_PERMISSIONS, USER_ROLES } from "@/constants";
import { writeActivityLog } from "@/lib/activity-log";

const SORT_FIELDS = ["openedAt", "closedAt", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    await requirePermissions(auth, [BAR_PERMISSIONS.REPORT_VIEW], {
      allowRoles: [
        USER_ROLES.TENANT_ADMIN,
        USER_ROLES.BRANCH_MANAGER,
        USER_ROLES.BAR_MANAGER,
        USER_ROLES.BAR_CASHIER,
        USER_ROLES.ACCOUNTANT,
      ],
    });
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const isClosed = req.nextUrl.searchParams.get("isClosed");
    const filter: Record<string, unknown> = { tenantId, branchId };
    if (isClosed != null) {
      filter.isClosed = isClosed === "true";
    }
    const query = BarShift.find(filter as any)
      .sort(parseSortString(sort, SORT_FIELDS))
      .populate("openedBy", "firstName lastName email");
    const countQuery = BarShift.countDocuments(filter as any);
    const result = await paginate(query, countQuery, { page, limit, sort });
    return successResponse(result.items, 200, { pagination: result.pagination });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BAR_CASHIER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    await requirePermissions(auth, [BAR_PERMISSIONS.SHIFT_OPEN], {
      allowRoles: [
        USER_ROLES.TENANT_ADMIN,
        USER_ROLES.BRANCH_MANAGER,
        USER_ROLES.BAR_MANAGER,
        USER_ROLES.BAR_CASHIER,
      ],
    });

    const body = openBarShiftSchema.parse(await req.json());
    const doc = await BarShift.create({
      tenantId,
      branchId,
      shiftName: body.shiftName,
      openingCash: body.openingCash ?? 0,
      openingStockSnapshot:
        body.openingStockSnapshot?.map((entry) => ({
          inventoryItemId: entry.inventoryItemId,
          quantity: entry.quantity,
        })) ?? [],
      openedBy: auth.userId,
      openedAt: new Date(),
      isClosed: false,
    } as any);

    await writeActivityLog(req, auth, {
      action: "BAR_SHIFT_OPENED",
      resource: "barShift",
      resourceId: String(doc._id),
      details: { shiftName: doc.shiftName, openingCash: doc.openingCash },
    });

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
