import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { USER_ROLES } from "@/constants";
import { employeePayrollSchema } from "@/validations/payroll";
import EmployeePayroll from "@/models/staff/EmployeePayroll";

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
    const userId = req.nextUrl.searchParams.get("userId");

    if (userId) {
      const one = await EmployeePayroll.findOne({
        tenantId,
        branchId,
        userId,
      })
        .populate("userId", "firstName lastName email")
        .populate("salaryStructureId")
        .lean();
      return successResponse(one);
    }

    const list = await EmployeePayroll.find({ tenantId, branchId })
      .populate("userId", "firstName lastName email")
      .populate("salaryStructureId")
      .sort({ updatedAt: -1 })
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
    const data = employeePayrollSchema.parse(body);

    const existing = await EmployeePayroll.findOne({
      tenantId,
      branchId,
      userId: data.userId,
    });
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
    if (existing) {
      const updated = await EmployeePayroll.findOneAndUpdate(
        { _id: existing._id },
        payload,
        { new: true }
      )
        .populate("salaryStructureId")
        .lean();
      return successResponse(updated);
    }

    const doc = await EmployeePayroll.create({
      tenantId,
      branchId,
      userId: data.userId,
      ...payload,
    });
    const populated = await EmployeePayroll.findById(doc._id)
      .populate("salaryStructureId")
      .lean();
    return createdResponse(populated ?? doc.toObject());
  },
  { auth: true }
);
