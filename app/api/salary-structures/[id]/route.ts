import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES } from "@/constants";
import { NotFoundError } from "@/lib/errors";
import { salaryStructureSchema } from "@/validations/payroll";
import SalaryStructure from "@/models/staff/SalaryStructure";

export const GET = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
      USER_ROLES.ACCOUNTANT,
      USER_ROLES.FINANCE_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const id = params?.id;
    if (!id) throw new NotFoundError("Salary structure");

    const doc = await SalaryStructure.findOne({ _id: id, tenantId, branchId }).lean();
    if (!doc) throw new NotFoundError("Salary structure");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
      USER_ROLES.ACCOUNTANT,
      USER_ROLES.FINANCE_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const id = params?.id;
    if (!id) throw new NotFoundError("Salary structure");

    const body = await req.json();
    const data = salaryStructureSchema.partial().parse(body);

    const doc = await SalaryStructure.findOneAndUpdate(
      { _id: id, tenantId, branchId },
      {
        ...(data.name != null && { name: data.name }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.baseSalary != null && { baseSalary: data.baseSalary }),
        ...(data.overtimeRate != null && { overtimeRate: data.overtimeRate }),
        ...(data.deductions && { deductions: data.deductions }),
        ...(data.additions && { additions: data.additions }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) throw new NotFoundError("Salary structure");
    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { auth, params }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.HR_MANAGER,
      USER_ROLES.ACCOUNTANT,
      USER_ROLES.FINANCE_MANAGER,
      USER_ROLES.RESTAURANT_MANAGER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const id = params?.id;
    if (!id) throw new NotFoundError("Salary structure");

    const deleted = await SalaryStructure.findOneAndDelete({ _id: id, tenantId, branchId });
    if (!deleted) throw new NotFoundError("Salary structure");
    return noContentResponse();
  },
  { auth: true }
);
