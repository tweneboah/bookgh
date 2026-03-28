"use client";

import { useState, useMemo } from "react";
import { Manrope } from "next/font/google";
import {
  useHousekeepingTasks,
  useHousekeepingStats,
  useCreateHousekeepingTask,
  useUpdateHousekeepingTask,
  useDeleteHousekeepingTask,
  useRooms,
  useUsers,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Textarea,
  EmptyState,
  AppReactSelect,
  Dropdown,
} from "@/components/ui";
import { Pencil, Trash2, Sparkles, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  HOUSEKEEPING_TASK_TYPE,
  HOUSEKEEPING_STATUS,
  PRIORITY,
} from "@/constants";
import { cn } from "@/lib/cn";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-housekeeping-tasks-manrope",
  display: "swap",
});

function MsIcon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={cn("material-symbols-outlined inline-flex select-none", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  );
}

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy h:mm a");
  } catch {
    return "—";
  }
}

function toDateTimeLocalValue(iso: string | Date | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TASK_TYPE_OPTIONS = Object.entries(HOUSEKEEPING_TASK_TYPE).map(
  ([k, v]) => ({
    value: v,
    label: k.replace(/([A-Z])/g, " $1").trim(),
  })
);

const STATUS_OPTIONS = Object.entries(HOUSEKEEPING_STATUS).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const PRIORITY_OPTIONS = Object.entries(PRIORITY).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  normal: { bg: "bg-[#7b2cbf]/10", text: "text-[#5a189a]", border: "border-[#7b2cbf]/30" },
  high: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  urgent: { bg: "bg-orange-50", text: "text-[#ff8500]", border: "border-[#ff8500]/40" },
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  inProgress: { bg: "bg-[#5a189a]/10", text: "text-[#5a189a]", border: "border-[#5a189a]/30" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  inspected: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

function assigneeLabel(u: unknown): string {
  if (!u || typeof u !== "object") return "";
  const o = u as { firstName?: string; lastName?: string; email?: string };
  const n = `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim();
  return n || o.email || "";
}

export default function HousekeepingTasksPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    roomId: "",
    taskType: HOUSEKEEPING_TASK_TYPE.CLEANING as string,
    assignedTo: "",
    priority: PRIORITY.NORMAL as string,
    notes: "",
    dueAt: "",
    linenChanged: false,
    inspectionNotes: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (statusFilter) params.status = statusFilter;
  if (roomFilter) params.roomId = roomFilter;
  if (floorFilter) params.floor = floorFilter;
  if (overdueOnly) params.overdue = "1";

  const { data: listEnvelope, isLoading } = useHousekeepingTasks(params);
  const { data: statsEnvelope } = useHousekeepingStats();
  const { data: roomsData } = useRooms({ limit: "500" });
  const { data: usersEnvelope } = useUsers({ limit: "200" });
  const createMut = useCreateHousekeepingTask();
  const updateMut = useUpdateHousekeepingTask();
  const deleteMut = useDeleteHousekeepingTask();

  const items = (listEnvelope?.data as unknown[]) ?? [];
  const pagination = listEnvelope?.meta?.pagination as
    | { total: number; limit: number; page: number }
    | undefined;
  const rooms = (roomsData?.data as unknown[]) ?? [];
  const users = (usersEnvelope?.data as unknown[]) ?? [];
  const counts = statsEnvelope?.data as
    | { total?: number; pending?: number; inProgress?: number; overdue?: number }
    | undefined;

  const roomOptions = rooms.map((r: { _id?: string; roomNumber?: string }) => ({
    value: r._id ?? "",
    label: r.roomNumber ?? r._id ?? "",
  }));

  const userOptions = users.map((u: { _id?: string; firstName?: string; lastName?: string; email?: string }) => ({
    value: u._id ?? "",
    label:
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u._id || "",
  }));

  const floors = useMemo(() => {
    const s = new Set<number>();
    for (const r of rooms as { floor?: number }[]) {
      if (r.floor != null && !Number.isNaN(Number(r.floor))) s.add(Number(r.floor));
    }
    return Array.from(s).sort((a, b) => a - b);
  }, [rooms]);

  const floorFilterOptions = [
    { value: "", label: "All floors" },
    ...floors.map((f) => ({ value: String(f), label: `Floor ${f}` })),
  ];

  const statusFilterOptions = [
    { value: "", label: "All statuses" },
    ...STATUS_OPTIONS,
  ];
  const roomFilterOptions = [{ value: "", label: "All rooms" }, ...roomOptions];

  const resetForm = () => {
    setForm({
      roomId: "",
      taskType: HOUSEKEEPING_TASK_TYPE.CLEANING,
      assignedTo: "",
      priority: PRIORITY.NORMAL,
      notes: "",
      dueAt: "",
      linenChanged: false,
      inspectionNotes: "",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
  };

  const openEdit = (item: Record<string, unknown>) => {
    setEditItem(item);
    const r = item.roomId as { _id?: string } | undefined;
    const a = item.assignedTo as { _id?: string } | string | undefined;
    const assignedId =
      typeof a === "object" && a && "_id" in a
        ? String((a as { _id: string })._id)
        : typeof a === "string"
          ? a
          : "";
    setForm({
      roomId: r?._id ?? String(item.roomId ?? ""),
      taskType: (item.taskType as string) ?? HOUSEKEEPING_TASK_TYPE.CLEANING,
      assignedTo: assignedId,
      priority: (item.priority as string) ?? PRIORITY.NORMAL,
      notes: (item.notes as string) ?? "",
      dueAt: toDateTimeLocalValue(item.dueAt as string | undefined),
      linenChanged: Boolean(item.linenChanged),
      inspectionNotes: (item.inspectionNotes as string) ?? "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomId.trim()) {
      toast.error("Please select a room");
      return;
    }
    const dueIso =
      form.dueAt.trim() !== ""
        ? new Date(form.dueAt).toISOString()
        : undefined;

    const payload: Record<string, unknown> = {
      roomId: form.roomId,
      taskType: form.taskType,
      assignedTo: form.assignedTo.trim() || undefined,
      priority: form.priority,
      notes: form.notes.trim() || undefined,
      ...(dueIso ? { dueAt: dueIso } : {}),
    };

    if (editItem) {
      payload.linenChanged = form.linenChanged;
      payload.inspectionNotes = form.inspectionNotes.trim() || undefined;
    }

    try {
      if (editItem) {
        await updateMut.mutateAsync({
          id: String(editItem._id),
          ...payload,
        });
        toast.success("Housekeeping task updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Housekeeping task created");
      }
      resetForm();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(e?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Housekeeping task deleted");
      setShowDelete(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(e?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleStatusChange = async (task: { _id?: string }, newStatus: string) => {
    try {
      await updateMut.mutateAsync({
        id: String(task._id),
        status: newStatus,
      });
      toast.success("Status updated");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(e?.response?.data?.error?.message ?? "Something went wrong");
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
      className={cn(
        manrope.variable,
        "min-h-full bg-[#f7f9fb] p-4 text-[#191c1e] sm:p-6 lg:p-10"
      )}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="mb-8">
        <h2 className={cn(manrope.className, "text-4xl font-extrabold tracking-tight text-slate-900")}>
          Assign Task
        </h2>
        <p className="mt-2 text-[#5a4136]">
          Schedule a new maintenance or cleaning duty for the staff.
        </p>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-xl bg-white p-8 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <AppReactSelect
                  label="Room Number"
                  value={form.roomId}
                  onChange={(v) => setForm((f) => ({ ...f, roomId: v }))}
                  options={[{ value: "", label: "Select room" }, ...roomOptions]}
                />
                <AppReactSelect
                  label="Task Type"
                  value={form.taskType}
                  onChange={(v) => setForm((f) => ({ ...f, taskType: v }))}
                  options={TASK_TYPE_OPTIONS}
                />
              </div>

              <AppReactSelect
                label="Assign to Staff"
                value={form.assignedTo}
                onChange={(v) => setForm((f) => ({ ...f, assignedTo: v }))}
                options={[{ value: "", label: "Unassigned" }, ...userOptions]}
              />

              <Input
                label="Due Date & Time"
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
              />

              <AppReactSelect
                label="Priority Level"
                value={form.priority}
                onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                options={PRIORITY_OPTIONS}
              />

              <Textarea
                label="Additional Instructions (Notes)"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
                placeholder="Add handling notes for staff"
              />

              {editItem && (
                <>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.linenChanged}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, linenChanged: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-[#5a189a]"
                    />
                    Linen changed
                  </label>
                  <Textarea
                    label="Inspection Notes"
                    value={form.inspectionNotes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, inspectionNotes: e.target.value }))
                    }
                    rows={2}
                    placeholder="After supervisor inspection"
                  />
                </>
              )}

              <div className="flex items-center justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                  className="px-8 py-3.5 font-bold text-slate-500"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={createMut.isPending || updateMut.isPending}
                  className={cn(
                    manrope.className,
                    "rounded-xl bg-gradient-to-r from-[#a04100] to-[#ff6b00] px-10 py-3.5 font-bold text-white shadow-lg shadow-orange-500/20"
                  )}
                >
                  {editItem ? "Update Task" : "Save Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-[#f2f4f6] p-6">
            <h3 className={cn(manrope.className, "mb-4 text-lg font-bold text-slate-900")}>Room Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-white p-4">
                <div className="flex items-center gap-3">
                  <MsIcon name="meeting_room" className="text-orange-500" />
                  <div>
                    <p className="text-xs font-bold leading-none text-slate-900">Occupancy</p>
                    <p className="text-[10px] uppercase text-slate-500">Current state</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#059eff] px-2 py-1 text-[10px] font-bold uppercase text-white">
                  Live
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white p-4">
                <div className="flex items-center gap-3">
                  <MsIcon name="schedule" className="text-orange-500" />
                  <div>
                    <p className="text-xs font-bold leading-none text-slate-900">Open tasks</p>
                    <p className="text-[10px] uppercase text-slate-500">System total</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-700">{counts?.total ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-[#ff6b00] p-6 text-white">
            <div className="relative z-10">
              <h3 className={cn(manrope.className, "text-lg font-bold")}>Staff Productivity</h3>
              <p className="mb-5 text-xs text-orange-100">Real-time performance metrics</p>
              <div className="mb-4 flex h-20 items-end gap-2">
                <div className="h-[40%] flex-1 rounded-t-md bg-white/20" />
                <div className="h-[70%] flex-1 rounded-t-md bg-white/40" />
                <div className="h-[50%] flex-1 rounded-t-md bg-white/20" />
                <div className="h-[95%] flex-1 rounded-t-md bg-white/80" />
                <div className="h-[60%] flex-1 rounded-t-md bg-white/40" />
              </div>
              <div className="flex items-center justify-between border-t border-white/20 pt-4">
                <span className="text-xs font-bold uppercase tracking-widest">Active Tasks</span>
                <span className={cn(manrope.className, "text-2xl font-black")}>{counts?.total ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mb-10 overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_-4px_rgba(36,0,70,0.08)]">
        <div
          className="absolute inset-x-0 top-0 h-1.5 shrink-0"
          style={{
            background:
              "linear-gradient(90deg, #240046 0%, #5a189a 40%, #ff6d00 70%, #ff9e00 100%)",
          }}
          aria-hidden
        />
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[#5a189a]">
                <Sparkles className="h-5 w-5" aria-hidden />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Operations
                </span>
              </div>
              <h1 className={cn(manrope.className, "text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl")}>
                Housekeeping tasks
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Assign staff, track due times, and complete inspections. Checkout creates turnover
                tasks automatically.
              </p>
            </div>
            <Button onClick={openCreate} className="h-11 shrink-0 rounded-xl px-5 font-bold">
              Reset form
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "All open",
            value: counts?.total ?? "—",
            icon: "assignment_late",
            tone: "text-[#191c1e]",
            suffix: "Tasks",
          },
          {
            label: "Pending",
            value: counts?.pending ?? "—",
            icon: "hourglass_empty",
            tone: "text-[#b5c8df]",
          },
          {
            label: "In progress",
            value: counts?.inProgress ?? "—",
            icon: "sync",
            tone: "text-[#0062a1]",
          },
          {
            label: "Overdue",
            value: counts?.overdue ?? "—",
            icon: "warning",
            tone: "text-[#ba1a1a]",
            isError: true,
          },
        ].map(({ label, value, icon, tone, suffix, isError }) => (
          <div
            key={label}
            className="rounded-xl bg-white p-6 shadow-sm transition-all hover:bg-[#f7f9fb]"
          >
            <p className={cn("mb-1 text-sm font-semibold", isError ? "text-[#ba1a1a]" : "text-[#5a4136]")}>{label}</p>
            <div className="flex items-baseline gap-2">
              <span className={cn(manrope.className, "text-4xl font-black", tone)}>{value}</span>
              {suffix ? (
                <span className="text-xs font-bold uppercase tracking-tighter text-slate-400">{suffix}</span>
              ) : (
                <MsIcon name={icon} className={cn("text-lg", tone)} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-6 rounded-xl bg-[#f2f4f6] p-4">
        <AppReactSelect
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={statusFilterOptions}
          placeholder="Status"
          className="min-w-[160px]"
        />
        <AppReactSelect
          value={roomFilter}
          onChange={(v) => {
            setRoomFilter(v);
            setPage(1);
          }}
          options={roomFilterOptions}
          placeholder="Room"
          className="min-w-[160px]"
        />
        <AppReactSelect
          value={floorFilter}
          onChange={(v) => {
            setFloorFilter(v);
            setPage(1);
          }}
          options={floorFilterOptions}
          placeholder="Floor"
          className="min-w-[160px]"
        />
        <label className="ml-auto flex cursor-pointer items-center gap-3 text-sm font-bold text-[#5a4136]">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              setPage(1);
            }}
            className="h-5 w-5 rounded-md border-slate-300 text-[#a04100] focus:ring-[#a04100]/30"
          />
          Overdue only
        </label>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="rounded-xl bg-white p-8 sm:p-12">
            <EmptyState
              icon={ClipboardList}
              title="No housekeeping tasks"
              description="Tasks appear when guests check out, or add one manually."
              action={{
                label: "Add task",
                onClick: openCreate,
              }}
              actionClassName="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] text-white hover:opacity-95 focus-visible:ring-[#5a189a]"
            />
          </div>
        ) : (
          <>
            {items.map((row) => {
              const r = row as Record<string, unknown>;
              const priorityStyle =
                PRIORITY_STYLES[String(r.priority)] ?? PRIORITY_STYLES.normal;
              const statusStyle =
                STATUS_STYLES[String(r.status)] ?? STATUS_STYLES.pending;
              const roomObj = r.roomId as { roomNumber?: string; floor?: number } | undefined;
              const roomLabel = roomObj?.roomNumber ?? "—";
              const taskLabel =
                TASK_TYPE_OPTIONS.find((o) => o.value === r.taskType)?.label ??
                String(r.taskType ?? "");
              const assignee = assigneeLabel(r.assignedTo);
              const due = r.dueAt as string | undefined;
              const overdue =
                due &&
                new Date(due) < new Date() &&
                r.status !== HOUSEKEEPING_STATUS.COMPLETED &&
                r.status !== HOUSEKEEPING_STATUS.INSPECTED;

              return (
                <div
                  key={String(r._id)}
                  className="group flex flex-col justify-between gap-6 rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-[0px_12px_32px_rgba(25,28,30,0.06)] md:flex-row md:items-center"
                >
                  <div className="flex flex-col gap-6 md:flex-row md:items-center">
                    <div
                      className={cn(
                        "flex h-16 w-16 flex-col items-center justify-center rounded-xl font-black",
                        overdue ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#ffdbcc] text-[#7a3000]"
                      )}
                    >
                      <span className="text-lg">{roomLabel}</span>
                      <span className="text-[10px] uppercase tracking-widest opacity-70">Room</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn(manrope.className, "mr-2 text-lg font-bold text-[#191c1e]")}>
                          Room {roomLabel}
                          {roomObj?.floor != null ? ` · Floor ${roomObj.floor}` : ""}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                            statusStyle.bg,
                            statusStyle.text
                          )}
                        >
                          {STATUS_OPTIONS.find((o) => o.value === r.status)?.label ?? String(r.status)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                            priorityStyle.bg,
                            priorityStyle.text
                          )}
                        >
                          {PRIORITY_OPTIONS.find((o) => o.value === r.priority)?.label ?? String(r.priority)}
                        </span>
                        <span className="rounded-full bg-[#f2f4f6] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5a4136]">
                          {taskLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#5a4136]">
                        <div className="flex items-center gap-2">
                          <MsIcon name="person" className="text-sm" />
                          <span>
                            Assigned: <strong>{assignee || "Unassigned"}</strong>
                          </span>
                        </div>
                        {due && (
                          <div className="flex items-center gap-2">
                            <MsIcon name="event" className="text-sm" />
                            <span>Due {formatDate(due)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs opacity-70">
                          <MsIcon name="history" className="text-xs" />
                          <span>Created {formatDate(r.createdAt as string)}</span>
                        </div>
                        {overdue && (
                          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700">
                            OVERDUE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dropdown
                      trigger={
                        <button
                          type="button"
                          className="whitespace-nowrap rounded-xl border-2 border-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          Quick status
                        </button>
                      }
                      items={STATUS_OPTIONS.map((opt) => ({
                        id: opt.value,
                        label: opt.label,
                        onClick: () => handleStatusChange(r, opt.value),
                      }))}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(r)}
                      aria-label="Edit"
                      className="text-slate-600 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDelete(String(r._id))}
                      aria-label="Delete"
                      className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {pagination && pagination.total > pagination.limit && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <p className="text-sm text-slate-600">
                  Showing {(page - 1) * pagination.limit + 1}–
                  {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!hasPrev || isLoading}
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext || isLoading}
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete task"
        size="sm"
        className="[&>div]:rounded-3xl [&>div]:shadow-xl"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this housekeeping task? This action cannot be undone.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDelete(null)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
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
