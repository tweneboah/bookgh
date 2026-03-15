"use client";

import { useMemo, useState } from "react";
import { useCorporateReports, useCorporateAccounts } from "@/hooks/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  DollarSign,
  TrendingUp,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 0,
  }).format(n);

function statusVariant(status: string): "success" | "warning" | "danger" | "outline" {
  if (status === "active") return "success";
  if (status === "suspended") return "danger";
  if (status === "inactive") return "warning";
  return "outline";
}

export default function CorporateReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  );
  const [corporateAccountId, setCorporateAccountId] = useState("");

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.startDate = new Date(startDate).toISOString();
    if (endDate) p.endDate = new Date(endDate + "T23:59:59").toISOString();
    if (corporateAccountId) p.corporateAccountId = corporateAccountId;
    return p;
  }, [startDate, endDate, corporateAccountId]);

  const { data, isLoading } = useCorporateReports(params);
  const { data: corporateData } = useCorporateAccounts({ limit: "200" });
  const report = data?.data;

  const corporateOptions = (corporateData?.data ?? []).map((item: any) => ({
    value: item._id,
    label: item.companyName,
  }));

  const accounts = report?.accounts ?? [];
  const kpis = report?.kpis;
  const trend = report?.dailyTrend ?? [];

  const chartAccounts = useMemo(() => accounts.slice(0, 10), [accounts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Corporate Bookings Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Revenue and booking performance for corporate accounts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={corporateAccountId}
            onChange={(e) => setCorporateAccountId(e.target.value)}
            options={[
              { value: "", label: "All Corporate Accounts" },
              ...corporateOptions,
            ]}
            className="w-56"
          />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
          <span className="text-slate-400">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : kpis ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Revenue"
              value={fmt(kpis.totalRevenue)}
              icon={DollarSign}
            />
            <StatCard
              title="Corporate Bookings"
              value={String(kpis.totalBookings)}
              icon={Briefcase}
            />
            <StatCard
              title="Active Accounts"
              value={String(kpis.activeAccounts)}
              icon={Wallet}
            />
            <StatCard
              title="Avg Booking Value"
              value={fmt(kpis.avgBookingValue)}
              icon={TrendingUp}
            />
            <StatCard
              title="Outstanding Balance"
              value={fmt(kpis.totalOutstanding)}
              icon={AlertTriangle}
              className={kpis.totalOutstanding > 0 ? "border-amber-200" : ""}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Corporate Account Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-3 font-medium">Company</th>
                      <th className="pb-3 font-medium text-right">Bookings</th>
                      <th className="pb-3 font-medium text-right">Revenue</th>
                      <th className="pb-3 font-medium text-right">Avg Booking</th>
                      <th className="pb-3 font-medium text-right">Outstanding</th>
                      <th className="pb-3 font-medium text-right">Discount</th>
                      <th className="pb-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((row: any) => (
                      <tr key={String(row.corporateAccountId ?? row.companyName)}>
                        <td className="py-3 font-medium text-slate-800">{row.companyName}</td>
                        <td className="py-3 text-right">{row.totalBookings}</td>
                        <td className="py-3 text-right font-semibold text-green-700">
                          {fmt(row.totalRevenue)}
                        </td>
                        <td className="py-3 text-right">{fmt(row.avgBookingValue)}</td>
                        <td className="py-3 text-right">
                          {row.currentBalance > 0 ? (
                            <span className="text-amber-600">{fmt(row.currentBalance)}</span>
                          ) : (
                            fmt(0)
                          )}
                        </td>
                        <td className="py-3 text-right">{Number(row.negotiatedRate ?? 0).toFixed(1)}%</td>
                        <td className="py-3 text-right">
                          <Badge variant={statusVariant(row.status)}>
                            {String(row.status ?? "-")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Corporate Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {chartAccounts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartAccounts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="companyName"
                        tick={{ fontSize: 11 }}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => fmt(Number(v ?? 0))} />
                      <Legend />
                      <Bar
                        dataKey="totalRevenue"
                        name="Revenue"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="totalBookings"
                        name="Bookings"
                        fill="#16a34a"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-400">
                    No corporate booking data for this period
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Corporate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={trend}>
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
                        formatter={(v: any, name: string) =>
                          name === "Revenue"
                            ? fmt(Number(v ?? 0))
                            : Number(v ?? 0)
                        }
                        labelFormatter={(v) =>
                          new Date(v).toLocaleDateString("en-GH", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="bookings"
                        name="Bookings"
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-400">
                    No trend data for this period
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">No report data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
