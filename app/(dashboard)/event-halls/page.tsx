"use client";

import { useState } from "react";
import {
  useEventHalls,
  useCreateEventHall,
  useUpdateEventHall,
  useDeleteEventHall,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Badge,
  Textarea,
} from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { Plus, Pencil, Trash2, LayoutGrid, Building2, Users, Layout, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { EVENT_HALL_STATUS } from "@/constants";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 0 }).format(n);

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...Object.entries(EVENT_HALL_STATUS).map(([k, v]) => ({
    value: v,
    label: k.replace(/([A-Z])/g, " $1").trim(),
  })),
];

const STATUS_BADGE_VARIANT: Record<string, "success" | "info" | "warning" | "default"> = {
  available: "success",
  booked: "info",
  maintenance: "warning",
};

type Hall = {
  _id: string;
  name?: string;
  description?: string;
  capacity?: number;
  hourlyRate?: number;
  status?: string;
  layoutTemplates?: unknown[];
};

export default function EventHallsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [editItem, setEditItem] = useState<Hall | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    capacity: "",
    hourlyRate: "",
    amenities: "",
    layoutTypes: "",
    layoutTemplates: [] as Array<{
      name: string;
      capacity: string;
      caption: string;
      images: UploadedImage[];
    }>,
    images: [] as UploadedImage[],
  });

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useEventHalls(params);
  const createMut = useCreateEventHall();
  const updateMut = useUpdateEventHall();
  const deleteMut = useDeleteEventHall();

  const items = (data?.data ?? []) as Hall[];
  const pagination = data?.meta?.pagination;

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      capacity: "",
      hourlyRate: "",
      amenities: "",
      layoutTypes: "",
      layoutTemplates: [],
      images: [],
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: Hall) => {
    setEditItem(item);
    const templates = Array.isArray(item.layoutTemplates) ? item.layoutTemplates : [];
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      capacity: item.capacity != null ? String(item.capacity) : "",
      hourlyRate: item.hourlyRate != null ? String(item.hourlyRate) : "",
      amenities: Array.isArray((item as { amenities?: string[] }).amenities)
        ? (item as { amenities?: string[] }).amenities!.join(", ")
        : "",
      layoutTypes: Array.isArray((item as { layoutTypes?: string[] }).layoutTypes)
        ? (item as { layoutTypes?: string[] }).layoutTypes!.join(", ")
        : "",
      layoutTemplates: (templates as Array<{ name?: string; capacity?: number; caption?: string; imageUrl?: string }>).map((t) => ({
        name: t.name ?? "",
        capacity: t.capacity != null ? String(t.capacity) : "",
        caption: t.caption ?? "",
        images: t.imageUrl ? [{ url: t.imageUrl, caption: t.caption }] : [],
      })),
      images: Array.isArray((item as { images?: { url?: string; publicId?: string; caption?: string }[] }).images)
        ? (item as { images?: { url?: string; publicId?: string; caption?: string }[] }).images!.map((img) => ({
            url: img.url ?? "",
            publicId: img.publicId ?? "",
            caption: img.caption ?? "",
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
      capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
      hourlyRate: parseFloat(form.hourlyRate),
      amenities: form.amenities
        ? form.amenities.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      layoutTypes: form.layoutTypes
        ? form.layoutTypes.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      layoutTemplates: form.layoutTemplates
        .filter((t) => t.name.trim())
        .map((t) => ({
          name: t.name.trim(),
          capacity: parseInt(t.capacity || "0", 10) || 0,
          imageUrl: t.images?.[0]?.url,
          caption: t.caption.trim() || undefined,
        })),
      images: form.images.map((img) => ({ url: img.url, caption: img.caption || undefined })),
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Event hall updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Event hall created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
          "Something went wrong"
      );
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Event hall deleted");
      setShowDelete(null);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
          "Something went wrong"
      );
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

  return (
    <div className="min-h-0 bg-white font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-slate-200/80 bg-white">
        <div
          className="absolute left-0 top-0 h-full w-1 bg-[linear-gradient(180deg,#ff6d00_0%,#ff9e00_100%)]"
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#5a189a_0%,#7b2cbf_100%)] text-white shadow-lg shadow-[#5a189a]/20">
                <Building2 className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Event Halls
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">
                  Manage venues, capacity, rates, and layout templates.
                </p>
              </div>
            </div>
            <Button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ff6d00_0%,#ff8500_100%)] font-semibold text-white shadow-md hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              Add Hall
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="w-full min-w-0 sm:w-48">
            <AppReactSelect
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v ?? "");
                setPage(1);
              }}
              options={STATUS_OPTIONS}
              placeholder="Status"
            />
          </div>
        </div>

        {/* Hall cards */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#5a189a]" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Building2 className="h-7 w-7" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900">No event halls</p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Add your first event hall to get started.
              </p>
              <Button
                onClick={openCreate}
                className="mt-4 rounded-xl bg-[linear-gradient(135deg,#ff6d00_0%,#ff8500_100%)] font-semibold text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Hall
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                {items.map((row) => {
                  const layoutCount = Array.isArray(row.layoutTemplates) ? row.layoutTemplates.length : 0;
                  return (
                    <div
                      key={row._id}
                      className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:border-[#5a189a]/20 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {row.name ?? "Unnamed"}
                        </h3>
                        <Badge variant={STATUS_BADGE_VARIANT[row.status ?? ""] ?? "default"} className="shrink-0 text-xs">
                          {STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status ?? "—"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        {row.capacity != null && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-slate-400" />
                            {row.capacity}
                          </span>
                        )}
                        {layoutCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Layout className="h-4 w-4 text-slate-400" />
                            {layoutCount} layout{layoutCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 space-y-1 text-xs font-medium text-slate-500">
                        {row.hourlyRate != null && (
                          <p className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Hourly {fmt(row.hourlyRate)}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(row)}
                          className="text-slate-600 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDelete(row._id)}
                          aria-label="Delete"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {pagination && totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
                  <p className="text-sm font-medium text-slate-500">
                    Page {pagination.page} of {totalPages} · {pagination.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-lg"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title=""
        size="lg"
      >
        <div className="relative overflow-hidden rounded-t-xl border-b border-slate-100 bg-[linear-gradient(135deg,#5a189a_0%,#7b2cbf_100%)] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {editItem ? "Edit Event Hall" : "Add Event Hall"}
              </h2>
              <p className="text-sm text-white/90">
                {editItem ? "Update venue details and rates." : "Create a new event hall."}
              </p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. Grand Ballroom"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Brief description"
            rows={3}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Capacity"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              placeholder="Optional"
            />
            <Input
              label="Hourly Rate (GHS)"
              type="number"
              min="0"
              step="0.01"
              value={form.hourlyRate}
              onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
              placeholder="e.g. 500"
              required
            />
          </div>
          <Input
            label="Amenities (comma-separated)"
            value={form.amenities}
            onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
            placeholder="e.g. stage, PA system, lighting"
          />
          <Input
            label="Layout Types (comma-separated)"
            value={form.layoutTypes}
            onChange={(e) => setForm((f) => ({ ...f, layoutTypes: e.target.value }))}
            placeholder="e.g. theater, banquet, classroom"
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <LayoutGrid className="h-4 w-4 text-[#5a189a]" />
                Room setup & layout templates
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    layoutTemplates: [
                      ...f.layoutTemplates,
                      { name: "", capacity: "", caption: "", images: [] },
                    ],
                  }))
                }
                className="rounded-lg border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/5"
              >
                <Plus className="mr-1 h-4 w-4" /> Add layout
              </Button>
            </div>
            <p className="mb-3 text-xs font-medium text-slate-500">
              Define layout types (e.g. Theater, Classroom, U-shape) with capacity and optional image.
            </p>
            {form.layoutTemplates.length === 0 ? (
              <p className="text-sm text-slate-400">No layouts added. Click &quot;Add layout&quot; to add one.</p>
            ) : (
              <div className="space-y-4">
                {form.layoutTemplates.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <Input
                      label="Layout name"
                      value={row.name}
                      onChange={(e) =>
                        setForm((f) => {
                          const next = [...f.layoutTemplates];
                          next[idx] = { ...next[idx], name: e.target.value };
                          return { ...f, layoutTemplates: next };
                        })
                      }
                      placeholder="e.g. Theater"
                      className="min-w-[120px]"
                    />
                    <Input
                      label="Capacity"
                      type="number"
                      min="0"
                      value={row.capacity}
                      onChange={(e) =>
                        setForm((f) => {
                          const next = [...f.layoutTemplates];
                          next[idx] = { ...next[idx], capacity: e.target.value };
                          return { ...f, layoutTemplates: next };
                        })
                      }
                      placeholder="e.g. 80"
                      className="w-24"
                    />
                    <div className="min-w-[180px] flex-1">
                      <ImageUpload
                        label="Layout image (optional)"
                        value={row.images}
                        onChange={(images) =>
                          setForm((f) => {
                            const next = [...f.layoutTemplates];
                            next[idx] = { ...next[idx], images };
                            return { ...f, layoutTemplates: next };
                          })
                        }
                        folder="event-halls/layouts"
                        single
                        maxFiles={1}
                      />
                    </div>
                    <Input
                      label="Caption"
                      value={row.caption}
                      onChange={(e) =>
                        setForm((f) => {
                          const next = [...f.layoutTemplates];
                          next[idx] = { ...next[idx], caption: e.target.value };
                          return { ...f, layoutTemplates: next };
                        })
                      }
                      placeholder="Optional"
                      className="min-w-[100px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-6 text-red-600 hover:bg-red-50"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          layoutTemplates: f.layoutTemplates.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <ImageUpload
            label="Images"
            value={form.images}
            onChange={(images) => setForm((f) => ({ ...f, images }))}
            folder="event-halls"
            maxFiles={10}
            showCaptions
          />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="rounded-xl bg-[linear-gradient(135deg,#ff6d00_0%,#ff8500_100%)] font-semibold text-white"
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Event Hall">
        <p className="font-medium text-slate-600">
          Are you sure you want to delete this event hall? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowDelete(null)} className="rounded-xl">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} loading={deleteMut.isPending} className="rounded-xl">
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
