"use client";

import { useState, useMemo } from "react";
import { Epilogue, Manrope } from "next/font/google";
import { format } from "date-fns";
import { useAccommodationReports } from "@/hooks/api";
import apiClient from "@/lib/api-client";
import { cn } from "@/lib/cn";
import "./accommodation-reports-editorial.css";

const fontHeadline = Epilogue({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-acc-headline",
  display: "swap",
});

const fontBody = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-acc-body",
  display: "swap",
});

/** Design uses GH₵ prefix like the reference HTML */
function fmtDisplay(n: number) {
  const x = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
  return `GH₵${x}`;
}

function roomLabel(r: { roomNumber?: string; roomId?: string }) {
  if (r.roomNumber && String(r.roomNumber).trim()) return String(r.roomNumber).trim();
  if (r.roomId) return `Room ${String(r.roomId).slice(-6)}`;
  return "—";
}

function formatSourceLabel(source: string): string {
  const map: Record<string, string> = {
    walkIn: "Walk-In",
    online: "Direct Online",
    phone: "Phone",
    agent: "Travel Agent",
    corporate: "Corporate",
  };
  return map[source] ?? String(source).replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

type ForecastDay = {
  date: string;
  occupiedRooms: number;
  totalRooms: number;
  occupancyPct: number;
};

export default function AccommodationReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  );
  const [trendMetric, setTrendMetric] = useState<"revenue" | "bookings">("revenue");
  const [downloading, setDownloading] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.startDate = new Date(startDate).toISOString();
    if (endDate) p.endDate = new Date(endDate + "T23:59:59").toISOString();
    return p;
  }, [startDate, endDate]);

  const { data, isLoading, isError } = useAccommodationReports(params);
  const report = data?.data;
  const kpis = report?.kpis;

  const downloadCsv = async () => {
    if (!startDate || !endDate) return;
    setDownloading(true);
    try {
      const q = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + "T23:59:59").toISOString(),
        format: "csv",
      });
      const { data: csv } = await apiClient.get<string>(`/reports/accommodation?${q}`, {
        responseType: "text",
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `accommodation-report-${startDate}-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setDownloading(false);
    }
  };

  /** Merge API daily points with every calendar day in the report range so the chart isn’t empty/sparse. */
  const dailySeries = useMemo(() => {
    const raw = report?.dailyRevenue as { date: string; revenue?: number; bookings?: number }[] | undefined;
    const byDate = new Map<string, { date: string; revenue: number; bookings: number }>();
    for (const row of raw ?? []) {
      if (!row?.date) continue;
      byDate.set(row.date, {
        date: row.date,
        revenue: Number(row.revenue ?? 0),
        bookings: Number(row.bookings ?? 0),
      });
    }
    const startStr =
      (report?.period?.startDate && String(report.period.startDate).slice(0, 10)) || startDate;
    const endStr =
      (report?.period?.endDate && String(report.period.endDate).slice(0, 10)) || endDate;
    const start = new Date(startStr + "T12:00:00");
    const end = new Date(endStr + "T12:00:00");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    const filled: { date: string; revenue: number; bookings: number }[] = [];
    for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      filled.push(byDate.get(key) ?? { date: key, revenue: 0, bookings: 0 });
    }
    return filled.slice(-30);
  }, [report?.dailyRevenue, report?.period?.startDate, report?.period?.endDate, startDate, endDate]);

  const CHART_H = 240;

  const dailyBars = useMemo(() => {
    const vals = dailySeries.map((d) =>
      Number(trendMetric === "revenue" ? d.revenue : d.bookings) || 0
    );
    const max = Math.max(...vals, 1);
    return dailySeries.map((d, i) => {
      const v = vals[i];
      const ratio = v / max;
      const heightPx = Math.max(14, Math.round(ratio * CHART_H));
      return {
        date: d.date,
        value: v,
        heightPx,
        isPeak: v > 0 && v === max,
        label: format(new Date(d.date + "T12:00:00"), "d/M"),
        title:
          trendMetric === "revenue"
            ? `${d.date}: ${fmtDisplay(v)}`
            : `${d.date}: ${v} booking${v === 1 ? "" : "s"}`,
      };
    });
  }, [dailySeries, trendMetric]);

  const topRooms = useMemo(() => {
    const list = [...(report?.revenueByRoom ?? [])].sort(
      (a: any, b: any) => (b.revenue ?? 0) - (a.revenue ?? 0)
    );
    const top = list.slice(0, 5);
    const totalRev = top.reduce((s: number, r: any) => s + (r.revenue ?? 0), 0) || 1;
    const maxRev = top[0]?.revenue ?? 1;
    return top.map((r: any, i: number) => ({
      ...r,
      displayName: roomLabel(r),
      pctOfTotal: ((r.revenue ?? 0) / totalRev) * 100,
      barPct: maxRev ? ((r.revenue ?? 0) / maxRev) * 100 : 0,
      opacity: i === 0 ? "" : i === 1 ? "60" : "40",
    }));
  }, [report?.revenueByRoom]);

  const topPerformer = topRooms[0];
  const forecast = (report?.occupancyForecast ?? []) as ForecastDay[];

  const bySourceRows = useMemo(() => {
    const rows = [...(report?.bySource ?? [])] as {
      source: string;
      bookings: number;
      revenue: number;
    }[];
    rows.sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));
    const seen = new Set(rows.map((r) => r.source));
    if (!seen.has("online")) rows.push({ source: "online", bookings: 0, revenue: 0 });
    if (!seen.has("bookingCom")) rows.push({ source: "bookingCom", bookings: 0, revenue: 0 });
    return rows.map((r) => ({
      ...r,
      label:
        r.source === "bookingCom"
          ? "Booking.com"
          : formatSourceLabel(r.source),
      muted: (r.revenue ?? 0) === 0 && (r.bookings ?? 0) === 0,
      active: (r.revenue ?? 0) > 0,
    }));
  }, [report?.bySource]);

  const generatedAt = format(new Date(), "MMM d, yyyy - HH:mm");

  return (
    <div
      className={cn(
        fontHeadline.variable,
        fontBody.variable,
        "acc-rep-editorial min-h-full bg-[#f5f6f7] pb-12 text-[#2c2f30] antialiased"
      )}
      style={{ fontFamily: "var(--font-acc-body), Manrope, system-ui, sans-serif" }}
    >
      <header className="mx-auto flex max-w-[1600px] flex-col items-end justify-between gap-6 px-4 pb-6 pt-8 sm:px-6 md:flex-row md:px-8 md:pt-12">
        <div className="w-full space-y-3 md:w-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#9b3f00]">
                Intelligence Suite
              </span>
              <h1
                className={cn(
                  fontHeadline.className,
                  "text-4xl font-black leading-none tracking-tighter text-[#2c2f30] sm:text-5xl md:text-6xl lg:text-7xl"
                )}
              >
                Accommodation <br />
                <span className="text-[#9b3f00]">Reports.</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-[#dadddf] bg-white px-3 py-2 text-xs font-semibold text-[#2c2f30] outline-none focus:ring-2 focus:ring-[#ff7a2c]/40"
              />
              <span className="text-xs font-medium text-[#595c5d]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-[#dadddf] bg-white px-3 py-2 text-xs font-semibold text-[#2c2f30] outline-none focus:ring-2 focus:ring-[#ff7a2c]/40"
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={downloading || !report}
          className="acc-editorial-gradient flex w-full shrink-0 items-center justify-center gap-3 rounded-xl px-6 py-4 text-sm font-bold text-[#401600] shadow-[0px_10px_30px_rgba(255,122,44,0.3)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto md:px-8"
          style={{ fontFamily: "var(--font-acc-headline), Epilogue, sans-serif" }}
        >
          <span className="acc-material text-xl !leading-none" aria-hidden>
            download
          </span>
          Export Full Report (CSV)
        </button>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pb-20 sm:px-6 md:px-8">
        {isLoading && (
          <div className="mt-12 space-y-16 animate-pulse">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-white shadow-[0px_20px_40px_rgba(44,47,48,0.06)]" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={cn("h-24 rounded-xl bg-[#eff1f2]", i === 4 && "col-span-2")} />
                ))}
              </div>
              <div className="h-64 rounded-xl bg-white lg:col-span-8" />
            </div>
          </div>
        )}

        {isError && (
          <div className="mt-12 rounded-xl border border-[#dadddf] bg-white p-12 text-center shadow-sm">
            <p className="font-semibold text-[#9b3f00]">Unable to load report</p>
            <p className="mt-2 text-sm text-[#595c5d]">
              You may need accountant, branch manager, or tenant admin access.
            </p>
          </div>
        )}

        {!isLoading && !isError && kpis && (
          <>
            {/* Hero KPIs */}
            <section className="mb-16 mt-8 grid grid-cols-1 gap-6 md:grid-cols-4 md:mt-12">
              <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-[#9b3f00]/5 transition-all group-hover:scale-110" />
                <p className="mb-4 text-sm font-medium text-[#595c5d]">Total Room Revenue</p>
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(fontHeadline.className, "text-3xl font-black text-[#9b3f00] sm:text-4xl")}
                  >
                    {fmtDisplay(kpis.totalRoomRevenue)}
                  </span>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[#9b3f00]">
                  <span className="acc-material text-sm" aria-hidden>
                    trending_up
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">Live Tracking</span>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-[#9b3f00]/5 transition-all group-hover:scale-110" />
                <p className="mb-4 text-sm font-medium text-[#595c5d]">Occupancy Rate</p>
                <div className="flex items-baseline gap-1">
                  <span className={cn(fontHeadline.className, "text-4xl font-black text-[#2c2f30] sm:text-5xl")}>
                    {kpis.occupancyRate}%
                  </span>
                </div>
                <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-[#e6e8ea]">
                  <div
                    className="h-full rounded-full bg-[#9b3f00]"
                    style={{ width: `${Math.min(100, kpis.occupancyRate)}%` }}
                  />
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-[#9b3f00]/5 transition-all group-hover:scale-110" />
                <p className="mb-4 text-sm font-medium text-[#595c5d]">ADR</p>
                <div className="flex items-baseline gap-1">
                  <span className={cn(fontHeadline.className, "text-4xl font-black text-[#2c2f30] sm:text-5xl")}>
                    {fmtDisplay(kpis.adr)}
                  </span>
                </div>
                <p className="mt-6 text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                  Average Daily Rate
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-[#9b3f00]/5 transition-all group-hover:scale-110" />
                <p className="mb-4 text-sm font-medium text-[#595c5d]">RevPAR</p>
                <div className="flex items-baseline gap-1">
                  <span className={cn(fontHeadline.className, "text-4xl font-black text-[#2c2f30] sm:text-5xl")}>
                    {fmtDisplay(kpis.revpar)}
                  </span>
                </div>
                <div className="mt-6 flex items-center gap-1 text-[#7a5400]">
                  <span className="acc-material text-sm" aria-hidden>
                    show_chart
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">Per Available Room</span>
                </div>
              </div>
            </section>

            {/* Quick stats + forecast */}
            <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="grid grid-cols-2 gap-4 lg:col-span-4">
                <div className="flex flex-col justify-between rounded-xl bg-[#eff1f2] p-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#595c5d]">
                    Total Rooms
                  </span>
                  <span className={cn(fontHeadline.className, "text-3xl font-black text-[#2c2f30]")}>
                    {kpis.totalRooms}
                  </span>
                </div>
                <div className="flex flex-col justify-between rounded-xl bg-[#eff1f2] p-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#595c5d]">
                    Total Bookings
                  </span>
                  <span className={cn(fontHeadline.className, "text-3xl font-black text-[#2c2f30]")}>
                    {kpis.totalBookings}
                  </span>
                </div>
                <div className="flex flex-col justify-between rounded-xl border-l-4 border-[#9b3f00]/20 bg-[#eff1f2] p-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#595c5d]">
                    Cancellation
                  </span>
                  <span className={cn(fontHeadline.className, "text-3xl font-black text-[#2c2f30]")}>
                    {kpis.cancellationRate}%
                  </span>
                </div>
                <div className="flex flex-col justify-between rounded-xl border-l-4 border-[#9b3f00]/20 bg-[#eff1f2] p-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#595c5d]">
                    No-Show
                  </span>
                  <span className={cn(fontHeadline.className, "text-3xl font-black text-[#2c2f30]")}>
                    {kpis.noShowRate}%
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-xl bg-[#ff7a2c]/10 p-6">
                  <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#9b3f00]">
                      Rate Variance
                    </span>
                    <span className={cn(fontHeadline.className, "text-2xl font-black text-[#9b3f00]")}>
                      {(report.rateVariance?.variancePercent ?? 0) >= 0 ? "+" : ""}
                      {report.rateVariance?.variancePercent ?? 0}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold uppercase text-[#595c5d]">Avg Base</span>
                    <span className="text-sm font-bold">
                      {fmtDisplay(report.rateVariance?.averageBaseRate ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)] lg:col-span-8">
                <div className="mb-8 flex items-center justify-between">
                  <h3
                    className={cn(
                      fontHeadline.className,
                      "flex items-center gap-2 text-lg font-bold sm:text-xl"
                    )}
                  >
                    <span className="acc-material text-[#9b3f00]" aria-hidden>
                      calendar_month
                    </span>
                    Next 7 Days Occupancy Forecast
                  </h3>
                </div>
                <div className="acc-hide-scrollbar overflow-x-auto">
                  <div className="flex min-w-[600px] justify-between gap-4">
                    {forecast.map((f) => {
                      const pct = Math.min(100, f.occupancyPct);
                      const label = format(new Date(f.date + "T12:00:00"), "EEE");
                      const peak = forecast.length && pct === Math.max(...forecast.map((x) => x.occupancyPct));
                      return (
                        <div key={f.date} className="flex-1 rounded-xl bg-[#f5f6f7] p-4 text-center">
                          <span
                            className={cn(
                              "mb-3 block text-xs font-bold uppercase",
                              peak ? "text-[#9b3f00]" : "text-[#595c5d]"
                            )}
                          >
                            {label}
                          </span>
                          <span
                            className={cn(
                              "text-lg font-black",
                              peak ? "text-[#9b3f00]" : "text-[#2c2f30]"
                            )}
                          >
                            {f.occupancyPct}%
                          </span>
                          <div className="relative mx-auto mt-2 h-16 w-1 rounded-full bg-[#dadddf]">
                            <div
                              className={cn(
                                "absolute bottom-0 w-full rounded-full bg-[#9b3f00]",
                                peak && "shadow-[0px_0px_10px_rgba(255,122,44,0.5)]"
                              )}
                              style={{ height: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="relative overflow-hidden rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)] lg:col-span-7">
                <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h3 className={cn(fontHeadline.className, "text-lg font-bold sm:text-xl")}>
                      Daily Revenue Trend
                    </h3>
                    <p className="text-sm text-[#595c5d]">Performance over the selected period (up to 30 days)</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTrendMetric("revenue")}
                      className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-bold uppercase",
                        trendMetric === "revenue"
                          ? "bg-[#9b3f00] text-white"
                          : "bg-[#e0e3e4] text-[#595c5d]"
                      )}
                    >
                      Revenue
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendMetric("bookings")}
                      className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-bold uppercase",
                        trendMetric === "bookings"
                          ? "bg-[#9b3f00] text-white"
                          : "bg-[#e0e3e4] text-[#595c5d]"
                      )}
                    >
                      Bookings
                    </button>
                  </div>
                </div>
                {dailyBars.length > 0 ? (
                  <>
                    <div className="flex gap-1 border-b border-[#e6e8ea] pb-1">
                      {dailyBars.map((b) => (
                        <div
                          key={b.date}
                          className="flex h-[280px] min-w-0 flex-1 flex-col items-stretch justify-end"
                          title={b.title}
                        >
                          <div className="flex min-h-0 flex-1 flex-col justify-end">
                            <div
                              className={cn(
                                "w-full rounded-t-sm transition-colors",
                                b.isPeak ? "bg-[#9b3f00]" : "bg-[#9b3f00]/25 hover:bg-[#9b3f00]/80"
                              )}
                              style={{ height: b.heightPx }}
                            />
                          </div>
                          <div className="mt-2 space-y-0.5 text-center">
                            <p className="truncate text-[9px] font-bold uppercase tracking-tight text-[#595c5d]">
                              {b.label}
                            </p>
                            <p className="truncate text-[10px] font-black tabular-nums text-[#2c2f30]">
                              {trendMetric === "revenue"
                                ? fmtDisplay(b.value)
                                : `${b.value}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                      <span>Earlier</span>
                      <span>Mid</span>
                      <span>Recent</span>
                      <span>Latest</span>
                    </div>
                  </>
                ) : (
                  <p className="py-16 text-center text-sm text-[#595c5d]">No daily data for this period</p>
                )}
              </div>

              <div className="rounded-xl border-t-8 border-[#9b3f00] bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)] lg:col-span-5">
                <h3 className={cn(fontHeadline.className, "mb-6 text-lg font-bold sm:text-xl")}>
                  Revenue by Room
                </h3>
                {topRooms.length > 0 ? (
                  <>
                    <div className="space-y-6">
                      {topRooms.map((r: any) => (
                        <div key={String(r.roomId ?? r.displayName)}>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-bold">
                              {r.displayName}
                              {r.floor != null ? ` · Fl ${r.floor}` : ""}
                            </span>
                            <span className={cn(fontHeadline.className, "text-sm font-black")}>
                              {fmtDisplay(r.revenue ?? 0)}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[#e6e8ea]">
                            <div
                              className={cn(
                                "h-full rounded-full bg-[#9b3f00]",
                                r.opacity === "60" && "bg-[#9b3f00]/60",
                                r.opacity === "40" && "bg-[#9b3f00]/40"
                              )}
                              style={{ width: `${r.barPct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {topPerformer && (
                      <div className="mt-10 flex items-center gap-4 rounded-xl bg-[#9b3f00]/5 p-4">
                        <div className="acc-editorial-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[#401600]">
                          <span className="acc-material" aria-hidden>
                            star
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-[#9b3f00]">Top Performer</p>
                          <p className="text-sm font-bold">
                            {topPerformer.displayName} (
                            {Math.round(topPerformer.pctOfTotal)}% of top slice)
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="py-12 text-center text-sm text-[#595c5d]">No room revenue in period</p>
                )}
              </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className={cn(fontHeadline.className, "text-lg font-bold sm:text-xl")}>
                    Bookings &amp; Revenue by Source
                  </h3>
                  <span className="acc-material text-[#595c5d]" aria-hidden>
                    hub
                  </span>
                </div>
                <table className="w-full text-left">
                  <thead className="border-b border-[#e6e8ea] text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                    <tr>
                      <th className="pb-4">Source</th>
                      <th className="pb-4 text-center">Bookings</th>
                      <th className="pb-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {bySourceRows.map((r) => (
                      <tr
                        key={r.source}
                        className={cn(
                          "transition-colors hover:bg-[#f5f6f7]",
                          r.muted && "opacity-40"
                        )}
                      >
                        <td className="flex items-center gap-2 py-5 font-bold">
                          {r.active && <span className="h-2 w-2 shrink-0 rounded-full bg-[#9b3f00]" />}
                          {!r.active && <span className="w-2 shrink-0" />}
                          {r.label}
                        </td>
                        <td className="py-5 text-center font-medium">{r.bookings}</td>
                        <td className={cn(fontHeadline.className, "py-5 text-right font-black")}>
                          {fmtDisplay(r.revenue ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className={cn(fontHeadline.className, "text-lg font-bold sm:text-xl")}>
                    Revenue Per Room Details
                  </h3>
                  <span className="acc-material text-[#595c5d]" aria-hidden>
                    bed
                  </span>
                </div>
                <table className="w-full text-left">
                  <thead className="border-b border-[#e6e8ea] text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                    <tr>
                      <th className="pb-4">Room</th>
                      <th className="pb-4 text-center">Nights sold</th>
                      <th className="pb-4 text-right">Avg rate</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {(report.revenueByRoom?.length ? report.revenueByRoom : []).slice(0, 12).map((r: any) => {
                      const nights = r.nights ?? 0;
                      const avg = nights > 0 ? (r.revenue ?? 0) / nights : 0;
                      const name = roomLabel(r);
                      return (
                        <tr key={String(r.roomId ?? name)} className="transition-colors hover:bg-[#f5f6f7]">
                          <td className="py-5 font-bold">
                            {name}
                            {r.floor != null ? ` · Fl ${r.floor}` : ""}
                          </td>
                          <td className="py-5 text-center font-medium">{nights}</td>
                          <td className={cn(fontHeadline.className, "py-5 text-right font-black")}>
                            {nights > 0 ? fmtDisplay(avg) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!(report.revenueByRoom?.length > 0) && (
                  <p className="pb-4 text-center text-sm text-[#595c5d]">No room breakdown for this period</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-32 flex flex-col justify-between gap-8 border-t border-[#e0e3e4] pt-12 opacity-60 md:flex-row">
              <div className="max-w-md">
                <h4 className={cn(fontHeadline.className, "mb-4 text-2xl font-black text-[#9b3f00]")}>
                  Solar Curator.
                </h4>
                <p className="text-sm leading-relaxed text-[#2c2f30]">
                  This report is an algorithmic representation of current accommodation flows. Accuracy is
                  maintained via real-time synchronization with the core ledger system.
                </p>
              </div>
              <div className="flex flex-wrap gap-12 text-xs font-bold uppercase tracking-widest">
                <div className="space-y-2">
                  <p className="text-[#595c5d]">Confidentiality</p>
                  <p>Level 4 Secure</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[#595c5d]">Generated</p>
                  <p>{generatedAt}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {!isLoading && !isError && !kpis && (
          <div className="mt-12 rounded-xl bg-white p-12 text-center shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
            <p className="text-[#595c5d]">No report data available</p>
          </div>
        )}
      </main>
    </div>
  );
}
