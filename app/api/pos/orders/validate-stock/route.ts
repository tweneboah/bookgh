import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { BadRequestError } from "@/lib/errors";
import {
  ensureSufficientBarStock,
  estimateOrderLineStockCaps,
} from "@/lib/bar-service";
import { normalizePosDepartment } from "@/lib/department-pos";
import { validateOrderStockSchema } from "@/validations/pos";
import { USER_ROLES } from "@/constants";

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
      USER_ROLES.CASHIER,
      USER_ROLES.WAITER,
      USER_ROLES.HOSTESS,
      USER_ROLES.SUPERVISOR,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BARTENDER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = validateOrderStockSchema.parse(body);
    const department = normalizePosDepartment(data.department) ?? "bar";
    const lineHints = await estimateOrderLineStockCaps({
      tenantId,
      branchId,
      items: data.items,
      department,
    });

    try {
      await ensureSufficientBarStock({
        tenantId,
        branchId,
        items: data.items as Array<{
          menuItemId: string;
          name: string;
          quantity: number;
        }>,
        department,
      });
      return successResponse({ ok: true, lineHints });
    } catch (error) {
      if (error instanceof BadRequestError) {
        return successResponse({
          ok: false,
          message: error.message,
          lineHints,
        });
      }
      throw error;
    }
  },
  { auth: true }
);
