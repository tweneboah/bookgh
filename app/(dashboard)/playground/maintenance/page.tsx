"use client";

import { useState } from "react";
import {
  usePlaygroundMaintenanceList,
  usePlaygroundAreas,
  usePlaygroundEquipmentList,
  useCreatePlaygroundMaintenance,
  useUpdatePlaygroundMaintenance,
  useDeletePlaygroundMaintenance,
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
import { Plus, Pencil, Trash2, Wrench, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  PLAYGROUND_MAINTENANCE_TYPE,
  PLAYGROUND_MAINTENANCE_STATUS,
} from "@/constants";
import { format } from "date-fns";

const TYPE_OPTIONS = Object.entries(PLAYGROUND_MAINTENANCE_TYPE).map(
  ([k, v]) => ({
    value: v,
    label: k.replace(/([A-Z])/g, " $1").trim(),
  })
);

const STATUS_OPTIONS = Object.entries(PLAYGROUND_MAINTENANCE_STATUS).map(
  ([k, v]) => ({
    value: v,
    label: k.replace(/([A-Z])/g, " $1").trim(),
  })
);

const fmt = (n: number) =>
  `₵${Number(n).toLocaleString("en-GH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export default function PlaygroundMaintenancePage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    playgroundAreaId: "",
    playgroundEquipmentId: "",
    scheduledDate: null as Date | null,
    type: PLAYGROUND_MAINTENANCE_TYPE.INSPECTION,
    description: "",
    status: PLAYGROUND_MAINTENANCE_STATUS.SCHEDULED,
    cost: "",
    notes: "",
  });

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (statusFilter) params.status = statusFilter;
  if (areaFilter) params.playgroundAreaId = areaFilter;

  const { data, isLoading } = usePlaygroundMaintenanceList(params);
  const { data: areasData } = usePlaygroundAreas({ limit: "100" });
  const { data: equipmentData } = usePlaygroundEquipmentList({
    limit: "200",
    ...(form.playgroundAreaId && {
      playgroundAreaId: form.playgroundAreaId,
    }),
  });
  const areas = areasData?.data ?? [];
  const equipmentList = equipmentData?.data ?? [];
  const createMut = useCreatePlaygroundMaintenance();
  const updateMut = useUpdatePlaygroundMaintenance();
  const deleteMut = useDeletePlaygroundMaintenance();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const areaOptions = areas.map((a: any) => ({
    value: a._id,
    label: a.name,
  }));

  const equipmentOptions = equipmentList.map((e: any) => ({
    value: e._id,
    label: `${e.name} (${e.type})`,
  }));

  const resetForm = () => {
    setForm({
      playgroundAreaId: "",
      playgroundEquipmentId: "",
      scheduledDate: null,
      type: PLAYGROUND_MAINTENANCE_TYPE.INSPECTION,
      description: "",
      status: PLAYGROUND_MAINTENANCE_STATUS.SCHEDULED,
      cost: "",
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
    setForm({
      playgroundAreaId:
        item.playgroundAreaId?._id ?? item.playgroundAreaId ?? "",
      playgroundEquipmentId:
        item.playgroundEquipmentId?._id ?? item.playgroundEquipmentId ?? "",
      scheduledDate: item.scheduledDate
        ? new Date(item.scheduledDate)
        : null,
      type: item.type ?? PLAYGROUND_MAINTENANCE_TYPE.INSPECTION,
      description: item.description ?? "",
      status: item.status ?? PLAYGROUND_MAINTENANCE_STATUS.SCHEDULED,
      cost: item.cost != null ? String(item.cost) : "",
      notes: item.notes ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      playgroundAreaId: form.playgroundAreaId,
      scheduledDate: form.scheduledDate
        ? form.scheduledDate.toISOString()
        : undefined,
      type: form.type,
      description: form.description.trim(),
      status: form.status,
      cost: form.cost ? parseFloat(form.cost) : undefined,
      notes: form.notes.trim() || undefined,
    };
    if (form.playgroundEquipmentId) {
      (payload as any).playgroundEquipmentId = form.playgroundEquipmentId;
    }

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Maintenance record updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Maintenance scheduled");
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
      toast.success("Maintenance record deleted");
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
                Playground Maintenance
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Schedule inspections, cleaning, and repairs
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
              Schedule Maintenance
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Area:</span>
          <div className="min-w-[180px]">
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
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Status:</span>
          <div className="min-w-[140px]">
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
          <p className="text-sm text-slate-600">
            {(page - 1) * pagination.limit + 1}–
            {Math.min(page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12">
            <EmptyState
              icon={Wrench}
              title="No maintenance records"
              description="Schedule inspections, cleaning, and repairs for playground areas and equipment."
              action={{
                label: "Schedule Maintenance",
                onClick: openCreate,
              }}
              actionClassName="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] text-white"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item: any) => {
              const typeLabel =
                TYPE_OPTIONS.find((o) => o.value === item.type)?.label ??
                item.type;
              const statusLabel =
                STATUS_OPTIONS.find((o) => o.value === item.status)?.label ??
                item.status;
              const areaName =
                item.playgroundAreaId?.name ?? "—";
              const equipmentName = item.playgroundEquipmentId?.name
                ? ` · ${item.playgroundEquipmentId.name}`
                : "";

              return (
                <div
                  key={item._id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {typeLabel} – {item.description}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {areaName}
                      {equipmentName} ·{" "}
                      {item.scheduledDate
                        ? format(
                            new Date(item.scheduledDate),
                            "dd MMM yyyy"
                          )
                        : "—"}
                      {item.cost != null && item.cost > 0 && (
                        <> · {fmt(item.cost)}</>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {statusLabel}
                  </span>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(item)}
                      className="text-slate-600 hover:text-[#5a189a]"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDelete(item._id)}
                      className="text-slate-600 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination && !isEmpty && totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={!hasPrev}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm text-slate-700">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
            >
              Next
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
        size="lg"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {editItem ? "Edit Maintenance" : "Schedule Maintenance"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <AppReactSelect
              label="Playground Area"
              value={form.playgroundAreaId}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  playgroundAreaId: v ?? "",
                  playgroundEquipmentId: "",
                }))
              }
              options={areaOptions}
              placeholder="Select area"
              required
            />
            <AppReactSelect
              label="Equipment (optional)"
              value={form.playgroundEquipmentId}
              onChange={(v) =>
                setForm((f) => ({ ...f, playgroundEquipmentId: v ?? "" }))
              }
              options={[{ value: "", label: "None" }, ...equipmentOptions]}
              placeholder="Select equipment"
            />
            <AppDatePicker
              label="Scheduled date"
              selected={form.scheduledDate}
              onChange={(d) =>
                setForm((f) => ({ ...f, scheduledDate: d ?? null }))
              }
              required
              placeholderText="Select date"
            />
            <AppReactSelect
              label="Type"
              value={form.type}
              onChange={(v) =>
                setForm((f) => ({ ...f, type: v ?? form.type }))
              }
              options={TYPE_OPTIONS}
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="e.g. Safety inspection"
              required
            />
            <AppReactSelect
              label="Status"
              value={form.status}
              onChange={(v) =>
                setForm((f) => ({ ...f, status: v ?? form.status }))
              }
              options={STATUS_OPTIONS}
            />
            <Input
              label="Cost (₵)"
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              placeholder="Optional"
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
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              style={{
                background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                color: "white",
              }}
            >
              {editItem ? "Update" : "Schedule"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Maintenance Record"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this maintenance record?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowDelete(null)}>
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
