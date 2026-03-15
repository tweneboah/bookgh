"use client";

import { useState } from "react";
import {
  useAttendance,
  useCreateAttendance,
  useUpdateAttendance,
  useDeleteAttendance,
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
import { Plus, LogOut, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { ATTENDANCE_STATUS } from "@/constants";

const STATUS_OPTIONS = Object.entries(ATTENDANCE_STATUS).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const STATUS_BADGE: Record<string, "success" | "danger" | "warning" | "info"> = {
  present: "success",
  absent: "danger",
  late: "warning",
  halfDay: "info",
};

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function hoursBetween(clockIn: string, clockOut: string): number {
  const inM = parseTimeToMinutes(clockIn);
  const outM = parseTimeToMinutes(clockOut);
  return Math.max(0, (outM - inM) / 60);
}

export default function AttendancePage() {
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [showClockOut, setShowClockOut] = useState<any>(null);
  const [clockOutTime, setClockOutTime] = useState("");

  const [form, setForm] = useState({
    userId: "",
    date: "",
    clockIn: "08:00",
    status: ATTENDANCE_STATUS.PRESENT as string,
    notes: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (dateFilter) params.date = dateFilter;
  if (userFilter) params.userId = userFilter;

  const { data, isLoading } = useAttendance(params);
  const { data: usersData } = useUsers({ limit: "100" });
  const createMut = useCreateAttendance();
  const updateMut = useUpdateAttendance();
  const deleteMut = useDeleteAttendance();

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
      date: "",
      clockIn: "08:00",
      status: ATTENDANCE_STATUS.PRESENT,
      notes: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setForm((f) => ({
      ...f,
      date: new Date().toISOString().slice(0, 10),
    }));
    setShowModal(true);
  };

  const openClockOut = (row: any) => {
    setShowClockOut(row);
    const now = new Date();
    setClockOutTime(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    );
  };

  const handleClockOut = async () => {
    if (!showClockOut) return;
    const clockInStr = showClockOut.clockIn;
    let clockInTime = "08:00";
    if (clockInStr) {
      if (typeof clockInStr === "string" && clockInStr.includes(":")) {
        clockInTime = clockInStr.slice(0, 5);
      } else if (clockInStr instanceof Date) {
        clockInTime = format(clockInStr, "HH:mm");
      }
    }
    const hrs = hoursBetween(clockInTime, clockOutTime);
    const dateStr = showClockOut.date;
    const datePart =
      typeof dateStr === "string" && dateStr.includes("T")
        ? dateStr.slice(0, 10)
        : dateStr
          ? format(new Date(dateStr), "yyyy-MM-dd")
          : new Date().toISOString().slice(0, 10);
    const clockOutISO = `${datePart}T${clockOutTime}:00.000Z`;

    try {
      await updateMut.mutateAsync({
        id: showClockOut._id,
        clockOut: clockOutISO,
        hoursWorked: Math.round(hrs * 100) / 100,
      });
      toast.success("Clock out recorded");
      setShowClockOut(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.date || !form.status) {
      toast.error("User, date, and status are required");
      return;
    }

    const dateISO = `${form.date}T00:00:00.000Z`;
    const clockInISO = form.clockIn
      ? `${form.date}T${form.clockIn}:00.000Z`
      : undefined;

    const payload = {
      userId: form.userId,
      date: dateISO,
      clockIn: clockInISO,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };

    try {
      await createMut.mutateAsync(payload);
      toast.success("Attendance recorded");
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
      toast.success("Attendance record deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const formatClock = (val: any): string => {
    if (val == null) return "-";
    if (typeof val === "string" && val.includes("T")) {
      const t = val.split("T")[1];
      return t ? t.slice(0, 5) : "-";
    }
    if (val instanceof Date) return format(val, "HH:mm");
    return String(val);
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
      key: "date",
      header: "Date",
      render: (row: any) =>
        row.date ? format(new Date(row.date), "MMM d, yyyy") : "-",
    },
    {
      key: "clockIn",
      header: "Clock In",
      render: (row: any) => formatClock(row.clockIn),
    },
    {
      key: "clockOut",
      header: "Clock Out",
      render: (row: any) => formatClock(row.clockOut),
    },
    {
      key: "hoursWorked",
      header: "Hours Worked",
      render: (row: any) =>
        row.hoursWorked != null ? `${row.hoursWorked}h` : "-",
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={STATUS_BADGE[row.status] ?? "default"}>
          {STATUS_OPTIONS.find((o) => o.value === row.status)?.label ??
            row.status ??
            "-"}
        </Badge>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (row: any) => row.notes ?? "-",
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          {!row.clockOut && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openClockOut(row)}
              aria-label="Clock out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
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
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
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
            Add Record
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
        emptyTitle="No attendance records"
        emptyDescription="Add your first attendance record to get started."
      />

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Create Attendance Record"
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
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
          <Input
            label="Clock In (HH:mm)"
            type="time"
            value={form.clockIn}
            onChange={(e) => setForm((f) => ({ ...f, clockIn: e.target.value }))}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            required
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
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showClockOut}
        onClose={() => setShowClockOut(null)}
        title="Clock Out"
      >
        <div className="space-y-4">
          {showClockOut && (
            <p className="text-sm text-slate-600">
              Staff: {userMap[String(showClockOut.userId?._id ?? showClockOut.userId)] ?? "-"}
            </p>
          )}
          <Input
            label="Clock Out Time (HH:mm)"
            type="time"
            value={clockOutTime}
            onChange={(e) => setClockOutTime(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowClockOut(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleClockOut}
              loading={updateMut.isPending}
            >
              Record Clock Out
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Attendance Record"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this attendance record? This action
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
