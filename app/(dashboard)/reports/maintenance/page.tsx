"use client";

import { useMemo, useState } from "react";
import { useMaintenanceReports } from "@/hooks/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Wrench, AlertTriangle, Clock3, Wallet } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 0,
  }).format(n);

export default function MaintenanceReportsPage() {
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

  const { data, isLoading } = useMaintenanceReports(params);
  const report = data?.data;
  const cost = report?.maintenanceCostPerBranch;
  const summary = report?.ticketSummary;
  const failures = report?.equipmentFailureFrequency ?? [];
  const downtime = report?.downtimeTracking;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Maintenance Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cost tracking, failure frequency, downtime and preventive performance
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Tickets" value={String(summary?.total ?? 0)} icon={Wrench} />
            <StatCard title="Open Tickets" value={String(summary?.open ?? 0)} icon={AlertTriangle} />
            <StatCard title="Actual Cost" value={fmt(cost?.actualCost ?? 0)} icon={Wallet} />
            <StatCard title="Downtime (hrs)" value={String(downtime?.totalDowntimeHours ?? 0)} icon={Clock3} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Cost Per Branch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Estimated Cost</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{fmt(cost?.estimatedCost ?? 0)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Actual Cost</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{fmt(cost?.actualCost ?? 0)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Ticket Count</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{cost?.ticketCount ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equipment Failure Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                {failures.length ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={failures}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="assetName" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={70} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => Number(v ?? 0)} />
                      <Legend />
                      <Bar dataKey="failureCount" name="Failures" fill="#C71585" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-sm text-slate-400">
                    No equipment failure records for this period
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Downtime Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Total Downtime</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {downtime?.totalDowntimeHours ?? 0} hrs
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Average Downtime</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {downtime?.averageDowntimeHours ?? 0} hrs
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Preventive Tickets</p>
                  <p className="text-lg font-semibold text-slate-900">{summary?.preventive ?? 0}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-3 font-medium">Ticket</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Downtime (hrs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(downtime?.records ?? []).length ? (
                      downtime.records.map((row: any) => (
                        <tr key={row.ticketId}>
                          <td className="py-3">{row.title ?? "-"}</td>
                          <td className="py-3 capitalize">{row.status ?? "-"}</td>
                          <td className="py-3 text-right">{row.downtimeHours ?? 0}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-8 text-center text-slate-400" colSpan={3}>
                          No downtime records in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
