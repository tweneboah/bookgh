"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  usePoolBooking,
  usePoolBookingPayments,
  useCreatePoolBookingPayment,
} from "@/hooks/api";
import { Button, Input } from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { ArrowLeft, Wallet, Plus, Receipt, RefreshCw, ReceiptText } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { PAYMENT_METHOD } from "@/constants";
import { getApiErrorMessage } from "@/lib/api-client";

const fmt = (n: number) =>
  `₵${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD).map(([k, v]) => ({
  value: v,
  label: k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim(),
}));

type PaymentRow = {
  _id: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  notes?: string;
  processedBy?: { name?: string; email?: string };
  createdAt: string;
};

export default function PoolBookingPaymentsPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params?.id ?? "";

  const { data: bookingData, isLoading: bookingLoading, refetch: refetchBooking } = usePoolBooking(bookingId);
  const { data: paymentsData, isLoading: paymentsLoading } = usePoolBookingPayments(bookingId);
  const createMut = useCreatePoolBookingPayment(bookingId);

  useEffect(() => {
    if (bookingId) refetchBooking();
  }, [bookingId, refetchBooking]);

  type BookingShape = {
    bookingReference?: string;
    guestName?: string;
    amount?: number;
    paidAmount?: number;
    customerChargesTotal?: number;
    expenseLineItems?: Array<{
      chargeToCustomer?: boolean | string;
      amountToCharge?: number;
      amount?: number;
    }>;
  };
  const raw = bookingData as { data?: BookingShape } | BookingShape | null | undefined;
  const booking: BookingShape | undefined =
    raw && typeof raw === "object" && "data" in raw && raw.data != null
      ? (raw.data as BookingShape)
      : (raw as BookingShape);

  const payments = (paymentsData?.data ?? []) as PaymentRow[];

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.CASH);
  const [notes, setNotes] = useState("");

  const isChargeable = (row: { chargeToCustomer?: boolean | string; amountToCharge?: number }) =>
    row.chargeToCustomer === true ||
    row.chargeToCustomer === "true" ||
    (row.amountToCharge != null && Number(row.amountToCharge) > 0);
  const chargeableLineItems = Array.isArray(booking?.expenseLineItems)
    ? booking.expenseLineItems.filter(isChargeable)
    : [];
  const derivedCustomerCharges = chargeableLineItems.reduce(
    (sum, row) => sum + Number((row as any).amountToCharge ?? (row as any).amount ?? 0),
    0
  );
  const storedCustomerCharges = Number(booking?.customerChargesTotal ?? 0);
  const customerChargesTotal = Math.max(storedCustomerCharges, derivedCustomerCharges);

  const totalAmountDue = Number(booking?.amount ?? 0) + customerChargesTotal;
  const paidAmount = Number(booking?.paidAmount ?? 0);
  const outstanding = Math.max(0, totalAmountDue - paidAmount);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!bookingId || !Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    try {
      await createMut.mutateAsync({
        amount: num,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      toast.success("Payment recorded");
      setAmount("");
      setNotes("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to record payment."));
    }
  };

  const isLoading = bookingLoading;
  const paymentMethodLabel = (method: string) =>
    PAYMENT_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method;

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
                  <Wallet className="h-5 w-5 text-[#ff8500]" aria-hidden />
                  <span className="text-sm font-medium">Payment history</span>
                </div>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Record payments
                </h1>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  {booking?.bookingReference && (
                    <span className="font-medium text-slate-700">{booking.bookingReference}</span>
                  )}{" "}
                  {booking?.guestName ?? "Pool booking"} — record payments here.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetchBooking()}
                className="rounded-xl border-slate-200 font-medium"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Link
                href={`/pool/bookings/${bookingId}/expenses`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#5a189a]/30 hover:bg-slate-50 hover:text-[#5a189a]"
              >
                <ReceiptText className="h-4 w-4" />
                Expenses
              </Link>
              <Link
                href={`/pool/bookings/${bookingId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#5a189a]/30 hover:bg-slate-50 hover:text-[#5a189a]"
              >
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {customerChargesTotal > 0 && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
                <p className="text-sm font-semibold text-amber-900">Charges to guest (expenses to pay)</p>
                <p className="mt-0.5 text-xs text-amber-800">
                  These amounts are added to the guest’s bill (e.g. damage, extra cleaning). Total: {fmt(customerChargesTotal)} — record a payment below to collect.
                </p>
                {chargeableLineItems.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {chargeableLineItems.map((row, i) => (
                      <li key={i} className="flex items-center justify-between text-sm text-amber-900">
                        <span>Charge</span>
                        <span className="font-medium">{fmt(Number((row as any).amountToCharge ?? (row as any).amount ?? 0))}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Link
                  href={`/pool/bookings/${bookingId}/expenses`}
                  className="mt-2 inline-block text-xs font-medium text-[#5a189a] hover:underline"
                >
                  Edit expenses →
                </Link>
              </div>
            )}

            {/* Summary */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total to pay
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">{fmt(totalAmountDue)}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Booking: {fmt(Number(booking?.amount ?? 0))}
                  {customerChargesTotal > 0 ? ` + charges: ${fmt(customerChargesTotal)}` : ""}
                </p>
                {customerChargesTotal === 0 && (
                  <Link
                    href={`/pool/bookings/${bookingId}/expenses`}
                    className="mt-1 inline-block text-xs font-medium text-[#5a189a] hover:underline"
                  >
                    Add guest charges (e.g. damage) →
                  </Link>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Paid
                </p>
                <p className="mt-1 text-xl font-bold text-emerald-700">{fmt(paidAmount)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Outstanding
                </p>
                <p className="mt-1 text-xl font-bold text-amber-600">{fmt(outstanding)}</p>
                {customerChargesTotal > 0 && outstanding > 0 && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Includes booking balance + {fmt(customerChargesTotal)} charges.
                  </p>
                )}
              </div>
            </div>

            {/* Record payment */}
            <section className="mb-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#ff6d00_0%,#ff9e00_100%)] text-white">
                  <Plus className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                  Record payment
                </h2>
              </div>
              {outstanding > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-600">
                    Outstanding is {fmt(outstanding)}
                    {customerChargesTotal > 0 ? ` (booking balance + ${fmt(customerChargesTotal)} charges)` : ""}. Enter the amount the guest is paying.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(String(outstanding))}
                    className="rounded-lg border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  >
                    Use full outstanding ({fmt(outstanding)})
                  </Button>
                </div>
              )}
              <form onSubmit={handleRecordPayment} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Input
                  label="Amount (₵)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={outstanding > 0 ? `e.g. ${outstanding}` : "0.00"}
                  required
                />
                <AppReactSelect
                  label="Method"
                  value={paymentMethod}
                  onChange={(v) => setPaymentMethod((v as string) ?? PAYMENT_METHOD.CASH)}
                  options={PAYMENT_METHOD_OPTIONS}
                />
                <div className="sm:col-span-2 lg:col-span-1">
                  <Input
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                  <Button
                    type="submit"
                    loading={createMut.isPending}
                    className="w-full rounded-xl bg-[linear-gradient(135deg,#ff6d00_0%,#ff8500_100%)] font-semibold text-white shadow-md hover:opacity-95"
                  >
                    Record payment
                  </Button>
                </div>
              </form>
            </section>

            {/* Payment history */}
            <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
                <Receipt className="h-5 w-5 text-[#5a189a]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                  Payment history
                </h2>
              </div>
              {paymentsLoading ? (
                <div className="flex min-h-[120px] items-center justify-center p-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#5a189a]" />
                </div>
              ) : payments.length === 0 ? (
                <div className="flex min-h-[120px] flex-col items-center justify-center p-8 text-center">
                  <Wallet className="h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-600">No payments recorded yet</p>
                  <p className="text-xs text-slate-500">Record a payment above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Method</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr
                          key={p._id}
                          className="border-b border-slate-50 transition hover:bg-slate-50/50"
                        >
                          <td className="px-4 py-3 text-slate-600">
                            {p.paidAt
                              ? format(new Date(p.paidAt), "MMM d, yyyy HH:mm")
                              : format(new Date(p.createdAt), "MMM d, yyyy HH:mm")}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {fmt(Number(p.amount))}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {paymentMethodLabel(p.paymentMethod)}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
