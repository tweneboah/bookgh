"use client";

import { useMemo, useState } from "react";
import {
  useStaffPerformance,
  useCreateStaffPerformance,
  useUpdateStaffPerformance,
  useDeleteStaffPerformance,
  useUsers,
} from "@/hooks/api";
import { Button, DataTable, Modal, Input, Select, Badge } from "@/components/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { PERFORMANCE_RATING } from "@/constants";

const RATING_OPTIONS = Object.entries(PERFORMANCE_RATING).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const RATING_BADGE: Record<string, "success" | "info" | "warning" | "danger" | "default"> = {
  excellent: "success",
  good: "info",
  satisfactory: "default",
  needsImprovement: "warning",
  poor: "danger",
};

export default function StaffPerformancePage() {
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    userId: "",
    reviewDate: "",
    periodStart: "",
    periodEnd: "",
    rating: PERFORMANCE_RATING.GOOD as string,
    score: "80",
    goalsAchieved: "",
    strengths: "",
    improvements: "",
    managerNotes: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (ratingFilter) params.rating = ratingFilter;
  if (userFilter) params.userId = userFilter;

  const { data, isLoading } = useStaffPerformance(params);
  const { data: usersData } = useUsers({ limit: "200" });
  const createMut = useCreateStaffPerformance();
  const updateMut = useUpdateStaffPerformance();
  const deleteMut = useDeleteStaffPerformance();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const users = usersData?.data ?? [];

  const userOptions = useMemo(
    () =>
      users.map((u: any) => ({
        value: u._id,
        label: (`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email) ?? u._id,
      })),
    [users]
  );
  const userMap = useMemo(
    () =>
      Object.fromEntries(
        userOptions.map((u: { value: string; label: string }) => [u.value, u.label])
      ),
    [userOptions]
  );

  const resetForm = () => {
    setForm({
      userId: "",
      reviewDate: "",
      periodStart: "",
      periodEnd: "",
      rating: PERFORMANCE_RATING.GOOD,
      score: "80",
      goalsAchieved: "",
      strengths: "",
      improvements: "",
      managerNotes: "",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    const today = new Date().toISOString().slice(0, 10);
    setForm((f) => ({ ...f, reviewDate: today, periodStart: today, periodEnd: today }));
    setShowModal(true);
  };

  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      userId: row.userId?._id ?? row.userId ?? "",
      reviewDate: row.reviewDate ? format(new Date(row.reviewDate), "yyyy-MM-dd") : "",
      periodStart: row.periodStart ? format(new Date(row.periodStart), "yyyy-MM-dd") : "",
      periodEnd: row.periodEnd ? format(new Date(row.periodEnd), "yyyy-MM-dd") : "",
      rating: row.rating ?? PERFORMANCE_RATING.GOOD,
      score: String(row.score ?? 80),
      goalsAchieved: row.goalsAchieved ?? "",
      strengths: row.strengths ?? "",
      improvements: row.improvements ?? "",
      managerNotes: row.managerNotes ?? "",
    });
    setShowModal(true);
  };

  const toIso = (date: string) => `${date}T00:00:00.000Z`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.reviewDate || !form.periodStart || !form.periodEnd) {
      toast.error("All date and staff fields are required");
      return;
    }
    const score = Number(form.score);
    if (!Number.isFinite(score) || score < 1 || score > 100) {
      toast.error("Score must be between 1 and 100");
      return;
    }

    const payload = {
      userId: form.userId,
      reviewDate: toIso(form.reviewDate),
      periodStart: toIso(form.periodStart),
      periodEnd: toIso(form.periodEnd),
      rating: form.rating,
      score,
      goalsAchieved: form.goalsAchieved.trim() || undefined,
      strengths: form.strengths.trim() || undefined,
      improvements: form.improvements.trim() || undefined,
      managerNotes: form.managerNotes.trim() || undefined,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Performance record updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Performance record added");
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
      toast.success("Performance record deleted");
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
        return uid ? userMap[String(uid)] ?? "-" : "-";
      },
    },
    {
      key: "reviewDate",
      header: "Review Date",
      render: (row: any) => (row.reviewDate ? format(new Date(row.reviewDate), "MMM d, yyyy") : "-"),
    },
    {
      key: "period",
      header: "Period",
      render: (row: any) =>
        row.periodStart && row.periodEnd
          ? `${format(new Date(row.periodStart), "MMM d")} - ${format(new Date(row.periodEnd), "MMM d, yyyy")}`
          : "-",
    },
    {
      key: "rating",
      header: "Rating",
      render: (row: any) => (
        <Badge variant={RATING_BADGE[row.rating] ?? "default"}>
          {RATING_OPTIONS.find((r) => r.value === row.rating)?.label ?? row.rating}
        </Badge>
      ),
    },
    {
      key: "score",
      header: "Score",
      render: (row: any) => (row.score != null ? `${row.score}/100` : "-"),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label="Edit">
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
        <h1 className="text-2xl font-semibold text-slate-900">Performance</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setPage(1);
            }}
            options={[{ value: "", label: "All Staff" }, ...userOptions]}
            className="w-52"
          />
          <Select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
            options={[{ value: "", label: "All Ratings" }, ...RATING_OPTIONS]}
            className="w-44"
          />
          <Button onClick={openCreate} className="bg-[#C71585] hover:bg-[#FF0090]">
            <Plus className="h-4 w-4" />
            Add Review
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
        emptyTitle="No performance records"
        emptyDescription="Add staff reviews to start tracking performance."
      />

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Performance Review" : "Add Performance Review"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Staff Member"
            options={[{ value: "", label: "Select staff..." }, ...userOptions]}
            value={form.userId}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Review Date"
              type="date"
              value={form.reviewDate}
              onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))}
              required
            />
            <Input
              label="Period Start"
              type="date"
              value={form.periodStart}
              onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
              required
            />
            <Input
              label="Period End"
              type="date"
              value={form.periodEnd}
              onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Rating"
              options={RATING_OPTIONS}
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
            />
            <Input
              label="Score (1-100)"
              type="number"
              min="1"
              max="100"
              value={form.score}
              onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
              required
            />
          </div>
          <Input
            label="Goals Achieved"
            value={form.goalsAchieved}
            onChange={(e) => setForm((f) => ({ ...f, goalsAchieved: e.target.value }))}
            placeholder="Optional"
          />
          <Input
            label="Strengths"
            value={form.strengths}
            onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))}
            placeholder="Optional"
          />
          <Input
            label="Improvements"
            value={form.improvements}
            onChange={(e) => setForm((f) => ({ ...f, improvements: e.target.value }))}
            placeholder="Optional"
          />
          <Input
            label="Manager Notes"
            value={form.managerNotes}
            onChange={(e) => setForm((f) => ({ ...f, managerNotes: e.target.value }))}
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
            <Button type="submit" loading={createMut.isPending || updateMut.isPending}>
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Performance Review">
        <p className="text-slate-600">
          Are you sure you want to delete this performance review? This action cannot be undone.
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
  );
}
