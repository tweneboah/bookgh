import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import CorporateAccount from "@/models/booking/CorporateAccount";
import { createCorporateAccountSchema } from "@/validations/corporate";
import { USER_ROLES } from "@/constants";

const SORT_FIELDS = ["companyName", "negotiatedRate", "totalBookings", "totalSpend", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const { status, search } = Object.fromEntries(req.nextUrl.searchParams.entries());

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { contactEmail: { $regex: search, $options: "i" } },
      ];
    }

    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = CorporateAccount.find(filter as any).sort(sortObj);
    const countQuery = CorporateAccount.countDocuments(filter as any);
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
      USER_ROLES.FRONT_DESK,
      USER_ROLES.RESERVATION_OFFICER,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    const data = createCorporateAccountSchema.parse(body);

    const account = await CorporateAccount.create({
      ...data,
      tenantId,
      branchId,
      createdBy: auth.userId,
    } as any);

    return createdResponse(account.toObject());
  },
  { auth: true }
);
