"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUploadFiles, useDeleteUpload } from "@/hooks/api";
import { Button } from "./button";
import toast from "react-hot-toast";

export interface UploadedImage {
  url: string;
  publicId?: string;
  caption?: string;
}

interface ImageUploadProps {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  folder: string;
  maxFiles?: number;
  /** Single image mode (logo, avatar) */
  single?: boolean;
  /** When set (e.g. platform editing a tenant), sent with request so upload goes to that tenant's folder. Requires super_admin. */
  tenantId?: string;
  className?: string;
  label?: string;
  showCaptions?: boolean;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ImageUpload({
  value = [],
  onChange,
  folder,
  maxFiles = 10,
  single = false,
  tenantId,
  className,
  label,
  showCaptions = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const uploadMutation = useUploadFiles();
  const deleteMutation = useDeleteUpload();

  const effectiveMax = single ? 1 : maxFiles;
  const canUpload = value.length < effectiveMax;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = effectiveMax - value.length;

      if (fileArray.length > remaining) {
        toast.error(`You can upload ${remaining} more file(s)`);
        return;
      }

      for (const f of fileArray) {
        if (!ACCEPTED.includes(f.type)) {
          toast.error(`${f.name}: invalid type. Use JPEG, PNG, WebP, or GIF`);
          return;
        }
        if (f.size > MAX_SIZE) {
          toast.error(`${f.name}: too large. Max 10MB`);
          return;
        }
      }

      const formData = new FormData();
      formData.append("folder", folder);
      if (tenantId?.trim()) {
        formData.append("tenantId", tenantId.trim());
      }
      for (const f of fileArray) {
        formData.append("files", f);
      }

      try {
        const res = await uploadMutation.mutateAsync(formData);
        const uploaded: UploadedImage[] = (res.data || []).map(
          (r: { url: string; publicId: string }) => ({
            url: r.url,
            publicId: r.publicId,
          })
        );

        if (single) {
          if (value[0]?.publicId) {
            deleteMutation.mutate(value[0].publicId);
          }
          onChange(uploaded.slice(0, 1));
        } else {
          onChange([...value, ...uploaded]);
        }
        toast.success(
          `${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded`
        );
      } catch (err: any) {
        const msg =
          err?.response?.data?.error?.message ||
          "Upload failed. Check Cloudinary config in .env.local and that the upload folder is allowed.";
        toast.error(msg);
      }
    },
    [folder, tenantId, value, effectiveMax, single, onChange, uploadMutation, deleteMutation]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const img = value[index];
      if (img.publicId) {
        deleteMutation.mutate(img.publicId);
      }
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange, deleteMutation]
  );

  const handleCaptionChange = useCallback(
    (index: number, caption: string) => {
      const updated = [...value];
      updated[index] = { ...updated[index], caption };
      onChange(updated);
    },
    [value, onChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const isUploading = uploadMutation.isPending;

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      {/* Existing images */}
      {value.length > 0 && (
        <div
          className={cn(
            "grid gap-3",
            single ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          )}
        >
          {value.map((img, i) => (
            <div
              key={img.url}
              className="group relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50"
            >
              <div className="aspect-video relative">
                <img
                  src={img.url}
                  alt={img.caption || `Image ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="absolute top-1.5 right-1.5 rounded-full bg-red-500 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {showCaptions && (
                <input
                  type="text"
                  value={img.caption || ""}
                  onChange={(e) => handleCaptionChange(i, e.target.value)}
                  placeholder="Add caption..."
                  className="w-full border-t border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {canUpload && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
            dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100",
            isUploading && "pointer-events-none opacity-60"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-600">Uploading...</p>
            </>
          ) : (
            <>
              <div className="rounded-full bg-slate-200 p-2.5">
                {single ? (
                  <ImageIcon className="h-5 w-5 text-slate-500" />
                ) : (
                  <Upload className="h-5 w-5 text-slate-500" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  {single ? "Click or drop image" : "Click or drop images"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  JPEG, PNG, WebP, GIF — max 10MB
                </p>
                {!single && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {value.length}/{effectiveMax} uploaded
                  </p>
                )}
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple={!single}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                handleFiles(e.target.files);
              }
              e.target.value = "";
            }}
          />
        </div>
      )}

      {!canUpload && !single && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            Maximum {effectiveMax} images reached. Remove one to upload more.
          </p>
        </div>
      )}
    </div>
  );
}
