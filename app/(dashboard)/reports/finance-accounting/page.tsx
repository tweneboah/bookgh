"use client";

import { useMemo, useState } from "react";
import { useFinanceAccountingReports } from "@/hooks/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 0,
  }).format(n);

export default function FinanceAccountingReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  );
  const [viewMode, setViewMode] = useState<"finance" | "operational">("finance");

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.startDate = new Date(startDate).toISOString();
    if (endDate) p.endDate = new Date(endDate + "T23:59:59").toISOString();
    if (viewMode === "operational") p.includePending = "true";
    return p;
  }, [startDate, endDate, viewMode]);

  const { data, isLoading } = useFinanceAccountingReports(params);
  const report = data?.data;
  const branch = report?.branchProfitability;
  const departments = report?.departmentComparison ?? [];
  const cashFlow = report?.cashFlowSummary ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Finance & Accounting</h1>
          <p className="mt-1 text-sm text-slate-500">
            Branch profitability, department comparison, cash flow and revenue trends
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={viewMode}
            onChange={(e) => setViewMode((e.target.value as "finance" | "operational") ?? "finance")}
            options={[
              { value: "finance", label: "Finance View" },
              { value: "operational", label: "Operational View" },
            ]}
            className="w-40"
          />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          <span className="text-slate-400">to</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Branch Revenue" value={fmt(branch?.revenue ?? 0)} icon={TrendingUp} />
            <StatCard title="Branch Expenses" value={fmt(branch?.expenses ?? 0)} icon={TrendingDown} />
            <StatCard
              title="Branch Profit"
              value={fmt(branch?.profit ?? 0)}
              icon={DollarSign}
              className={(branch?.profit ?? 0) >= 0 ? "border-emerald-200" : "border-red-200"}
            />
            <StatCard title="Profit Margin" value={`${branch?.profitMargin ?? 0}%`} icon={Wallet} />
            <StatCard title="Tax Collected" value={fmt(report?.taxReports?.totalTaxCollected ?? 0)} icon={BarChart3} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Department</th>
                        <th className="pb-3 font-medium text-right">Revenue</th>
                        <th className="pb-3 font-medium text-right">Expenses</th>
                        <th className="pb-3 font-medium text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {departments.length ? (
                        departments.map((row: any) => (
                          <tr key={row.department}>
                            <td className="py-3 capitalize">{row.department}</td>
                            <td className="py-3 text-right text-green-600">{fmt(row.revenue ?? 0)}</td>
                            <td className="py-3 text-right text-red-600">{fmt(row.expenses ?? 0)}</td>
                            <td className="py-3 text-right">
                              <Badge variant={(row.profit ?? 0) >= 0 ? "success" : "danger"}>
                                {fmt(row.profit ?? 0)}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-8 text-center text-slate-400" colSpan={4}>
                            No department data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {cashFlow.length ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={cashFlow}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => fmt(Number(v ?? 0))} />
                      <Legend />
                      <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#16a34a" strokeWidth={2} />
                      <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#dc2626" strokeWidth={2} />
                      <Line type="monotone" dataKey="net" name="Net" stroke="#C71585" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-sm text-slate-400">No cash flow data</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {cashFlow.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cashFlow}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => fmt(Number(v ?? 0))} />
                      <Legend />
                      <Bar dataKey="inflow" name="Revenue" fill="#FF0090" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-sm text-slate-400">No revenue trend data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tax Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(report?.taxReports?.byTaxType ?? []).length ? (
                    report.taxReports.byTaxType.map((tax: any) => (
                      <div key={tax.taxType} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                        <div>
                          <p className="font-medium text-slate-900">{tax.taxType}</p>
                          <p className="text-xs text-slate-500">Avg rate: {tax.avgTaxRate}%</p>
                        </div>
                        <p className="font-semibold text-slate-900">{fmt(tax.totalTaxAmount ?? 0)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No tax records for this period.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
