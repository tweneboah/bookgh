import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireTenant } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import Notification from "@/models/shared/Notification";
import { createNotificationSchema } from "@/validations/shared";

const SORT_FIELDS = ["createdAt", "isRead"];

export const GET = withHandler(
  async (req, { auth }) => {
    const tenantId = requireTenant(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const isRead = req.nextUrl.searchParams.get("isRead");

    const filter: Record<string, unknown> = {
      tenantId,
      userId: auth.userId,
    };
    if (isRead !== undefined && isRead !== null && isRead !== "") {
      filter.isRead = isRead === "true";
    }

    const query = Notification.find(filter as Record<string, unknown>).sort(
      parseSortString(sort, SORT_FIELDS)
    );
    const countQuery = Notification.countDocuments(
      filter as Record<string, unknown>
    );
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
    const data = createNotificationSchema.parse(body);

    const doc = await Notification.create({
      ...data,
      tenantId,
      createdBy: auth.userId,
    } as Record<string, unknown>);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
