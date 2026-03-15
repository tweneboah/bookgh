"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePoolBooking, useUpdatePoolBooking } from "@/hooks/api";
import { Button, Input, Textarea, Card, CardContent } from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Receipt,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  Sparkles,
  UserPlus,
  History,
  ExternalLink,
  Droplets,
} from "lucide-react";
import { getApiErrorMessage } from "@/lib/api-client";

type ExpenseRow = {
  category: string;
  description: string;
  amount: string;
  chargeToCustomer?: boolean;
  amountToCharge?: string;
};

const DEFAULT_CATEGORIES = [
  "equipmentDamage",
  "cleaning",
  "towels",
  "lifeguard",
  "maintenance",
  "other",
];

const BASE_CATEGORY_OPTIONS = DEFAULT_CATEGORIES.map((c) => ({
  value: c,
  label: c
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim(),
}));

const fmt = (n: number) =>
  `₵${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function categoryToLabel(cat: string): string {
  if (cat === "other") return "Other";
  return (
    BASE_CATEGORY_OPTIONS.find((o) => o.value === cat)?.label ??
    cat.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim()
  );
}

function buildCategoryOptions(rows: ExpenseRow[]): { value: string; label: string }[] {
  const known = new Set(BASE_CATEGORY_OPTIONS.map((o) => o.value));
  const extra = rows
    .map((r) => r.category?.trim())
    .filter((c): c is string => !!c && !known.has(c));
  const uniqueExtra = [...new Set(extra)];
  return [
    ...BASE_CATEGORY_OPTIONS,
    ...uniqueExtra.map((value) => ({ value, label: categoryToLabel(value) })),
  ];
}

export default function PoolBookingExpensesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = params?.id ?? "";

  const { data, isLoading, refetch: refetchBooking } = usePoolBooking(bookingId);
  const raw = data as { data?: unknown } | undefined;
  const booking = (raw?.data ?? raw) as {
    bookingReference?: string;
    guestName?: string;
    amount?: number;
    expenseLineItems?: Array<{
      category?: string;
      description?: string;
      amount?: number;
      chargeToCustomer?: boolean;
      amountToCharge?: number;
    }>;
  } | undefined;

  // [PoolExpenses] Debug: what we got from API and what we use as booking
  if (typeof window !== "undefined") {
    console.log("[PoolExpenses] usePoolBooking result", {
      bookingId,
      hasData: !!data,
      rawKeys: raw && typeof raw === "object" ? Object.keys(raw) : [],
      hasDataKey: raw && typeof raw === "object" && "data" in raw,
      bookingFrom: raw && typeof raw === "object" && "data" in raw ? "raw.data" : "raw",
      expenseLineItems: booking?.expenseLineItems,
      expenseLineItemsLength: Array.isArray(booking?.expenseLineItems) ? booking.expenseLineItems.length : 0,
      totalExpenses: (booking as { totalExpenses?: number })?.totalExpenses,
    });
  }

  const updateMut = useUpdatePoolBooking();

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const rowsRef = useRef<ExpenseRow[]>(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (!booking) return;
    const existing = Array.isArray(booking.expenseLineItems)
      ? booking.expenseLineItems.map((row) => {
          const hasCharge = !!(row.chargeToCustomer || (row.amountToCharge != null && row.amountToCharge > 0));
          return {
            category: row.category ?? "",
            description: row.description ?? "",
            amount: row.amount != null ? String(row.amount) : "",
            chargeToCustomer: hasCharge,
            amountToCharge: row.amountToCharge != null ? String(row.amountToCharge) : row.amount != null ? String(row.amount) : "",
          };
        })
      : [];
    setRows(
      existing.length
        ? existing
        : DEFAULT_CATEGORIES.map((category) => ({
            category,
            description: "",
            amount: "",
            chargeToCustomer: false,
            amountToCharge: "",
          }))
    );
  }, [booking]);

  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const customerChargesTotal = rows.reduce(
    (sum, row) =>
      row.chargeToCustomer && (row.amountToCharge || row.amount)
        ? sum + Number(row.amountToCharge || row.amount)
        : sum,
    0
  );
  const revenue = Number(booking?.amount ?? 0);
  const netProfit = revenue + customerChargesTotal - total;

  const handleSave = async () => {
    if (!bookingId) return;
    // Use ref so we always have the latest rows (avoids stale state if user clicks Save before re-render)
    const currentRows = rowsRef.current;
    const filtered = currentRows.filter(
      (row) => String(row.category ?? "").trim() && row.amount !== "" && row.amount != null && Number(row.amount) >= 0
    );
    const totalToSend = currentRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const payload = {
      expenseLineItems: filtered.map((row) => ({
        category: String(row.category ?? "").trim(),
        description: String(row.description ?? "").trim() || undefined,
        amount: Number(row.amount),
        ...(row.chargeToCustomer && {
          chargeToCustomer: true,
          amountToCharge: Number(row.amountToCharge || row.amount) || Number(row.amount),
        }),
      })),
      totalExpenses: totalToSend,
    };
    if (typeof window !== "undefined") {
      console.log("[PoolExpenses] handleSave payload", {
        bookingId,
        rowsLength: currentRows.length,
        filteredLength: filtered.length,
        rowsSample: currentRows.slice(0, 3).map((r) => ({ category: r.category, categoryType: typeof r.category, amount: r.amount, chargeToCustomer: r.chargeToCustomer })),
        payload,
      });
    }
    if (filtered.length === 0) {
      const hasAnyAmount = currentRows.some((r) => r.amount !== "" && r.amount != null);
      toast.error(hasAnyAmount ? "Select a category for each cost item you want to save." : "Add at least one cost item (category and amount) before saving.");
      return;
    }
    try {
      const result = await updateMut.mutateAsync({ id: bookingId, ...payload });
      if (typeof window !== "undefined") {
        console.log("[PoolExpenses] mutateAsync result", { result, resultKeys: result && typeof result === "object" ? Object.keys(result) : [] });
      }
      const refetched = await refetchBooking();
      const refetchedData = refetched?.data as { data?: { expenseLineItems?: unknown[] } } | undefined;
      if (typeof window !== "undefined") {
        console.log("[PoolExpenses] after refetch", {
          refetchedDataKeys: refetchedData && typeof refetchedData === "object" ? Object.keys(refetchedData) : [],
          hasDataKey: refetchedData && "data" in refetchedData,
          expenseLineItems: refetchedData?.data?.expenseLineItems ?? (refetchedData as { expenseLineItems?: unknown[] })?.expenseLineItems,
          expenseLineItemsLength: Array.isArray(refetchedData?.data?.expenseLineItems) ? refetchedData.data.expenseLineItems.length : Array.isArray((refetchedData as any)?.expenseLineItems) ? (refetchedData as any).expenseLineItems.length : 0,
        });
      }
      toast.success("Pool booking expenses updated");
      // Stay on page so "Charges to guest – history" and Total expenses update from refetched data
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to save expenses. Please try again."));
    }
  };

  const categoryOptions = buildCategoryOptions(rows);

  const isChargeableFromBooking = (row: { chargeToCustomer?: boolean | string; amountToCharge?: number }) =>
    row.chargeToCustomer === true || row.chargeToCustomer === "true" || (row.amountToCharge != null && Number(row.amountToCharge) > 0);
  const savedExpenseItems = Array.isArray(booking?.expenseLineItems) ? booking.expenseLineItems : [];
  const chargeableHistory = savedExpenseItems.filter((row) =>
    row.chargeToCustomer === true ||
    row.chargeToCustomer === "true" ||
    (row.amountToCharge != null && Number(row.amountToCharge) > 0)
  );
  const pendingChargeable = rows.filter(
    (row) =>
      (row.chargeToCustomer || (row.amountToCharge != null && String(row.amountToCharge).trim() !== "")) &&
      (row.amount || row.amountToCharge) &&
      row.category?.trim()
  );
  const hasAnyChargeable = chargeableHistory.length > 0 || pendingChargeable.length > 0;

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="relative overflow-hidden border-b border-slate-200/80 bg-white">
        <div
          className="absolute left-0 top-0 h-full w-1 bg-[linear-gradient(180deg,#ff6d00_0%,#ff9e00_100%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/pool/bookings"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#5a189a]/30 hover:bg-slate-50 hover:text-[#5a189a]"
                aria-label="Back to pool bookings"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Receipt className="h-5 w-5 text-[#ff8500]" aria-hidden />
                  <span className="text-sm font-medium">Pool booking profitability</span>
                </div>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Pool Booking Expenses
                </h1>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  Track pool booking costs. Mark expenses to charge to the guest (e.g. damage, extra cleaning, towels).
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/pool/bookings/${bookingId}/payments`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#5a189a]/30 hover:bg-slate-50 hover:text-[#5a189a]"
              >
                <Wallet className="h-4 w-4" />
                Payments
              </Link>
              <Link
                href={`/pool/bookings/${bookingId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#5a189a]/30 hover:bg-slate-50 hover:text-[#5a189a]"
              >
                <Droplets className="h-4 w-4" />
                View booking
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {isLoading ? (
          <div className="space-y-6">
            <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {customerChargesTotal > 0 && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <UserPlus className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">
                    Guest charges: {fmt(customerChargesTotal)}
                  </p>
                  <p className="mt-0.5 text-sm text-amber-800">
                    This amount will be added to the guest’s outstanding balance. They can pay via the Payments page.
                  </p>
                </div>
              </div>
            )}

            <Card className="mb-8 overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
              <div className="border-b border-slate-200/80 bg-linear-to-r from-amber-50/80 to-white px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                      <History className="h-4 w-4 text-amber-700" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Charges to guest – history</h2>
                      <p className="text-sm text-slate-600">Expenses added to the guest’s bill (from saved record).</p>
                    </div>
                  </div>
                  {hasAnyChargeable && (
                    <Link
                      href={`/pool/bookings/${bookingId}/payments`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Collect on Payments
                    </Link>
                  )}
                </div>
              </div>
              <CardContent className="p-0">
                {!hasAnyChargeable ? (
                  <div className="px-5 py-8 text-center sm:px-6">
                    <p className="text-sm text-slate-500">No charges to guest yet.</p>
                    <p className="mt-1 text-xs text-slate-400">Mark cost items below as “Charge to customer” and save to add them to the guest’s bill.</p>
                  </div>
                ) : (
                  <>
                    {chargeableHistory.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80">
                              <th className="px-5 py-3 font-semibold text-slate-700">Category</th>
                              <th className="px-5 py-3 font-semibold text-slate-700">Description</th>
                              <th className="px-5 py-3 font-semibold text-slate-700 text-right">Cost</th>
                              <th className="px-5 py-3 font-semibold text-amber-800 text-right">Charge to guest</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chargeableHistory.map((row, i) => (
                              <tr key={`saved-${i}`} className="border-b border-slate-100 last:border-0">
                                <td className="px-5 py-3 text-slate-900">{categoryToLabel(row.category ?? "")}</td>
                                <td className="px-5 py-3 text-slate-600">{row.description || "—"}</td>
                                <td className="px-5 py-3 text-right font-medium text-slate-900">{fmt(Number(row.amount ?? 0))}</td>
                                <td className="px-5 py-3 text-right font-semibold text-amber-800">{fmt(Number(row.amountToCharge ?? row.amount ?? 0))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {pendingChargeable.length > 0 && (
                      <div className={chargeableHistory.length > 0 ? "border-t border-slate-200" : ""}>
                        <div className="px-5 py-2 sm:px-6">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending save</p>
                          <p className="mt-0.5 text-xs text-slate-500">These will be added to the guest’s bill when you click Save expenses.</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/50">
                                <th className="px-5 py-2 font-semibold text-slate-600">Category</th>
                                <th className="px-5 py-2 font-semibold text-slate-600">Description</th>
                                <th className="px-5 py-2 font-semibold text-slate-600 text-right">Cost</th>
                                <th className="px-5 py-2 font-semibold text-amber-700 text-right">Charge to guest</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendingChargeable.map((row, i) => (
                                <tr key={`pending-${i}`} className="border-b border-slate-100 last:border-0">
                                  <td className="px-5 py-2 text-slate-800">{categoryToLabel(row.category ?? "")}</td>
                                  <td className="px-5 py-2 text-slate-600">{row.description || "—"}</td>
                                  <td className="px-5 py-2 text-right font-medium text-slate-800">{fmt(Number(row.amount || 0))}</td>
                                  <td className="px-5 py-2 text-right font-semibold text-amber-700">{fmt(Number(row.amountToCharge || row.amount || 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {hasAnyChargeable && (
                      <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
                        <p className="text-xs text-slate-500">
                          Total chargeable: <span className="font-semibold text-amber-800">{fmt(customerChargesTotal)}</span>
                          {pendingChargeable.length > 0 && " (includes pending until saved)"}
                          {" — "}reflected on the Payments page after save.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <section className="mb-8 grid gap-4 sm:grid-cols-3">
              <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Booking revenue</span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{fmt(revenue)}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Wallet className="h-4 w-4 text-[#5a189a]" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Total expenses</span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{fmt(total)}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Sparkles className="h-4 w-4 text-[#ff8500]" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Net profit</span>
                  </div>
                  <p
                    className={`mt-2 text-xl font-bold sm:text-2xl ${
                      netProfit >= 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {fmt(netProfit)}
                  </p>
                </CardContent>
              </Card>
            </section>

            <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
              <div className="border-b border-slate-200/80 bg-linear-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
                <div className="h-1 w-12 rounded-full bg-[linear-gradient(90deg,#5a189a,#ff9100)]" />
                <h2 className="mt-3 text-base font-semibold text-slate-900">Cost items</h2>
                <p className="mt-0.5 text-sm text-slate-600">Add and edit expense lines for this pool booking.</p>
              </div>
              <CardContent className="space-y-4 p-5 sm:p-6">
                {rows.map((row, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="grid gap-4 sm:grid-cols-12">
                      <div className="sm:col-span-4">
                        <AppReactSelect
                          label="Category"
                          value={row.category}
                          onChange={(v) =>
                            setRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], category: v ?? "" };
                              return next;
                            })
                          }
                          options={categoryOptions}
                          placeholder="Select category…"
                          className="w-full"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Input
                          label="Amount (₵)"
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.amount}
                          onChange={(e) =>
                            setRows((prev) => {
                              const next = [...prev];
                              const newAmount = e.target.value;
                              next[idx] = {
                                ...next[idx],
                                amount: newAmount,
                                ...(next[idx].chargeToCustomer && { amountToCharge: newAmount }),
                              };
                              return next;
                            })
                          }
                          placeholder="0.00"
                          className="rounded-xl border-slate-300 focus-visible:ring-[#5a189a]"
                        />
                      </div>
                      <div className="flex flex-wrap items-end gap-2 sm:col-span-5">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={!!row.chargeToCustomer}
                            onChange={(e) =>
                              setRows((prev) => {
                                const next = [...prev];
                                const checked = e.target.checked;
                                next[idx] = {
                                  ...next[idx],
                                  chargeToCustomer: checked,
                                  amountToCharge: checked ? (next[idx].amountToCharge || next[idx].amount) : "",
                                };
                                return next;
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]"
                          />
                          <span>Charge to guest</span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    {row.chargeToCustomer && (
                      <div className="mt-3">
                        <Input
                          label="Amount to charge guest (₵)"
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.amountToCharge ?? row.amount}
                          onChange={(e) =>
                            setRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], amountToCharge: e.target.value };
                              return next;
                            })
                          }
                          placeholder="Same as cost or enter different amount"
                          className="max-w-xs rounded-xl border-slate-300 focus-visible:ring-[#5a189a]"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Added to guest’s outstanding balance. They pay via Payments page.
                        </p>
                      </div>
                    )}
                    <div className="mt-3">
                      <Textarea
                        label="Description"
                        value={row.description}
                        onChange={(e) =>
                          setRows((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], description: e.target.value };
                            return next;
                          })
                        }
                        rows={2}
                        placeholder="Optional notes…"
                        className="rounded-xl border-slate-300 focus-visible:ring-[#5a189a]"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setRows((prev) => [
                      ...prev,
                      { category: DEFAULT_CATEGORIES[0] ?? "other", description: "", amount: "", chargeToCustomer: false, amountToCharge: "" },
                    ])
                  }
                  className="w-full rounded-xl border-dashed border-slate-300 py-6 text-slate-600 hover:border-[#ff9100] hover:bg-[#ff9100]/5 hover:text-[#ff6d00]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add cost item
                </Button>
              </CardContent>
            </Card>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-200/80 pt-6 sm:flex-row sm:justify-end sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/pool/bookings")}
                className="rounded-xl border-slate-300 text-slate-700 hover:border-[#5a189a]/50 hover:text-[#5a189a] focus-visible:ring-[#5a189a]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                loading={updateMut.isPending}
                className="rounded-xl bg-[linear-gradient(135deg,#ff6d00_0%,#ff9100_100%)] text-white shadow-md shadow-[#ff9100]/25 hover:opacity-95 focus-visible:ring-[#ff8500]"
              >
                Save expenses
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
