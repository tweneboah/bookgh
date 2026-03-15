"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { usePoolBooking } from "@/hooks/api";
import { Badge } from "@/components/ui";
import {
  ArrowLeft,
  Droplets,
  User,
  Mail,
  Phone,
  Clock,
  Users,
  DollarSign,
  Wallet,
  Pencil,
  Calendar,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { POOL_BOOKING_STATUS } from "@/constants";

const fmt = (n: number) =>
  `₵${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(POOL_BOOKING_STATUS).map(([k, v]) => [
    v,
    k.replace(/([A-Z])/g, " $1").trim(),
  ])
);

const STATUS_BADGE_VARIANT: Record<
  string,
  "outline" | "default" | "info" | "warning" | "success" | "danger"
> = {
  pending: "warning",
  confirmed: "info",
  checkedIn: "success",
  completed: "default",
  cancelled: "danger",
  noShow: "default",
};

type Booking = {
  _id: string;
  bookingReference?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  poolAreaId?: { _id?: string; name?: string; type?: string };
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  numberOfGuests?: number;
  sessionType?: string;
  status?: string;
  amount?: number;
  paidAmount?: number;
  customerChargesTotal?: number;
  addOns?: Array<{ name: string; quantity: number; unitPrice: number }>;
  notes?: string;
  createdAt?: string;
};

export default function PoolBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data, isLoading } = usePoolBooking(id);
  const b = data?.data as Booking | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="h-10 w-56 animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!b) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-white px-4 font-sans">
        <p className="font-medium text-[#5a189a]">Booking not found.</p>
        <Link
          href="/pool/bookings"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#5a189a] shadow-sm hover:border-[#9d4edd] hover:bg-[#5a189a]/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pool Bookings
        </Link>
      </div>
    );
  }

  const amount = Number(b.amount ?? 0);
  const paidAmount = Number(b.paidAmount ?? 0);
  const customerCharges = Number(b.customerChargesTotal ?? 0);
  const totalDue = amount + customerCharges;
  const outstanding = Math.max(0, totalDue - paidAmount);

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="border-b border-slate-200/80 bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <Link
                href="/pool/bookings"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#5a189a] transition hover:border-[#9d4edd] hover:bg-[#5a189a]/5"
                aria-label="Back to pool bookings"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <p className="font-mono text-xs font-medium text-[#7b2cbf]">
                  {b.bookingReference ?? "—"}
                </p>
                <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {b.guestName ?? "Pool booking"}
                </h1>
                <p className="mt-1 text-sm text-[#5a189a]/90">
                  {b.poolAreaId?.name ?? "—"} ·{" "}
                  {b.bookingDate
                    ? format(new Date(b.bookingDate), "MMM d, yyyy")
                    : "—"}
                </p>
                <div className="mt-3">
                  <Badge
                    variant={STATUS_BADGE_VARIANT[b.status ?? ""] ?? "default"}
                    className="text-xs"
                  >
                    {STATUS_LABELS[b.status ?? ""] ?? b.status ?? "—"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link
                href={`/pool/bookings/${id}/payments`}
                className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ff6d00_0%,#ff9100_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
              >
                <Wallet className="h-4 w-4" />
                Payments
              </Link>
              <Link
                href={`/pool/bookings/${id}/expenses`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#5a189a] shadow-sm transition hover:border-[#9d4edd] hover:bg-[#5a189a]/5"
              >
                <Receipt className="h-4 w-4" />
                Expenses
              </Link>
              <Link
                href="/pool/bookings"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#5a189a] shadow-sm transition hover:border-[#9d4edd] hover:bg-[#5a189a]/5"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7b2cbf]">
              Total to pay
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
              {fmt(totalDue)}
            </p>
            {customerCharges > 0 && (
              <p className="mt-0.5 text-xs text-slate-500">
                Booking {fmt(amount)} + charges {fmt(customerCharges)}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Paid
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-600 sm:text-xl">
              {fmt(paidAmount)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Outstanding
            </p>
            <p className="mt-1 text-lg font-bold text-amber-600 sm:text-xl">
              {fmt(outstanding)}
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ff8500_0%,#ff9e00_100%)] text-white">
                <User className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Guest</h2>
            </div>
            <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Name</p>
                <p className="mt-1 font-semibold text-slate-900">{b.guestName ?? "—"}</p>
              </div>
              {b.guestEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#7b2cbf]" />
                  <a
                    href={`mailto:${b.guestEmail}`}
                    className="text-sm font-medium text-[#5a189a] hover:underline"
                  >
                    {b.guestEmail}
                  </a>
                </div>
              )}
              {b.guestPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#7b2cbf]" />
                  <a
                    href={`tel:${b.guestPhone}`}
                    className="text-sm font-medium text-slate-900"
                  >
                    {b.guestPhone}
                  </a>
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5a189a] text-white">
                <Droplets className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Pool & schedule</h2>
            </div>
            <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Pool area
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {(b.poolAreaId as { name?: string })?.name ?? "—"}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#7b2cbf]" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Date</p>
                  <p className="font-medium text-slate-900">
                    {b.bookingDate
                      ? format(new Date(b.bookingDate), "EEE, MMM d, yyyy")
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#7b2cbf]" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Time</p>
                  <p className="font-medium text-slate-900">
                    {b.startTime && b.endTime ? `${b.startTime} – ${b.endTime}` : "—"}
                  </p>
                </div>
              </div>
              {b.numberOfGuests != null && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#7b2cbf]" />
                  <span className="text-sm font-medium text-slate-900">
                    {b.numberOfGuests} guest{b.numberOfGuests !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {b.sessionType && (
                <p className="text-sm text-slate-600">Session: {b.sessionType}</p>
              )}
            </div>
          </article>
        </div>

        {/* Financial summary */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7b2cbf] text-white">
              <DollarSign className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Financial summary</h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total to pay
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">{fmt(totalDue)}</p>
                {customerCharges > 0 && (
                  <p className="mt-0.5 text-xs text-slate-500">Booking {fmt(amount)} + charges {fmt(customerCharges)}</p>
                )}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Paid
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-600">{fmt(paidAmount)}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Outstanding
                </p>
                <p className="mt-1 text-lg font-bold text-amber-600">{fmt(outstanding)}</p>
              </div>
            </div>
            {Array.isArray(b.addOns) && b.addOns.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Add-ons
                </p>
                <ul className="mt-2 space-y-1">
                  {b.addOns.map((a, i) => (
                    <li key={i} className="flex justify-between text-sm text-slate-700">
                      <span>{a.name} × {a.quantity}</span>
                      <span>{fmt(a.quantity * a.unitPrice)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {b.notes && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{b.notes}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
