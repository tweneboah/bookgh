import { withHandler } from "@/lib/with-handler";
import { successResponse, createdResponse } from "@/lib/api-response";
import { requireBranch } from "@/lib/auth-context";
import { parsePagination, parseSortString, paginate } from "@/lib/pagination";
import LostAndFound from "@/models/housekeeping/LostAndFound";
import "@/models/room/Room";
import "@/models/user/User";
import {
  createLostAndFoundSchema,
} from "@/validations/operations";
import mongoose from "mongoose";

const SORT_FIELDS = ["status", "foundDate", "createdAt"];

export const GET = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const { page, limit, sort } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get("status");

    const filter: Record<string, unknown> = { tenantId, branchId };
    if (status) filter.status = status;

    const query = LostAndFound.find(filter as Record<string, unknown>)
      .populate({ path: "roomId", model: "Room", select: "roomNumber floor" })
      .populate("foundBy", "firstName lastName email")
      .sort(parseSortString(sort, SORT_FIELDS));
    const countQuery = LostAndFound.countDocuments(
      filter as Record<string, unknown>
    );
    const result = await paginate(query, countQuery, { page, limit, sort });

    // [DEBUG] Lost & Found GET: log first item's roomId shape
    if (result.items.length > 0) {
      const first = result.items[0] as Record<string, unknown>;
      console.log("[lost-and-found GET] total items:", result.items.length);
      console.log("[lost-and-found GET] first item _id:", first._id);
      console.log("[lost-and-found GET] first item roomId raw:", first.roomId);
      console.log("[lost-and-found GET] first item roomId type:", typeof first.roomId);
      if (first.roomId && typeof first.roomId === "object") {
        console.log("[lost-and-found GET] first item roomId.roomNumber:", (first.roomId as Record<string, unknown>).roomNumber);
      }
    }

    return successResponse(result.items, 200, {
      pagination: result.pagination,
    });
  },
  { auth: true }
);

export const POST = withHandler(
  async (req, { auth }) => {
    const { tenantId, branchId } = requireBranch(auth);
    const body = await req.json();
    console.log("[lost-and-found POST] raw body.roomId:", body.roomId, "type:", typeof body.roomId);

    const data = createLostAndFoundSchema.parse(body);
    console.log("[lost-and-found POST] parsed data.roomId:", data.roomId);

    const createPayload: Record<string, unknown> = {
      itemDescription: data.itemDescription,
      foundDate: data.foundDate,
      tenantId,
      branchId,
      foundBy: auth.userId,
    };
    if (data.foundLocation) createPayload.foundLocation = data.foundLocation;
    if (data.notes) createPayload.notes = data.notes;
    if (data.images?.length) createPayload.images = data.images;
    if (data.roomId && typeof data.roomId === "string" && data.roomId.trim() && mongoose.Types.ObjectId.isValid(data.roomId)) {
      createPayload.roomId = new mongoose.Types.ObjectId(data.roomId);
      console.log("[lost-and-found POST] set createPayload.roomId:", createPayload.roomId);
    } else {
      console.log("[lost-and-found POST] roomId NOT set (empty/invalid). data.roomId:", data.roomId);
    }

    const doc = await LostAndFound.create(createPayload);
    const docObj = doc.toObject() as Record<string, unknown>;
    console.log("[lost-and-found POST] created doc.roomId:", docObj.roomId);

    return createdResponse(doc.toObject());
  },
  { auth: true }
);
