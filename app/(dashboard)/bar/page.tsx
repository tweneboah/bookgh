"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  AppReactSelect,
  AppDatePicker,
} from "@/components/ui";
import { useBarReports, useBarShifts } from "@/hooks/api";
import {
  FiDollarSign,
  FiTrendingUp,
  FiClock,
  FiFileText,
  FiGrid,
  FiPackage,
  FiClipboard,
  FiArchive,
  FiShield,
  FiCalendar,
  FiShoppingCart,
  FiBarChart2,
  FiCreditCard,
  FiPieChart,
  FiFile,
  FiArrowRight,
  FiBook,
} from "react-icons/fi";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const periodOptions = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "Quarter" },
];

function getRange(period: string, baseDate: Date) {
  const dayStart = new Date(baseDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(baseDate);
  dayEnd.setHours(23, 59, 59, 999);

  if (period === "today") {
    return { startDate: dayStart.toISOString(), endDate: dayEnd.toISOString() };
  }

  if (period === "week") {
    const weekStart = new Date(baseDate);
    const day = weekStart.getDay();
    const offset = day === 0 ? 6 : day - 1;
    weekStart.setDate(weekStart.getDate() - offset);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { startDate: weekStart.toISOString(), endDate: weekEnd.toISOString() };
  }

  if (period === "quarter") {
    const quarter = Math.floor(baseDate.getMonth() / 3);
    const quarterStart = new Date(baseDate.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
    const quarterEnd = new Date(baseDate.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
    return { startDate: quarterStart.toISOString(), endDate: quarterEnd.toISOString() };
  }

  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { startDate: monthStart.toISOString(), endDate: monthEnd.toISOString() };
}

type CardAccent = "orange" | "purple" | "emerald" | "amber" | "violet" | "rose" | "sky" | "indigo";

const quickLinks: Array<{
  href: string;
  label: string;
  icon: typeof FiGrid;
  featured?: boolean;
  accent?: CardAccent;
}> = [
  { href: "/bar/menu-items", label: "Menu Items", icon: FiGrid, featured: true },
  { href: "/bar/recipes", label: "Recipes", icon: FiBook, featured: false, accent: "violet" },
  { href: "/bar/orders", label: "Manage Orders", icon: FiClipboard, featured: true },
  { href: "/reports/bar", label: "BAR Reports", icon: FiBarChart2, featured: true },
  { href: "/bar/inventory-items", label: "Inventory Items", icon: FiPackage, accent: "orange" },
  { href: "/bar/inventory", label: "Inventory Movements", icon: FiArchive, accent: "purple" },
  { href: "/bar/stock-control", label: "Stock Control", icon: FiArchive, accent: "sky" },
  { href: "/bar/shifts", label: "Shifts", icon: FiClock, accent: "violet" },
  { href: "/bar/role-matrix", label: "Role Matrix", icon: FiShield, accent: "indigo" },
  { href: "/bar/pricing-rules", label: "Happy Hour Rules", icon: FiCalendar, accent: "amber" },
  { href: "/bar/suppliers", label: "Suppliers", icon: FiPackage, accent: "emerald" },
  { href: "/bar/purchase-orders", label: "Purchase Orders", icon: FiShoppingCart, accent: "sky" },
  { href: "/bar/payments", label: "Payments", icon: FiCreditCard, accent: "emerald" },
  { href: "/bar/expenses", label: "Expenses", icon: FiFileText, accent: "rose" },
  { href: "/bar/accounting", label: "Accounting", icon: FiPieChart, accent: "purple" },
  { href: "/bar/finance", label: "Finance", icon: FiFile, accent: "orange" },
];

const accentStyles: Record<
  CardAccent,
  { iconBg: string; iconColor: string; border: string; hoverBorder: string; hoverShadow: string }
> = {
  orange: {
    iconBg: "bg-[#ff8500]/15",
    iconColor: "text-[#c2410c]",
    border: "border-l-4 border-l-[#ff8500]",
    hoverBorder: "hover:border-[#ff8500]/40",
    hoverShadow: "hover:shadow-[0_8px_24px_rgba(255,133,0,0.15)]",
  },
  purple: {
    iconBg: "bg-[#5a189a]/15",
    iconColor: "text-[#5a189a]",
    border: "border-l-4 border-l-[#5a189a]",
    hoverBorder: "hover:border-[#5a189a]/50",
    hoverShadow: "hover:shadow-[0_8px_24px_rgba(90,24,154,0.15)]",
  },
  emerald: {
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-700",
    border: "border-l-4 border-l-emerald-500",
    hoverBorder: "hover:border-emerald-500/50",
    hoverShadow: "hover:shadow-[0_8px_24px_rgba(16,185,129,0.12)]",
  },
  amber: {
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-700",
    border: "border-l-4 border-l-amber-500",
    hoverBorder: "hover:border-amber-500/50",
    hoverShadow: "hover:shadow-[0_8px_24px_rgba(245,158,11,0.12)]",
  },
  violet: {
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-700",
    border: "border-l-4 border-l-violet-500",
    hoverBorder: "hover:border-violet-500/50",
    hoverShadow: "hover:shadow-[0_8px_24px_rgba(139,92,246,0.12)]",
  },
  rose: {
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-700",
    border: "border-l-4 border-l-rose-500",
    hoverBorder: "hover:border-rose-500/50",
    hoverShadow: "hover:shadow-[0_8px_24px_rgba(244,63,94,0.12)]",
  },
  sky: {
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-700",
    border: "border-l-4 border-l-sky-500",
    hoverBorder: "hover:border-sky-500/50",
    hoverShadow: "hover:shadow-[0_8px_24px_rgba(14,165,233,0.12)]",
  },
  indigo: {
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-700",
    border: "border-l-4 border-l-indigo-500",
    hoverBorder: "hover:border-indigo-500/50",
    hoverShadow: "hover:shadow-[0_8px_24px_rgba(99,102,241,0.12)]",
  },
};

export default function BarOverviewPage() {
  const [period, setPeriod] = useState("month");
  const [referenceDate, setReferenceDate] = useState<Date | null>(new Date());
  const range = useMemo(
    () => getRange(period, referenceDate ?? new Date()),
    [period, referenceDate]
  );
  const { data: reportData } = useBarReports(range);
  const { data: shiftData } = useBarShifts({ isClosed: "false", limit: "5" });

  const report = reportData?.data;
  const activeShiftCount = shiftData?.meta?.pagination?.total ?? 0;
  const totalRevenue = (report?.profitPerProduct ?? []).reduce(
    (sum: number, row: { revenue?: number }) => sum + Number(row.revenue ?? 0),
    0
  );
  const totalProfit = (report?.profitPerProduct ?? []).reduce(
    (sum: number, row: { profit?: number }) => sum + Number(row.profit ?? 0),
    0
  );
  const wastageCount = (report?.wastage ?? []).length;

  const metrics = [
    { label: "Revenue", value: fmt(totalRevenue), icon: FiDollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Profit", value: fmt(totalProfit), icon: FiTrendingUp, color: "text-[#c2410c]", bg: "bg-[#ff8500]/10" },
    { label: "Active Shifts", value: String(activeShiftCount), icon: FiClock, color: "text-[#5a189a]", bg: "bg-[#5a189a]/10" },
    { label: "Wastage Entries", value: String(wastageCount), icon: FiFileText, color: "text-slate-600", bg: "bg-slate-100" },
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header with subtle gradient accent */}
      <header className="relative border-b border-slate-100 bg-white">
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-[#ff6d00] via-[#ff8500] to-[#5a189a] opacity-80"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a189a]">
            Beverage Operations
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            BAR Department
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600 sm:text-base">
            End-to-end control for beverage sales, stock, billing, shift monitoring, and
            performance reporting.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Bento: period controls + metrics in one row on desktop */}
        <div className="mb-8 grid gap-4 lg:grid-cols-3">
          <Card className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Performance period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <AppReactSelect
                label="Period"
                value={period}
                onChange={setPeriod}
                options={periodOptions}
                placeholder="Choose period"
              />
              <AppDatePicker
                label="Reference date"
                selected={referenceDate}
                onChange={setReferenceDate}
                placeholder="Select date"
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Key metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {metrics.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/30 p-3 transition-shadow hover:shadow-sm sm:p-4"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${m.bg} ${m.color}`}>
                      <m.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">{m.label}</p>
                      <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        {m.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions — single card, primary + list */}
        <Card className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <CardHeader className="border-b border-slate-100 bg-slate-50/40 px-4 py-4 sm:px-6">
            <CardTitle className="text-base font-semibold text-slate-900 sm:text-lg">
              Quick actions
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Jump to menu, orders, reports, inventory, and more.
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {/* Primary: Menu Items, Manage Orders, BAR Reports */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {quickLinks
                .filter((l) => l.featured)
                .map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex flex-col items-center rounded-xl border-2 border-slate-100 bg-white py-5 text-center transition-all hover:border-[#ff8500]/40 hover:bg-[#ff8500]/4 hover:shadow-[0_4px_16px_rgba(255,133,0,0.12)]"
                  >
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#ff6d00]/15 via-[#ff8500]/10 to-[#5a189a]/10 text-[#c2410c] transition-colors group-hover:from-[#ff6d00]/25 group-hover:to-[#5a189a]/15">
                      <link.icon className="h-7 w-7" aria-hidden />
                    </div>
                    <span className="block text-sm font-semibold text-slate-900">
                      {link.label}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-slate-500">Open</span>
                  </Link>
                ))}
            </div>

            {/* Divider */}
            <div className="mb-5 h-px bg-slate-100" />

            {/* Secondary actions: colorful premium cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {quickLinks
                .filter((l): l is typeof l & { accent: CardAccent } => !l.featured && !!l.accent)
                .map((link) => {
                  const style = accentStyles[link.accent];
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`group flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all ${style.border} ${style.hoverBorder} ${style.hoverShadow}`}
                    >
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.iconBg} ${style.iconColor} transition-transform group-hover:scale-105`}
                      >
                        <link.icon className="h-6 w-6" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                          {link.label}
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-slate-500">Open</span>
                      </div>
                      <FiArrowRight
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-all group-hover:translate-x-0.5 ${style.iconColor} group-hover:opacity-100`}
                        aria-hidden
                      />
                    </Link>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
