"use client";

import { useState } from "react";
import {
  useEventResources,
  useCreateEventResource,
  useUpdateEventResource,
  useDeleteEventResource,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  AppReactSelect,
} from "@/components/ui";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { EVENT_RESOURCE_TYPE, RESOURCE_CONDITION, RESOURCE_PRICE_UNIT } from "@/constants";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const TYPE_OPTIONS = Object.entries(EVENT_RESOURCE_TYPE).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const CONDITION_OPTIONS = Object.entries(RESOURCE_CONDITION).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const PRICE_UNIT_OPTIONS = [
  { value: RESOURCE_PRICE_UNIT.PER_HOUR, label: "Per hour" },
  { value: RESOURCE_PRICE_UNIT.PER_DAY, label: "Per day" },
  { value: RESOURCE_PRICE_UNIT.PER_UNIT, label: "Per unit (per item)" },
];

const PRICE_BASIS_EXAMPLES: Record<string, { title: string; formula: string; examples: string[] }> = {
  [RESOURCE_PRICE_UNIT.PER_HOUR]: {
    title: "Per hour — charged by event duration",
    formula: "Rate × Quantity × Event hours",
    examples: [
      "Projector: GHS 80/hr × 1 × 4 hrs = GHS 320",
      "PA system: GHS 150/hr × 1 × 6 hrs = GHS 900",
      "Security guard: GHS 40/hr × 2 × 5 hrs = GHS 400",
    ],
  },
  [RESOURCE_PRICE_UNIT.PER_DAY]: {
    title: "Per day — charged by number of days",
    formula: "Rate × Quantity × Event days",
    examples: [
      "Backdrop rental: GHS 300/day × 1 × 2 days = GHS 600",
      "Marquee tent: GHS 1,500/day × 1 × 1 day = GHS 1,500",
      "Generator: GHS 800/day × 1 × 3 days = GHS 2,400",
    ],
  },
  [RESOURCE_PRICE_UNIT.PER_UNIT]: {
    title: "Per unit — charged per item or per person",
    formula: "Rate × Quantity (event duration ignored)",
    examples: [
      "Flower centerpiece: GHS 250 × 12 = GHS 3,000",
      "Catering per guest: GHS 120 × 80 = GHS 9,600",
      "Gift bag: GHS 45 × 50 = GHS 2,250",
    ],
  },
};

function getRateLabel(priceUnit: string): string {
  if (priceUnit === RESOURCE_PRICE_UNIT.PER_HOUR) return "Hourly rate (GHS)";
  if (priceUnit === RESOURCE_PRICE_UNIT.PER_DAY) return "Daily rate (GHS)";
  return "Per unit price (GHS)";
}

function priceUnitLabel(priceUnit: string | undefined): string {
  if (!priceUnit) return "per unit";
  const o = PRICE_UNIT_OPTIONS.find((opt) => opt.value === priceUnit);
  return o ? o.label : priceUnit;
}

/** Short label for card/booking: "per unit", "per hour", "per day" */
function priceUnitShort(priceUnit: string | undefined): string {
  if (priceUnit === RESOURCE_PRICE_UNIT.PER_HOUR) return "per hour";
  if (priceUnit === RESOURCE_PRICE_UNIT.PER_DAY) return "per day";
  return "per unit";
}

const TYPE_BADGE_STYLE: Record<string, string> = {
  equipment: "bg-[#7b2cbf]/10 text-[#5a189a] border-[#7b2cbf]/20",
  catering: "bg-[#ff9100]/10 text-[#ff6d00] border-[#ff9100]/20",
  decoration: "bg-[#9d4edd]/10 text-[#7b2cbf] border-[#9d4edd]/20",
  staffing: "bg-[#ff9e00]/10 text-[#ff8500] border-[#ff9e00]/20",
  security: "bg-[#3c096c]/10 text-[#240046] border-[#3c096c]/20",
};

const CONDITION_BADGE_STYLE: Record<string, string> = {
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fair: "bg-amber-50 text-amber-700 border-amber-200",
  poor: "bg-red-50 text-red-700 border-red-200",
  outOfService: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function EventResourcesPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: EVENT_RESOURCE_TYPE.EQUIPMENT as string,
    description: "",
    quantity: "1",
    unitPrice: "",
    totalAmountEntered: "",
    priceUnit: RESOURCE_PRICE_UNIT.PER_HOUR as string,
    condition: RESOURCE_CONDITION.GOOD as string,
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (typeFilter) params.type = typeFilter;

  const { data, isLoading } = useEventResources(params);
  const createMut = useCreateEventResource();
  const updateMut = useUpdateEventResource();
  const deleteMut = useDeleteEventResource();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const resetForm = () => {
    setForm({
      name: "",
      type: EVENT_RESOURCE_TYPE.EQUIPMENT,
      description: "",
      quantity: "1",
      unitPrice: "",
      totalAmountEntered: "",
      priceUnit: RESOURCE_PRICE_UNIT.PER_HOUR,
      condition: RESOURCE_CONDITION.GOOD,
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const normalizePriceUnit = (v: unknown): string => {
    if (v === RESOURCE_PRICE_UNIT.PER_HOUR || v === RESOURCE_PRICE_UNIT.PER_DAY || v === RESOURCE_PRICE_UNIT.PER_UNIT) return v;
    return RESOURCE_PRICE_UNIT.PER_HOUR;
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name ?? "",
      type: item.type ?? EVENT_RESOURCE_TYPE.EQUIPMENT,
      description: item.description ?? "",
      quantity: item.quantity != null ? String(item.quantity) : "1",
      unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
      totalAmountEntered: "",
      priceUnit: normalizePriceUnit(item.priceUnit),
      condition: item.condition ?? RESOURCE_CONDITION.GOOD,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
      quantity: form.quantity ? parseInt(form.quantity, 10) : 1,
      unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
      priceUnit: form.priceUnit,
      condition: form.condition,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Event resource updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Event resource created");
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
      toast.success("Event resource deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit) || 1
    : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero header */}
      <header className="relative overflow-hidden border-b border-slate-200/80 bg-white">
        <div
          className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#ff6d00] via-[#ff9100] to-[#5a189a]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-500">
                <Sparkles className="h-5 w-5 text-[#ff8500]" aria-hidden />
                <span className="text-sm font-medium">Resources & inventory</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Event Resources
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
                Manage equipment, catering, decoration, staffing, and security for your events.
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9100] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff9100]/25 transition hover:from-[#ff7900] hover:to-[#ff9e00] focus-visible:ring-[#ff8500]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add Resource
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Filters card */}
        <Card className="mb-6 rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 sm:max-w-xs">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Filter by type
                </label>
                <AppReactSelect
                  value={typeFilter}
                  onChange={(v) => {
                    setTypeFilter(v);
                    setPage(1);
                  }}
                  options={[{ value: "", label: "All types" }, ...TYPE_OPTIONS]}
                  placeholder="All types"
                  isClearable
                  className="[&_.css-1d8n9bt]:rounded-xl"
                />
              </div>
              {pagination && pagination.total > 0 && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{pagination.total}</span>{" "}
                  resource{pagination.total !== 1 ? "s" : ""} total
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resource grid */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card
                  key={i}
                  className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm"
                >
                  <CardContent className="p-5">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                    <div className="mt-4 flex gap-2">
                      <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
                      <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-4 h-8 w-full animate-pulse rounded-lg bg-slate-100" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isEmpty ? (
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
              <CardContent className="p-8 sm:p-12">
                <EmptyState
                  icon={Package}
                  title="No event resources yet"
                  description="Add equipment, catering, decoration, staffing, or security resources to use in your events."
                  action={{
                    label: "Add your first resource",
                    onClick: openCreate,
                  }}
                  actionClassName="bg-linear-to-r from-[#ff6d00] to-[#ff9100] text-white hover:opacity-95 focus-visible:ring-[#ff8500]"
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row: any) => (
                  <Card
                    key={row._id}
                    className="group overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm transition hover:shadow-md hover:shadow-slate-200/60"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold text-slate-900 line-clamp-2">
                          {row.name ?? "—"}
                        </CardTitle>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(row)}
                            aria-label="Edit resource"
                            className="h-8 w-8 rounded-lg text-slate-500 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDelete(row._id)}
                            aria-label="Delete resource"
                            className="h-8 w-8 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          TYPE_BADGE_STYLE[row.type] ?? "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {TYPE_OPTIONS.find((o) => o.value === row.type)?.label ?? row.type}
                      </span>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                        <span>Qty: {row.quantity ?? 1}</span>
                        <span>
                          {row.unitPrice != null ? fmt(row.unitPrice) : "—"} {priceUnitShort(row.priceUnit)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                            CONDITION_BADGE_STYLE[row.condition] ?? "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {CONDITION_OPTIONS.find((o) => o.value === row.condition)?.label ?? row.condition}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                            row.isAvailable !== false
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.isAvailable !== false ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.total > pagination.limit && (
                <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    Showing{" "}
                    <span className="font-medium text-slate-800">
                      {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{" "}
                    of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={!hasPrev || isLoading}
                      className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-[#5a189a]/30 hover:text-[#5a189a] focus-visible:ring-[#5a189a]"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="min-w-24 text-center text-sm font-medium text-slate-700">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNext || isLoading}
                      className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-[#5a189a]/30 hover:text-[#5a189a] focus-visible:ring-[#5a189a]"
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create / Edit modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title=""
        size="lg"
        className="max-w-xl rounded-2xl border-slate-200/80 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-linear-to-r from-slate-50 to-white px-6 py-4">
          <div>
            <div className="h-1 w-16 rounded-full bg-linear-to-r from-[#ff6d00] to-[#5a189a]" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">
              {editItem ? "Edit Event Resource" : "Add Event Resource"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {editItem ? "Update details below." : "Create a new resource for your events."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => { setShowModal(false); resetForm(); }}
            aria-label="Close"
            className="rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. Projector HD"
            className="rounded-xl border-slate-300 focus-visible:ring-[#5a189a]"
          />
          <AppReactSelect
            label="Type"
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            placeholder="Select type"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Optional"
            rows={3}
            className="rounded-xl border-slate-300 focus-visible:ring-[#5a189a]"
          />
          <AppReactSelect
            label="Price basis"
            options={PRICE_UNIT_OPTIONS}
            value={form.priceUnit}
            onChange={(v) => setForm((f) => ({ ...f, priceUnit: v ?? RESOURCE_PRICE_UNIT.PER_HOUR }))}
            placeholder="How is this resource priced?"
            className="w-full"
          />
          {(() => {
            const basis = PRICE_BASIS_EXAMPLES[form.priceUnit] ?? PRICE_BASIS_EXAMPLES[RESOURCE_PRICE_UNIT.PER_HOUR];
            return (
              <div className="rounded-xl border border-[#5a189a]/20 bg-[#5a189a]/5 px-4 py-3">
                <p className="text-sm font-semibold text-[#5a189a]">{basis.title}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">Formula: {basis.formula}</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {basis.examples.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[#5a189a]/60" />
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => {
                const q = e.target.value;
                setForm((f) => {
                  const next = { ...f, quantity: q };
                  const totalVal = Number(f.totalAmountEntered) || 0;
                  const qty = Number(q) || 0;
                  if (totalVal > 0 && qty > 0)
                    next.unitPrice = String(
                      Math.round((totalVal / qty) * 100) / 100
                    );
                  return next;
                });
              }}
              className="rounded-xl border-slate-300 focus-visible:ring-[#5a189a]"
            />
            <Input
              label={getRateLabel(form.priceUnit)}
              type="number"
              min={0}
              step={0.01}
              value={form.unitPrice}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  unitPrice: e.target.value,
                  totalAmountEntered: "",
                }))
              }
              placeholder={
                form.priceUnit === RESOURCE_PRICE_UNIT.PER_HOUR
                  ? "e.g. 80"
                  : form.priceUnit === RESOURCE_PRICE_UNIT.PER_DAY
                    ? "e.g. 300"
                    : "e.g. 250"
              }
              className="rounded-xl border-slate-300 focus-visible:ring-[#5a189a]"
            />
          </div>
          {form.priceUnit === RESOURCE_PRICE_UNIT.PER_UNIT && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Total amount (optional)
              </label>
              <p className="text-xs text-slate-500">
                Enter the total for this quantity and we&apos;ll fill the per-unit rate for you.
              </p>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g. 3000"
                value={form.totalAmountEntered}
                onChange={(e) => {
                  const totalStr = e.target.value;
                  setForm((f) => {
                    const next = { ...f, totalAmountEntered: totalStr };
                    const totalVal = Number(totalStr) || 0;
                    const qty = Number(f.quantity) || 0;
                    if (totalVal > 0 && qty > 0)
                      next.unitPrice = String(
                        Math.round((totalVal / qty) * 100) / 100
                      );
                    return next;
                  });
                }}
                className="rounded-xl border-slate-300 focus-visible:ring-[#5a189a]"
              />
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-sm font-medium text-slate-600">
              {form.priceUnit === RESOURCE_PRICE_UNIT.PER_HOUR && "Rate × Quantity (total = rate × qty × event hours at booking)"}
              {form.priceUnit === RESOURCE_PRICE_UNIT.PER_DAY && "Rate × Quantity (total = rate × qty × event days at booking)"}
              {form.priceUnit === RESOURCE_PRICE_UNIT.PER_UNIT && "Line total (Rate × Quantity)"}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {fmt(
                (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0)
              )}
            </p>
          </div>
          <AppReactSelect
            label="Condition"
            options={CONDITION_OPTIONS}
            value={form.condition}
            onChange={(v) => setForm((f) => ({ ...f, condition: v }))}
            placeholder="Select condition"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="rounded-xl border-slate-300 text-slate-700 hover:border-[#5a189a]/50 hover:text-[#5a189a] focus-visible:ring-[#5a189a]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9100] text-white shadow-md shadow-[#ff9100]/25 hover:opacity-95 focus-visible:ring-[#ff8500]"
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title=""
        className="max-w-md rounded-2xl border-slate-200/80 shadow-xl"
      >
        <div className="px-6 py-5">
          <div className="h-1 w-12 rounded-full bg-linear-to-r from-red-400 to-red-500" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Delete Event Resource
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Are you sure you want to delete this event resource? This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDelete(null)}
              className="rounded-xl border-slate-300 text-slate-700 focus-visible:ring-[#5a189a]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteMut.isPending}
              className="rounded-xl"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
