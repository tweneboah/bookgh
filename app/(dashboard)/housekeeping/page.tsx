"use client";

import Link from "next/link";
import { Manrope } from "next/font/google";
import {
  useHousekeepingStats,
  useHousekeepingTasks,
} from "@/hooks/api";
import {
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/cn";
import { HOUSEKEEPING_STATUS } from "@/constants";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-housekeeping-manrope",
  display: "swap",
});

function MsIcon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={cn("material-symbols-outlined inline-flex select-none", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  );
}

function getStaffName(user: unknown) {
  if (!user) return "Unassigned";
  if (typeof user === "string") return user;
  if (typeof user === "object") {
    const u = user as { firstName?: string; lastName?: string; email?: string };
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return name || u.email || "Unassigned";
  }
  return "Unassigned";
}

export default function HousekeepingOverviewPage() {
  const { data: statsEnvelope, isLoading: statsLoading } = useHousekeepingStats();
  const counts = statsEnvelope?.data as
    | { total?: number; pending?: number; inProgress?: number; overdue?: number }
    | undefined;

  const { data: recentEnvelope, isLoading: recentLoading } = useHousekeepingTasks({
    limit: "8",
    sort: "-createdAt",
  });
  const recent = ((recentEnvelope?.data as unknown[]) ?? []).slice(0, 6) as Array<{
    _id?: string;
    roomId?: { roomNumber?: string } | string;
    assignedTo?: { firstName?: string; lastName?: string; email?: string } | string;
    taskType?: string;
    dueAt?: string;
    status?: string;
  }>;

  const totalOpen = Number(counts?.total ?? 0);
  const pending = Number(counts?.pending ?? 0);
  const inProgress = Number(counts?.inProgress ?? 0);
  const overdue = Number(counts?.overdue ?? 0);

  const metrics = [
    {
      label: "All open tasks",
      value: statsLoading ? "…" : String(totalOpen),
      icon: "assignment_late",
      iconWrap: "bg-[#a04100]/10 text-[#a04100]",
      hint: "LIVE",
      description: "All open tasks",
    },
    {
      label: "Pending",
      value: statsLoading ? "…" : String(pending),
      icon: "pending",
      iconWrap: "bg-[#cfe2f9]/50 text-[#526478]",
      description: "Pending (Not started)",
    },
    {
      label: "In progress",
      value: statsLoading ? "…" : String(inProgress),
      icon: "mop",
      iconWrap: "bg-[#059eff]/10 text-[#0062a1]",
      description: "In progress",
    },
    {
      label: "Overdue",
      value: statsLoading ? "…" : String(overdue),
      icon: "alarm_on",
      iconWrap: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
      description: "Overdue",
      emphasize: true,
    },
  ];

  return (
    <div
      className={cn(
        manrope.variable,
        "min-h-full bg-[#f7f9fb] p-4 text-[#191c1e] sm:p-6 lg:p-10"
      )}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <h1
            className={cn(
              manrope.className,
              "text-3xl font-extrabold tracking-tight text-[#191c1e] sm:text-4xl"
            )}
          >
            Housekeeping Overview
          </h1>
          <p className="max-w-2xl leading-relaxed text-[#5a4136]">
            Turnover tasks are created automatically at guest checkout. Track SLAs, assign staff,
            and move rooms back to available when cleaning is complete.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/housekeeping/reports"
            className={cn(
              manrope.className,
              "rounded-xl border border-[#a04100]/20 px-5 py-2.5 text-sm font-bold text-[#a04100] transition-colors hover:bg-[#a04100]/5"
            )}
          >
            Reports
          </Link>
          <Link
            href="/housekeeping/board"
            className={cn(
              manrope.className,
              "rounded-xl border border-[#a04100]/20 px-5 py-2.5 text-sm font-bold text-[#a04100] transition-colors hover:bg-[#a04100]/5"
            )}
          >
            Room board
          </Link>
          <Link
            href="/housekeeping/tasks"
            className={cn(
              manrope.className,
              "rounded-xl bg-gradient-to-r from-[#a04100] to-[#ff6b00] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#ff6b00]/20 transition-all active:scale-95"
            )}
          >
            Open task list
          </Link>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={cn(
              "rounded-[1.5rem] bg-white p-6 shadow-[0px_12px_32px_rgba(25,28,30,0.04)] transition-all hover:shadow-[0px_12px_32px_rgba(25,28,30,0.08)]",
              m.emphasize && "border-l-4 border-[#ba1a1a]/20"
            )}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className={cn("rounded-2xl p-3", m.iconWrap)}>
                <MsIcon name={m.icon} className="text-2xl" />
              </div>
              {m.hint && (
                <span className="text-xs font-bold text-[#5a4136]/40 transition-colors hover:text-[#a04100]">
                  {m.hint}
                </span>
              )}
            </div>
            <p
              className={cn(
                manrope.className,
                "mb-1 text-3xl font-extrabold",
                m.emphasize ? "text-[#ba1a1a]" : "text-[#191c1e]"
              )}
            >
              {m.value}
            </p>
            <p className="text-sm font-semibold text-[#5a4136]">{m.description}</p>
          </div>
        ))}
      </section>

      <section className="mb-10 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className={cn(manrope.className, "text-xl font-bold")}>Recent tasks</h2>
          <Link href="/housekeeping/tasks" className="text-sm font-bold text-[#a04100] hover:underline">
            View all
          </Link>
        </div>
        <div className="rounded-[1.5rem] bg-[#f2f4f6] p-2">
          <div className="overflow-hidden rounded-[1.25rem] bg-white">
            {recentLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="p-6 text-sm text-[#5a4136]">No recent housekeeping tasks yet.</div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-[#5a4136]/60">
                    <th className="px-8 py-5">Room Number</th>
                    <th className="px-8 py-5">Task Details</th>
                    <th className="px-8 py-5">Due Time</th>
                    <th className="px-8 py-5">Staff Assigned</th>
                    <th className="px-8 py-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium">
                  {recent.map((row, idx) => {
                    const roomNo =
                      typeof row.roomId === "object" && row.roomId
                        ? row.roomId.roomNumber ?? "—"
                        : "—";
                    const status = String(row.status ?? "");
                    const done =
                      status === HOUSEKEEPING_STATUS.COMPLETED ||
                      status === HOUSEKEEPING_STATUS.INSPECTED;
                    return (
                      <tr
                        key={String(row._id ?? idx)}
                        className="group cursor-pointer transition-colors duration-200 hover:bg-[#f2f4f6]"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6e8ea] font-bold text-[#191c1e]">
                              {roomNo}
                            </div>
                            <span className={cn(manrope.className, "font-bold")}>Room {roomNo}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-[#5a4136]">
                          {String(row.taskType ?? "General Cleaning")
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (c) => c.toUpperCase())}
                        </td>
                        <td className="px-8 py-5 text-[#191c1e]">
                          {row.dueAt
                            ? format(new Date(String(row.dueAt)), "MMM d, h:mm a")
                            : <span className="text-[#5a4136]/50">No due time</span>}
                        </td>
                        <td className="px-8 py-5 text-[#191c1e]">
                          <span className="font-medium">{getStaffName(row.assignedTo)}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          {done ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#059eff] px-3 py-1 text-xs font-bold text-white">
                              <MsIcon name="check_circle" className="text-sm" filled />
                              Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#cfe2f9] px-3 py-1 text-xs font-bold text-[#526478]">
                              <MsIcon name="pending" className="text-sm" />
                              {status || "pending"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="group relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#a04100] to-[#ff6b00] p-8 text-white md:col-span-2">
          <div className="relative z-10">
            <h3 className={cn(manrope.className, "mb-2 text-2xl font-bold")}>
              Staff Efficiency Tracking
            </h3>
            <p className="mb-6 max-w-md text-white/80">
              Average turnover time has improved this week. Keep tracking SLAs to maintain the
              guest-ready standard.
            </p>
            <Link
              href="/housekeeping/reports"
              className={cn(
                manrope.className,
                "inline-flex rounded-xl bg-white/20 px-6 py-2 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/30"
              )}
            >
              View Detailed Insights
            </Link>
          </div>
          <div className="absolute -bottom-[20%] right-[-10%] opacity-10 transition-transform duration-700 group-hover:scale-110">
            <MsIcon name="monitoring" className="text-[200px]" />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 rounded-[1.5rem] bg-[#f2f4f6] p-8 text-center">
          <Sparkles className="h-12 w-12 animate-pulse text-[#a04100]" />
          <div>
            <p className={cn(manrope.className, "text-xl font-bold")}>Predictive Maintenance</p>
            <p className="mt-1 text-sm text-[#5a4136]">
              Analyzing guest feedback for preventative repairs.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
