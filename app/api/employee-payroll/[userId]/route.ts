import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES } from "@/constants";
import { NotFoundError } from "@/lib/errors";
import { employeePayrollSchema } from "@/validations/payroll";
import EmployeePayroll from "@/models/staff/EmployeePayroll";

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
    const userId = params?.userId;
    if (!userId) throw new NotFoundError("User");

    const doc = await EmployeePayroll.findOne({
      tenantId,
      branchId,
      userId,
    })
      .populate("userId", "firstName lastName email")
      .populate("salaryStructureId")
      .lean();
    return successResponse(doc);
  },
  { auth: true }
);

export const PUT = withHandler(
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
    const userId = params?.userId;
    if (!userId) throw new NotFoundError("User");

    const body = await req.json();
    const data = employeePayrollSchema.parse({ ...body, userId });

    const payload = {
      salaryStructureId: data.salaryStructureId || undefined,
      paymentMethod: data.paymentMethod ?? "cash",
      bankAccountNumber: data.bankAccountNumber,
      bankName: data.bankName,
      momoNumber: data.momoNumber,
      momoProvider: data.momoProvider,
      employeeNumber: data.employeeNumber,
      ...(data.baseSalary != null && { baseSalary: data.baseSalary }),
      ...(data.overtimeRate != null && { overtimeRate: data.overtimeRate }),
      ...(data.deductions && { deductions: data.deductions }),
    };
    const doc = await EmployeePayroll.findOneAndUpdate(
      { tenantId, branchId, userId },
      payload,
      { new: true, upsert: true, runValidators: true }
    )
      .populate("salaryStructureId")
      .lean();
    return successResponse(doc);
  },
  { auth: true }
);
