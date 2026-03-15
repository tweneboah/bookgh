"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  usePricingRules,
  useCreatePricingRule,
  useUpdatePricingRule,
  useDeletePricingRule,
  useRoomCategories,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import {
  HiOutlineTag,
  HiPlus,
  HiPencil,
  HiTrash,
  HiOutlineCalendar,
  HiOutlineSparkles,
} from "react-icons/hi2";
import toast from "react-hot-toast";
import { format } from "date-fns";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { PRICING_RULE_TYPE, MODIFIER_TYPE } from "@/constants";

const TYPE_OPTIONS = Object.entries(PRICING_RULE_TYPE).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}));

const MODIFIER_OPTIONS = Object.entries(MODIFIER_TYPE).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}));

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function toDateTimeLocal(dateStr: string | Date | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISO(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString();
}

export default function PricingRulesPage() {
  const searchParams = useSearchParams();
  const urlDepartment = searchParams.get("department") ?? "";
  const typeFilter = searchParams.get("type") ?? "";
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: PRICING_RULE_TYPE.SEASONAL as string,
    modifierType: MODIFIER_TYPE.PERCENTAGE as string,
    modifierValue: "",
    roomCategoryId: "",
    startDate: "",
    endDate: "",
    priority: "0",
    daysOfWeek: [] as number[],
    isActive: true,
  });

  const { data, isLoading } = usePricingRules({
    page: String(page),
    limit: "20",
    ...(urlDepartment ? { department: urlDepartment } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  });
  const { data: categoriesData } = useRoomCategories({ limit: "100" });
  const createMut = useCreatePricingRule();
  const updateMut = useUpdatePricingRule();
  const deleteMut = useDeletePricingRule();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const categories = categoriesData?.data ?? [];

  const resetForm = () => {
    setForm({
      name: "",
      type: PRICING_RULE_TYPE.SEASONAL,
      modifierType: MODIFIER_TYPE.PERCENTAGE,
      modifierValue: "",
      roomCategoryId: "",
      startDate: "",
      endDate: "",
      priority: "0",
      daysOfWeek: [],
      isActive: true,
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setForm((f) => ({
      ...f,
      type: typeFilter || PRICING_RULE_TYPE.SEASONAL,
    }));
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name ?? "",
      type: item.type ?? PRICING_RULE_TYPE.SEASONAL,
      modifierType: item.modifierType ?? MODIFIER_TYPE.PERCENTAGE,
      modifierValue: String(item.modifierValue ?? ""),
      roomCategoryId: item.roomCategoryId?._id ?? item.roomCategoryId ?? "",
      startDate: toDateTimeLocal(item.startDate),
      endDate: toDateTimeLocal(item.endDate),
      priority: String(item.priority ?? 0),
      daysOfWeek: Array.isArray(item.daysOfWeek) ? item.daysOfWeek : [],
      isActive: item.isActive !== false,
    });
    setShowModal(true);
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day].sort((a, b) => a - b),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      type: form.type,
      modifierType: form.modifierType,
      modifierValue: parseFloat(form.modifierValue) || 0,
      roomCategoryId: form.roomCategoryId || undefined,
      startDate: form.startDate ? toISO(form.startDate) : undefined,
      endDate: form.endDate ? toISO(form.endDate) : undefined,
      priority: parseInt(form.priority, 10) || 0,
      daysOfWeek: form.daysOfWeek.length ? form.daysOfWeek : undefined,
      ...(editItem && { isActive: form.isActive }),
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({
          id: editItem._id,
          ...payload,
          ...(urlDepartment ? { department: urlDepartment } : {}),
        });
        toast.success("Pricing rule updated");
      } else {
        await createMut.mutateAsync({
          ...payload,
          ...(urlDepartment ? { department: urlDepartment } : {}),
        });
        toast.success("Pricing rule created");
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
      await deleteMut.mutateAsync({
        id: showDelete,
        ...(urlDepartment ? { department: urlDepartment } : {}),
      });
      toast.success("Pricing rule deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const filterLabel =
    urlDepartment && typeFilter
      ? `${urlDepartment.charAt(0).toUpperCase() + urlDepartment.slice(1)} · ${TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? typeFilter}`
      : urlDepartment
        ? `${urlDepartment.charAt(0).toUpperCase() + urlDepartment.slice(1)}`
        : typeFilter
          ? TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? typeFilter
          : null;

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) || 1 : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && items.length === 0;

  const formatModifier = (row: any) => {
    const isPct = row.modifierType === MODIFIER_TYPE.PERCENTAGE;
    if (row.modifierValue == null) return "—";
    return isPct
      ? `${row.modifierValue}%`
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.modifierValue);
  };

  return (
    <div
      className="min-h-screen bg-white font-sans text-slate-800"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* White header with accent strip */}
      <header className="relative border-b border-slate-100 bg-white">
        <div
          className="absolute left-0 top-0 h-full w-1 min-w-0 rounded-r-full bg-linear-to-b from-[#ff8500] via-[#ff9100] to-[#5a189a] sm:w-1.5"
          aria-hidden
        />
        <div className="relative px-4 py-6 sm:px-6 sm:py-8 md:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 pl-2 sm:pl-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[#5a189a]">
                  <HiOutlineTag className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pricing rules
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Manage pricing rules
              </h1>
              {filterLabel && (
                <p className="text-sm font-medium text-slate-600">
                  Showing: <span className="font-semibold text-[#5a189a]">{filterLabel}</span>
                </p>
              )}
              {urlDepartment === "bar" && typeFilter === "special" && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <HiOutlineSparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#7b2cbf]" aria-hidden />
                  <p className="text-sm text-slate-600">
                    The first active Special rule that matches the current date and days of week is applied to BAR orders. You can see which rule was applied in the BAR Orders table (Pricing rule column) and in Take Payment.
                  </p>
                </div>
              )}
            </div>
            <Button
              onClick={openCreate}
              className="shrink-0 bg-linear-to-r from-[#ff6d00] to-[#ff9100] font-semibold text-white shadow-md shadow-orange-500/25 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ff8500]/50"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              <HiPlus className="h-5 w-5" aria-hidden />
              Add rule
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          {isLoading ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-xl bg-slate-100"
                  aria-hidden
                />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="p-4 sm:p-8">
              <EmptyState
                icon={HiOutlineTag as any}
                title="No pricing rules"
                description={
                  filterLabel
                    ? typeFilter
                      ? `No rules for this filter. New rules you add here will use Type "${TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? typeFilter}" and appear in this list.`
                      : "No rules for this department. Add a rule to get started."
                    : "Add your first pricing rule to get started."
                }
                action={{ label: "Add rule", onClick: openCreate }}
                actionClassName="bg-linear-to-r from-[#ff6d00] to-[#ff9100] hover:opacity-95 focus-visible:ring-[#ff8500]/50"
              />
            </div>
          ) : (
            <>
              {/* Card grid: same layout on all breakpoints for a fresh, premium feel */}
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
                {items.map((row: any) => (
                  <Card
                    key={row._id}
                    className="overflow-hidden border border-slate-100 bg-white shadow-sm transition-all hover:shadow-[0_8px_30px_rgba(90,24,154,0.08)]"
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-slate-50 pb-3">
                      <CardTitle className="text-base font-semibold text-slate-900">
                        {row.name ?? "—"}
                      </CardTitle>
                      <Badge
                        variant={row.isActive !== false ? "success" : "outline"}
                        className={
                          row.isActive !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "border-slate-200 text-slate-500"
                        }
                      >
                        {row.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-lg bg-[#5a189a]/10 px-2.5 py-1 text-xs font-medium text-[#5a189a]">
                          {TYPE_OPTIONS.find((o) => o.value === row.type)?.label ?? row.type}
                        </span>
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          Priority {row.priority ?? 0}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-slate-500">Modifier: </span>
                        <span className="font-semibold text-slate-800">{formatModifier(row)}</span>
                        <span className="text-slate-400"> ({row.modifierType ?? "—"})</span>
                      </div>
                      {(row.startDate || row.endDate) && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <HiOutlineCalendar className="h-4 w-4 shrink-0 text-[#7b2cbf]/70" />
                          {row.startDate ? format(new Date(row.startDate), "MMM d, yyyy") : "—"}
                          {" – "}
                          {row.endDate ? format(new Date(row.endDate), "MMM d, yyyy") : "—"}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(row)}
                          className="border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10 hover:border-[#5a189a]/50"
                        >
                          <HiPencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDelete(row._id)}
                          className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <HiTrash className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {pagination && !isEmpty && pagination.total > pagination.limit && (
                <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-4 py-4 sm:flex-row sm:px-6">
                  <p className="text-sm text-slate-500">
                    Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev || isLoading}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Previous
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
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add/Edit Modal — white theme, purple focus, orange CTA */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit pricing rule" : "Add pricing rule"}
        size="lg"
        className="max-h-[90vh] overflow-y-auto bg-white"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. Summer Premium"
            className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AppReactSelect
              label="Type"
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            />
            <AppReactSelect
              label="Room category (optional)"
              options={[
                { value: "", label: "All categories" },
                ...categories.map((c: any) => ({ value: c._id, label: c.name })),
              ]}
              value={form.roomCategoryId}
              onChange={(v) => setForm((f) => ({ ...f, roomCategoryId: v }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AppReactSelect
              label="Modifier type"
              options={MODIFIER_OPTIONS}
              value={form.modifierType}
              onChange={(v) => setForm((f) => ({ ...f, modifierType: v }))}
            />
            <Input
              label="Modifier value"
              type="number"
              step="0.01"
              value={form.modifierValue}
              onChange={(e) => setForm((f) => ({ ...f, modifierValue: e.target.value }))}
              required
              placeholder={form.modifierType === MODIFIER_TYPE.PERCENTAGE ? "10" : "50"}
              className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Start date & time</label>
              <ReactDatePicker
                selected={form.startDate ? new Date(form.startDate) : null}
                onChange={(date) =>
                  setForm((f) => ({
                    ...f,
                    startDate: date ? toDateTimeLocal(date) : "",
                  }))
                }
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMM d, yyyy h:mm aa"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                placeholderText="Select start"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">End date & time</label>
              <ReactDatePicker
                selected={form.endDate ? new Date(form.endDate) : null}
                onChange={(date) =>
                  setForm((f) => ({
                    ...f,
                    endDate: date ? toDateTimeLocal(date) : "",
                  }))
                }
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMM d, yyyy h:mm aa"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                placeholderText="Select end"
              />
            </div>
          </div>
          <Input
            label="Priority"
            type="number"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            placeholder="0 = default"
            className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Days of week (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((d) => (
                <label
                  key={d.value}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    form.daysOfWeek.includes(d.value)
                      ? "border-[#5a189a] bg-[#5a189a]/10 text-[#5a189a] font-medium"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.daysOfWeek.includes(d.value)}
                    onChange={() => toggleDay(d.value)}
                    className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/30"
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          {editItem && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/30"
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="border-slate-200 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="bg-linear-to-r from-[#ff6d00] to-[#ff9100] font-semibold text-white shadow-md shadow-orange-500/25 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ff8500]/50"
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
        title="Delete pricing rule"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this pricing rule? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDelete(null)} className="border-slate-200">
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
