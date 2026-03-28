"use client";

import { useMemo } from "react";
import { useHousekeepingTasks } from "@/hooks/api";
import { Button } from "@/components/ui";
import { BarChart3, Download } from "lucide-react";
import { format } from "date-fns";

export default function HousekeepingReportsPage() {
  const { data: envelope, isLoading } = useHousekeepingTasks({
    limit: "500",
    sort: "-createdAt",
  });

  const rows = (envelope?.data as Record<string, unknown>[]) ?? [];

  const csv = useMemo(() => {
    const headers = [
      "Room",
      "Floor",
      "Task type",
      "Status",
      "Priority",
      "Due",
      "Assigned",
      "Booking ref",
      "Created",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      const room = r.roomId as { roomNumber?: string; floor?: number } | undefined;
      const assignee = r.assignedTo as
        | { firstName?: string; lastName?: string }
        | undefined;
      const booking = r.bookingId as { bookingReference?: string } | undefined;
      const assigned =
        assignee && typeof assignee === "object"
          ? `${assignee.firstName ?? ""} ${assignee.lastName ?? ""}`.trim().replace(/"/g, '""')
          : "";
      const due = r.dueAt ? format(new Date(String(r.dueAt)), "yyyy-MM-dd HH:mm") : "";
      const created = r.createdAt
        ? format(new Date(String(r.createdAt)), "yyyy-MM-dd HH:mm")
        : "";
      lines.push(
        [
          `"${(room?.roomNumber ?? "").replace(/"/g, '""')}"`,
          room?.floor ?? "",
          `"${String(r.taskType ?? "").replace(/"/g, '""')}"`,
          `"${String(r.status ?? "").replace(/"/g, '""')}"`,
          `"${String(r.priority ?? "").replace(/"/g, '""')}"`,
          `"${due}"`,
          `"${assigned}"`,
          `"${(booking?.bookingReference ?? "").replace(/"/g, '""')}"`,
          `"${created}"`,
        ].join(",")
      );
    }
    return lines.join("\n");
  }, [rows]);

  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `housekeeping-tasks-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#5a189a]">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Housekeeping export</h1>
          <p className="mt-1 text-sm text-slate-600">
            Download up to 500 most recent tasks as CSV for spreadsheets or audits.
          </p>
        </div>
        <Button
          type="button"
          onClick={download}
          disabled={isLoading || rows.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 font-semibold text-white shadow-md"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Room</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Due</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No tasks to show.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const room = r.roomId as { roomNumber?: string } | undefined;
                  const assignee = r.assignedTo as { firstName?: string; lastName?: string } | undefined;
                  const name =
                    assignee && typeof assignee === "object"
                      ? `${assignee.firstName ?? ""} ${assignee.lastName ?? ""}`.trim()
                      : "—";
                  return (
                    <tr key={String(r._id)} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {room?.roomNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{String(r.taskType ?? "")}</td>
                      <td className="px-4 py-3 text-slate-600">{String(r.status ?? "")}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.dueAt
                          ? format(new Date(String(r.dueAt)), "MMM d, yyyy h:mm a")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{name || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
