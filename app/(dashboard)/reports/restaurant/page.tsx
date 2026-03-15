"use client";

import { useMemo, useState } from "react";
import { useRestaurantReports } from "@/hooks/api";
import { AppDatePicker } from "@/components/ui";
import {
  FiDollarSign,
  FiShoppingCart,
  FiPieChart,
  FiTrendingUp,
  FiBarChart2,
  FiFilter,
} from "react-icons/fi";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 0 }).format(n);

function StatBlock({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  accent: "orange" | "purple" | "slate" | "emerald";
}) {
  const accentStyles = {
    orange: "bg-[#ff6d00]/10 text-[#ff6d00]",
    purple: "bg-[#5a189a]/10 text-[#5a189a]",
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentStyles[accent]}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

export default function RestaurantReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | null>(
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
  );

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.startDate = startDate.toISOString();
    if (endDate) {
      const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      p.endDate = endOfDay.toISOString();
    }
    return p;
  }, [startDate, endDate]);

  const { data, isLoading } = useRestaurantReports(params);
  const report = data?.data;

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      {/* Hero */}
      <div className="relative border-b border-slate-100 bg-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[min(80vw,400px)] h-[min(80vw,400px)] bg-gradient-to-br from-[#ff9100]/10 to-[#ff6d00]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#5a189a]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/25">
                  <FiBarChart2 className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Restaurant Reports
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 max-w-xl">
                    Sales, COGS, gross margin, waiter performance, top items, and accounting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Date range */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex items-center gap-2 text-slate-600">
              <FiFilter className="h-4 w-4 text-[#5a189a] shrink-0" aria-hidden />
              <span className="text-sm font-semibold">Date range</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 max-w-md">
              <AppDatePicker
                label="Start date"
                selected={startDate}
                onChange={(d) => setStartDate(d)}
                placeholder="Select start"
              />
              <AppDatePicker
                label="End date"
                selected={endDate}
                onChange={(d) => setEndDate(d)}
                placeholder="Select end"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI row 1 */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatBlock
                title="Total Sales"
                value={fmt(report?.dailySummary?.totalSales ?? 0)}
                icon={FiDollarSign}
                accent="orange"
              />
              <StatBlock
                title="Total Orders"
                value={String(report?.dailySummary?.totalOrders ?? 0)}
                icon={FiShoppingCart}
                accent="purple"
              />
              <StatBlock
                title="Gross Profit"
                value={fmt(report?.dailySummary?.grossProfit ?? 0)}
                icon={FiTrendingUp}
                accent="emerald"
              />
              <StatBlock
                title="Gross Margin %"
                value={`${report?.performanceMetrics?.grossMarginPercent ?? 0}%`}
                icon={FiPieChart}
                accent="slate"
              />
            </div>

            {/* KPI row 2 */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatBlock
                title="Purchased Qty"
                value={String(report?.bohStockControl?.totalPurchased ?? 0)}
                icon={FiShoppingCart}
                accent="slate"
              />
              <StatBlock
                title="Consumed Qty"
                value={String(report?.bohStockControl?.totalConsumed ?? 0)}
                icon={FiTrendingUp}
                accent="purple"
              />
              <StatBlock
                title="Wastage Qty"
                value={String(report?.bohStockControl?.totalWastage ?? 0)}
                icon={FiPieChart}
                accent="slate"
              />
              <StatBlock
                title="Wastage %"
                value={`${report?.bohStockControl?.wastagePercent ?? 0}%`}
                icon={FiDollarSign}
                accent="slate"
              />
            </div>

            {/* Top Selling + Sales Per Waiter */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
                  <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#ff6d00] to-[#ff9e00] shrink-0" aria-hidden />
                  <h2 className="text-lg font-bold text-slate-900">Top Selling Items</h2>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="space-y-2">
                    {(report?.fohReports?.topSellingItems ?? []).slice(0, 10).map((row: any) => (
                      <div
                        key={row.itemName}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/30 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{row.itemName}</p>
                          <p className="text-xs text-slate-500">Qty {row.quantity}</p>
                        </div>
                        <p className="font-semibold text-slate-800 tabular-nums">{fmt(row.sales ?? 0)}</p>
                      </div>
                    ))}
                    {!(report?.fohReports?.topSellingItems ?? []).length && (
                      <p className="py-8 text-center text-sm text-slate-500">No data for this period.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
                  <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#5a189a] to-[#9d4edd] shrink-0" aria-hidden />
                  <h2 className="text-lg font-bold text-slate-900">Sales Per Waiter</h2>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="space-y-2">
                    {(report?.performanceMetrics?.salesPerWaiter ?? []).slice(0, 10).map((row: any) => (
                      <div
                        key={`${row.waiterId}-${row.waiterName}`}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/30 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{row.waiterName}</p>
                          <p className="text-xs text-slate-500">Orders {row.orders}</p>
                        </div>
                        <p className="font-semibold text-slate-800 tabular-nums">{fmt(row.sales ?? 0)}</p>
                      </div>
                    ))}
                    {!(report?.performanceMetrics?.salesPerWaiter ?? []).length && (
                      <p className="py-8 text-center text-sm text-slate-500">No data for this period.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
                <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#5a189a] to-[#9d4edd] shrink-0" aria-hidden />
                <h2 className="text-lg font-bold text-slate-900">Expense Breakdown</h2>
              </div>
              <div className="p-4 sm:p-5">
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-left">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Amount</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(report?.monthlySummary?.expenseBreakdown ?? []).length ? (
                        report.monthlySummary.expenseBreakdown.map((row: any) => (
                          <tr key={row.category} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-800">{row.category}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmt(row.amount ?? 0)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.count ?? 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-10 text-center text-slate-500">
                            No expense data for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Demand Forecasting + Menu Engineering */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
                  <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#ff6d00] to-[#ff9e00] shrink-0" aria-hidden />
                  <h2 className="text-lg font-bold text-slate-900">Demand Forecasting (7-Day)</h2>
                </div>
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Average Daily Sales (last 30 days)</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                      {fmt(report?.enterpriseInsights?.demandForecasting?.averageDailySales ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-[#5a189a]/20 bg-[#5a189a]/5 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Projected Sales (next 7 days)</p>
                    <p className="mt-1 text-xl font-bold text-[#5a189a] tabular-nums">
                      {fmt(report?.enterpriseInsights?.demandForecasting?.projectedNext7DaysSales ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
                  <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#5a189a] to-[#9d4edd] shrink-0" aria-hidden />
                  <h2 className="text-lg font-bold text-slate-900">Menu Engineering Matrix</h2>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="space-y-2">
                    {(report?.enterpriseInsights?.menuEngineering ?? []).slice(0, 8).map((row: any) => (
                      <div
                        key={row.itemName}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/30 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{row.itemName}</p>
                          <p className="text-xs text-slate-500">
                            Margin {row.grossMarginPercent ?? 0}% · Popularity {row.popularityScore ?? 0}%
                          </p>
                        </div>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                          {row.classification}
                        </span>
                      </div>
                    ))}
                    {!(report?.enterpriseInsights?.menuEngineering ?? []).length && (
                      <p className="py-8 text-center text-sm text-slate-500">No data for this period.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
