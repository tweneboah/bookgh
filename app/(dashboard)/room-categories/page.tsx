"use client";

import { useMemo, useState, type ComponentType } from "react";
import { Epilogue, Manrope } from "next/font/google";
import {
  useRoomCategories,
  useCreateRoomCategory,
  useUpdateRoomCategory,
  useDeleteRoomCategory,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Textarea,
  EmptyState,
  AppReactSelect,
} from "@/components/ui";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { cn } from "@/lib/cn";
import {
  Plus,
  Pencil,
  Trash2,
  BedDouble,
  Users,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Download,
  Wifi,
  Sparkles,
  Maximize2,
} from "lucide-react";
import toast from "react-hot-toast";
import { BED_TYPE } from "@/constants";

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const BED_TYPE_OPTIONS = Object.entries(BED_TYPE).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}));

const ORANGE_GRADIENT = "linear-gradient(135deg, #ff7a2c 0%, #9b3f00 100%)";
const EDITORIAL_SHADOW = "0px 20px 40px rgba(44, 47, 48, 0.06)";

function formatPriceGHS(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(value);
}

type CategoryRow = {
  _id: string;
  name?: string;
  description?: string;
  basePrice?: number;
  maxOccupancy?: number;
  bedType?: string;
  roomSize?: number;
  amenities?: string[];
  images?: { url: string; caption?: string }[];
  isActive?: boolean;
};

function thirdHighlight(row: CategoryRow): {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
} | null {
  const am = row.amenities?.filter(Boolean) ?? [];
  if (am.length > 0) {
    const first = am[0];
    const lower = first.toLowerCase();
    if (lower.includes("wifi") || lower.includes("wi-fi")) {
      return { icon: Wifi, label: "Connectivity", value: "WiFi" };
    }
    if (lower.includes("pool")) {
      return { icon: Sparkles, label: "Access", value: first };
    }
    return { icon: Sparkles, label: "Highlight", value: first };
  }
  if (row.roomSize != null && row.roomSize > 0) {
    return {
      icon: Maximize2,
      label: "Room size",
      value: `${row.roomSize} sq ft`,
    };
  }
  return null;
}

function StatBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e6e8ea]">
        <Icon className="h-5 w-5 text-[#9b3f00]" aria-hidden />
      </div>
      <div>
        <p className="mb-1 text-[10px] font-black uppercase leading-none text-[#595c5d]">
          {label}
        </p>
        <p className="font-bold text-[#2c2f30]">{value}</p>
      </div>
    </div>
  );
}

export default function RoomCategoriesPage() {
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<CategoryRow | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    maxOccupancy: "",
    bedType: "",
    roomSize: "",
    amenities: "",
    isActive: true,
    images: [] as UploadedImage[],
  });

  const { data, isLoading } = useRoomCategories({
    page: String(page),
    limit: "20",
  });
  const createMut = useCreateRoomCategory();
  const updateMut = useUpdateRoomCategory();
  const deleteMut = useDeleteRoomCategory();

  const items = (data?.data ?? []) as CategoryRow[];
  const pagination = data?.meta?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) || 1 : 1;
  const hasPrev = page > 1;
  const hasNext = pagination ? page < totalPages : false;

  const pageNumbers = useMemo(() => {
    const total = totalPages;
    const cur = page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const set = new Set(
      [1, total, cur, cur - 1, cur + 1].filter((n) => n >= 1 && n <= total)
    );
    return [...set].sort((a, b) => a - b);
  }, [page, totalPages]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      basePrice: "",
      maxOccupancy: "",
      bedType: "",
      roomSize: "",
      amenities: "",
      isActive: true,
      images: [],
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: CategoryRow) => {
    setEditItem(item);
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      basePrice: String(item.basePrice ?? ""),
      maxOccupancy: String(item.maxOccupancy ?? ""),
      bedType: item.bedType ?? "",
      roomSize: item.roomSize ? String(item.roomSize) : "",
      amenities: Array.isArray(item.amenities) ? item.amenities.join(", ") : "",
      isActive: item.isActive !== false,
      images: Array.isArray(item.images)
        ? item.images.map((img) => ({
            url: img.url,
            publicId: (img as { publicId?: string }).publicId,
            caption: img.caption,
          }))
        : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      basePrice: parseFloat(form.basePrice) || 0,
      maxOccupancy: parseInt(form.maxOccupancy, 10) || 1,
      bedType: form.bedType || undefined,
      roomSize: form.roomSize ? parseFloat(form.roomSize) : undefined,
      amenities: form.amenities
        ? form.amenities
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      images: form.images.map((img) => ({
        url: img.url,
        caption: img.caption || undefined,
      })),
      ...(editItem && { isActive: form.isActive }),
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Room category updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Room category created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined;
      toast.error(msg ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Room category deleted");
      setShowDelete(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined;
      toast.error(msg ?? "Something went wrong");
    }
  };

  const bedLabel = (value: string) =>
    BED_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  const exportCsv = () => {
    if (!items.length) {
      toast.error("Nothing to export on this page");
      return;
    }
    const header = "Name,Base Price (GHS),Max Guests,Bed Type,Active,Description\n";
    const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const body = items
      .map((r) =>
        [
          escape(r.name ?? ""),
          r.basePrice ?? "",
          r.maxOccupancy ?? "",
          escape(bedLabel(r.bedType ?? "") || ""),
          r.isActive !== false ? "Yes" : "No",
          escape(r.description ?? ""),
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `room-categories-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  const showingFrom = pagination ? (page - 1) * pagination.limit + 1 : 0;
  const showingTo = pagination
    ? Math.min(page * pagination.limit, pagination.total)
    : items.length;

  return (
    <div className={cn(manrope.className, "min-h-screen bg-[#f5f6f7] text-[#2c2f30] antialiased")}>
      <header className="sticky top-0 z-40 w-full border-b border-[#abadae]/10 bg-[#eff1f2]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-8 pt-10 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-10">
          <div className="space-y-2">
            <h1
              className={cn(
                epilogue.className,
                "text-4xl font-black leading-tight tracking-tighter text-[#9b3f00] sm:text-5xl"
              )}
            >
              Room Categories
            </h1>
            <p className="max-w-2xl text-lg font-medium text-[#595c5d]">
              Define room types, pricing, and amenities to power your property&apos;s inventory.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={exportCsv}
              disabled={isLoading || items.length === 0}
              className="rounded-xl bg-[#e0e3e4] px-6 py-3 text-sm font-semibold text-[#2c2f30] transition-all hover:bg-[#dadddf] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4" aria-hidden />
                Export
              </span>
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-[#fff0ea] shadow-lg shadow-[#ff7a2c]/20 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: ORANGE_GRADIENT }}
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              Add Category
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-10">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[2rem] bg-white shadow-[0px_20px_40px_rgba(44,47,48,0.06)]"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="min-h-[280px] flex-1 animate-pulse bg-[#e6e8ea] md:w-1/3 md:min-h-[320px]" />
                  <div className="flex-1 space-y-4 p-8 md:w-2/3 md:p-10">
                    <div className="h-10 w-2/3 animate-pulse rounded-lg bg-[#e6e8ea]" />
                    <div className="h-20 animate-pulse rounded-lg bg-[#eff1f2]" />
                    <div className="flex gap-8">
                      <div className="h-14 w-32 animate-pulse rounded-xl bg-[#eff1f2]" />
                      <div className="h-14 w-32 animate-pulse rounded-xl bg-[#eff1f2]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[#abadae]/40 bg-white p-6">
            <EmptyState
              icon={LayoutGrid}
              title="No room categories yet"
              description="Create your first room category to start managing room types, rates, and availability."
              action={{ label: "Add Category", onClick: openCreate }}
              actionClassName="bg-gradient-to-br from-[#ff7a2c] to-[#9b3f00] font-bold text-[#fff0ea] shadow-lg shadow-orange-500/25 hover:opacity-95"
              className="border-0 bg-transparent py-16"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-10">
              {items.map((row) => {
                const img = row.images?.[0];
                const extra = thirdHighlight(row);
                return (
                  <article
                    key={row._id}
                    className="group relative overflow-hidden rounded-[2rem] bg-white transition-all hover:-translate-y-1"
                    style={{ boxShadow: EDITORIAL_SHADOW }}
                  >
                    <div className="flex h-full flex-col md:flex-row">
                      <div className="relative min-h-[280px] md:w-1/3 md:min-h-[320px]">
                        {img ? (
                          <img
                            src={img.url}
                            alt={row.name ? `${row.name} photo` : "Room category"}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#e6e8ea] text-[#757778]">
                            <LayoutGrid className="h-16 w-16 opacity-50" aria-hidden />
                          </div>
                        )}
                        <div className="absolute left-6 top-6">
                          <span
                            className={cn(
                              "inline-block rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest shadow-lg",
                              row.isActive !== false
                                ? "text-[#fff0ea]"
                                : "bg-[#dadddf] text-[#595c5d]"
                            )}
                            style={
                              row.isActive !== false
                                ? { background: ORANGE_GRADIENT }
                                : undefined
                            }
                          >
                            {row.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between p-8 md:w-2/3 md:p-10">
                        <div>
                          <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                            <h2
                              className={cn(
                                epilogue.className,
                                "text-2xl font-bold text-[#2c2f30] sm:text-3xl"
                              )}
                            >
                              {row.name}
                            </h2>
                            <div className="text-left sm:text-right">
                              <span
                                className={cn(
                                  epilogue.className,
                                  "block text-4xl font-black leading-none text-[#9b3f00]"
                                )}
                              >
                                {row.basePrice != null ? formatPriceGHS(row.basePrice) : "—"}
                              </span>
                              <span className="text-sm font-semibold uppercase tracking-tight text-[#595c5d]">
                                per night
                              </span>
                            </div>
                          </div>
                          {row.description ? (
                            <p className="mb-8 max-w-xl text-lg leading-relaxed text-[#595c5d]">
                              {row.description}
                            </p>
                          ) : (
                            <p className="mb-8 text-lg italic text-[#abadae]">No description yet.</p>
                          )}
                          <div className="flex flex-wrap gap-8">
                            <StatBlock
                              icon={Users}
                              label="Capacity"
                              value={
                                row.maxOccupancy == null
                                  ? "—"
                                  : `${row.maxOccupancy} guest${row.maxOccupancy === 1 ? "" : "s"}`
                              }
                            />
                            <StatBlock
                              icon={BedDouble}
                              label="Bed type"
                              value={row.bedType ? bedLabel(row.bedType) : "—"}
                            />
                            {extra ? (
                              <StatBlock icon={extra.icon} label={extra.label} value={extra.value} />
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-[#e6e8ea] pt-8">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-[#2c2f30] transition-colors hover:bg-[#e6e8ea]"
                          >
                            <Pencil className="h-5 w-5" aria-hidden />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDelete(row._id)}
                            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-[#b02500] transition-colors hover:bg-[#b02500]/10"
                          >
                            <Trash2 className="h-5 w-5" aria-hidden />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {pagination && pagination.total > pagination.limit && (
              <div className="mt-16 flex flex-col items-stretch justify-between gap-6 sm:flex-row sm:items-center">
                <p className="text-center text-sm font-medium text-[#595c5d] sm:text-left">
                  Showing {showingFrom}–{showingTo} of {pagination.total} room categories
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!hasPrev}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e0e3e4] text-[#2c2f30] transition-all hover:bg-[#dadddf] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {pageNumbers.map((num, idx) => (
                    <span key={num} className="flex items-center gap-1">
                      {idx > 0 && num - pageNumbers[idx - 1] > 1 ? (
                        <span className="px-1 font-bold text-[#757778]" aria-hidden>
                          …
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setPage(num)}
                        className={cn(
                          "flex h-12 min-w-[3rem] items-center justify-center rounded-xl px-3 text-sm font-black transition-all",
                          page === num
                            ? "text-[#fff0ea] shadow-md"
                            : "bg-[#e6e8ea] text-[#2c2f30] hover:bg-[#e0e3e4]"
                        )}
                        style={page === num ? { background: ORANGE_GRADIENT } : undefined}
                      >
                        {num}
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={!hasNext}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e0e3e4] text-[#2c2f30] transition-all hover:bg-[#dadddf] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {pagination && pagination.total <= pagination.limit && pagination.total > 0 && (
              <p className="mt-12 text-center text-sm font-medium text-[#595c5d]">
                Showing all {pagination.total} room categor{pagination.total === 1 ? "y" : "ies"}
              </p>
            )}
          </>
        )}
      </main>

      <button
        type="button"
        onClick={openCreate}
        className="fixed bottom-8 right-8 z-40 flex h-16 w-16 items-center justify-center rounded-full text-[#fff0ea] shadow-2xl shadow-[#9b3f00]/30 transition-transform hover:scale-105 active:scale-95 md:hidden"
        style={{ background: ORANGE_GRADIENT }}
        aria-label="Add category"
      >
        <Plus className="h-8 w-8" strokeWidth={2.5} />
      </button>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title=""
        size="6xl"
        className={cn(
          manrope.className,
          "max-h-[92vh] border border-[#abadae]/25 bg-[#f5f6f7] shadow-2xl"
        )}
        bodyClassName="p-0"
      >
        <form onSubmit={handleSubmit} className="max-h-[92vh] overflow-y-auto p-6 md:p-10">
          <header className="mb-8 flex flex-col gap-3">
            <h2
              className={cn(
                epilogue.className,
                "text-4xl font-black tracking-tighter text-[#2c2f30] md:text-5xl"
              )}
            >
              {editItem ? "Edit Room Category" : "Add Room Category"}
            </h2>
            <p className="text-lg font-medium text-[#595c5d]">
              Define room types, pricing, and amenities.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <section className="space-y-8 lg:col-span-8">
              <div className="relative overflow-hidden rounded-xl bg-white p-6 md:p-8" style={{ boxShadow: EDITORIAL_SHADOW }}>
                <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-[#9b3f00]/5" />
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className={cn(epilogue.className, "text-sm font-bold uppercase tracking-tight text-[#595c5d]")}>
                      Name
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      placeholder="e.g. Executive Sunset Suite"
                      className="w-full rounded-xl border-none bg-[#eff1f2] p-4 font-medium transition-all focus:bg-white focus:ring-2 focus:ring-[#9b3f00]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className={cn(epilogue.className, "text-sm font-bold uppercase tracking-tight text-[#595c5d]")}>
                      Description
                    </label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Describe the ambiance and unique features of this category..."
                      rows={4}
                      className="resize-none rounded-xl border-none bg-[#eff1f2] p-4 font-medium transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#9b3f00]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={cn(epilogue.className, "text-sm font-bold uppercase tracking-tight text-[#595c5d]")}>
                      Base price (GHS)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#9b3f00]">C</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.basePrice}
                        onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                        required
                        placeholder="0.00"
                        className="w-full rounded-xl border-none bg-[#eff1f2] p-4 pl-10 font-medium transition-all focus:bg-white focus:ring-2 focus:ring-[#9b3f00]/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={cn(epilogue.className, "text-sm font-bold uppercase tracking-tight text-[#595c5d]")}>
                      Max occupancy
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.maxOccupancy}
                      onChange={(e) => setForm((f) => ({ ...f, maxOccupancy: e.target.value }))}
                      required
                      placeholder="2"
                      className="w-full rounded-xl border-none bg-[#eff1f2] p-4 font-medium transition-all focus:bg-white focus:ring-2 focus:ring-[#9b3f00]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={cn(epilogue.className, "text-sm font-bold uppercase tracking-tight text-[#595c5d]")}>
                      Bed type
                    </label>
                    <AppReactSelect
                      visualVariant="solar"
                      options={[{ value: "", label: "Select..." }, ...BED_TYPE_OPTIONS]}
                      value={form.bedType}
                      onChange={(v) => setForm((f) => ({ ...f, bedType: v }))}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={cn(epilogue.className, "text-sm font-bold uppercase tracking-tight text-[#595c5d]")}>
                      Room size (sq ft)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.roomSize}
                      onChange={(e) => setForm((f) => ({ ...f, roomSize: e.target.value }))}
                      placeholder="450"
                      className="w-full rounded-xl border-none bg-[#eff1f2] p-4 font-medium transition-all focus:bg-white focus:ring-2 focus:ring-[#9b3f00]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className={cn(epilogue.className, "text-sm font-bold uppercase tracking-tight text-[#595c5d]")}>
                      Amenities
                    </label>
                    <input
                      value={form.amenities}
                      onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
                      placeholder="WiFi, Air Conditioning, Mini Bar, Ocean View"
                      className="w-full rounded-xl border-none bg-[#eff1f2] p-4 font-medium transition-all focus:bg-white focus:ring-2 focus:ring-[#9b3f00]/20"
                    />
                    <span className="text-xs text-[#595c5d]/70">Separate each amenity with a comma</span>
                  </div>
                </div>
              </div>

              {editItem && (
                <label className="inline-flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-[#2c2f30]" style={{ boxShadow: EDITORIAL_SHADOW }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-[#abadae] text-[#9b3f00] focus:ring-[#9b3f00]/30"
                  />
                  Active
                </label>
              )}

              <div className="flex items-center justify-end gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className={cn(epilogue.className, "px-6 py-3 text-sm font-bold text-[#595c5d] transition-colors hover:text-[#9b3f00]")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                  className={cn(
                    epilogue.className,
                    "inline-flex items-center justify-center gap-2 rounded-xl px-10 py-3 text-base font-bold text-[#fff0ea] shadow-lg transition-all hover:opacity-95 disabled:opacity-50"
                  )}
                  style={{ background: ORANGE_GRADIENT }}
                >
                  {createMut.isPending || updateMut.isPending ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#fff0ea] border-t-transparent" />
                  ) : null}
                  {editItem ? "Update Room" : "Create Room"}
                </button>
              </div>
            </section>

            <aside className="lg:col-span-4">
              <div className="sticky top-4 space-y-5 rounded-xl bg-white p-6" style={{ boxShadow: EDITORIAL_SHADOW }}>
                <h3 className={cn(epilogue.className, "text-xl font-bold text-[#2c2f30]")}>Images</h3>
                <ImageUpload
                  value={form.images}
                  onChange={(images) => setForm((f) => ({ ...f, images }))}
                  folder="room-categories"
                  maxFiles={8}
                  showCaptions
                />

                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg border border-[#abadae]/20 bg-[#eff1f2] flex items-center justify-center">
                      <LayoutGrid className="h-4 w-4 text-[#abadae]" />
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[#f7b21f]/20 bg-[#f7b21f]/10 p-4">
                  <div className="flex gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#7a5400]" />
                    <p className="text-xs font-medium leading-relaxed text-[#4f3600]">
                      Pro tip: Use high-resolution photos (at least 1920x1080) to showcase room textures and natural lighting.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete room category"
        className="border border-[#abadae]/20"
      >
        <p className="text-sm leading-relaxed text-[#595c5d]">
          Are you sure you want to delete this room category? This action cannot be undone.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setShowDelete(null)}
            className="rounded-xl border-[#abadae]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteMut.isPending}
            className="rounded-xl"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
