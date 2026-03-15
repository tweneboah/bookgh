"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  usePlaygroundBooking,
  useUpdatePlaygroundBooking,
} from "@/hooks/api";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Receipt,
  Plus,
  Trash2,
  Wallet,
  Gamepad2,
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
  "maintenance",
  "supplies",
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

function buildCategoryOptions(
  rows: ExpenseRow[]
): { value: string; label: string }[] {
  const known = new Set(BASE_CATEGORY_OPTIONS.map((o) => o.value));
  const extra = rows
    .map((r) => r.category?.trim())
    .filter((c): c is string => !!c && !known.has(c));
  const uniqueExtra = [...new Set(extra)];
  return [
    ...BASE_CATEGORY_OPTIONS,
    ...uniqueExtra.map((value) => ({
      value,
      label: value.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim(),
    })),
  ];
}

export default function PlaygroundBookingExpensesPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params?.id ?? "";

  const { data, isLoading, refetch: refetchBooking } = usePlaygroundBooking(bookingId);
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

  const updateMut = useUpdatePlaygroundBooking();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const rowsRef = useRef<ExpenseRow[]>(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (!booking) return;
    const existing = Array.isArray(booking.expenseLineItems)
      ? booking.expenseLineItems.map((row) => ({
          category: row.category ?? "",
          description: row.description ?? "",
          amount: row.amount != null ? String(row.amount) : "",
          chargeToCustomer: !!(
            row.chargeToCustomer ||
            (row.amountToCharge != null && row.amountToCharge > 0)
          ),
          amountToCharge:
            row.amountToCharge != null
              ? String(row.amountToCharge)
              : row.amount != null
                ? String(row.amount)
                : "",
        }))
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

  const handleSave = async () => {
    if (!bookingId) return;
    const currentRows = rowsRef.current;
    const filtered = currentRows.filter(
      (row) =>
        String(row.category ?? "").trim() &&
        row.amount !== "" &&
        row.amount != null &&
        Number(row.amount) >= 0
    );
    const totalToSend = currentRows.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );
    const payload = {
      expenseLineItems: filtered.map((row) => ({
        category: String(row.category ?? "").trim(),
        description: String(row.description ?? "").trim() || undefined,
        amount: Number(row.amount),
        ...(row.chargeToCustomer && {
          chargeToCustomer: true,
          amountToCharge:
            Number(row.amountToCharge || row.amount) || Number(row.amount),
        }),
      })),
      totalExpenses: totalToSend,
    };
    if (filtered.length === 0) {
      const hasAnyAmount = currentRows.some(
        (r) => r.amount !== "" && r.amount != null
      );
      toast.error(
        hasAnyAmount
          ? "Select a category for each cost item you want to save."
          : "Add at least one cost item (category and amount) before saving."
      );
      return;
    }
    try {
      await updateMut.mutateAsync({ id: bookingId, ...payload });
      await refetchBooking();
      toast.success("Playground booking expenses updated");
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, "Failed to save expenses. Please try again.")
      );
    }
  };

  const categoryOptions = buildCategoryOptions(rows);

  return (
    <div
      className="min-h-screen bg-white font-sans"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <header className="relative overflow-hidden border-b border-slate-200/80 bg-white">
        <div
          className="absolute left-0 top-0 h-full w-1 bg-[linear-gradient(180deg,#ff6d00_0%,#ff9e00_100%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/playground/bookings"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#5a189a]/30 hover:bg-slate-50 hover:text-[#5a189a]"
                aria-label="Back to playground bookings"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Receipt className="h-5 w-5 text-[#ff8500]" aria-hidden />
                  <span className="text-sm font-medium">
                    Playground booking costs
                  </span>
                </div>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Playground Booking Expenses
                </h1>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  {booking?.bookingReference && (
                    <span className="font-medium text-slate-700">
                      {booking.bookingReference}
                    </span>
                  )}{" "}
                  — Track costs and optionally charge to guest.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/playground/bookings/${bookingId}/payments`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#5a189a]/30 hover:bg-slate-50 hover:text-[#5a189a]"
              >
                <Wallet className="h-4 w-4" />
                Payments
              </Link>
              <Link
                href={`/playground/bookings/${bookingId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#5a189a]/30 hover:bg-slate-50 hover:text-[#5a189a]"
              >
                <Gamepad2 className="h-4 w-4" />
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
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {customerChargesTotal > 0 && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="font-medium text-amber-900">
                  Guest charges: {fmt(customerChargesTotal)}
                </p>
                <p className="mt-0.5 text-sm text-amber-800">
                  This amount is added to the guest’s balance. Collect via the
                  Payments page.
                </p>
              </div>
            )}

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total expenses
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {fmt(total)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Charged to guest
                  </p>
                  <p className="mt-1 text-xl font-bold text-amber-600">
                    {fmt(customerChargesTotal)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Cost items
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRows((r) => [
                        ...r,
                        {
                          category: "other",
                          description: "",
                          amount: "",
                          chargeToCustomer: false,
                          amountToCharge: "",
                        },
                      ])
                    }
                    className="border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/5"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add row
                  </Button>
                </div>
                <div className="space-y-4">
                  {rows.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                    >
                      <div className="min-w-[120px] flex-1">
                        <AppReactSelect
                          placeholder="Category"
                          value={row.category}
                          onChange={(v) =>
                            setRows((r) =>
                              r.map((item, i) =>
                                i === idx ? { ...item, category: v ?? "" } : item
                              )
                            )
                          }
                          options={categoryOptions}
                        />
                      </div>
                      <Input
                        placeholder="Description"
                        value={row.description}
                        onChange={(e) =>
                          setRows((r) =>
                            r.map((item, i) =>
                              i === idx
                                ? { ...item, description: e.target.value }
                                : item
                            )
                          )
                        }
                        className="min-w-[120px] flex-1"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        value={row.amount}
                        onChange={(e) =>
                          setRows((r) =>
                            r.map((item, i) =>
                              i === idx ? { ...item, amount: e.target.value } : item
                            )
                          )
                        }
                        className="w-24"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!row.chargeToCustomer}
                          onChange={(e) =>
                            setRows((r) =>
                              r.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      chargeToCustomer: e.target.checked,
                                      amountToCharge: e.target.checked
                                        ? item.amountToCharge || item.amount
                                        : "",
                                    }
                                  : item
                              )
                            )
                          }
                          className="rounded border-slate-300"
                        />
                        Charge guest
                      </label>
                      {row.chargeToCustomer && (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Charge"
                          value={row.amountToCharge ?? ""}
                          onChange={(e) =>
                            setRows((r) =>
                              r.map((item, i) =>
                                i === idx
                                  ? { ...item, amountToCharge: e.target.value }
                                  : item
                              )
                            )
                          }
                          className="w-24"
                        />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setRows((r) => r.filter((_, i) => i !== idx))
                        }
                        className="border-slate-300 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleSave}
                    loading={updateMut.isPending}
                    className="bg-[linear-gradient(135deg,#ff6d00_0%,#ff8500_100%)] font-semibold text-white shadow-md hover:opacity-95"
                  >
                    Save expenses
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
