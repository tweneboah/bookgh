"use client";

import { useState } from "react";
import {
  usePlaygroundAreas,
  useCreatePlaygroundArea,
  useUpdatePlaygroundArea,
  useDeletePlaygroundArea,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Textarea,
  EmptyState,
  AppReactSelect,
  AppTimePicker,
} from "@/components/ui";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  PLAYGROUND_AREA_STATUS,
  PLAYGROUND_AREA_TYPE,
} from "@/constants";

const STATUS_OPTIONS = Object.entries(PLAYGROUND_AREA_STATUS).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}));

const TYPE_OPTIONS = Object.entries(PLAYGROUND_AREA_TYPE).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}));

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  open: {
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#059669",
    border: "rgba(16, 185, 129, 0.3)",
  },
  closed: {
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#475569",
    border: "rgba(100, 116, 139, 0.3)",
  },
  maintenance: {
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#b45309",
    border: "rgba(245, 158, 11, 0.3)",
  },
  reserved: {
    bg: "rgba(90, 24, 154, 0.12)",
    text: "#5a189a",
    border: "rgba(90, 24, 154, 0.3)",
  },
};

export default function PlaygroundAreasPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: PLAYGROUND_AREA_TYPE.OUTDOOR,
    capacity: "",
    openingTime: "",
    closingTime: "",
    status: PLAYGROUND_AREA_STATUS.OPEN,
    hourlyRate: "",
    dailyRate: "",
    amenities: "",
    images: [] as UploadedImage[],
  });

  const params: Record<string, string> = { page: String(page), limit: "12" };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = usePlaygroundAreas(params);
  const createMut = useCreatePlaygroundArea();
  const updateMut = useUpdatePlaygroundArea();
  const deleteMut = useDeletePlaygroundArea();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      type: PLAYGROUND_AREA_TYPE.OUTDOOR,
      capacity: "",
      openingTime: "",
      closingTime: "",
      status: PLAYGROUND_AREA_STATUS.OPEN,
      hourlyRate: "",
      dailyRate: "",
      amenities: "",
      images: [],
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      type: item.type ?? PLAYGROUND_AREA_TYPE.OUTDOOR,
      capacity: item.capacity != null ? String(item.capacity) : "",
      openingTime: item.openingTime ?? "",
      closingTime: item.closingTime ?? "",
      status: item.status ?? PLAYGROUND_AREA_STATUS.OPEN,
      hourlyRate: item.hourlyRate != null ? String(item.hourlyRate) : "",
      dailyRate: item.dailyRate != null ? String(item.dailyRate) : "",
      amenities: Array.isArray(item.amenities) ? item.amenities.join(", ") : "",
      images: Array.isArray(item.images)
        ? item.images.map((img: any) => ({ url: img.url, caption: img.caption }))
        : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hourlyNum = form.hourlyRate !== "" ? parseFloat(form.hourlyRate) : undefined;
    const dailyNum = form.dailyRate !== "" ? parseFloat(form.dailyRate) : undefined;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      capacity: form.capacity ? parseInt(form.capacity, 10) : 0,
      openingTime: form.openingTime.trim() || undefined,
      closingTime: form.closingTime.trim() || undefined,
      status: form.status,
      ...(hourlyNum !== undefined && !Number.isNaN(hourlyNum) && { hourlyRate: hourlyNum }),
      ...(dailyNum !== undefined && !Number.isNaN(dailyNum) && { dailyRate: dailyNum }),
      amenities: form.amenities
        ? form.amenities.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      images: form.images.map((img) => ({
        url: img.url,
        caption: img.caption || undefined,
      })),
    };

    // [Playground Areas] Debug: form and payload before API call
    if (typeof window !== "undefined") {
      console.log("[Playground Areas] handleSubmit", {
        formHourlyRate: form.hourlyRate,
        formDailyRate: form.dailyRate,
        hourlyNum,
        dailyNum,
        payloadKeys: Object.keys(payload),
        payloadHourlyRate: (payload as Record<string, unknown>).hourlyRate,
        payloadDailyRate: (payload as Record<string, unknown>).dailyRate,
        isEdit: !!editItem,
      });
    }

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Playground area updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Playground area created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Playground area deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit) || 1
    : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && items.length === 0;

  return (
    <div
      className="min-h-screen bg-white font-sans"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
        <div
          className="absolute left-0 top-0 h-full w-1 bg-[linear-gradient(180deg,#ff6d00_0%,#ff9e00_100%)]"
          aria-hidden
        />
        <div className="relative px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Playground Areas
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Manage playground zones, capacity, and opening hours
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="shrink-0 font-semibold"
              style={{
                background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                color: "white",
                boxShadow: "0 4px 14px rgba(255, 109, 0, 0.25)",
              }}
            >
              <Plus className="h-5 w-5" />
              Add Playground Area
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            Filter by status:
          </span>
          <div className="min-w-[160px]">
            <AppReactSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS]}
              placeholder="All statuses"
            />
          </div>
        </div>
        {pagination && !isEmpty && (
          <p className="text-sm text-slate-600">
            Showing {(page - 1) * pagination.limit + 1}–
            {Math.min(page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[260px] animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12">
            <EmptyState
              icon={Sparkles}
              title="No playground areas yet"
              description="Create your first playground area to manage capacity and opening hours."
              action={{
                label: "Add Playground Area",
                onClick: openCreate,
              }}
              actionClassName="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] text-white hover:opacity-90 focus-visible:ring-[#5a189a]"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any) => {
              const statusStyle =
                STATUS_STYLES[item.status] ?? STATUS_STYLES.closed;
              const typeLabel =
                TYPE_OPTIONS.find((o) => o.value === item.type)?.label ??
                item.type;
              const statusLabel =
                STATUS_OPTIONS.find((o) => o.value === item.status)?.label ??
                item.status;
              const firstImage =
                Array.isArray(item.images) && item.images[0] ? item.images[0] : null;

              return (
                <div
                  key={item._id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:border-slate-300"
                >
                  <div className="relative h-32 overflow-hidden bg-slate-100">
                    {firstImage?.url ? (
                      <img
                        src={firstImage.url}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(255, 109, 0, 0.08) 0%, rgba(90, 24, 154, 0.08) 100%)",
                        }}
                      >
                        <Sparkles className="h-10 w-10 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute right-3 top-3">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.text,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm capitalize text-slate-500">
                      {typeLabel}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                      {item.capacity != null && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>Capacity: {item.capacity}</span>
                        </div>
                      )}
                      {(item.openingTime || item.closingTime) && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>
                            {item.openingTime || "—"} – {item.closingTime || "—"}
                          </span>
                        </div>
                      )}
                      {(item.hourlyRate != null && item.hourlyRate > 0) && (
                        <div className="flex items-center gap-1.5 text-[#5a189a] font-medium">
                          <span>
                            ₵{Number(item.hourlyRate).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/hr
                          </span>
                        </div>
                      )}
                      {(item.dailyRate != null && item.dailyRate > 0) && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span>
                            ₵{Number(item.dailyRate).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/day
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                        aria-label="Edit"
                        className="text-slate-600 hover:bg-slate-100 hover:text-[#5a189a]"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDelete(item._id)}
                        aria-label="Delete"
                        className="text-slate-600 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination && !isEmpty && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={!hasPrev || isLoading}
              aria-label="Previous page"
              className="border-slate-300 hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext || isLoading}
              aria-label="Next page"
              className="border-slate-300 hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title=""
        size="2xl"
        className="!max-h-[90vh]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
              }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h2 id="modal-title" className="text-xl font-semibold text-slate-900">
              {editItem ? "Edit Playground Area" : "Add Playground Area"}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
            aria-label="Close modal"
            className="text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 px-6 py-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g. Kids Playground"
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional"
              rows={2}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AppReactSelect
                label="Type"
                value={form.type}
                onChange={(value) => setForm((f) => ({ ...f, type: value }))}
                options={TYPE_OPTIONS}
              />
              <Input
                label="Capacity"
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value }))
                }
                placeholder="e.g. 30"
                required
              />
              <AppReactSelect
                label="Status"
                value={form.status}
                onChange={(value) => setForm((f) => ({ ...f, status: value }))}
                options={STATUS_OPTIONS}
              />
              <AppTimePicker
                label="Opening Time"
                value={form.openingTime}
                onChange={(v) => setForm((f) => ({ ...f, openingTime: v }))}
                placeholder="Select opening time"
                timeIntervals={15}
              />
              <AppTimePicker
                label="Closing Time"
                value={form.closingTime}
                onChange={(v) => setForm((f) => ({ ...f, closingTime: v }))}
                placeholder="Select closing time"
                timeIntervals={15}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Hourly rate (₵)"
                type="number"
                min="0"
                step="0.01"
                value={form.hourlyRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hourlyRate: e.target.value }))
                }
                placeholder="e.g. 50 — used to suggest booking amount"
              />
              <Input
                label="Daily rate (₵)"
                type="number"
                min="0"
                step="0.01"
                value={form.dailyRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dailyRate: e.target.value }))
                }
                placeholder="Optional — flat rate for full-day use"
              />
            </div>
            <Input
              label="Amenities (comma-separated)"
              value={form.amenities}
              onChange={(e) =>
                setForm((f) => ({ ...f, amenities: e.target.value }))
              }
              placeholder="e.g. Shade, Benches, Fence"
            />
            <ImageUpload
              label="Images"
              value={form.images}
              onChange={(images) => setForm((f) => ({ ...f, images }))}
              folder="playground-areas"
              maxFiles={10}
              showCaptions
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="border-slate-300 hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                color: "white",
                boxShadow: "0 4px 14px rgba(255, 109, 0, 0.25)",
              }}
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Playground Area"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this playground area? This action
          cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDelete(null)}
            className="border-slate-300 hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteMut.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
