"use client";

import { useMemo, useState } from "react";
import { useBarReports } from "@/hooks/api";
import {
  AppDatePicker,
  AppReactSelect,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import { Wine, TrendingUp, AlertTriangle, DollarSign, Info } from "lucide-react";
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

export default function BarReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const [metricView, setMetricView] = useState("profit");

  const params = useMemo(
    () => ({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    [startDate, endDate]
  );
  const {
    data,
    isLoading,
    error,
  } = useBarReports(params);
  const report = data?.data;

  const totals = useMemo(() => {
    if (!report) {
      return { revenue: 0, profit: 0, wastage: 0, consumed: 0 };
    }
    const revenue = (report.profitPerProduct ?? []).reduce(
      (sum: number, row: any) => sum + Number(row.revenue ?? 0),
      0
    );
    const profit = (report.profitPerProduct ?? []).reduce(
      (sum: number, row: any) => sum + Number(row.profit ?? 0),
      0
    );
    const wastage = (report.wastage ?? []).reduce(
      (sum: number, row: any) => sum + Number(row.totalWasted ?? 0),
      0
    );
    const consumed = (report.liquorConsumption ?? []).reduce(
      (sum: number, row: any) => sum + Number(row.totalConsumed ?? 0),
      0
    );
    return { revenue, profit, wastage, consumed };
  }, [report]);

  const productChart = useMemo(() => {
    return (report?.profitPerProduct ?? []).slice(0, 10).map((row: any) => ({
      name: row.productName,
      profit: Number(row.profit ?? 0),
      revenue: Number(row.revenue ?? 0),
    }));
  }, [report]);

  const hasAnyData =
    !!report &&
    ((report.profitPerProduct && report.profitPerProduct.length > 0) ||
      (report.salesPerShift && report.salesPerShift.length > 0));

  const headerSubtext = error
    ? "We couldn't load BAR reports for this period. Adjust the dates or try again."
    : hasAnyData
      ? "Liquor consumption, sales per shift, product profit, and wastage trends."
      : "No BAR report data for this period yet. Try expanding the date range.";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">BAR Reports</h1>
            <p className="mt-1 text-sm text-slate-500">{headerSubtext}</p>
            {error ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
                <Info className="h-3.5 w-3.5" />
                <span>Technical detail: {String((error as any)?.message ?? "Unknown error")}</span>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AppDatePicker
              label="From"
              selected={startDate}
              onChange={(date) => setStartDate(date ?? startDate)}
            />
            <AppDatePicker
              label="To"
              selected={endDate}
              onChange={(date) => setEndDate(date ?? endDate)}
            />
            <AppReactSelect
              label="Chart Metric"
              value={metricView}
              onChange={setMetricView}
              options={[
                { value: "profit", label: "Profit by Product" },
                { value: "revenue", label: "Revenue by Product" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-pink-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Revenue</p>
              <DollarSign className="h-5 w-5 text-[#C71585]" />
            </div>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {isLoading ? "…" : fmt(totals.revenue)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Profit</p>
              <TrendingUp className="h-5 w-5 text-[#FF0090]" />
            </div>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {isLoading ? "…" : fmt(totals.profit)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Liquor Consumed</p>
              <Wine className="h-5 w-5 text-violet-600" />
            </div>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {isLoading ? "…" : totals.consumed.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Wastage</p>
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {isLoading ? "…" : totals.wastage.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Top Products</CardTitle>
            </div>
            {!isLoading && !productChart.length ? (
              <Badge variant="outline" className="text-xs text-slate-600">
                No products for this range
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-72 animate-pulse rounded bg-slate-100" />
            ) : !productChart.length ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No product-level BAR sales found for the selected dates.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => fmt(Number(v ?? 0))} />
                  <Bar
                    dataKey={metricView}
                    fill={metricView === "profit" ? "#C71585" : "#FF0090"}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Sales Per Shift</CardTitle>
            {!isLoading && !(report?.salesPerShift ?? []).length ? (
              <Badge variant="outline" className="text-xs text-slate-600">
                No shifts in range
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-72 animate-pulse rounded bg-slate-100" />
            ) : !(report?.salesPerShift ?? []).length ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No BAR shifts with sales found for the selected dates.
              </p>
            ) : (
              <div className="max-h-[320px] overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2">Shift</th>
                      <th className="py-2 text-right">Orders</th>
                      <th className="py-2 text-right">Avg Ticket</th>
                      <th className="py-2 text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(report?.salesPerShift ?? []).map((row: any) => (
                      <tr key={String(row.shiftId ?? row.shiftName)}>
                        <td className="py-2 text-slate-700">{row.shiftName}</td>
                        <td className="py-2 text-right">{row.orderCount}</td>
                        <td className="py-2 text-right">{fmt(Number(row.avgTicket ?? 0))}</td>
                        <td className="py-2 text-right font-medium text-slate-900">
                          {fmt(Number(row.salesAmount ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
