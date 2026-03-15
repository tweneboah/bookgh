import { withHandler } from "@/lib/with-handler";
import { successResponse, noContentResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { updateExpenseSchema } from "@/validations/shared";
import { getExpenseModelForDepartment } from "@/lib/department-ledger";

export const GET = withHandler(
  async (req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const department = req.nextUrl.searchParams.get("department");
    if (!department) throw new BadRequestError("department is required");

    const model = getExpenseModelForDepartment(department);
    const doc = await model
      .findOne({ _id: params.id, tenantId, branchId } as any)
      .lean();
    if (!doc) throw new NotFoundError("Expense");
    return successResponse(doc);
  },
  { auth: true }
);

export const PATCH = withHandler(
  async (req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const department = req.nextUrl.searchParams.get("department");
    if (!department) throw new BadRequestError("department is required");

    const body = updateExpenseSchema.parse(await req.json());
    const model = getExpenseModelForDepartment(department);
    const doc = await model
      .findOneAndUpdate({ _id: params.id, tenantId, branchId } as any, body as any, {
        new: true,
        runValidators: true,
      })
      .lean();
    if (!doc) throw new NotFoundError("Expense");
    return successResponse(doc);
  },
  { auth: true }
);

export const DELETE = withHandler(
  async (req, { params, auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const department = req.nextUrl.searchParams.get("department");
    if (!department) throw new BadRequestError("department is required");

    const model = getExpenseModelForDepartment(department);
    const doc = await model
      .findOneAndDelete({ _id: params.id, tenantId, branchId } as any)
      .lean();
    if (!doc) throw new NotFoundError("Expense");
    return noContentResponse();
  },
  { auth: true }
);
