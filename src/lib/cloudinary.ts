import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type UploadFolder =
  | "room-categories"
  | "branches"
  | "event-halls"
  | "event-halls/layouts"
  | "menu-items"
  | "maintenance"
  | "lost-and-found"
  | "logos"
  | "avatars"
  | "guest-ids"
  | "contracts"
  | "suppliers/restaurant"
  | "suppliers/restaurant/documents"
  | "suppliers/inventoryProcurement"
  | "suppliers/inventoryProcurement/documents"
  | "suppliers/bar"
  | "suppliers/bar/documents"
  | "pos-inventory/restaurant"
  | "pos-inventory/inventoryProcurement"
  | "pool-areas"
  | "playground-areas"
  | "tenant-hero";

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB`;
  }
  return null;
}

function getCloudinaryConfig() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name?.trim() || !api_key?.trim() || !api_secret?.trim()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local and restart the dev server."
    );
  }
  return { cloud_name, api_key, api_secret };
}

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: UploadFolder,
  tenantId: string
): Promise<UploadResult> {
  getCloudinaryConfig(); // ensure credentials exist before upload

  const fullFolder = `hotel-hub/${tenantId}/${folder}`;

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: fullFolder,
          resource_type: "image",
          transformation: [
            { quality: "auto", fetch_format: "auto" },
            { width: 1920, crop: "limit" },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Upload failed"));
            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      )
      .end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
