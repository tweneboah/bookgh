"use client";

import { useMemo, useState } from "react";
import { useConferenceReports } from "@/hooks/api";
import apiClient from "@/lib/api-client";
import { AppDatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CalendarRange,
  Download,
  LayoutGrid,
  AlertCircle,
  PieChart,
  Target,
  Percent,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 0,
  }).format(n);

export default function ConferenceReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState<Date>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date>(
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
  );
  const [exporting, setExporting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    p.startDate = startDate.toISOString();
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    p.endDate = endOfDay.toISOString();
    return p;
  }, [startDate, endDate]);

  const { data, isLoading } = useConferenceReports(params);
  const report = data?.data;
  const dept = report?.departmentReports;
  const halls = report?.hallReports?.utilization ?? [];
  const eventTypeRevenue = report?.departmentReports?.revenueByEventType ?? [];
  const outstanding = report?.eventReports?.outstandingPayments ?? [];
  const budgetVsActual = report?.budgetVsActual ?? [];
  const commissionTracking = report?.commissionTracking ?? [];
  const projectedRevenue =
    report?.enterpriseInsights?.eventForecasting?.projectedRevenue ?? 0;

  const exportCsv = async () => {
    try {
      setExporting(true);
      const q = new URLSearchParams(params);
      q.set("format", "csv");
      const response = await apiClient.get(`/reports/conference?${q.toString()}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conference-report-${startDate.toISOString().slice(0, 10)}-to-${endDate.toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7fa] font-sans">
      {/* Header — white, full width */}
      <header className="border-b border-[#eee] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#240046] sm:text-3xl">
                Conference Reports
              </h1>
              <p className="mt-1 text-sm font-medium text-[#5a189a]/80">
                Revenue, utilization, profitability & projections
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <AppDatePicker
                  label="From"
                  selected={startDate}
                  onChange={(d) => d && setStartDate(d)}
                  className="min-w-[140px]"
                />
                <AppDatePicker
                  label="To"
                  selected={endDate}
                  onChange={(d) => d && setEndDate(d)}
                  className="min-w-[140px]"
                />
              </div>
              <Button
                type="button"
                onClick={exportCsv}
                loading={exporting}
                className="bg-linear-to-r from-[#ff6d00] to-[#ff9100] font-semibold text-white shadow-md hover:from-[#ff7900] hover:to-[#ff9e00]"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              />
            ))}
          </div>
        ) : (
          <>
            {/* KPI cards — mobile-first grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-2xl border border-[#eee] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(36,0,70,0.08)] sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#7b2cbf]">
                      Event revenue
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#240046] sm:text-3xl">
                      {fmt(dept?.totalEventRevenue ?? 0)}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#ff8500] to-[#ff9e00] text-white">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </article>
              <article className="rounded-2xl border border-[#eee] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(36,0,70,0.08)] sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#7b2cbf]">
                      Event expenses
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#240046] sm:text-3xl">
                      {fmt(dept?.totalEventExpenses ?? 0)}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5a189a] text-white">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                </div>
              </article>
              <article className="rounded-2xl border border-[#eee] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(36,0,70,0.08)] sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#7b2cbf]">
                      Net profit
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#240046] sm:text-3xl">
                      {fmt(dept?.netDepartmentProfit ?? 0)}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7b2cbf] text-white">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
              </article>
              <article className="rounded-2xl border border-[#eee] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(36,0,70,0.08)] sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#7b2cbf]">
                      Revenue projection
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#240046] sm:text-3xl">
                      {fmt(projectedRevenue)}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3c096c] text-white">
                    <CalendarRange className="h-5 w-5" />
                  </div>
                </div>
              </article>
            </div>

            {/* Two-column content */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {/* Hall utilization */}
              <section className="rounded-2xl border border-[#eee] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="border-b border-[#eee] px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5a189a]/10 text-[#5a189a]">
                      <LayoutGrid className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-semibold text-[#240046]">
                      Hall utilization
                    </h2>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  {halls.length ? (
                    <ul className="space-y-3">
                      {halls.map((row: any) => (
                        <li
                          key={row.hallId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eee] bg-[#faf9fc] px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-[#240046]">
                              {row.hallName}
                            </p>
                            <p className="text-xs text-[#5a189a]/80">
                              {row.bookingCount} bookings
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[#240046]">
                              {fmt(row.revenue ?? 0)}
                            </p>
                            <p className="text-xs font-medium text-[#7b2cbf]">
                              {row.utilizationRate ?? 0}% utilized
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-8 text-center text-sm text-[#7b2cbf]/70">
                      No hall utilization data for this period
                    </p>
                  )}
                </div>
              </section>

              {/* Outstanding payments */}
              <section className="rounded-2xl border border-[#eee] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="border-b border-[#eee] px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff9100]/15 text-[#c45a00]">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-semibold text-[#240046]">
                      Outstanding payments
                    </h2>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  {outstanding.length ? (
                    <ul className="space-y-3">
                      {outstanding.slice(0, 10).map((row: any) => (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eee] bg-[#faf9fc] px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-[#240046]">
                              {row.title}
                            </p>
                            <p className="text-xs text-[#5a189a]/80">
                              {row.bookingReference}
                            </p>
                          </div>
                          <p className="font-semibold text-[#c45a00]">
                            {fmt(row.outstanding ?? 0)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-8 text-center text-sm text-[#7b2cbf]/70">
                      No outstanding event payments
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Revenue by event type — full width */}
            <section className="mt-6 rounded-2xl border border-[#eee] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="border-b border-[#eee] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7b2cbf]/10 text-[#5a189a]">
                    <PieChart className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#240046]">
                    Revenue by event type
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto p-5 sm:p-6">
                <table className="w-full min-w-[280px] text-sm">
                  <thead>
                    <tr className="border-b border-[#eee]">
                      <th className="pb-3 text-left font-semibold text-[#5a189a]">
                        Event type
                      </th>
                      <th className="pb-3 text-right font-semibold text-[#5a189a]">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventTypeRevenue.length ? (
                      eventTypeRevenue.map((row: any) => (
                        <tr
                          key={row.eventType}
                          className="border-b border-[#f0eef5] last:border-0"
                        >
                          <td className="py-3 font-medium capitalize text-[#240046]">
                            {row.eventType}
                          </td>
                          <td className="py-3 text-right font-semibold text-[#240046]">
                            {fmt(row.revenue ?? 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={2}
                          className="py-10 text-center text-sm text-[#7b2cbf]/70"
                        >
                          No revenue by event type in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Budget vs actual & Commission — two columns */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#eee] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="border-b border-[#eee] px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff6d00]/15 text-[#b85a00]">
                      <Target className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-semibold text-[#240046]">
                      Budget vs actual
                    </h2>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  {budgetVsActual.length ? (
                    <ul className="space-y-3">
                      {budgetVsActual.slice(0, 8).map((row: any) => (
                        <li
                          key={row.bookingReference}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eee] bg-[#faf9fc] px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-[#240046]">
                              {row.title}
                            </p>
                            <p className="text-xs text-[#5a189a]/80">
                              {row.bookingReference}
                            </p>
                          </div>
                          <div className="text-right text-xs">
                            <p className="text-[#6b6b6b]">
                              Budget {fmt(row.budgetedCost ?? 0)}
                            </p>
                            <p className="text-[#6b6b6b]">
                              Actual {fmt(row.actualCost ?? 0)}
                            </p>
                            <p
                              className={`font-semibold ${
                                (row.variance ?? 0) >= 0
                                  ? "text-[#0d9488]"
                                  : "text-[#dc2626]"
                              }`}
                            >
                              Var {fmt(row.variance ?? 0)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-8 text-center text-sm text-[#7b2cbf]/70">
                      No budget vs actual records
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-[#eee] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="border-b border-[#eee] px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#9d4edd]/10 text-[#7b2cbf]">
                      <Percent className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-semibold text-[#240046]">
                      Commission tracking
                    </h2>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  {commissionTracking.length ? (
                    <ul className="space-y-3">
                      {commissionTracking.slice(0, 8).map((row: any) => (
                        <li
                          key={row.bookingReference}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eee] bg-[#faf9fc] px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-[#240046]">
                              {row.title}
                            </p>
                            <p className="text-xs text-[#5a189a]/80">
                              {row.bookingReference}
                            </p>
                          </div>
                          <div className="text-right text-xs">
                            <p className="text-[#6b6b6b]">
                              Revenue {fmt(row.revenue ?? 0)}
                            </p>
                            <p className="text-[#6b6b6b]">
                              Rate {row.commissionRate ?? 0}%
                            </p>
                            <p className="font-semibold text-[#240046]">
                              {fmt(row.commissionAmount ?? 0)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-8 text-center text-sm text-[#7b2cbf]/70">
                      No commission data
                    </p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
