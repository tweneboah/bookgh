"use client";

import { useState } from "react";
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { ASSET_CONDITION } from "@/constants";

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

const CONDITION_OPTIONS = Object.entries(ASSET_CONDITION).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const CONDITION_BADGE_VARIANT: Record<string, "success" | "warning" | "danger" | "outline"> = {
  good: "success",
  fair: "warning",
  poor: "danger",
  outOfService: "outline",
};

function toISO(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString();
}

export default function AssetsPage() {
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "",
    serialNumber: "",
    purchaseDate: "",
    purchaseCost: "",
    condition: ASSET_CONDITION.GOOD as string,
    location: "",
    warrantyExpiry: "",
    nextMaintenanceDate: "",
    notes: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };

  const { data, isLoading } = useAssets(params);
  const createMut = useCreateAsset();
  const updateMut = useUpdateAsset();
  const deleteMut = useDeleteAsset();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      serialNumber: "",
      purchaseDate: "",
      purchaseCost: "",
      condition: ASSET_CONDITION.GOOD,
      location: "",
      warrantyExpiry: "",
      nextMaintenanceDate: "",
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
      name: item.name ?? "",
      category: item.category ?? "",
      serialNumber: item.serialNumber ?? "",
      purchaseDate: item.purchaseDate ? item.purchaseDate.slice(0, 10) : "",
      purchaseCost: item.purchaseCost != null ? String(item.purchaseCost) : "",
      condition: item.condition ?? ASSET_CONDITION.GOOD,
      location: item.location ?? "",
      warrantyExpiry: item.warrantyExpiry ? item.warrantyExpiry.slice(0, 10) : "",
      nextMaintenanceDate: item.nextMaintenanceDate
        ? item.nextMaintenanceDate.slice(0, 10)
        : "",
      notes: item.notes ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || undefined,
      serialNumber: form.serialNumber.trim() || undefined,
      purchaseDate: form.purchaseDate ? toISO(form.purchaseDate) : undefined,
      purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : undefined,
      condition: form.condition,
      location: form.location.trim() || undefined,
      warrantyExpiry: form.warrantyExpiry
        ? toISO(form.warrantyExpiry)
        : undefined,
      nextMaintenanceDate: form.nextMaintenanceDate
        ? toISO(form.nextMaintenanceDate)
        : undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Asset updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Asset created");
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
      toast.success("Asset deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const columns = [
    { key: "name", header: "Name", sortable: true },
    {
      key: "category",
      header: "Category",
      render: (row: any) => row.category ?? "-",
    },
    {
      key: "serialNumber",
      header: "Serial #",
      render: (row: any) => row.serialNumber ?? "-",
    },
    {
      key: "condition",
      header: "Condition",
      render: (row: any) => (
        <Badge variant={CONDITION_BADGE_VARIANT[row.condition] ?? "default"}>
          {CONDITION_OPTIONS.find((o) => o.value === row.condition)?.label ??
            row.condition}
        </Badge>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (row: any) => row.location ?? "-",
    },
    {
      key: "purchaseDate",
      header: "Purchase Date",
      render: (row: any) => formatDate(row.purchaseDate),
    },
    {
      key: "warrantyExpiry",
      header: "Warranty Expiry",
      render: (row: any) => formatDate(row.warrantyExpiry),
    },
    {
      key: "nextMaintenanceDate",
      header: "Next Maintenance",
      render: (row: any) => formatDate(row.nextMaintenanceDate),
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
        <h1 className="text-2xl font-semibold text-slate-900">Assets</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
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
        emptyTitle="No assets"
        emptyDescription="Add your first asset to get started."
      />

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Asset" : "Add Asset"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. HVAC Unit 101"
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            placeholder="e.g. HVAC, Furniture"
          />
          <Input
            label="Serial Number"
            value={form.serialNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, serialNumber: e.target.value }))
            }
            placeholder="Optional"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={form.purchaseDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, purchaseDate: e.target.value }))
              }
            />
            <Input
              label="Purchase Cost (GHS)"
              type="number"
              min="0"
              step="0.01"
              value={form.purchaseCost}
              onChange={(e) =>
                setForm((f) => ({ ...f, purchaseCost: e.target.value }))
              }
              placeholder="Optional"
            />
          </div>
          <Select
            label="Condition"
            options={CONDITION_OPTIONS}
            value={form.condition}
            onChange={(e) =>
              setForm((f) => ({ ...f, condition: e.target.value }))
            }
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
            placeholder="e.g. Room 101, Lobby"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Warranty Expiry"
              type="date"
              value={form.warrantyExpiry}
              onChange={(e) =>
                setForm((f) => ({ ...f, warrantyExpiry: e.target.value }))
              }
            />
            <Input
              label="Next Maintenance Date"
              type="date"
              value={form.nextMaintenanceDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, nextMaintenanceDate: e.target.value }))
              }
            />
          </div>
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
            rows={3}
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
        title="Delete Asset"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this asset? This action cannot be
          undone.
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
