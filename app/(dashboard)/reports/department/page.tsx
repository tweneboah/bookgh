"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDepartmentReports } from "@/hooks/api";
import apiClient from "@/lib/api-client";
import { useSearchParams } from "next/navigation";
import {
  AppReactSelect,
  AppDatePicker,
  Badge,
  Button,
} from "@/components/ui";
import {
  AlertCircle,
  ArrowRightLeft,
  BarChart2,
  Bookmark,
  CreditCard,
  DollarSign,
  Download,
  PieChart,
  Printer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { DEPARTMENT } from "@/constants";

const fmt = (n: number) =>
  `₵${new Intl.NumberFormat("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)}`;

const DEPARTMENT_OPTIONS = Object.entries(DEPARTMENT).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, " "),
}));
const VIEW_MODE_OPTIONS = [
  { value: "finance", label: "Finance View" },
  { value: "operational", label: "Operational View" },
];

const ORANGE = "#ff8500";
const ORANGE_LIGHT = "#ff9e00";
const PURPLE = "#5a189a";
const PURPLE_LIGHT = "#9d4edd";
const DEPT_COLORS: Record<string, string> = {
  accommodation: "#5a189a",
  restaurant: "#ff8500",
  conference: "#7b2cbf",
  bar: "#ff6d00",
  pool: "#0891b2",
  gym: "#0e7490",
  housekeeping: "#ca8a04",
  staff: "#64748b",
  general: "#6b7280",
};

/** Department slug -> dedicated report path (for drill-down). */
const DEPT_REPORT_PATH: Record<string, string> = {
  restaurant: "/reports/restaurant",
  bar: "/reports/bar",
  pool: "/reports/pool",
  accommodation: "/reports/accommodation",
  conference: "/reports/conference",
  maintenance: "/reports/maintenance",
};

function KpiCard({
  title,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "orange" | "purple" | "green" | "red" | "amber";
  hint?: string;
}) {
  const iconBg: Record<string, string> = {
    orange: "bg-linear-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/25",
    purple: "bg-linear-to-br from-[#5a189a] to-[#7b2cbf] text-white shadow-lg shadow-[#5a189a]/25",
    green: "bg-linear-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20",
    red: "bg-linear-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/20",
    amber: "bg-linear-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20",
  };
  const valueColor: Record<string, string> = {
    orange: "text-slate-900",
    purple: "text-slate-900",
    green: "text-emerald-700",
    red: "text-red-700",
    amber: "text-amber-700",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <div className={`mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg[accent]}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className={`mt-2 text-lg font-bold tracking-tight text-slate-900 ${valueColor[accent]}`}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export default function DepartmentReportsPage() {
  const searchParams = useSearchParams();
  const urlDepartment = searchParams.get("department") ?? "";
  const urlIncludePending = (searchParams.get("includePending") ?? "").toLowerCase();
  const now = new Date();
  const [startDate, setStartDate] = useState<Date>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date>(
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
  );
  const [department, setDepartment] = useState(urlDepartment);
  const [viewMode, setViewMode] = useState<"finance" | "operational">(
    ["1", "true", "yes", "on"].includes(urlIncludePending) ? "operational" : "finance"
  );
  const [exportingFormat, setExportingFormat] = useState<"csv" | "pdf" | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [trendSeries, setTrendSeries] = useState<"both" | "income" | "expenses">("both");
  const [barMode, setBarMode] = useState<"grouped" | "stacked">("grouped");
  const [savedConfigs, setSavedConfigs] = useState<
    Array<{
      id: string;
      name: string;
      department: string;
      viewMode: "finance" | "operational";
      startDateISO: string;
      endDateISO: string;
      includePending: boolean;
    }>
  >([]);

  useEffect(() => {
    setDepartment(urlDepartment);
    setViewMode(["1", "true", "yes", "on"].includes(urlIncludePending) ? "operational" : "finance");
  }, [urlDepartment, urlIncludePending]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("dept_reports_saved_configs");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSavedConfigs(parsed);
    } catch {
      // ignore
    }
  }, []);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.startDate = startDate.toISOString();
    if (endDate)
      p.endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).toISOString();
    if (department) p.department = department;
    if (viewMode === "operational") p.includePending = "true";
    return p;
  }, [startDate, endDate, department, viewMode]);

  const { data, isLoading } = useDepartmentReports(params);
  const report = data?.data;
  const totals = report?.totals;

  const compareParams = useMemo(() => {
    if (!compareEnabled || !startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const prevEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 23, 59, 59, 999);
    const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - (days - 1), 0, 0, 0, 0);
    const p: Record<string, string> = {};
    p.startDate = prevStart.toISOString();
    p.endDate = prevEnd.toISOString();
    if (department) p.department = department;
    if (viewMode === "operational") p.includePending = "true";
    return p;
  }, [compareEnabled, startDate, endDate, department, viewMode]);

  const compareQuery = useDepartmentReports(compareParams ?? undefined);
  const compareTotals = compareEnabled ? compareQuery.data?.data?.totals : undefined;

  const chartData = useMemo(() => {
    if (!report?.allDepartments) return [];
    return report.allDepartments
      .filter((d: { totalIncome: number; totalExpenses: number }) => d.totalIncome > 0 || d.totalExpenses > 0)
      .map((d: { department: string; [key: string]: unknown }) => ({
        ...d,
        name:
          DEPARTMENT_OPTIONS.find((o) => o.value === d.department)?.label ?? d.department,
      }));
  }, [report]);

  const trendData = useMemo(() => {
    if (!report) return [];
    const dateMap = new Map<string, { date: string; income: number; expenses: number }>();

    (report.incomeTrend ?? []).forEach((item: { date: string; amount: number }) => {
      const existing = dateMap.get(item.date) ?? { date: item.date, income: 0, expenses: 0 };
      existing.income = item.amount;
      dateMap.set(item.date, existing);
    });

    (report.expenseTrend ?? []).forEach((item: { date: string; amount: number }) => {
      const existing = dateMap.get(item.date) ?? { date: item.date, income: 0, expenses: 0 };
      existing.expenses = item.amount;
      dateMap.set(item.date, existing);
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [report]);

  const exportReport = async (format: "csv" | "pdf") => {
    try {
      setExportingFormat(format);
      const q = new URLSearchParams(params);
      q.set("format", format);

      const response = await apiClient.get(`/reports/department?${q.toString()}`, {
        responseType: "blob",
      });
      const mime = format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8;";
      const blob = new Blob([response.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const from = startDate ? startDate.toISOString().slice(0, 10) : "from";
      const to = endDate ? endDate.toISOString().slice(0, 10) : "to";
      const deptSuffix = department ? `-${department}` : "-all";
      anchor.href = url;
      anchor.download = `department-pnl-${from}-to-${to}${deptSuffix}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export report:", error);
    } finally {
      setExportingFormat(null);
    }
  };

  const activeDeptLabel =
    DEPARTMENT_OPTIONS.find((o) => o.value === (department || urlDepartment))?.label ??
    (department || urlDepartment || "All departments");
  const accentColor = DEPT_COLORS[department || urlDepartment] ?? ORANGE;

  const delta = (current?: number, prev?: number) => {
    if (current == null || prev == null) return null;
    const diff = current - prev;
    const pct = prev === 0 ? null : (diff / prev) * 100;
    return { diff, pct };
  };

  const saveCurrentConfig = () => {
    if (typeof window === "undefined") return;
    const name = window.prompt("Name this report preset (e.g. 'Restaurant – monthly')");
    if (!name) return;
    const cfg = {
      id: `${Date.now()}`,
      name: name.trim(),
      department,
      viewMode,
      startDateISO: startDate?.toISOString() ?? new Date().toISOString(),
      endDateISO: endDate?.toISOString() ?? new Date().toISOString(),
      includePending: viewMode === "operational",
    };
    const next = [cfg, ...savedConfigs].slice(0, 20);
    setSavedConfigs(next);
    try {
      window.localStorage.setItem("dept_reports_saved_configs", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const applyConfig = (cfg: (typeof savedConfigs)[number]) => {
    setDepartment(cfg.department);
    setViewMode(cfg.viewMode);
    setStartDate(new Date(cfg.startDateISO));
    setEndDate(new Date(cfg.endDateISO));
  };

  const applyPreset = (preset: "thisMonth" | "lastMonth" | "last30" | "ytd") => {
    const n = new Date();
    if (preset === "thisMonth") {
      setStartDate(new Date(n.getFullYear(), n.getMonth(), 1));
      setEndDate(new Date(n.getFullYear(), n.getMonth() + 1, 0));
      return;
    }
    if (preset === "lastMonth") {
      setStartDate(new Date(n.getFullYear(), n.getMonth() - 1, 1));
      setEndDate(new Date(n.getFullYear(), n.getMonth(), 0));
      return;
    }
    if (preset === "last30") {
      const end = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
      setStartDate(start);
      setEndDate(end);
      return;
    }
    // ytd
    setStartDate(new Date(n.getFullYear(), 0, 1));
    setEndDate(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
  };

  const printReport = () => {
    if (typeof window === "undefined" || !totals) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const from = startDate ? startDate.toISOString().slice(0, 10) : "";
    const to = endDate ? endDate.toISOString().slice(0, 10) : "";
    const title = `Department Finance — ${activeDeptLabel}`;
    const mode = viewMode === "operational" ? "Operational (includes pending)" : "Finance (approved/success only)";
    w.document.write(`<!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding:24px; color:#0f172a;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:16px;">
            <div>
              <h1 style="margin:0; font-size:20px;">${title}</h1>
              <p style="margin:6px 0 0 0; font-size:12px; color:#64748b;">
                Period: ${from} → ${to} • View: ${mode}
              </p>
            </div>
            <div style="width:10px; height:10px; border-radius:999px; background:${accentColor}; margin-top:8px;"></div>
          </div>
          <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:12px; margin-bottom:16px;">
            <div style="border:1px solid #e2e8f0; border-radius:14px; padding:12px;">
              <div style="font-size:12px; color:#64748b; font-weight:600;">Total Income</div>
              <div style="font-size:14px; font-weight:700; margin-top:4px; color:#166534;">${fmt(totals.totalIncome)}</div>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:14px; padding:12px;">
              <div style="font-size:12px; color:#64748b; font-weight:600;">Total Expenses</div>
              <div style="font-size:14px; font-weight:700; margin-top:4px; color:#b91c1c;">${fmt(totals.totalExpenses)}</div>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:14px; padding:12px;">
              <div style="font-size:12px; color:#64748b; font-weight:600;">Net Profit</div>
              <div style="font-size:14px; font-weight:700; margin-top:4px; color:${totals.profit >= 0 ? "#065f46" : "#991b1b"};">${fmt(totals.profit)}</div>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:14px; padding:12px;">
              <div style="font-size:12px; color:#64748b; font-weight:600;">Outstanding</div>
              <div style="font-size:14px; font-weight:700; margin-top:4px; color:${totals.outstanding > 0 ? "#b45309" : "#334155"};">${fmt(totals.outstanding)}</div>
            </div>
          </div>
          <h2 style="font-size:14px; margin:18px 0 10px 0;">Department breakdown</h2>
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="text-align:left; padding:8px; border-bottom:1px solid #e2e8f0;">Department</th>
                <th style="text-align:right; padding:8px; border-bottom:1px solid #e2e8f0;">Income</th>
                <th style="text-align:right; padding:8px; border-bottom:1px solid #e2e8f0;">Expenses</th>
                <th style="text-align:right; padding:8px; border-bottom:1px solid #e2e8f0;">Profit</th>
                <th style="text-align:right; padding:8px; border-bottom:1px solid #e2e8f0;">Margin</th>
              </tr>
            </thead>
            <tbody>
              ${(report?.allDepartments ?? [])
                .filter((d: any) => (d.totalIncome ?? 0) > 0 || (d.totalExpenses ?? 0) > 0)
                .map((d: any) => {
                  const margin = d.totalIncome > 0 ? ((d.profit / d.totalIncome) * 100).toFixed(1) : "0.0";
                  const name = DEPARTMENT_OPTIONS.find((o) => o.value === d.department)?.label ?? d.department;
                  return `<tr>
                    <td style="padding:8px; border-bottom:1px solid #eef2f7;">${name}</td>
                    <td style="padding:8px; border-bottom:1px solid #eef2f7; text-align:right;">${fmt(d.totalIncome ?? 0)}</td>
                    <td style="padding:8px; border-bottom:1px solid #eef2f7; text-align:right;">${fmt(d.totalExpenses ?? 0)}</td>
                    <td style="padding:8px; border-bottom:1px solid #eef2f7; text-align:right;">${fmt(d.profit ?? 0)}</td>
                    <td style="padding:8px; border-bottom:1px solid #eef2f7; text-align:right;">${margin}%</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="min-h-screen bg-slate-50/60" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Hero — full-width gradient strip + content */}
      <div
        className="relative overflow-hidden border-b border-slate-200/80"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[#ff6d00]/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#5a189a]/25 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-xl"
                style={{
                  background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                  boxShadow: "0 8px 24px rgba(255, 109, 0, 0.4)",
                }}
              >
                <BarChart2 className="h-7 w-7 text-white" aria-hidden />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-sm font-medium text-slate-300">{activeDeptLabel}</span>
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Department Reports
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Income, expenses, margin & trends
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={printReport}
                className="border-slate-500/50 bg-white/5 font-medium text-slate-200 hover:bg-white/10 hover:text-white hover:border-slate-400/50"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => exportReport("csv")}
                loading={exportingFormat === "csv"}
                className="border-slate-500/50 bg-white/5 font-medium text-slate-200 hover:bg-white/10 hover:text-white hover:border-slate-400/50"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button
                type="button"
                onClick={() => exportReport("pdf")}
                loading={exportingFormat === "pdf"}
                className="font-semibold text-white shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                  boxShadow: "0 4px 20px rgba(255, 109, 0, 0.4)",
                }}
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters & date range — full width */}
        <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">Filters & date range</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={saveCurrentConfig}
              className="text-slate-500 hover:text-[#5a189a]"
            >
              <Bookmark className="mr-1.5 h-3.5 w-3.5" />
              Save preset
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <AppReactSelect
                label="Department"
                value={department}
                onChange={setDepartment}
                options={[
                  { value: "", label: "All Departments" },
                  ...DEPARTMENT_OPTIONS,
                ]}
              />
            </div>
            <div className="lg:col-span-2">
              <AppReactSelect
                label="View"
                value={viewMode}
                onChange={(v) =>
                  setViewMode((v as "finance" | "operational") || "finance")
                }
                options={VIEW_MODE_OPTIONS}
              />
            </div>
            <div className="lg:col-span-4 grid grid-cols-2 gap-3">
              <AppDatePicker label="From" selected={startDate} onChange={(d) => setStartDate(d ?? startDate)} />
              <AppDatePicker label="To" selected={endDate} onChange={(d) => setEndDate(d ?? endDate)} />
            </div>
            <div className="lg:col-span-3 flex flex-wrap items-end gap-2">
              {[
                { id: "thisMonth", label: "This month" as const },
                { id: "lastMonth", label: "Last month" as const },
                { id: "last30", label: "Last 30d" as const },
                { id: "ytd", label: "YTD" as const },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCompareEnabled((v) => !v)}
                className={
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition " +
                  (compareEnabled
                    ? "border-[#ff6d00]/50 bg-[#ff6d00]/15 text-[#ff6d00]"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100")
                }
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Compare
              </button>
            </div>
          </div>
          {savedConfigs.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saved</span>
              {savedConfigs.slice(0, 6).map((cfg) => (
                <button
                  key={cfg.id}
                  type="button"
                  onClick={() => applyConfig(cfg)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {cfg.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
              />
            ))}
          </div>
        ) : totals ? (
          <>
            {/* At a glance */}
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">At a glance</h2>
            <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <KpiCard
                title="Total Income"
                value={fmt(totals.totalIncome)}
                icon={TrendingUp}
                accent="green"
                hint={
                  compareEnabled && compareTotals
                    ? (() => {
                        const d = delta(totals.totalIncome, compareTotals.totalIncome);
                        if (!d || d.pct == null) return "—";
                        return `${d.pct >= 0 ? "+" : ""}${d.pct.toFixed(1)}% vs prev`;
                      })()
                    : undefined
                }
              />
              <KpiCard
                title="Total Expenses"
                value={fmt(totals.totalExpenses)}
                icon={TrendingDown}
                accent="red"
                hint={
                  compareEnabled && compareTotals
                    ? (() => {
                        const d = delta(totals.totalExpenses, compareTotals.totalExpenses);
                        if (!d || d.pct == null) return "—";
                        return `${d.pct >= 0 ? "+" : ""}${d.pct.toFixed(1)}% vs prev`;
                      })()
                    : undefined
                }
              />
              <KpiCard
                title="Net Profit"
                value={fmt(totals.profit)}
                icon={DollarSign}
                accent={totals.profit < 0 ? "red" : "orange"}
                hint={
                  totals.totalIncome > 0
                    ? `Margin ${((totals.profit / totals.totalIncome) * 100).toFixed(1)}%`
                    : undefined
                }
              />
              <KpiCard
                title="Total Invoiced"
                value={fmt(totals.totalInvoiced)}
                icon={CreditCard}
                accent="purple"
              />
              <KpiCard
                title="Outstanding"
                value={fmt(totals.outstanding)}
                icon={AlertCircle}
                accent={totals.outstanding > 0 ? "amber" : "purple"}
              />
            </div>

            {/* Department breakdown */}
            <div className="mb-10 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="border-b border-slate-200/80 bg-slate-50/50 px-5 py-3.5 sm:px-6">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-[#5a189a]" aria-hidden />
                  <h2 className="text-base font-semibold text-slate-900">Department Breakdown</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Department</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Income</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Expenses</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Net Profit</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Invoiced</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Outstanding</th>
                      <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.allDepartments
                      .filter(
                        (d: { totalIncome: number; totalExpenses: number }) =>
                          d.totalIncome > 0 || d.totalExpenses > 0
                      )
                      .map((dept: {
                        department: string;
                        totalIncome: number;
                        totalExpenses: number;
                        profit: number;
                        totalInvoiced: number;
                        outstanding: number;
                      }) => {
                        const margin =
                          dept.totalIncome > 0
                            ? ((dept.profit / dept.totalIncome) * 100).toFixed(1)
                            : "0.0";
                        return (
                          <tr key={dept.department} className="text-slate-700 transition-colors hover:bg-slate-50/80">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-3 w-3 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: DEPT_COLORS[dept.department] ?? "#6b7280",
                                  }}
                                />
                                <span className="font-medium capitalize">
                                  {DEPARTMENT_OPTIONS.find((o) => o.value === dept.department)?.label ??
                                    dept.department}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right font-medium text-emerald-600">
                              {fmt(dept.totalIncome)}
                            </td>
                            <td className="px-5 py-3.5 text-right text-red-600">
                              {fmt(dept.totalExpenses)}
                            </td>
                            <td
                              className={`px-5 py-3.5 text-right font-semibold ${
                                dept.profit >= 0 ? "text-emerald-700" : "text-red-700"
                              }`}
                            >
                              {fmt(dept.profit)}
                            </td>
                            <td className="px-5 py-3.5 text-right">{fmt(dept.totalInvoiced)}</td>
                            <td className="px-5 py-3.5 text-right">
                              {dept.outstanding > 0 ? (
                                <span className="text-amber-600 font-medium">{fmt(dept.outstanding)}</span>
                              ) : (
                                fmt(0)
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <Badge
                                variant={
                                  Number(margin) >= 50
                                    ? "success"
                                    : Number(margin) >= 0
                                      ? "warning"
                                      : "danger"
                                }
                              >
                                {margin}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-100/80 font-semibold text-slate-900">
                      <td className="px-5 py-3.5">Totals</td>
                      <td className="px-5 py-3.5 text-right text-emerald-600">
                        {fmt(totals.totalIncome)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-red-600">
                        {fmt(totals.totalExpenses)}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right ${
                          totals.profit >= 0 ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {fmt(totals.profit)}
                      </td>
                      <td className="px-5 py-3.5 text-right">{fmt(totals.totalInvoiced)}</td>
                      <td className="px-5 py-3.5 text-right text-amber-600">
                        {fmt(totals.outstanding)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {totals.totalIncome > 0 ? (
                          <Badge variant={totals.profit >= 0 ? "success" : "danger"}>
                            {((totals.profit / totals.totalIncome) * 100).toFixed(1)}%
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="border-b border-slate-200/80 bg-slate-50/50 px-5 py-3.5 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-[#ff8500]" aria-hidden />
                      <h2 className="text-base font-semibold text-slate-900">Income vs Expenses by Department</h2>
                    </div>
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {barMode === "stacked" ? "Stacked" : "Grouped"}
                    </span>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          angle={-20}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: unknown) => fmt(Number(v ?? 0))} />
                        <Legend />
                        <Bar
                          dataKey="totalIncome"
                          name="Income"
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                          stackId={barMode === "stacked" ? "a" : undefined}
                        />
                        <Bar
                          dataKey="totalExpenses"
                          name="Expenses"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                          stackId={barMode === "stacked" ? "a" : undefined}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="py-12 text-center text-sm text-slate-400">
                      No data for this period
                    </p>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="border-b border-slate-200/80 bg-slate-50/50 px-5 py-3.5 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#5a189a]" aria-hidden />
                      <h2 className="text-base font-semibold text-slate-900">Daily Income vs Expenses</h2>
                    </div>
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Trend: {trendSeries === "both" ? "Both" : trendSeries === "income" ? "Income" : "Expenses"}
                    </span>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) => {
                            const d = new Date(v);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(v: unknown) => fmt(Number(v ?? 0))}
                          labelFormatter={(v) =>
                            new Date(v).toLocaleDateString("en-GH", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })
                          }
                        />
                        <Legend />
                        {(trendSeries === "both" || trendSeries === "income") && (
                          <Line
                            type="monotone"
                            dataKey="income"
                            name="Income"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        )}
                        {(trendSeries === "both" || trendSeries === "expenses") && (
                          <Line
                            type="monotone"
                            dataKey="expenses"
                            name="Expenses"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="py-12 text-center text-sm text-slate-400">
                      No trend data for this period
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Chart & drill-down — below charts */}
            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">Chart & drill-down</h3>
              <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Trend series</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                    {[
                      { id: "both", label: "Both" as const },
                      { id: "income", label: "Income" as const },
                      { id: "expenses", label: "Expenses" as const },
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setTrendSeries(o.id)}
                        className={
                          "rounded-md px-3 py-1.5 text-xs font-semibold transition " +
                          (trendSeries === o.id
                            ? "bg-white text-slate-900 shadow border border-slate-200"
                            : "text-slate-600 hover:text-slate-900")
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Bar mode</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                    {[
                      { id: "grouped", label: "Grouped" as const },
                      { id: "stacked", label: "Stacked" as const },
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setBarMode(o.id)}
                        className={
                          "rounded-md px-3 py-1.5 text-xs font-semibold transition " +
                          (barMode === o.id
                            ? "bg-white text-slate-900 shadow border border-slate-200"
                            : "text-slate-600 hover:text-slate-900")
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2 border-l border-slate-200 pl-6">
                  <Link
                    href={`/expenses?department=${encodeURIComponent(department || "restaurant")}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 transition hover:border-[#ff8500]/40 hover:bg-[#ff6d00]/5"
                  >
                    View expenses list
                    <span className="text-slate-400">→</span>
                  </Link>
                  {(() => {
                    const deptSlug = (department || urlDepartment || "").toLowerCase();
                    const reportPath = deptSlug ? DEPT_REPORT_PATH[deptSlug] : null;
                    if (!reportPath) return null;
                    return (
                      <Link
                        href={reportPath}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 transition hover:border-[#5a189a]/40 hover:bg-[#5a189a]/5"
                      >
                        Open {activeDeptLabel} report
                        <span className="text-slate-400">→</span>
                      </Link>
                    );
                  })()}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-white py-16 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <p className="text-slate-500">No report data available for the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
