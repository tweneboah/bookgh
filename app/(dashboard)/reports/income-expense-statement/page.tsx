"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useIncomeExpenseStatement } from "@/hooks/api";
import { AppReactSelect, AppDatePicker, Button } from "@/components/ui";
import { FileText, TrendingDown, TrendingUp } from "lucide-react";
import { DEPARTMENT } from "@/constants";

const fmt = (n: number) =>
  `₵${new Intl.NumberFormat("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)}`;

const DEPARTMENT_OPTIONS = Object.entries(DEPARTMENT).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, " "),
}));

export default function IncomeExpenseStatementPage() {
  const searchParams = useSearchParams();
  const now = new Date();
  const [startDate, setStartDate] = useState<Date>(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date>(
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
  );
  const [department, setDepartment] = useState<string>(() => searchParams.get("department") ?? "");
  const [includePending, setIncludePending] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    p.startDate = startDate.toISOString();
    p.endDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      23,
      59,
      59,
      999
    ).toISOString();
    if (department) p.department = department;
    if (includePending) p.includePending = "true";
    return p;
  }, [startDate, endDate, department, includePending]);

  const { data, isLoading } = useIncomeExpenseStatement(params);
  const report = data?.data;

  const periodLabel =
    startDate && endDate
      ? `${startDate.toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" })} – ${endDate.toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" })}`
      : "—";

  return (
    <div className="min-h-screen bg-slate-50/60" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#5a189a] to-[#7b2cbf] text-white shadow-lg shadow-[#5a189a]/20">
                <FileText className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Income & Expense Statement
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Revenue and expenses by account (COA) for the period
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <AppReactSelect
                label="Department"
                value={department}
                onChange={setDepartment}
                options={[
                  { value: "", label: "All departments" },
                  ...DEPARTMENT_OPTIONS,
                ]}
              />
            </div>
            <div className="lg:col-span-3 grid grid-cols-2 gap-3">
              <AppDatePicker
                label="From"
                selected={startDate}
                onChange={(d) => setStartDate(d ?? startDate)}
              />
              <AppDatePicker
                label="To"
                selected={endDate}
                onChange={(d) => setEndDate(d ?? endDate)}
              />
            </div>
            <div className="lg:col-span-3 flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={includePending}
                  onChange={(e) => setIncludePending(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]"
                />
                Include pending
              </label>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <p className="text-slate-500">Loading statement…</p>
          </div>
        ) : !report ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <p className="text-slate-500">No data for the selected period.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Income
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {fmt(report.totalIncome)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Expenses
                </p>
                <p className="mt-2 text-2xl font-bold text-red-700">
                  {fmt(report.totalExpenses)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Net Income
                </p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    report.netIncome >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {fmt(report.netIncome)}
                </p>
              </div>
            </div>

            {/* Income section */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="border-b border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden />
                  <h2 className="text-lg font-semibold text-slate-900">Income</h2>
                  <span className="text-sm text-slate-500">({periodLabel})</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {report.incomeByAccount?.length > 0 ? (
                  report.incomeByAccount.map((row: { accountCode: string; label: string; amount: number; count?: number }) => (
                    <div
                      key={row.accountCode}
                      className="flex items-center justify-between px-4 py-3 sm:px-5"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{row.label}</p>
                        {row.count != null && row.count > 0 && (
                          <p className="text-xs text-slate-500">{row.count} transactions</p>
                        )}
                      </div>
                      <p className="font-semibold text-emerald-700">{fmt(row.amount)}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-slate-500 sm:px-5">
                    No income in this period
                  </div>
                )}
              </div>
            </div>

            {/* Expense section */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="border-b border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" aria-hidden />
                  <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
                  <span className="text-sm text-slate-500">({periodLabel})</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {report.expenseByAccount?.length > 0 ? (
                  report.expenseByAccount.map((row: { accountCode: string; label: string; amount: number; count?: number }) => (
                    <div
                      key={row.accountCode}
                      className="flex items-center justify-between px-4 py-3 sm:px-5"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{row.label}</p>
                        {row.count != null && row.count > 0 && (
                          <p className="text-xs text-slate-500">{row.count} transactions</p>
                        )}
                      </div>
                      <p className="font-semibold text-red-700">{fmt(row.amount)}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-slate-500 sm:px-5">
                    No expenses in this period
                  </div>
                )}
              </div>
            </div>

            {/* Net income footer */}
            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-900">Net Income (Loss)</p>
                <p
                  className={`text-xl font-bold ${
                    report.netIncome >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {fmt(report.netIncome)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
