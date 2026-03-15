"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEventBooking } from "@/hooks/api";
import { Badge } from "@/components/ui";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Clock,
  Users,
  DollarSign,
  FileText,
  Wallet,
  Receipt,
  Pencil,
  LayoutGrid,
  Sparkles,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { EVENT_BOOKING_STATUS, EVENT_TYPE } from "@/constants";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 0,
  }).format(n);

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(EVENT_BOOKING_STATUS).map(([k, v]) => [
    v,
    k.replace(/([A-Z])/g, " $1").trim(),
  ])
);
const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(EVENT_TYPE).map(([k, v]) => [
    v,
    k.replace(/([A-Z])/g, " $1").trim(),
  ])
);

const STATUS_BADGE_VARIANT: Record<
  string,
  "outline" | "default" | "info" | "warning" | "success" | "danger"
> = {
  inquiry: "outline",
  quoted: "default",
  confirmed: "info",
  depositPaid: "warning",
  ongoing: "success",
  completed: "success",
  cancelled: "danger",
};

type Booking = {
  _id: string;
  bookingReference?: string;
  title?: string;
  description?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  eventType?: string;
  eventHallId?: { _id?: string; name?: string };
  selectedLayoutName?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  expectedAttendees?: number;
  status?: string;
  quotedPrice?: number;
  agreedPrice?: number;
  totalRevenue?: number;
  depositPaid?: number;
  finalSettlementPaid?: number;
  outstandingAmount?: number;
  totalExpenses?: number;
  netProfit?: number;
  specialRequests?: string;
  pricingOverrideReason?: string;
  createdAt?: string;
};

function formatDateTime(s: string | Date | null | undefined): string {
  if (!s) return "—";
  try {
    const d = typeof s === "string" ? new Date(s) : s;
    return format(d, "EEE, MMM d, yyyy · HH:mm");
  } catch {
    return "—";
  }
}

export default function EventBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data, isLoading } = useEventBooking(id);
  const b = data?.data as Booking | undefined;

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-slate-50/50 font-sans antialiased"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-12 w-64 animate-pulse rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
              />
            ))}
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]" />
            <div className="h-72 animate-pulse rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!b) {
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-slate-50/50 px-4 font-sans"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <p className="text-lg font-semibold text-slate-800">Booking not found.</p>
          <Link
            href="/event-bookings"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5a189a] to-[#7b2cbf] px-5 py-2.5 font-semibold text-white shadow-lg transition hover:opacity-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event Bookings
          </Link>
        </div>
      </div>
    );
  }

  const totalRevenue = Number(b.totalRevenue ?? b.agreedPrice ?? b.quotedPrice ?? 0);
  const depositPaid = Number(b.depositPaid ?? 0);
  const finalSettlementPaid = Number(b.finalSettlementPaid ?? 0);
  const outstanding = Number(b.outstandingAmount ?? 0);
  const totalExpenses = Number(b.totalExpenses ?? 0);
  const netProfit = Number(b.netProfit ?? 0);
  const paid = depositPaid + finalSettlementPaid;
  const hallName = (b.eventHallId as { name?: string })?.name ?? "—";

  return (
    <div
      className="min-h-screen bg-slate-50/50 font-sans text-slate-900 antialiased"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Hero: gradient strip + back + title + actions */}
      <header className="relative overflow-hidden border-b border-slate-200/80 bg-white">
        <div className="absolute inset-0 max-w-2xl bg-gradient-to-br from-[#ff6d00]/5 via-transparent to-[#5a189a]/5" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#5a189a]" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Link
            href="/event-bookings"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#5a189a]"
            aria-label="Back to event bookings"
          >
            <ArrowLeft className="h-4 w-4" />
            Event Bookings
          </Link>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#5a189a]">
                {b.bookingReference ?? "—"}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                {b.title ?? b.clientName ?? "Event booking"}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {EVENT_TYPE_LABELS[b.eventType ?? ""] ?? b.eventType ?? "—"}
                </span>
                {b.startDate && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                    <CalendarDays className="h-4 w-4" />
                    {format(new Date(b.startDate), "MMM d, yyyy")}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <Badge
                  variant={STATUS_BADGE_VARIANT[b.status ?? ""] ?? "default"}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                >
                  {STATUS_LABELS[b.status ?? ""] ?? b.status ?? "—"}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link
                href={`/event-bookings/${id}/beo`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#5a189a]/40 hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
              >
                <FileText className="h-4 w-4" />
                BEO
              </Link>
              <Link
                href={`/event-bookings/${id}/payments`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff6d00]/25 transition hover:scale-[1.02] hover:shadow-xl"
              >
                <Wallet className="h-4 w-4" />
                Payments
              </Link>
              <Link
                href={`/event-bookings/${id}/expenses`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#5a189a]/40 hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
              >
                <Receipt className="h-4 w-4" />
                Expenses
              </Link>
              <Link
                href={`/event-bookings?edit=${id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#5a189a]/40 hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Metrics: colorful cards */}
        <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quoted</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
              {b.quotedPrice != null ? fmt(b.quotedPrice) : "—"}
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Revenue</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff8500]/15 text-[#ff6d00]">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
              {totalRevenue > 0 ? fmt(totalRevenue) : "—"}
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Paid</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold text-emerald-700 sm:text-2xl">{fmt(paid)}</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Outstanding</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold text-amber-700 sm:text-2xl">{fmt(outstanding)}</p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Client card */}
          <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-[#ff6d00]/10 to-[#ff9e00]/5 px-5 py-4 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/20">
                <User className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Client</h2>
            </div>
            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Name</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{b.clientName ?? "—"}</p>
              </div>
              {b.clientEmail && (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5a189a]/10 text-[#5a189a]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <a
                    href={`mailto:${b.clientEmail}`}
                    className="text-sm font-medium text-[#5a189a] hover:underline"
                  >
                    {b.clientEmail}
                  </a>
                </div>
              )}
              {b.clientPhone && (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5a189a]/10 text-[#5a189a]">
                    <Phone className="h-4 w-4" />
                  </span>
                  <a href={`tel:${b.clientPhone}`} className="text-sm font-medium text-slate-800">
                    {b.clientPhone}
                  </a>
                </div>
              )}
            </div>
          </article>

          {/* Venue & schedule card */}
          <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-[#5a189a]/10 to-[#9d4edd]/5 px-5 py-4 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a189a] to-[#7b2cbf] text-white shadow-lg shadow-[#5a189a]/20">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Venue & schedule</h2>
            </div>
            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hall</p>
                <p className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Building2 className="h-4 w-4 text-[#5a189a]" />
                  {hallName}
                </p>
              </div>
              {b.selectedLayoutName && (
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-[#7b2cbf]" />
                  <span className="text-sm font-medium text-slate-700">Layout: {b.selectedLayoutName}</span>
                </div>
              )}
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-[#5a189a]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Start</p>
                  <p className="mt-0.5 font-medium text-slate-900">{formatDateTime(b.startDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#5a189a]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">End</p>
                  <p className="mt-0.5 font-medium text-slate-900">{formatDateTime(b.endDate)}</p>
                </div>
              </div>
              {b.expectedAttendees != null && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#7b2cbf]" />
                  <span className="text-sm font-medium text-slate-700">{b.expectedAttendees} attendees</span>
                </div>
              )}
              {b.description && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm leading-relaxed text-slate-600">{b.description}</p>
                </div>
              )}
            </div>
          </article>
        </div>

        {/* Financial summary: full width, colorful */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-[#5a189a]/10 via-[#7b2cbf]/5 to-[#9d4edd]/5 px-5 py-4 sm:px-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a189a] to-[#9d4edd] text-white shadow-lg shadow-[#5a189a]/20">
              <DollarSign className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Financial summary</h2>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quoted</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {b.quotedPrice != null ? fmt(b.quotedPrice) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Revenue</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {totalRevenue > 0 ? fmt(totalRevenue) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Paid</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">{fmt(paid)}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Outstanding</p>
                <p className="mt-1 text-lg font-bold text-amber-700">{fmt(outstanding)}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-6 border-t border-slate-100 pt-6">
              <div>
                <p className="text-xs font-medium text-slate-500">Total expenses</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">{fmt(totalExpenses)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Net profit</p>
                <p
                  className={`mt-0.5 text-lg font-bold ${
                    netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {fmt(netProfit)}
                </p>
              </div>
            </div>
            {b.pricingOverrideReason && (
              <p className="mt-4 rounded-lg bg-slate-50 px-4 py-2 text-xs text-slate-600">
                <span className="font-semibold">Override reason:</span> {b.pricingOverrideReason}
              </p>
            )}
          </div>
        </section>

        {/* Special requests */}
        {b.specialRequests && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-[#9d4edd]/10 to-[#5a189a]/5 px-5 py-4 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#9d4edd] text-white shadow-lg shadow-[#9d4edd]/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Special requests</h2>
            </div>
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {b.specialRequests}
              </p>
            </div>
          </section>
        )}

        {/* Back CTA */}
        <div className="mt-10">
          <Link
            href="/event-bookings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#5a189a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all bookings
          </Link>
        </div>
      </main>
    </div>
  );
}
