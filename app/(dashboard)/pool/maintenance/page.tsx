"use client";

import { useState } from "react";
import {
  usePoolMaintenanceList,
  usePoolAreas,
  useCreatePoolMaintenance,
  useUpdatePoolMaintenance,
  useDeletePoolMaintenance,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Badge,
  Textarea,
  Select,
} from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  POOL_MAINTENANCE_TYPE,
  POOL_MAINTENANCE_STATUS,
} from "@/constants";

const TYPE_OPTIONS = Object.entries(POOL_MAINTENANCE_TYPE).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}));

const STATUS_OPTIONS = Object.entries(POOL_MAINTENANCE_STATUS).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const STATUS_BADGE_VARIANT: Record<string, "success" | "info" | "warning" | "default"> = {
  scheduled: "info",
  inProgress: "warning",
  completed: "success",
  postponed: "default",
  cancelled: "default",
};

const fmt = (n: number) =>
  `₵${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function PoolMaintenancePage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    poolAreaId: "",
    scheduledDate: "",
    startTime: "",
    endTime: "",
    recurrence: { frequency: "none" as "none" | "daily" | "weekly" | "monthly", interval: "1", endDate: "" },
    type: POOL_MAINTENANCE_TYPE.CLEANING,
    description: "",
    status: POOL_MAINTENANCE_STATUS.SCHEDULED,
    assignedTo: "",
    cost: "",
    chemicalReadings: {
      pH: "",
      chlorine: "",
      alkalinity: "",
      notes: "",
    },
    notes: "",
  });

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = usePoolMaintenanceList(params);
  const { data: areasData } = usePoolAreas({ limit: "100" });
  const poolAreas = areasData?.data ?? [];
  const createMut = useCreatePoolMaintenance();
  const updateMut = useUpdatePoolMaintenance();
  const deleteMut = useDeletePoolMaintenance();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const poolAreaOptions = poolAreas.map((a: any) => ({
    value: a._id,
    label: `${a.name} (${a.type})`,
  }));

  const resetForm = () => {
    setForm({
      poolAreaId: "",
      scheduledDate: "",
      startTime: "",
      endTime: "",
      recurrence: { frequency: "none", interval: "1", endDate: "" },
      type: POOL_MAINTENANCE_TYPE.CLEANING,
      description: "",
      status: POOL_MAINTENANCE_STATUS.SCHEDULED,
      assignedTo: "",
      cost: "",
      chemicalReadings: {
        pH: "",
        chlorine: "",
        alkalinity: "",
        notes: "",
      },
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
    const chem = item.chemicalReadings ?? {};
    const rec = item.recurrence ?? {};
    setForm({
      poolAreaId: item.poolAreaId?._id ?? item.poolAreaId ?? "",
      scheduledDate: item.scheduledDate
        ? new Date(item.scheduledDate).toISOString().slice(0, 16)
        : "",
      startTime: item.startTime ?? "",
      endTime: item.endTime ?? "",
      recurrence: {
        frequency: rec.frequency ?? "none",
        interval: rec.interval != null ? String(rec.interval) : "1",
        endDate: rec.endDate ? new Date(rec.endDate).toISOString().slice(0, 10) : "",
      },
      type: item.type ?? POOL_MAINTENANCE_TYPE.CLEANING,
      description: item.description ?? "",
      status: item.status ?? POOL_MAINTENANCE_STATUS.SCHEDULED,
      assignedTo: item.assignedTo?._id ?? item.assignedTo ?? "",
      cost: item.cost != null ? String(item.cost) : "",
      chemicalReadings: {
        pH: chem.pH != null ? String(chem.pH) : "",
        chlorine: chem.chlorine != null ? String(chem.chlorine) : "",
        alkalinity: chem.alkalinity != null ? String(chem.alkalinity) : "",
        notes: chem.notes ?? "",
      },
      notes: item.notes ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledDateStr = form.scheduledDate
      ? new Date(form.scheduledDate).toISOString()
      : undefined;
    const payload: Record<string, unknown> = {
      poolAreaId: form.poolAreaId,
      scheduledDate: scheduledDateStr,
      startTime: form.startTime.trim() || undefined,
      endTime: form.endTime.trim() || undefined,
      type: form.type,
      description: form.description.trim(),
      status: form.status,
      cost: form.cost ? parseFloat(form.cost) : undefined,
      notes: form.notes.trim() || undefined,
    };
    if (
      form.recurrence.frequency &&
      form.recurrence.frequency !== "none"
    ) {
      payload.recurrence = {
        frequency: form.recurrence.frequency,
        interval:
          form.recurrence.frequency === "weekly" && form.recurrence.interval
            ? parseInt(form.recurrence.interval, 10) || 1
            : undefined,
        endDate: form.recurrence.endDate
          ? new Date(form.recurrence.endDate).toISOString()
          : undefined,
      };
    }
    const chem = form.chemicalReadings;
    if (chem.pH || chem.chlorine || chem.alkalinity || chem.notes) {
      payload.chemicalReadings = {
        pH: chem.pH ? parseFloat(chem.pH) : undefined,
        chlorine: chem.chlorine ? parseFloat(chem.chlorine) : undefined,
        alkalinity: chem.alkalinity ? parseFloat(chem.alkalinity) : undefined,
        notes: chem.notes.trim() || undefined,
      };
    }
    if (form.assignedTo) payload.assignedTo = form.assignedTo;

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Maintenance record updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Maintenance record created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Maintenance record deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const columns = [
    {
      key: "poolArea",
      header: "Pool Area",
      render: (row: any) =>
        row.poolAreaId?.name ?? (typeof row.poolAreaId === "string" ? "—" : "—"),
    },
    {
      key: "scheduledDate",
      header: "Scheduled",
      render: (row: any) => formatDate(row.scheduledDate),
      sortable: true,
    },
    {
      key: "type",
      header: "Type",
      render: (row: any) =>
        TYPE_OPTIONS.find((o) => o.value === row.type)?.label ?? row.type,
    },
    { key: "description", header: "Description" },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? "default"}>
          {STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status}
        </Badge>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      render: (row: any) =>
        row.cost != null ? fmt(row.cost) : "—",
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDelete(row._id)}
            aria-label="Delete"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Pool Maintenance</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Statuses" },
              ...STATUS_OPTIONS,
            ]}
            className="w-40"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Maintenance
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        getRowKey={(row) => row._id}
        loading={isLoading}
        pagination={
          pagination
            ? {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                onPageChange: setPage,
              }
            : undefined
        }
        emptyTitle="No maintenance records"
        emptyDescription="Schedule pool maintenance to get started."
      />

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Maintenance" : "Schedule Maintenance"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <AppReactSelect
            label="Pool Area"
            value={form.poolAreaId}
            onChange={(value) => setForm((f) => ({ ...f, poolAreaId: value }))}
            options={poolAreaOptions}
            placeholder="Select pool area"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Scheduled Date & Time"
              type="datetime-local"
              value={form.scheduledDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, scheduledDate: e.target.value }))
              }
              required
            />
            <Input
              label="Start time (block)"
              value={form.startTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, startTime: e.target.value }))
              }
              placeholder="e.g. 08:00"
            />
            <Input
              label="End time (block)"
              value={form.endTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, endTime: e.target.value }))
              }
              placeholder="e.g. 10:00"
            />
            <AppReactSelect
              label="Type"
              value={form.type}
              onChange={(value) => setForm((f) => ({ ...f, type: value }))}
              options={TYPE_OPTIONS}
            />
            <AppReactSelect
              label="Status"
              value={form.status}
              onChange={(value) => setForm((f) => ({ ...f, status: value }))}
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
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="mb-3 text-sm font-medium text-slate-700">
              Recurrence (optional)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Frequency"
                value={form.recurrence.frequency}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    recurrence: {
                      ...f.recurrence,
                      frequency: e.target.value as "none" | "daily" | "weekly" | "monthly",
                    },
                  }))
                }
                options={[
                  { value: "none", label: "None" },
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ]}
              />
              {form.recurrence.frequency === "weekly" && (
                <Input
                  label="Every N weeks"
                  type="number"
                  min="1"
                  value={form.recurrence.interval}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      recurrence: { ...f.recurrence, interval: e.target.value },
                    }))
                  }
                />
              )}
              <Input
                label="Recurrence end date"
                type="date"
                value={form.recurrence.endDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    recurrence: { ...f.recurrence, endDate: e.target.value },
                  }))
                }
                placeholder="Optional"
              />
            </div>
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            required
            placeholder="Describe the maintenance task"
            rows={2}
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="mb-3 text-sm font-medium text-slate-700">
              Chemical readings (optional)
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Input
                label="pH"
                type="number"
                min="0"
                max="14"
                step="0.1"
                value={form.chemicalReadings.pH}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    chemicalReadings: {
                      ...f.chemicalReadings,
                      pH: e.target.value,
                    },
                  }))
                }
                placeholder="0–14"
              />
              <Input
                label="Chlorine (ppm)"
                type="number"
                min="0"
                step="0.1"
                value={form.chemicalReadings.chlorine}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    chemicalReadings: {
                      ...f.chemicalReadings,
                      chlorine: e.target.value,
                    },
                  }))
                }
                placeholder="Optional"
              />
              <Input
                label="Alkalinity"
                type="number"
                min="0"
                value={form.chemicalReadings.alkalinity}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    chemicalReadings: {
                      ...f.chemicalReadings,
                      alkalinity: e.target.value,
                    },
                  }))
                }
                placeholder="Optional"
              />
              <Input
                label="Notes"
                value={form.chemicalReadings.notes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    chemicalReadings: {
                      ...f.chemicalReadings,
                      notes: e.target.value,
                    },
                  }))
                }
                placeholder="Optional"
              />
            </div>
          </div>
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Additional notes"
            rows={2}
          />
          <div className="flex justify-end gap-2 pt-2">
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
            >
              {editItem ? "Update" : "Create"}
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
          Are you sure you want to delete this maintenance record? This action
          cannot be undone.
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
