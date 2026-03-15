import { NextRequest, NextResponse } from "next/server";
import { extractAuth } from "@/lib/auth-context";
import { USER_ROLES } from "@/constants";
import { successResponse } from "@/lib/api-response";
import {
  uploadToCloudinary,
  validateFile,
  type UploadFolder,
} from "@/lib/cloudinary";
import connectDB from "@/lib/db";

const VALID_FOLDERS: UploadFolder[] = [
  "room-categories",
  "branches",
  "event-halls",
  "event-halls/layouts",
  "menu-items",
  "maintenance",
  "lost-and-found",
  "logos",
  "avatars",
  "guest-ids",
  "contracts",
  "suppliers/restaurant",
  "suppliers/inventoryProcurement",
  "suppliers/bar",
  "pos-inventory/restaurant",
  "pos-inventory/inventoryProcurement",
  "pool-areas",
  "playground-areas",
  "tenant-hero",
];

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = extractAuth(req);

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const folder = formData.get("folder") as string;
    const tenantIdOverride = formData.get("tenantId") as string | null;

    let tenantId: string | undefined = auth.tenantId;
    if (auth.role === USER_ROLES.SUPER_ADMIN && tenantIdOverride?.trim()) {
      tenantId = tenantIdOverride.trim();
    }
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { message: "Tenant context required" } },
        { status: 403 }
      );
    }

    if (!folder || !VALID_FOLDERS.includes(folder as UploadFolder)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Invalid folder. Must be one of: ${VALID_FOLDERS.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    if (!files.length) {
      return NextResponse.json(
        { success: false, error: { message: "No files provided" } },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: { message: "Maximum 10 files per upload" } },
        { status: 400 }
      );
    }

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        return NextResponse.json(
          { success: false, error: { message: validationError } },
          { status: 400 }
        );
      }
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return uploadToCloudinary(
          buffer,
          folder as UploadFolder,
          tenantId
        );
      })
    );

    return successResponse(results, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed";
    const isConfig = message.includes("Cloudinary") && message.includes("not configured");
    return NextResponse.json(
      {
        success: false,
        error: { message },
      },
      { status: isConfig ? 503 : 400 }
    );
  }
}
