import { NextRequest } from "next/server";
import { extractAuth } from "@/lib/auth-context";
import { USER_ROLES } from "@/constants";
import { errorResponse, successResponse } from "@/lib/api-response";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import connectDB from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = extractAuth(req);

    const { publicId } = await req.json();
    if (!publicId || typeof publicId !== "string") {
      return errorResponse(new Error("publicId is required"));
    }

    const isSuperAdmin = auth.role === USER_ROLES.SUPER_ADMIN;
    const allowed =
      isSuperAdmin
        ? publicId.startsWith("hotel-hub/")
        : auth.tenantId != null && publicId.startsWith(`hotel-hub/${auth.tenantId}/`);

    if (!allowed) {
      return errorResponse(new Error("Unauthorized to delete this resource"));
    }

    await deleteFromCloudinary(publicId);
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
