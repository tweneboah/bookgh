"use client";

import { useState } from "react";
import {
  useSubscriptionPlans,
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
  useDeleteSubscriptionPlan,
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
import { BILLING_CYCLE } from "@/constants";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const BILLING_OPTIONS = [
  { value: BILLING_CYCLE.MONTHLY, label: "Monthly" },
  { value: BILLING_CYCLE.YEARLY, label: "Yearly" },
];

type PlanRow = {
  _id: string;
  name?: string;
  description?: string;
  price?: number;
  billingCycle?: string;
  trialDays?: number;
  limits?: {
    maxBranches?: number;
    maxRooms?: number;
    maxStaff?: number;
    hasEventModule?: boolean;
    hasPosModule?: boolean;
    hasApiAccess?: boolean;
  };
  features?: string[];
  isActive?: boolean;
  sortOrder?: number;
};

export default function PlatformSubscriptionPlansPage() {
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<PlanRow | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const params = { page: String(page), limit: "20" };

  const { data, isLoading } = useSubscriptionPlans(params);
  const createMut = useCreateSubscriptionPlan();
  const updateMut = useUpdateSubscriptionPlan();
  const deleteMut = useDeleteSubscriptionPlan();

  const items = (data?.data ?? data) as PlanRow[];
  const pagination = (data?.meta as { pagination?: { page: number; limit: number; total: number } })?.pagination;

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    billingCycle: BILLING_CYCLE.MONTHLY as string,
    trialDays: "14",
    maxBranches: "1",
    maxRooms: "10",
    maxStaff: "5",
    hasEventModule: false,
    hasPosModule: false,
    hasApiAccess: false,
    features: "",
    sortOrder: "0",
  });

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      billingCycle: BILLING_CYCLE.MONTHLY,
      trialDays: "14",
      maxBranches: "1",
      maxRooms: "10",
      maxStaff: "5",
      hasEventModule: false,
      hasPosModule: false,
      hasApiAccess: false,
      features: "",
      sortOrder: "0",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: PlanRow) => {
    setEditItem(item);
    const limits = item.limits ?? {};
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      price: item.price != null ? String(item.price) : "",
      billingCycle: (item.billingCycle ?? BILLING_CYCLE.MONTHLY) as string,
      trialDays: String(item.trialDays ?? 14),
      maxBranches: String(limits.maxBranches ?? 1),
      maxRooms: String(limits.maxRooms ?? 10),
      maxStaff: String(limits.maxStaff ?? 5),
      hasEventModule: limits.hasEventModule ?? false,
      hasPosModule: limits.hasPosModule ?? false,
      hasApiAccess: limits.hasApiAccess ?? false,
      features: Array.isArray(item.features) ? item.features.join(", ") : "",
      sortOrder: String(item.sortOrder ?? 0),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: parseFloat(form.price) || 0,
      billingCycle: form.billingCycle,
      trialDays: parseInt(form.trialDays, 10) || 0,
      limits: {
        maxBranches: parseInt(form.maxBranches, 10) || 1,
        maxRooms: parseInt(form.maxRooms, 10) || 10,
        maxStaff: parseInt(form.maxStaff, 10) || 5,
        hasEventModule: form.hasEventModule,
        hasPosModule: form.hasPosModule,
        hasApiAccess: form.hasApiAccess,
      },
      features: form.features
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      sortOrder: parseInt(form.sortOrder, 10) || 0,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Plan updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Plan created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Plan deleted");
      setShowDelete(null);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to delete");
    }
  };

  const columns = [
    { key: "name", header: "Name", render: (row: PlanRow) => row.name ?? "-" },
    {
      key: "price",
      header: "Price",
      render: (row: PlanRow) => (row.price != null ? fmt(row.price) : "-"),
    },
    {
      key: "billingCycle",
      header: "Billing Cycle",
      render: (row: PlanRow) => (
        <Badge variant="default">{row.billingCycle ?? "-"}</Badge>
      ),
    },
    {
      key: "trialDays",
      header: "Trial Days",
      render: (row: PlanRow) => row.trialDays ?? 0,
    },
    {
      key: "maxBranches",
      header: "Max Branches",
      render: (row: PlanRow) => row.limits?.maxBranches ?? "-",
    },
    {
      key: "maxRooms",
      header: "Max Rooms",
      render: (row: PlanRow) => row.limits?.maxRooms ?? "-",
    },
    {
      key: "maxStaff",
      header: "Max Staff",
      render: (row: PlanRow) => row.limits?.maxStaff ?? "-",
    },
    {
      key: "active",
      header: "Active",
      render: (row: PlanRow) =>
        row.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="danger">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: PlanRow) => (
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
        <h1 className="text-2xl font-semibold text-slate-900">Subscription Plans</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Plan
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
        emptyTitle="No subscription plans"
        emptyDescription="Create your first plan to get started."
      />

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editItem ? "Edit Plan" : "Create Plan"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              type="number"
              min={0}
              step={0.01}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
            />
            <Select
              label="Billing Cycle"
              options={BILLING_OPTIONS}
              value={form.billingCycle}
              onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value }))}
            />
          </div>
          <Input
            label="Trial Days"
            type="number"
            min={0}
            value={form.trialDays}
            onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Limits</p>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Max Branches"
                type="number"
                min={1}
                value={form.maxBranches}
                onChange={(e) => setForm((f) => ({ ...f, maxBranches: e.target.value }))}
              />
              <Input
                label="Max Rooms"
                type="number"
                min={1}
                value={form.maxRooms}
                onChange={(e) => setForm((f) => ({ ...f, maxRooms: e.target.value }))}
              />
              <Input
                label="Max Staff"
                type="number"
                min={1}
                value={form.maxStaff}
                onChange={(e) => setForm((f) => ({ ...f, maxStaff: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hasEventModule}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hasEventModule: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm">Event Module</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hasPosModule}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hasPosModule: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm">POS Module</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.hasApiAccess}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hasApiAccess: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm">API Access</span>
              </label>
            </div>
          </div>
          <Input
            label="Features (comma-separated)"
            value={form.features}
            onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
            placeholder="e.g. 24/7 Support, Reports, Multi-branch"
          />
          <Input
            label="Sort Order"
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowModal(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMut.isPending || updateMut.isPending}>
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Plan"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this subscription plan? This action
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
