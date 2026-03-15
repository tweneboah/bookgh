"use client";

import { useState, useMemo } from "react";
import {
  useHousekeepingTasks,
  useCreateHousekeepingTask,
  useUpdateHousekeepingTask,
  useDeleteHousekeepingTask,
  useRooms,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  EmptyState,
  AppReactSelect,
  Dropdown,
} from "@/components/ui";
import {
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Sparkles,
  ClipboardList,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  HOUSEKEEPING_TASK_TYPE,
  HOUSEKEEPING_STATUS,
  PRIORITY,
} from "@/constants";
import { cn } from "@/lib/cn";

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
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

const PRIORITY_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  low: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  normal: {
    bg: "bg-[#7b2cbf]/10",
    text: "text-[#5a189a]",
    border: "border-[#7b2cbf]/30",
  },
  high: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  urgent: {
    bg: "bg-orange-50",
    text: "text-[#ff8500]",
    border: "border-[#ff8500]/40",
  },
  critical: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  inProgress: {
    bg: "bg-[#5a189a]/10",
    text: "text-[#5a189a]",
    border: "border-[#5a189a]/30",
  },
  completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  inspected: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
};

export default function HousekeepingPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    roomId: "",
    taskType: HOUSEKEEPING_TASK_TYPE.CLEANING as string,
    assignedTo: "",
    priority: PRIORITY.NORMAL as string,
    notes: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (statusFilter) params.status = statusFilter;
  if (roomFilter) params.roomId = roomFilter;

  const { data, isLoading } = useHousekeepingTasks(params);
  const { data: roomsData } = useRooms({ limit: "500" });
  const createMut = useCreateHousekeepingTask();
  const updateMut = useUpdateHousekeepingTask();
  const deleteMut = useDeleteHousekeepingTask();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const rooms = roomsData?.data ?? [];

  const roomOptions = rooms.map((r: any) => ({
    value: r._id,
    label: r.roomNumber ?? r._id,
  }));

  const statusFilterOptions = [
    { value: "", label: "All statuses" },
    ...STATUS_OPTIONS,
  ];
  const roomFilterOptions = [
    { value: "", label: "All rooms" },
    ...roomOptions,
  ];

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((t: any) => t.status === "pending").length;
    const inProgress = items.filter(
      (t: any) => t.status === "inProgress"
    ).length;
    const completed = items.filter(
      (t: any) => t.status === "completed" || t.status === "inspected"
    ).length;
    return { total, pending, inProgress, completed };
  }, [items]);

  const resetForm = () => {
    setForm({
      roomId: "",
      taskType: HOUSEKEEPING_TASK_TYPE.CLEANING,
      assignedTo: "",
      priority: PRIORITY.NORMAL,
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
    const r = item.roomId;
    setForm({
      roomId: r?._id ?? r ?? "",
      taskType: item.taskType ?? HOUSEKEEPING_TASK_TYPE.CLEANING,
      assignedTo: item.assignedTo ?? "",
      priority: item.priority ?? PRIORITY.NORMAL,
      notes: item.notes ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomId.trim()) {
      toast.error("Please select a room");
      return;
    }
    const payload = {
      roomId: form.roomId,
      taskType: form.taskType,
      assignedTo: form.assignedTo.trim() || undefined,
      priority: form.priority,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Housekeeping task updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Housekeeping task created");
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
      toast.success("Housekeeping task deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const handleStatusChange = async (task: any, newStatus: string) => {
    try {
      await updateMut.mutateAsync({
        id: task._id,
        status: newStatus,
      });
      toast.success("Status updated");
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
    <div className="min-h-full font-sans" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_-4px_rgba(36,0,70,0.08)]">
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
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Housekeeping
              </h1>
              <p className="mt-1 max-w-xl text-sm font-normal text-slate-600">
                Manage room cleaning, inspections, and turnover tasks. Keep
                every stay spotless and on schedule.
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="h-11 shrink-0 rounded-xl px-5 font-semibold text-white shadow-md transition-all hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background:
                  "linear-gradient(135deg, #ff6d00 0%, #ff8500 50%, #ff9e00 100%)",
              }}
            >
              <Plus className="h-4 w-4" />
              Add task
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total tasks",
            value: pagination?.total ?? stats.total,
            icon: ClipboardList,
            gradient: "from-[#5a189a] to-[#7b2cbf]",
          },
          {
            label: "Pending",
            value: stats.pending,
            icon: Clock,
            gradient: "from-amber-500 to-amber-600",
          },
          {
            label: "In progress",
            value: stats.inProgress,
            icon: ClipboardList,
            gradient: "from-[#7b2cbf] to-[#9d4edd]",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-emerald-600",
          },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_4px_20px_-4px_rgba(36,0,70,0.1)]"
          >
            <div
              className={cn(
                "mb-2 inline-flex rounded-lg p-2",
                `bg-linear-to-br ${gradient}`
              )}
            >
              <Icon className="h-4 w-4 text-white" aria-hidden />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
        <AppReactSelect
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={statusFilterOptions}
          placeholder="Status"
          className="min-w-[140px] sm:min-w-[160px]"
        />
        <AppReactSelect
          value={roomFilter}
          onChange={(v) => {
            setRoomFilter(v);
            setPage(1);
          }}
          options={roomFilterOptions}
          placeholder="Room"
          className="min-w-[140px] sm:min-w-[180px]"
        />
      </div>

      {/* Task list */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_-4px_rgba(36,0,70,0.08)]">
        {isLoading ? (
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="p-8 sm:p-12">
            <EmptyState
              icon={ClipboardList}
              title="No housekeeping tasks"
              description="Create your first task to start managing room cleaning and inspections."
              action={{
                label: "Add task",
                onClick: openCreate,
              }}
              actionClassName="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] text-white hover:opacity-95 focus-visible:ring-[#5a189a]"
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {items.map((row: any) => {
                const priorityStyle =
                  PRIORITY_STYLES[row.priority] ?? PRIORITY_STYLES.normal;
                const statusStyle =
                  STATUS_STYLES[row.status] ?? STATUS_STYLES.pending;
                const roomLabel = row.roomId?.roomNumber ?? row.roomId ?? "—";
                const taskLabel =
                  TASK_TYPE_OPTIONS.find((o) => o.value === row.taskType)
                    ?.label ?? row.taskType;
                return (
                  <div
                    key={row._id}
                    className="flex flex-col gap-4 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:space-y-0">
                      <div>
                        <p className="font-semibold text-slate-900">
                          Room {roomLabel}
                        </p>
                        <p className="text-sm text-slate-500">{taskLabel}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2.5 py-0.5 text-xs font-medium",
                            priorityStyle.bg,
                            priorityStyle.text,
                            priorityStyle.border
                          )}
                        >
                          {PRIORITY_OPTIONS.find((o) => o.value === row.priority)
                            ?.label ?? row.priority}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2.5 py-0.5 text-xs font-medium",
                            statusStyle.bg,
                            statusStyle.text,
                            statusStyle.border
                          )}
                        >
                          {STATUS_OPTIONS.find((o) => o.value === row.status)
                            ?.label ?? row.status}
                        </span>
                      </div>
                      {row.assignedTo && (
                        <p className="text-sm text-slate-600">
                          Assigned: {row.assignedTo}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        Created {formatDate(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Dropdown
                        trigger={
                          <>
                            <span className="sr-only">Quick status</span>
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </>
                        }
                        items={STATUS_OPTIONS.map((opt) => ({
                          id: opt.value,
                          label: opt.label,
                          onClick: () => handleStatusChange(row, opt.value),
                        }))}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(row)}
                        aria-label="Edit"
                        className="text-slate-600 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDelete(row._id)}
                        aria-label="Delete"
                        className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {pagination && pagination.total > pagination.limit && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-4 py-3 sm:px-6">
                <p className="text-sm text-slate-600">
                  Showing{" "}
                  {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!hasPrev || isLoading}
                    className="border-slate-200 text-slate-700 hover:bg-slate-50"
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
                    className="border-slate-200 text-slate-700 hover:bg-slate-50"
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

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit task" : "Add housekeeping task"}
        size="lg"
        className="[&>div]:rounded-2xl [&>div]:shadow-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <AppReactSelect
            label="Room"
            value={form.roomId}
            onChange={(v) => setForm((f) => ({ ...f, roomId: v }))}
            options={[{ value: "", label: "Select room…" }, ...roomOptions]}
            placeholder="Select room…"
          />
          <AppReactSelect
            label="Task type"
            value={form.taskType}
            onChange={(v) => setForm((f) => ({ ...f, taskType: v }))}
            options={TASK_TYPE_OPTIONS}
            placeholder="Select type…"
          />
          <Input
            label="Assigned to"
            value={form.assignedTo}
            onChange={(e) =>
              setForm((f) => ({ ...f, assignedTo: e.target.value }))
            }
            placeholder="Staff name or ID"
            className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
          />
          <AppReactSelect
            label="Priority"
            value={form.priority}
            onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
            options={PRIORITY_OPTIONS}
            placeholder="Select priority…"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
            className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
          />
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="rounded-xl font-semibold text-white shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, #ff6d00 0%, #ff8500 50%, #ff9e00 100%)",
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
        title="Delete task"
        size="sm"
        className="[&>div]:rounded-2xl [&>div]:shadow-xl"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this housekeeping task? This action
          cannot be undone.
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
