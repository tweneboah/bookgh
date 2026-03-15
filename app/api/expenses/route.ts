import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import { createExpenseSchema } from "@/validations/shared";
import {
  getExpenseModelForDepartment,
} from "@/lib/department-ledger";
import { BadRequestError } from "@/lib/errors";

const SORT_FIELDS = ["date", "amount", "category", "status", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");
    const category = req.nextUrl.searchParams.get("category");
    const accountCode = req.nextUrl.searchParams.get("accountCode");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    const department = req.nextUrl.searchParams.get("department");
    if (!department) {
      throw new BadRequestError("department is required");
    }

    const filter: Record<string, any> = { tenantId, branchId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (accountCode) filter.accountCode = accountCode;
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
      filter.date = dateFilter;
    }

    const sortObj = parseSortString(sort, SORT_FIELDS);
    const expenseModel = getExpenseModelForDepartment(department);
    const query = expenseModel.find(filter).sort(sortObj);
    const countQuery = expenseModel.countDocuments(filter);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const department = req.nextUrl.searchParams.get("department");
    if (!department) {
      throw new BadRequestError("department is required");
    }
    const body = await req.json();
    // Force department scoping via query param (prevents cross-department writes)
    const data = createExpenseSchema.parse({ ...body, department });
    const accountCode = data.accountCode === "" || data.accountCode == null ? undefined : data.accountCode;
    const staffId = data.staffId && data.staffId.trim() ? data.staffId : undefined;

    const expenseModel = getExpenseModelForDepartment(data.department);
    const doc = await expenseModel.create({
      ...data,
      accountCode,
      staffId,
      tenantId,
      branchId,
      createdBy: auth.userId,
    } as Record<string, unknown>);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
