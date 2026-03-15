"use client";

import { useState } from "react";
import {
  useShifts,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useUsers,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Select,
  Badge,
} from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { SHIFT_TYPE, SHIFT_STATUS } from "@/constants";

const SHIFT_TYPE_OPTIONS = Object.entries(SHIFT_TYPE).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const SHIFT_TYPE_BADGE: Record<string, "info" | "warning" | "default"> = {
  morning: "info",
  afternoon: "warning",
  night: "default",
};

const SHIFT_STATUS_OPTIONS = Object.entries(SHIFT_STATUS).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const SHIFT_STATUS_BADGE: Record<string, "info" | "success" | "danger" | "warning"> = {
  scheduled: "info",
  completed: "success",
  missed: "danger",
  swapped: "warning",
};

export default function ShiftsPage() {
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    userId: "",
    shiftDate: "",
    startTime: "08:00",
    endTime: "16:00",
    shiftType: SHIFT_TYPE.MORNING as string,
    notes: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (dateFilter) params.shiftDate = dateFilter;
  if (userFilter) params.userId = userFilter;

  const { data, isLoading } = useShifts(params);
  const { data: usersData } = useUsers({ limit: "100" });
  const createMut = useCreateShift();
  const updateMut = useUpdateShift();
  const deleteMut = useDeleteShift();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const users = usersData?.data ?? [];

  const userMap = Object.fromEntries(
    users.map((u: any) => [
      String(u._id),
      (`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email) ?? u._id,
    ])
  );

  const userOptions = users.map((u: any) => ({
    value: u._id,
    label: (`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email) ?? u._id,
  }));

  const resetForm = () => {
    setForm({
      userId: "",
      shiftDate: "",
      startTime: "08:00",
      endTime: "16:00",
      shiftType: SHIFT_TYPE.MORNING,
      notes: "",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setForm((f) => ({
      ...f,
      shiftDate: new Date().toISOString().slice(0, 10),
    }));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.shiftDate || !form.startTime || !form.endTime) {
      toast.error("User, date, and times are required");
      return;
    }

    const shiftDateISO = `${form.shiftDate}T00:00:00.000Z`;

    const payload = {
      userId: form.userId,
      shiftDate: shiftDateISO,
      startTime: form.startTime,
      endTime: form.endTime,
      shiftType: form.shiftType,
      notes: form.notes.trim() || undefined,
    };

    try {
      await createMut.mutateAsync(payload);
      toast.success("Shift created");
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
      toast.success("Shift deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const columns = [
    {
      key: "userId",
      header: "Staff Member",
      render: (row: any) => {
        const uid = row.userId?._id ?? row.userId;
        return uid ? (userMap[String(uid)] ?? "-") : "-";
      },
    },
    {
      key: "shiftDate",
      header: "Date",
      render: (row: any) =>
        row.shiftDate
          ? format(new Date(row.shiftDate), "MMM d, yyyy")
          : "-",
    },
    {
      key: "startTime",
      header: "Start Time",
      render: (row: any) => row.startTime ?? "-",
    },
    {
      key: "endTime",
      header: "End Time",
      render: (row: any) => row.endTime ?? "-",
    },
    {
      key: "shiftType",
      header: "Shift Type",
      render: (row: any) => (
        <Badge variant={SHIFT_TYPE_BADGE[row.shiftType] ?? "default"}>
          {SHIFT_TYPE_OPTIONS.find((o) => o.value === row.shiftType)?.label ??
            row.shiftType ??
            "-"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={SHIFT_STATUS_BADGE[row.status] ?? "default"}>
          {SHIFT_STATUS_OPTIONS.find((o) => o.value === row.status)?.label ??
            row.status ??
            "-"}
        </Badge>
      ),
    },
    {
      key: "swappedWith",
      header: "Swapped With",
      render: (row: any) => {
        const wid = row.swappedWith?._id ?? row.swappedWith;
        return wid ? (userMap[String(wid)] ?? "-") : "-";
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
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
        <h1 className="text-2xl font-semibold text-slate-900">Shifts</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
          <Select
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Staff" },
              ...userOptions,
            ]}
            className="w-48"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Shift
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
        emptyTitle="No shifts"
        emptyDescription="Create your first shift to get started."
      />

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Create Shift"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Staff Member"
            options={[
              { value: "", label: "Select staff..." },
              ...userOptions,
            ]}
            value={form.userId}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
            required
          />
          <Input
            label="Shift Date"
            type="date"
            value={form.shiftDate}
            onChange={(e) => setForm((f) => ({ ...f, shiftDate: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time (HH:mm)"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              required
            />
            <Input
              label="End Time (HH:mm)"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              required
            />
          </div>
          <Select
            label="Shift Type"
            options={SHIFT_TYPE_OPTIONS}
            value={form.shiftType}
            onChange={(e) => setForm((f) => ({ ...f, shiftType: e.target.value }))}
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
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
            <Button type="submit" loading={createMut.isPending}>
              Create Shift
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Shift"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this shift? This action cannot be undone.
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
