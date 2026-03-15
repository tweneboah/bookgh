import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { resolveBarOrderPricing } from "@/lib/bar-service";
import { normalizePosDepartment } from "@/lib/department-pos";
import { USER_ROLES } from "@/constants";
import { z } from "zod";

const previewSchema = z.object({
  items: z.array(
    z.object({
      menuItemId: z.string().min(1),
      name: z.string().min(1),
      quantity: z.number().positive(),
      unitPrice: z.number().min(0),
      amount: z.number().min(0),
      notes: z.string().optional(),
    })
  ).min(1),
});

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BARTENDER,
      USER_ROLES.BAR_CASHIER,
      USER_ROLES.POS_STAFF,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = normalizePosDepartment(
      req.nextUrl.searchParams.get("department")
    );
    if (!department) {
      return successResponse(
        { originalSubtotal: 0, subtotal: 0, tax: 0, totalAmount: 0, appliedRule: null },
        200
      );
    }
    const body = await req.json();
    const data = previewSchema.parse(body);
    const originalSubtotal = Number(
      data.items
        .reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
        .toFixed(2)
    );
    const pricing = await resolveBarOrderPricing({
      tenantId,
      branchId,
      items: data.items as any,
      department,
    });
    return successResponse({
      originalSubtotal,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      totalAmount: pricing.totalAmount,
      appliedRule: pricing.appliedRule,
    });
  },
  { auth: true }
);
