"use client";

import { useMemo, useState } from "react";
import { usePoolReports } from "@/hooks/api";
import {
  AppDatePicker,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import {
  Droplets,
  DollarSign,
  CalendarCheck,
  TrendingUp,
  Download,
  BarChart3,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const ORANGE_GRADIENT = "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)";
const PURPLE_GRADIENT = "linear-gradient(135deg, #5a189a 0%, #9d4edd 100%)";
const PURPLE_DEEP = "#3c096c";
const ORANGE_ACCENT = "#ff8500";

export default function PoolReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [endDate, setEndDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  );

  const params = useMemo(
    () => ({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    [startDate, endDate]
  );
  const { data, isLoading, error } = usePoolReports(params);
  const report = data?.data;

  const areaChartData = useMemo(() => {
    return (report?.revenueByPoolArea ?? []).map((row: any) => ({
      name: row.poolAreaName ?? "Unknown",
      revenue: Number(row.totalRevenue ?? 0),
      bookings: Number(row.bookingCount ?? 0),
    }));
  }, [report]);

  const hasData =
    !!report &&
    (Number(report.totalRevenue) > 0 ||
      Number(report.totalPaid) > 0 ||
      Number(report.totalBookings) > 0 ||
      (report.revenueByPoolArea && report.revenueByPoolArea.length > 0));

  const hasAreaBreakdown = (report?.revenueByPoolArea?.length ?? 0) > 0;

  const exportCsv = () => {
    const q = new URLSearchParams({
      format: "csv",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    window.open(`/api/reports/pool?${q.toString()}`, "_blank");
  };

  return (
    <div
      className="min-h-screen bg-white font-sans text-slate-900"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Hero section: title + accent */}
      <div className="relative border-b border-slate-100 bg-white">
        <div className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-linear-to-b from-[#ff8500] to-[#9d4edd] sm:w-1.5" />
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="pl-2 sm:pl-4">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm"
                  style={{ background: PURPLE_GRADIENT }}
                >
                  <Droplets className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Pool Reports
                </h1>
              </div>
              <p className="mt-2 max-w-xl text-sm font-normal text-slate-500 sm:text-base">
                {error
                  ? "We couldn't load pool reports for this period."
                  : hasData
                    ? hasAreaBreakdown
                      ? "Revenue, bookings, and performance by pool area."
                      : "Revenue and bookings for this period. No breakdown by pool area for the selected dates."
                    : "No pool report data for this period yet. Try a different date range."}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3 sm:flex-nowrap">
              <div className="grid w-full gap-3 sm:grid-cols-2 sm:w-auto">
                <div className="relative z-100">
                  <AppDatePicker
                    label="From"
                    selected={startDate}
                    onChange={(date) => setStartDate(date ?? startDate)}
                  />
                </div>
                <div className="relative z-100">
                  <AppDatePicker
                    label="To"
                    selected={endDate}
                    onChange={(date) => setEndDate(date ?? endDate)}
                  />
                </div>
              </div>
              <Button
                onClick={exportCsv}
                className="h-10 shrink-0 font-semibold text-white shadow-md transition hover:opacity-95"
                style={{ background: ORANGE_GRADIENT }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {/* Primary metric + secondary metrics — new layout */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden border-0 shadow-md transition hover:shadow-lg">
            <div
              className="h-1 w-full shrink-0"
              style={{ background: ORANGE_GRADIENT }}
            />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Revenue
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                    {isLoading ? "…" : fmt(Number(report?.totalRevenue ?? 0))}
                  </p>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: ORANGE_GRADIENT }}
                >
                  <DollarSign className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Paid
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {isLoading ? "…" : fmt(Number(report?.totalPaid ?? 0))}
                  </p>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: PURPLE_GRADIENT }}
                >
                  <TrendingUp className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Bookings
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {isLoading ? "…" : report?.totalBookings ?? 0}
                  </p>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: "#7b2cbf" }}
                >
                  <CalendarCheck className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Completed
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {isLoading ? "…" : report?.completedBookings ?? 0}
                  </p>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: "#9d4edd" }}
                >
                  <Droplets className="h-5 w-5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by pool area — distinctive card */}
        <Card className="overflow-hidden border border-slate-100 bg-white shadow-md">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: PURPLE_GRADIENT }}
              >
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 sm:text-xl">
                  Revenue by Pool Area
                </CardTitle>
                <p className="mt-0.5 text-sm font-normal text-slate-500">
                  Breakdown by area for the selected period
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
            ) : !areaChartData.length ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16">
                <Sparkles className="h-12 w-12 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-500">
                  No revenue breakdown by pool area for this period.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {hasData
                    ? "Bookings or payments may not be linked to a pool area yet."
                    : "Try a different date range to see data."}
                </p>
              </div>
            ) : (
              <>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areaChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#64748b", fontFamily: "Inter, system-ui, sans-serif" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#64748b", fontFamily: "Inter, system-ui, sans-serif" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                      />
                      <Tooltip
                        formatter={(v: any) => fmt(Number(v ?? 0))}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          fontFamily: "Inter, system-ui, sans-serif",
                        }}
                        labelStyle={{ fontFamily: "Inter, system-ui, sans-serif" }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="url(#poolBarGradient)"
                        radius={[8, 8, 0, 0]}
                        name="Revenue"
                      />
                      <defs>
                        <linearGradient
                          id="poolBarGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#7b2cbf" />
                          <stop offset="100%" stopColor="#9d4edd" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 overflow-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                        <th className="px-4 py-3 font-semibold text-slate-600">
                          Pool Area
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Bookings
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(report?.revenueByPoolArea ?? []).map((row: any) => (
                        <tr
                          key={String(row.poolAreaId)}
                          className="transition hover:bg-slate-50/50"
                        >
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {row.poolAreaName ?? "—"}
                            {row.poolAreaType ? (
                              <span className="ml-1.5 font-normal text-slate-500">
                                ({row.poolAreaType})
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {row.bookingCount ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {fmt(Number(row.totalRevenue ?? 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
