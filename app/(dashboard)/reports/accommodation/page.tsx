"use client";

import { useState, useMemo } from "react";
import { useAccommodationReports } from "@/hooks/api";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui";
import {
  BedDouble,
  TrendingUp,
  Percent,
  DollarSign,
  XCircle,
  UserX,
  CalendarCheck,
  BarChart3,
  Download,
  Tag,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 0,
  }).format(n);

export default function AccommodationReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  );

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.startDate = new Date(startDate).toISOString();
    if (endDate) p.endDate = new Date(endDate + "T23:59:59").toISOString();
    return p;
  }, [startDate, endDate]);

  const { data, isLoading } = useAccommodationReports(params);
  const report = data?.data;
  const kpis = report?.kpis;
  const [downloading, setDownloading] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Accommodation Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Key performance indicators for room operations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCsv}
            disabled={downloading || !report}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : kpis ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Room Revenue"
              value={fmt(kpis.totalRoomRevenue)}
              icon={DollarSign}
            />
            <StatCard
              title="Occupancy Rate"
              value={`${kpis.occupancyRate}%`}
              icon={Percent}
            />
            <StatCard
              title="ADR"
              value={fmt(kpis.adr)}
              description="Average Daily Rate"
              icon={TrendingUp}
            />
            <StatCard
              title="RevPAR"
              value={fmt(kpis.revpar)}
              description="Revenue Per Available Room"
              icon={BarChart3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Rooms"
              value={kpis.totalRooms}
              icon={BedDouble}
            />
            <StatCard
              title="Total Bookings"
              value={kpis.totalBookings}
              icon={CalendarCheck}
            />
            <StatCard
              title="Cancellation Rate"
              value={`${kpis.cancellationRate}%`}
              description={`${kpis.cancelledBookings} cancelled`}
              icon={XCircle}
            />
            <StatCard
              title="No-Show Rate"
              value={`${kpis.noShowRate}%`}
              description={`${kpis.noShowBookings} no-shows`}
              icon={UserX}
            />
          </div>

          {report.rateVariance && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase text-slate-500">Avg base rate</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {fmt(report.rateVariance.averageBaseRate)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase text-slate-500">Avg achieved rate</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {fmt(report.rateVariance.averageAchievedRate)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase text-slate-500">Rate variance</p>
                  <p className={`mt-1 text-xl font-semibold ${(report.rateVariance.variancePercent ?? 0) >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                    {(report.rateVariance.variancePercent ?? 0) >= 0 ? "+" : ""}
                    {report.rateVariance.variancePercent ?? 0}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {report.bySource && report.bySource.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[#5a189a]" />
                  Bookings & revenue by source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Source</th>
                        <th className="pb-3 font-medium text-right">Bookings</th>
                        <th className="pb-3 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.bySource.map((r: any, i: number) => (
                        <tr key={r.source ?? i} className="text-slate-700">
                          <td className="py-2.5 font-medium capitalize">{r.source ?? "-"}</td>
                          <td className="py-2.5 text-right">{r.bookings ?? 0}</td>
                          <td className="py-2.5 text-right font-medium">{fmt(r.revenue ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {report.occupancyForecast && report.occupancyForecast.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#ff6d00]" />
                  Next 7 days occupancy forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium text-right">Occupied</th>
                        <th className="pb-3 font-medium text-right">Total rooms</th>
                        <th className="pb-3 font-medium text-right">Occupancy %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.occupancyForecast.map((f: any, i: number) => (
                        <tr key={f.date ?? i} className="text-slate-700">
                          <td className="py-2.5 font-medium">{f.date}</td>
                          <td className="py-2.5 text-right">{f.occupiedRooms ?? 0}</td>
                          <td className="py-2.5 text-right">{f.totalRooms ?? 0}</td>
                          <td className="py-2.5 text-right font-medium">{f.occupancyPct ?? 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {report.dailyRevenue?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={report.dailyRevenue}>
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
                        formatter={(v: any) => [fmt(Number(v ?? 0)), "Revenue"]}
                        labelFormatter={(v) =>
                          new Date(v).toLocaleDateString("en-GH", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ fill: "#2563eb", r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-400">
                    No revenue data for this period
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Room</CardTitle>
              </CardHeader>
              <CardContent>
                {report.revenueByRoom?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={report.revenueByRoom.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="roomNumber"
                        tick={{ fontSize: 12 }}
                        label={{
                          value: "Room",
                          position: "insideBottom",
                          offset: -5,
                          style: { fontSize: 12 },
                        }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(v: any) => [fmt(Number(v ?? 0)), "Revenue"]}
                      />
                      <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-400">
                    No room revenue data for this period
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {report.revenueByRoom?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Per Room Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Room</th>
                        <th className="pb-3 font-medium">Floor</th>
                        <th className="pb-3 font-medium text-right">
                          Bookings
                        </th>
                        <th className="pb-3 font-medium text-right">Nights</th>
                        <th className="pb-3 font-medium text-right">
                          Revenue
                        </th>
                        <th className="pb-3 font-medium text-right">
                          Avg/Night
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.revenueByRoom.map((r: any) => (
                        <tr key={r.roomId} className="text-slate-700">
                          <td className="py-2.5 font-medium">
                            {r.roomNumber ?? "-"}
                          </td>
                          <td className="py-2.5">
                            {r.floor != null ? `Floor ${r.floor}` : "-"}
                          </td>
                          <td className="py-2.5 text-right">{r.bookings}</td>
                          <td className="py-2.5 text-right">{r.nights}</td>
                          <td className="py-2.5 text-right font-medium">
                            {fmt(r.revenue)}
                          </td>
                          <td className="py-2.5 text-right">
                            {r.nights > 0
                              ? fmt(r.revenue / r.nights)
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
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
