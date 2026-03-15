import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES } from "@/constants";
import { salaryStructureSchema } from "@/validations/payroll";
import SalaryStructure from "@/models/staff/SalaryStructure";

export const GET = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
      USER_ROLES.ACCOUNTANT,
      USER_ROLES.FINANCE_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const department = req.nextUrl.searchParams.get("department");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (department) filter.department = department;

    const list = await SalaryStructure.find(filter)
      .sort({ name: 1 })
      .lean();
    return successResponse(list);
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
      USER_ROLES.ACCOUNTANT,
      USER_ROLES.FINANCE_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = salaryStructureSchema.parse(body);

    const doc = await SalaryStructure.create({
      tenantId,
      branchId,
      name: data.name,
      department: data.department,
      role: data.role,
      baseSalary: data.baseSalary,
      overtimeRate: data.overtimeRate ?? 1.5,
      deductions: data.deductions ?? [],
      additions: data.additions ?? [],
      isActive: data.isActive !== false,
    });
    return createdResponse(doc.toObject());
  },
  { auth: true }
);
