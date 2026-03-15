"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { AppDatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { useConferenceReports, useEventHalls, useEventBookings } from "@/hooks/api";
import {
  Building2,
  PartyPopper,
  Package,
  BarChart3,
  CreditCard,
  Receipt,
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CalendarRange,
  ArrowRight,
  FileText,
  Calendar,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 0 }).format(n);

type QuickLinkAccent = "orange" | "purple" | "violet" | "fuchsia" | "amber";

const quickLinkAccents: QuickLinkAccent[] = [
  "orange",
  "purple",
  "violet",
  "fuchsia",
  "amber",
  "orange",
  "purple",
  "violet",
  "fuchsia",
];

const quickLinks: { href: string; label: string; icon: typeof Building2 }[] = [
  { href: "/event-halls", label: "Event Halls", icon: Building2 },
  { href: "/event-bookings", label: "Event Bookings", icon: PartyPopper },
  { href: "/event-bookings/calendar", label: "Event Calendar", icon: Calendar },
  { href: "/event-bookings/pipeline", label: "Proposals pipeline", icon: FileText },
  { href: "/event-resources", label: "Resources", icon: Package },
  { href: "/reports/conference", label: "Financial Reporting", icon: BarChart3 },
  { href: "/payments?department=conference", label: "Payments", icon: CreditCard },
  { href: "/expenses?department=conference", label: "Expenses", icon: Receipt },
  { href: "/conference/accounting", label: "Income & Expenses Accounting", icon: PieChart },
];

const accentCardStyles: Record<QuickLinkAccent, string> = {
  orange:
    "border-[#ff9100]/35 hover:border-[#ff6d00]/60 bg-gradient-to-br from-white to-[#ff9e00]/8 hover:to-[#ff6d00]/12 shadow-sm hover:shadow-[0_4px_16px_rgba(255,109,0,0.12)]",
  purple:
    "border-[#5a189a]/35 hover:border-[#5a189a]/60 bg-gradient-to-br from-white to-[#5a189a]/8 hover:to-[#5a189a]/12 shadow-sm hover:shadow-[0_4px_16px_rgba(90,24,154,0.12)]",
  violet:
    "border-[#7b2cbf]/35 hover:border-[#7b2cbf]/60 bg-gradient-to-br from-white to-[#7b2cbf]/8 hover:to-[#7b2cbf]/12 shadow-sm hover:shadow-[0_4px_16px_rgba(123,44,191,0.12)]",
  fuchsia:
    "border-[#9d4edd]/35 hover:border-[#9d4edd]/60 bg-gradient-to-br from-white to-[#9d4edd]/8 hover:to-[#9d4edd]/12 shadow-sm hover:shadow-[0_4px_16px_rgba(157,78,221,0.12)]",
  amber:
    "border-[#ff8500]/35 hover:border-[#ff7900]/60 bg-gradient-to-br from-white to-[#ff8500]/8 hover:to-[#ff6d00]/12 shadow-sm hover:shadow-[0_4px_16px_rgba(255,133,0,0.12)]",
};

const accentIconStyles: Record<QuickLinkAccent, { bg: string; text: string }> = {
  orange: { bg: "bg-[#ff6d00]/15", text: "text-[#ff6d00]" },
  purple: { bg: "bg-[#5a189a]/15", text: "text-[#5a189a]" },
  violet: { bg: "bg-[#7b2cbf]/15", text: "text-[#7b2cbf]" },
  fuchsia: { bg: "bg-[#9d4edd]/15", text: "text-[#9d4edd]" },
  amber: { bg: "bg-[#ff8500]/15", text: "text-[#ff8500]" },
};

const periodOptions = [
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
];

function getRange(period: string, baseDate: Date) {
  const now = baseDate;
  if (period === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { startDate: monthStart.toISOString(), endDate: monthEnd.toISOString() };
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function getUpcomingRange(days = 7) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export default function ConferenceOverviewPage() {
  const [period, setPeriod] = useState("month");
  const [referenceDate, setReferenceDate] = useState<Date | null>(new Date());
  const range = useMemo(
    () => getRange(period, referenceDate ?? new Date()),
    [period, referenceDate]
  );
  const todayRange = useMemo(() => getTodayRange(), []);
  const upcomingRange = useMemo(() => getUpcomingRange(7), []);

  const params = useMemo(
    () => ({ startDate: range.startDate, endDate: range.endDate }),
    [range.startDate, range.endDate]
  );
  const { data: reportData } = useConferenceReports(params);
  const { data: hallsData } = useEventHalls({ limit: "100" });
  const { data: bookingsData } = useEventBookings({ limit: "1" });
  const { data: todayData } = useEventBookings({
    limit: "50",
    startDate: todayRange.startDate,
    endDate: todayRange.endDate,
  });
  const { data: upcomingData } = useEventBookings({
    limit: "50",
    startDate: upcomingRange.startDate,
    endDate: upcomingRange.endDate,
  });

  const report = reportData?.data;
  const dept = report?.departmentReports;
  const hallCount = hallsData?.data?.length ?? 0;
  const bookingTotal = bookingsData?.meta?.pagination?.total ?? 0;
  const todayEvents = (todayData?.data ?? []).filter((b: { status?: string }) => b.status !== "cancelled");
  const upcomingEvents = (upcomingData?.data ?? [])
    .filter((b: { status?: string }) => b.status !== "cancelled")
    .sort(
      (a: { startDate: string }, b: { startDate: string }) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )
    .slice(0, 10);

  return (
    <div
      className="min-h-0 bg-white font-sans text-slate-900 antialiased"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header: white, gradient accent */}
      <header className="relative border-b border-slate-100 bg-white">
        <div
          className="absolute bottom-0 left-0 h-1 w-full min-w-[200px] max-w-xl rounded-r-full bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-[#5a189a]">
                Department
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Conference & Events
              </h1>
              <p className="mt-2 max-w-xl text-base font-medium text-slate-500 sm:text-lg">
                Event halls, bookings, resources, and financials in one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="w-full min-w-0 sm:w-[160px]">
                <AppReactSelect
                  label="Period"
                  value={period}
                  onChange={setPeriod}
                  options={periodOptions}
                  placeholder="Period"
                />
              </div>
              <div className="w-full min-w-0 sm:w-[180px]">
                <AppDatePicker
                  label="Reference date"
                  selected={referenceDate}
                  onChange={setReferenceDate}
                  placeholder="Select date"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Bento KPIs */}
        <section className="mb-10 sm:mb-12">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#ff6d00] via-[#ff8500] to-[#ff9e00] p-6 shadow-[0_8px_30px_rgba(255,109,0,0.25)] transition-shadow hover:shadow-[0_12px_40px_rgba(255,109,0,0.3)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-white/90">
                    Event revenue
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                    {fmt(dept?.totalEventRevenue ?? 0)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                  <TrendingUp className="h-5 w-5 text-white" aria-hidden />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all hover:border-slate-300/80 hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Event expenses
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                    {fmt(dept?.totalEventExpenses ?? 0)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <TrendingDown className="h-4 w-4" aria-hidden />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all hover:border-slate-300/80 hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Net profit
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                    {fmt(dept?.netDepartmentProfit ?? 0)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <DollarSign className="h-4 w-4" aria-hidden />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all hover:border-[#5a189a]/30 hover:shadow-[0_8px_28px_rgba(90,24,154,0.08)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Halls · Bookings
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                    {hallCount} · {bookingTotal}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5a189a]/10 text-[#5a189a]">
                  <CalendarRange className="h-4 w-4" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Today & Upcoming — two-column cards */}
        <section className="mb-10 grid gap-6 lg:grid-cols-2 sm:mb-12">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6d00]/15 to-[#ff9e00]/15 text-[#ff6d00]">
                <Calendar className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Today&apos;s events</h2>
                <p className="text-xs font-medium text-slate-500">Live overview</p>
              </div>
            </div>
            <div className="p-5">
              {todayEvents.length === 0 ? (
                <p className="py-6 text-center text-sm font-medium text-slate-500">
                  No events scheduled for today.
                </p>
              ) : (
                <ul className="space-y-3">
                  {todayEvents.slice(0, 5).map(
                    (b: {
                      _id: string;
                      title?: string;
                      bookingReference?: string;
                      eventHallId?: { name?: string };
                      clientName?: string;
                      status?: string;
                    }) => (
                      <li
                        key={b._id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:bg-slate-50 hover:border-slate-200/80"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/event-bookings?edit=${b._id}`}
                            className="block truncate font-medium text-slate-900 hover:text-[#5a189a] hover:underline"
                          >
                            {b.title ?? b.bookingReference}
                          </Link>
                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            {b.eventHallId?.name} · {b.clientName}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="default" className="text-xs font-medium">
                            {b.status}
                          </Badge>
                          <Link
                            href={`/event-bookings/${b._id}/beo`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </li>
                    )
                  )}
                  {todayEvents.length > 5 && (
                    <li className="pt-1">
                      <Link
                        href="/event-bookings/calendar"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[#5a189a] hover:underline"
                      >
                        +{todayEvents.length - 5} more
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <PartyPopper className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Upcoming</h2>
                <p className="text-xs font-medium text-slate-500">Next 7 days</p>
              </div>
            </div>
            <div className="p-5">
              {upcomingEvents.length === 0 ? (
                <p className="py-6 text-center text-sm font-medium text-slate-500">
                  No upcoming events in the next 7 days.
                </p>
              ) : (
                <ul className="space-y-3">
                  {upcomingEvents.map(
                    (b: {
                      _id: string;
                      title?: string;
                      bookingReference?: string;
                      startDate: string;
                      eventHallId?: { name?: string };
                      status?: string;
                    }) => (
                      <li
                        key={b._id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:bg-slate-50 hover:border-slate-200/80"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/event-bookings?edit=${b._id}`}
                            className="block truncate font-medium text-slate-900 hover:text-[#5a189a] hover:underline"
                          >
                            {b.title ?? b.bookingReference}
                          </Link>
                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            {format(new Date(b.startDate), "MMM d")} · {b.eventHallId?.name}
                          </p>
                        </div>
                        <Link
                          href={`/event-bookings/${b._id}/beo`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 shrink-0 p-0 text-slate-500 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Quick actions: primary CTA + grid */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#ff8500]" aria-hidden />
              <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
            </div>
            <Button
              asChild
              className="w-full shrink-0 rounded-xl bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00] px-5 py-2.5 font-semibold text-white shadow-lg shadow-[#ff6d00]/25 transition-all hover:opacity-95 hover:shadow-xl hover:shadow-[#ff6d00]/30 sm:w-auto"
            >
              <Link href="/event-bookings" className="inline-flex items-center gap-2">
                Open Event Bookings
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link, i) => {
              const accent = quickLinkAccents[i % quickLinkAccents.length];
              const iconStyle = accentIconStyles[accent];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 ${accentCardStyles[accent]}`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyle.bg} ${iconStyle.text}`}
                  >
                    <link.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="flex-1 font-medium text-slate-900 group-hover:opacity-90">
                    {link.label}
                  </span>
                  <ArrowRight
                    className={`h-4 w-4 shrink-0 transition-all group-hover:translate-x-0.5 ${iconStyle.text}`}
                  />
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
