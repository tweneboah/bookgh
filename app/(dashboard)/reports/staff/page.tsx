"use client";

import { useMemo, useState } from "react";
import { useStaffReports } from "@/hooks/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Users, Clock3, CalendarCheck, Award } from "lucide-react";

const fmtPct = (n: number) => `${Math.round(n * 100) / 100}%`;

export default function StaffReportsPage() {
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

  const { data, isLoading } = useStaffReports(params);
  const report = data?.data;

  const attendanceRows = report?.topAttendance ?? [];
  const performanceRows = report?.topPerformance ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Staff Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Attendance, performance trends, and salary summary readiness
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Headcount" value={String(report?.headcount ?? 0)} icon={Users} />
            <StatCard
              title="Attendance Rate"
              value={fmtPct(report?.attendance?.attendanceRate ?? 0)}
              icon={CalendarCheck}
            />
            <StatCard
              title="Total Hours"
              value={String(Math.round(report?.attendance?.totalHours ?? 0))}
              icon={Clock3}
            />
            <StatCard
              title="Avg Hours / Record"
              value={String(report?.attendance?.averageHoursPerRecord ?? 0)}
              icon={Award}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Staff</th>
                        <th className="pb-3 font-medium text-right">Days</th>
                        <th className="pb-3 font-medium text-right">Present</th>
                        <th className="pb-3 font-medium text-right">Late</th>
                        <th className="pb-3 font-medium text-right">Absent</th>
                        <th className="pb-3 font-medium text-right">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceRows.length ? (
                        attendanceRows.map((row: any) => (
                          <tr key={row.userId} className="text-slate-700">
                            <td className="py-3">{row.userName || "Unknown staff"}</td>
                            <td className="py-3 text-right">{row.totalDays ?? 0}</td>
                            <td className="py-3 text-right">{row.presentCount ?? 0}</td>
                            <td className="py-3 text-right">{row.lateCount ?? 0}</td>
                            <td className="py-3 text-right">{row.absentCount ?? 0}</td>
                            <td className="py-3 text-right">{row.totalHours ?? 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-8 text-center text-slate-400" colSpan={6}>
                            No attendance data for this period
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
                <CardTitle>Top Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="pb-3 font-medium">Staff</th>
                        <th className="pb-3 font-medium text-right">Avg Score</th>
                        <th className="pb-3 font-medium text-right">Reviews</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {performanceRows.length ? (
                        performanceRows.map((row: any) => (
                          <tr key={row.userId} className="text-slate-700">
                            <td className="py-3">{row.userName || "Unknown staff"}</td>
                            <td className="py-3 text-right">{row.averageScore ?? 0}</td>
                            <td className="py-3 text-right">{row.reviews ?? 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-8 text-center text-slate-400" colSpan={3}>
                            No performance reviews for this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Salary Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                {report?.salarySummary?.message ??
                  "Payroll module not enabled yet. Salary summary will be available once payroll is added."}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
