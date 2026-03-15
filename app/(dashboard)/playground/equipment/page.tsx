"use client";

import { useState } from "react";
import {
  usePlaygroundEquipmentList,
  usePlaygroundAreas,
  useCreatePlaygroundEquipment,
  useUpdatePlaygroundEquipment,
  useDeletePlaygroundEquipment,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Textarea,
  EmptyState,
  AppReactSelect,
  AppDatePicker,
} from "@/components/ui";
import {
  Plus,
  Pencil,
  Trash2,
  SlidersHorizontal,
  X,
  MapPin,
  Calendar,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  PLAYGROUND_EQUIPMENT_TYPE,
  PLAYGROUND_EQUIPMENT_STATUS,
} from "@/constants";
import { format } from "date-fns";

const TYPE_OPTIONS = Object.entries(PLAYGROUND_EQUIPMENT_TYPE).map(
  ([k, v]) => ({
    value: v,
    label: k.replace(/([A-Z])/g, " $1").trim().replace(/^ /, ""),
  })
);

const STATUS_OPTIONS = Object.entries(PLAYGROUND_EQUIPMENT_STATUS).map(
  ([k, v]) => ({
    value: v,
    label: k.replace(/([A-Z])/g, " $1").trim(),
  })
);

const STATUS_STYLES: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-800",
  inUse: "bg-blue-100 text-blue-800",
  maintenance: "bg-amber-100 text-amber-800",
  outOfOrder: "bg-red-100 text-red-800",
  removed: "bg-slate-100 text-slate-600",
};

const STATUS_ACCENT: Record<string, string> = {
  available: "#5a189a",
  inUse: "#7b2cbf",
  maintenance: "#ff8500",
  outOfOrder: "#ff6d00",
  removed: "#64748b",
};

export default function PlaygroundEquipmentPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    playgroundAreaId: "",
    name: "",
    type: PLAYGROUND_EQUIPMENT_TYPE.OTHER,
    description: "",
    status: PLAYGROUND_EQUIPMENT_STATUS.AVAILABLE,
    lastInspectionDate: null as Date | null,
    notes: "",
  });

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (statusFilter) params.status = statusFilter;
  if (areaFilter) params.playgroundAreaId = areaFilter;

  const { data, isLoading } = usePlaygroundEquipmentList(params);
  const { data: areasData } = usePlaygroundAreas({ limit: "100" });
  const areas = areasData?.data ?? [];
  const createMut = useCreatePlaygroundEquipment();
  const updateMut = useUpdatePlaygroundEquipment();
  const deleteMut = useDeletePlaygroundEquipment();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const areaOptions = areas.map((a: any) => ({
    value: a._id,
    label: a.name,
  }));

  const resetForm = () => {
    setForm({
      playgroundAreaId: "",
      name: "",
      type: PLAYGROUND_EQUIPMENT_TYPE.OTHER,
      description: "",
      status: PLAYGROUND_EQUIPMENT_STATUS.AVAILABLE,
      lastInspectionDate: null,
      notes: "",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const areaId =
      item.playgroundAreaId?._id ?? item.playgroundAreaId ?? "";
    setForm({
      playgroundAreaId: areaId,
      name: item.name ?? "",
      type: item.type ?? PLAYGROUND_EQUIPMENT_TYPE.OTHER,
      description: item.description ?? "",
      status: item.status ?? PLAYGROUND_EQUIPMENT_STATUS.AVAILABLE,
      lastInspectionDate: item.lastInspectionDate
        ? new Date(item.lastInspectionDate)
        : null,
      notes: item.notes ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      playgroundAreaId: form.playgroundAreaId,
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };
    if (form.lastInspectionDate) {
      (payload as any).lastInspectionDate =
        form.lastInspectionDate.toISOString();
    }

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Equipment updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Equipment created");
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
      toast.success("Equipment deleted");
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
      {/* Header: white, gradient accent line, orange CTA */}
      <header className="bg-white">
        <div className="border-b border-slate-100 pb-6 pt-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div
                className="mb-2 h-1 w-16 rounded-full"
                style={{
                  background: "linear-gradient(90deg, #ff6d00 0%, #9d4edd 100%)",
                }}
                aria-hidden
              />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Playground Equipment
              </h1>
              <p className="mt-1 text-sm font-normal text-slate-600 sm:text-base">
                Track slides, seesaws, swings, and other play equipment
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="shrink-0 font-semibold"
              style={{
                background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                color: "white",
                boxShadow: "0 4px 14px rgba(255, 109, 0, 0.3)",
              }}
            >
              <Plus className="h-5 w-5" />
              Add Equipment
            </Button>
          </div>
        </div>
      </header>

      {/* Filters: single card, no overflow clip */}
      <div className="mt-6 overflow-visible">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 sm:min-w-[180px]">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Area
                </label>
                <AppReactSelect
                  value={areaFilter}
                  onChange={(v) => {
                    setAreaFilter(v ?? "");
                    setPage(1);
                  }}
                  options={[{ value: "", label: "All areas" }, ...areaOptions]}
                  placeholder="All areas"
                />
              </div>
              <div className="min-w-0 flex-1 sm:min-w-[160px]">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </label>
                <AppReactSelect
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v ?? "");
                    setPage(1);
                  }}
                  options={[{ value: "", label: "All" }, ...STATUS_OPTIONS]}
                  placeholder="All"
                />
              </div>
            </div>
            {pagination && !isEmpty && (
              <p className="text-sm font-medium text-slate-600">
                {(page - 1) * pagination.limit + 1}–
                {Math.min(page * pagination.limit, pagination.total)} of{" "}
                {pagination.total}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-slate-100 bg-slate-50/60"
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="overflow-visible rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-8 shadow-sm sm:p-12">
            <EmptyState
              icon={SlidersHorizontal}
              title="No equipment yet"
              description="Add slides, seesaws, swings, and other play equipment to track status and inspections."
              action={{
                label: "Add Equipment",
                onClick: openCreate,
              }}
              actionClassName="rounded-xl bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 font-semibold text-white shadow-md transition-all hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6d00] focus-visible:ring-offset-2"
              className="!border-0 !bg-transparent !p-0"
            />
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item: any) => {
                const typeLabel =
                  TYPE_OPTIONS.find((o) => o.value === item.type)?.label ??
                  item.type;
                const statusLabel =
                  STATUS_OPTIONS.find((o) => o.value === item.status)?.label ??
                  item.status;
                const areaName =
                  item.playgroundAreaId?.name ?? item.playgroundAreaId ?? "—";
                const accentColor =
                  STATUS_ACCENT[item.status] ?? "#5a189a";

                return (
                  <article
                    key={item._id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div
                      className="absolute left-0 top-0 h-full w-1 shrink-0 rounded-l-2xl"
                      style={{ backgroundColor: accentColor }}
                      aria-hidden
                    />
                    <div className="pl-5 pr-4 py-4 sm:pl-6 sm:pr-5 sm:py-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {item.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                            <Layers className="h-3.5 w-3.5 shrink-0" />
                            <span className="capitalize truncate">{typeLabel}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{areaName}</span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                            STATUS_STYLES[item.status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      {item.lastInspectionDate && (
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3 w-3 shrink-0" />
                          Last inspection:{" "}
                          {format(
                            new Date(item.lastInspectionDate),
                            "dd MMM yyyy"
                          )}
                        </p>
                      )}
                      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                          className="text-slate-600 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDelete(item._id)}
                          className="text-slate-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {pagination && totalPages > 1 && (
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!hasPrev}
                  className="border-slate-200 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Previous
                </Button>
                <span className="px-2 text-sm font-medium text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNext}
                  className="border-slate-200 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

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
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <div
              className="mb-1.5 h-0.5 w-10 rounded-full"
              style={{
                background: "linear-gradient(90deg, #ff6d00 0%, #9d4edd 100%)",
              }}
              aria-hidden
            />
            <h2 className="text-xl font-semibold text-slate-900">
              {editItem ? "Edit Equipment" : "Add Equipment"}
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
            aria-label="Close"
            className="text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-visible px-6 py-5">
          <div className="space-y-4">
            <AppReactSelect
              label="Playground Area"
              value={form.playgroundAreaId}
              onChange={(v) =>
                setForm((f) => ({ ...f, playgroundAreaId: v ?? "" }))
              }
              options={areaOptions}
              placeholder="Select area"
              required
            />
            <Input
              label="Name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Main slide"
              required
            />
            <AppReactSelect
              label="Type"
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v ?? form.type }))}
              options={TYPE_OPTIONS}
            />
            <AppReactSelect
              label="Status"
              value={form.status}
              onChange={(v) =>
                setForm((f) => ({ ...f, status: v ?? form.status }))
              }
              options={STATUS_OPTIONS}
            />
            <AppDatePicker
              label="Last inspection date"
              selected={form.lastInspectionDate}
              onChange={(d) =>
                setForm((f) => ({ ...f, lastInspectionDate: d ?? null }))
              }
              placeholderText="Optional"
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
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Optional"
              rows={2}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="border-slate-200 font-medium text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                boxShadow: "0 4px 14px rgba(255, 109, 0, 0.25)",
              }}
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Equipment"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this equipment record?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDelete(null)}
            className="border-slate-200 font-medium text-slate-700"
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