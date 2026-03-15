import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireTenant } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import Guest from "@/models/booking/Guest";
import { createGuestSchema } from "@/validations/guest";

const SORT_FIELDS = ["firstName", "lastName", "email", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    const tenantId = requireTenant(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const q = req.nextUrl.searchParams.get("q")?.trim();

    const filter: Record<string, unknown> = { tenantId };
    if (q) {
      const searchRegex = { $regex: q, $options: "i" };
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const sortObj = parseSortString(sort, SORT_FIELDS);
    const query = Guest.find(filter as Record<string, unknown>).sort(sortObj);
    const countQuery = Guest.countDocuments(filter as Record<string, unknown>);
    const result = await paginate(query, countQuery, { page, limit, sort });

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    const tenantId = requireTenant(auth);
    const body = await req.json();
    const data = createGuestSchema.parse(body);

    const guest = await Guest.create({
      ...data,
      tenantId,
    } as Record<string, unknown>);

    return createdResponse(guest.toObject());
  },
  { auth: true }
);
