"use client";

import { useState } from "react";
import {
  useMaintenanceTickets,
  useCreateMaintenanceTicket,
  useUpdateMaintenanceTicket,
  useDeleteMaintenanceTicket,
  useRooms,
  useAssets,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Select,
  Badge,
  Textarea,
} from "@/components/ui";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { MAINTENANCE_CATEGORY, MAINTENANCE_STATUS, PRIORITY } from "@/constants";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "-";
  }
}

const CATEGORY_OPTIONS = Object.entries(MAINTENANCE_CATEGORY).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const STATUS_OPTIONS = Object.entries(MAINTENANCE_STATUS).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const PRIORITY_OPTIONS = Object.entries(PRIORITY).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const STATUS_BADGE_VARIANT: Record<string, "danger" | "warning" | "info" | "success" | "default"> = {
  open: "danger",
  assigned: "warning",
  inProgress: "info",
  completed: "success",
  closed: "default",
};

const PRIORITY_BADGE_VARIANT: Record<string, "outline" | "default" | "warning" | "danger"> = {
  low: "outline",
  normal: "default",
  high: "warning",
  urgent: "danger",
  critical: "danger",
};

function toISO(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString();
}

export default function MaintenancePage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: MAINTENANCE_CATEGORY.OTHER as string,
    roomId: "",
    assetId: "",
    priority: PRIORITY.NORMAL as string,
    assignedTo: "",
    estimatedCost: "",
    scheduledDate: "",
    isPreventive: false,
    images: [] as UploadedImage[],
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (statusFilter) params.status = statusFilter;
  if (priorityFilter) params.priority = priorityFilter;

  const { data, isLoading } = useMaintenanceTickets(params);
  const { data: roomsData } = useRooms({ limit: "500" });
  const { data: assetsData } = useAssets({ limit: "500" });
  const createMut = useCreateMaintenanceTicket();
  const updateMut = useUpdateMaintenanceTicket();
  const deleteMut = useDeleteMaintenanceTicket();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const rooms = roomsData?.data ?? [];
  const assets = assetsData?.data ?? [];

  const roomOptions = rooms.map((r: any) => ({
    value: r._id,
    label: r.roomNumber ?? r._id,
  }));

  const assetOptions = assets.map((a: any) => ({
    value: a._id,
    label: a.name ?? a._id,
  }));

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      category: MAINTENANCE_CATEGORY.OTHER,
      roomId: "",
      assetId: "",
      priority: PRIORITY.NORMAL,
      assignedTo: "",
      estimatedCost: "",
      scheduledDate: "",
      isPreventive: false,
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
    const r = item.roomId;
    const a = item.assetId;
    setForm({
      title: item.title ?? "",
      description: item.description ?? "",
      category: item.category ?? MAINTENANCE_CATEGORY.OTHER,
      roomId: r?._id ?? r ?? "",
      assetId: a?._id ?? a ?? "",
      priority: item.priority ?? PRIORITY.NORMAL,
      assignedTo: item.assignedTo ?? "",
      estimatedCost: item.estimatedCost != null ? String(item.estimatedCost) : "",
      scheduledDate: item.scheduledDate ? item.scheduledDate.slice(0, 16) : "",
      isPreventive: item.isPreventive === true,
      images: Array.isArray(item.images)
        ? item.images.map((url: string) => ({ url }))
        : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      roomId: form.roomId || undefined,
      assetId: form.assetId || undefined,
      priority: form.priority,
      assignedTo: form.assignedTo.trim() || undefined,
      estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      scheduledDate: form.scheduledDate ? toISO(form.scheduledDate) : undefined,
      isPreventive: form.isPreventive,
      images: form.images.map((img) => img.url),
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload } as any);
        toast.success("Maintenance ticket updated");
      } else {
        await createMut.mutateAsync(payload as any);
        toast.success("Maintenance ticket created");
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
      toast.success("Maintenance ticket deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (row: any) => (
        <span className="font-medium">{row.title ?? "-"}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row: any) =>
        CATEGORY_OPTIONS.find((o) => o.value === row.category)?.label ?? row.category,
    },
    {
      key: "roomId",
      header: "Room",
      render: (row: any) => {
        const r = row.roomId;
        return r?.roomNumber ?? "-";
      },
    },
    {
      key: "priority",
      header: "Priority",
      render: (row: any) => (
        <Badge variant={PRIORITY_BADGE_VARIANT[row.priority] ?? "default"}>
          {PRIORITY_OPTIONS.find((o) => o.value === row.priority)?.label ?? row.priority}
        </Badge>
      ),
    },
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
      key: "assignedTo",
      header: "Assigned To",
      render: (row: any) => row.assignedTo ?? "-",
    },
    {
      key: "estimatedCost",
      header: "Est. Cost",
      render: (row: any) =>
        row.estimatedCost != null ? fmt(row.estimatedCost) : "-",
    },
    {
      key: "actualCost",
      header: "Actual Cost",
      render: (row: any) =>
        row.actualCost != null ? fmt(row.actualCost) : "-",
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
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance</h1>
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
          <Select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Priorities" },
              ...PRIORITY_OPTIONS,
            ]}
            className="w-40"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Ticket
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
        emptyTitle="No maintenance tickets"
        emptyDescription="Add your first maintenance ticket to get started."
      />

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Ticket" : "Add Maintenance Ticket"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            placeholder="e.g. AC unit not cooling"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Optional details"
            rows={3}
          />
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Room (optional)"
              options={[
                { value: "", label: "Select room..." },
                ...roomOptions,
              ]}
              value={form.roomId}
              onChange={(e) =>
                setForm((f) => ({ ...f, roomId: e.target.value }))
              }
            />
            <Select
              label="Asset (optional)"
              options={[
                { value: "", label: "Select asset..." },
                ...assetOptions,
              ]}
              value={form.assetId}
              onChange={(e) =>
                setForm((f) => ({ ...f, assetId: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value }))
              }
            />
            <Input
              label="Assigned To"
              value={form.assignedTo}
              onChange={(e) =>
                setForm((f) => ({ ...f, assignedTo: e.target.value }))
              }
              placeholder="Staff name or ID"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estimated Cost (GHS)"
              type="number"
              min="0"
              step="0.01"
              value={form.estimatedCost}
              onChange={(e) =>
                setForm((f) => ({ ...f, estimatedCost: e.target.value }))
              }
              placeholder="Optional"
            />
            <Input
              label="Scheduled Date"
              type="datetime-local"
              value={form.scheduledDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, scheduledDate: e.target.value }))
              }
            />
          </div>
          <ImageUpload
            label="Photos"
            value={form.images}
            onChange={(images) => setForm((f) => ({ ...f, images }))}
            folder="maintenance"
            maxFiles={5}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isPreventive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isPreventive: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Preventive maintenance</span>
          </label>
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
        title="Delete Ticket"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this maintenance ticket? This action
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
