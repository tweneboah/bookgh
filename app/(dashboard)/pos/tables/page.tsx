"use client";

import { useMemo, useState } from "react";
import {
  useTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useUsers,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Badge,
} from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import { POS_TABLE_STATUS, USER_ROLES } from "@/constants";
import { useSearchParams } from "next/navigation";

/** Roles that can be assigned as server (waitress/waiter) for a table */
const SERVER_ROLES = new Set([
  USER_ROLES.WAITER,
  USER_ROLES.HOSTESS,
  USER_ROLES.CASHIER,
  USER_ROLES.SUPERVISOR,
  USER_ROLES.RESTAURANT_MANAGER,
]) as Set<string>;

const STATUS_OPTIONS = Object.entries(POS_TABLE_STATUS).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const STATUS_BADGE_VARIANT: Record<string, "success" | "warning" | "info"> = {
  available: "success",
  occupied: "warning",
  reserved: "info",
};

export default function TablesPage() {
  const searchParams = useSearchParams();
  const department = searchParams.get("department") ?? undefined;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    tableNumber: "",
    capacity: "",
    location: "",
    assignedServerId: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (department) params.department = department;
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useTables(params);
  const { data: usersData } = useUsers({ limit: "300" });
  const createMut = useCreateTable();
  const updateMut = useUpdateTable();
  const deleteMut = useDeleteTable();

  const items = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.meta?.pagination;
  const rawUsers = usersData?.data ?? usersData;
  const allUsers = Array.isArray(rawUsers) ? rawUsers : [];
  const serverOptions = useMemo(() => {
    const list = allUsers.filter(
      (u: { role?: string; isActive?: boolean }) =>
        SERVER_ROLES.has(u.role ?? "") && u.isActive !== false
    );
    return [
      { value: "", label: "No server assigned" },
      ...list.map((u: { _id: string; firstName?: string; lastName?: string; email?: string }) => ({
        value: u._id,
        label: `${(u.firstName ?? "").trim()} ${(u.lastName ?? "").trim()}`.trim() || u.email || u._id,
      })),
    ];
  }, [allUsers]);

  const resetForm = () => {
    setForm({ tableNumber: "", capacity: "", location: "", assignedServerId: "" });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const server = item.assignedServerId;
    setForm({
      tableNumber: item.tableNumber ?? "",
      capacity: item.capacity != null ? String(item.capacity) : "",
      location: item.location ?? "",
      assignedServerId: server?._id ?? server ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const capacityNum = parseInt(form.capacity, 10);
    if (!form.tableNumber.trim() || isNaN(capacityNum) || capacityNum < 1) {
      toast.error("Table number and valid capacity are required");
      return;
    }
    const payload = {
      tableNumber: form.tableNumber.trim(),
      capacity: capacityNum,
      location: form.location.trim() || undefined,
      assignedServerId: form.assignedServerId.trim() || undefined,
    };
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, department, ...payload });
        toast.success("Table updated");
      } else {
        await createMut.mutateAsync({ department, ...payload });
        toast.success("Table created");
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
      await deleteMut.mutateAsync({ id: showDelete, department });
      toast.success("Table deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const columns = [
    {
      key: "tableNumber",
      header: "Table #",
      render: (row: any) => (
        <span className="font-semibold text-slate-900">{row.tableNumber ?? "-"}</span>
      ),
    },
    { key: "capacity", header: "Capacity", render: (row: any) => row.capacity ?? "-" },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? "default"}>
          {STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status ?? "-"}
        </Badge>
      ),
    },
    { key: "location", header: "Location", render: (row: any) => row.location ?? "-" },
    {
      key: "assignedServer",
      header: "Assigned server",
      render: (row: any) => {
        const s = row.assignedServerId;
        if (!s) return <span className="text-slate-400">—</span>;
        const name = typeof s === "object" && s !== null
          ? `${(s.firstName ?? "").trim()} ${(s.lastName ?? "").trim()}`.trim() || s.email
          : null;
        return <span className="text-slate-700">{name ?? "—"}</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
            aria-label="Edit"
            className="text-[#5a189a] hover:bg-[#5a189a]/10"
          >
            <FiEdit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDelete(row._id)}
            aria-label="Delete"
            className="text-red-600 hover:bg-red-50"
          >
            <FiTrash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-1 h-1 w-16 rounded-full bg-gradient-to-r from-[#5a189a] to-[#9d4edd]" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tables
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage dining tables and seating capacity.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <AppReactSelect
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "All Statuses" },
                ...STATUS_OPTIONS,
              ]}
              placeholder="All statuses"
              className="w-full sm:max-w-[200px]"
            />
            <Button
              onClick={openCreate}
              className="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-lg shadow-[#ff6d00]/25 hover:opacity-95"
            >
              <FiPlus className="h-4 w-4" />
              Add Table
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
            emptyTitle="No tables"
            emptyDescription="Add your first table to get started."
          />
        </div>

        <Modal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title={editItem ? "Edit Table" : "Add Table"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Table Number"
                value={form.tableNumber}
                onChange={(e) => setForm((f) => ({ ...f, tableNumber: e.target.value }))}
                required
                placeholder="e.g. 1"
              />
              <Input
                label="Capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                required
                placeholder="4"
              />
            </div>
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Main Dining"
            />
            <AppReactSelect
              label="Assigned server (waitress/waiter)"
              value={form.assignedServerId}
              onChange={(v) => setForm((f) => ({ ...f, assignedServerId: v }))}
              options={serverOptions}
              placeholder="No server assigned"
              isClearable
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
                className="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] text-white"
              >
                {editItem ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Table">
          <p className="text-slate-600">
            Are you sure you want to delete this table? This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleteMut.isPending}>
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
