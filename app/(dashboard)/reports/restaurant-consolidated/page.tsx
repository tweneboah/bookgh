"use client";

import { useMemo, useState } from "react";
import { useRestaurantConsolidatedReports } from "@/hooks/api";
import apiClient from "@/lib/api-client";
import { AppDatePicker, Button } from "@/components/ui";
import {
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiDownload,
  FiMapPin,
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

export default function RestaurantConsolidatedReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | null>(
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
  );
  const [exporting, setExporting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.startDate = startDate.toISOString();
    if (endDate) {
      const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      p.endDate = endOfDay.toISOString();
    }
    return p;
  }, [startDate, endDate]);

  const { data, isLoading } = useRestaurantConsolidatedReports(params);
  const report = data?.data;
  const totals = report?.totals;

  const exportCsv = async () => {
    try {
      setExporting(true);
      const q = new URLSearchParams(params);
      q.set("format", "csv");
      const response = await apiClient.get(
        `/reports/restaurant/consolidated?${q.toString()}`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const startStr = startDate ? startDate.toISOString().slice(0, 10) : "";
      const endStr = endDate ? endDate.toISOString().slice(0, 10) : "";
      a.download = `restaurant-consolidated-${startStr}-to-${endStr}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

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
                    Restaurant Consolidated Reports
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 max-w-xl">
                    Multi-branch rollup for sales, expenses, payments and profitability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Date range + Export */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
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
            <Button
              type="button"
              variant="outline"
              onClick={exportCsv}
              loading={exporting}
              className="rounded-xl border-slate-200 shrink-0"
            >
              <FiDownload className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatBlock
                title="Total Sales"
                value={fmt(totals?.sales ?? 0)}
                icon={FiDollarSign}
                accent="orange"
              />
              <StatBlock
                title="Total Expenses"
                value={fmt(totals?.expenses ?? 0)}
                icon={FiCreditCard}
                accent="purple"
              />
              <StatBlock
                title="Net Profit"
                value={fmt(totals?.profit ?? 0)}
                icon={FiTrendingUp}
                accent="emerald"
              />
              <StatBlock
                title="Branches"
                value={String(report?.branches?.length ?? 0)}
                icon={FiMapPin}
                accent="slate"
              />
            </div>

            {/* Branch Breakdown */}
            <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
                <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#5a189a] to-[#9d4edd] shrink-0" aria-hidden />
                <h2 className="text-lg font-bold text-slate-900">Branch Breakdown</h2>
              </div>
              <div className="p-4 sm:p-5">
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-left">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Branch</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Sales</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Expenses</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Profit</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Payments</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Orders</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(report?.branches ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-2 text-slate-500">
                              <FiMapPin className="h-10 w-10 text-slate-300" aria-hidden />
                              <p className="font-medium text-slate-600">No branch data</p>
                              <p className="text-sm">Branch breakdown will appear here for the selected period.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (report?.branches ?? []).map((row: any) => (
                          <tr key={row.branchId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800">{row.branchName}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmt(row.sales ?? 0)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmt(row.expenses ?? 0)}</td>
                            <td className={`px-4 py-3 text-right font-semibold tabular-nums ${(row.profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {fmt(row.profit ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmt(row.payments ?? 0)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.orders ?? 0}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
