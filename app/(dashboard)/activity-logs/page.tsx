"use client";

import { useState } from "react";
import {
  IoListOutline,
  IoPersonOutline,
  IoTimeOutline,
  IoChevronBack,
  IoChevronForward,
  IoDocumentTextOutline,
  IoGlobeOutline,
  IoPulseOutline,
} from "react-icons/io5";
import { useActivityLogs, useUsers } from "@/hooks/api";
import { AppReactSelect } from "@/components/ui/react-select";
import { format } from "date-fns";
import { cn } from "@/lib/cn";

const RESOURCE_OPTIONS = [
  { value: "", label: "All resources" },
  { value: "booking", label: "Booking" },
  { value: "guest", label: "Guest" },
  { value: "room", label: "Room" },
  { value: "user", label: "User" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment" },
  { value: "branch", label: "Branch" },
  { value: "tenant", label: "Tenant" },
];

type LogItem = {
  _id: string;
  userId?: string | { _id: string; firstName?: string; lastName?: string };
  action?: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  createdAt?: string;
};

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [resource, setResource] = useState("");

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (userId) params.userId = userId;
  if (resource) params.resource = resource;

  const { data, isLoading } = useActivityLogs(params);
  const { data: usersData } = useUsers({ limit: "100" });

  const items = (data?.data ?? data) as LogItem[];
  const pagination = (data?.meta as {
    pagination?: { page: number; limit: number; total: number };
  })?.pagination;
  const users = (usersData?.data ?? usersData) as
    | Array<{ _id: string; firstName?: string; lastName?: string; email?: string }>
    | undefined;
  const userList = Array.isArray(users) ? users : [];

  const getUserName = (
    uid: string | { _id: string; firstName?: string; lastName?: string } | undefined
  ) => {
    if (!uid) return "—";
    if (typeof uid === "object" && uid.firstName != null) {
      return `${uid.firstName ?? ""} ${uid.lastName ?? ""}`.trim() || (uid as { email?: string }).email || "—";
    }
    const u = userList.find((x) => x._id === uid);
    return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "—" : String(uid);
  };

  const userOptions = [
    { value: "", label: "All users" },
    ...userList.map((u) => ({
      value: u._id,
      label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u._id,
    })),
  ];

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) || 1 : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && items.length === 0;
  const totalCount = pagination?.total ?? 0;

  return (
    <div className="min-h-full bg-slate-50/60 font-sans">
      {/* Top: gradient strip + title + filters */}
      <header
        className="relative overflow-hidden px-4 py-6 sm:px-6 md:px-8"
        style={{
          background: "linear-gradient(135deg, #240046 0%, #3c096c 50%, #5a189a 100%)",
          boxShadow: "0 4px 24px -4px rgba(36, 0, 70, 0.25)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,rgba(255,125,0,0.12),transparent)]" />
        <div className="relative mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Activity Logs
              </h1>
              <p className="mt-0.5 text-sm text-white/80">
                User actions and system events
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <AppReactSelect
                value={userId}
                onChange={(v) => {
                  setUserId(v);
                  setPage(1);
                }}
                options={userOptions}
                placeholder="All users"
                className="min-w-0 flex-1 sm:min-w-[180px] sm:flex-none"
              />
              <AppReactSelect
                value={resource}
                onChange={(v) => {
                  setResource(v);
                  setPage(1);
                }}
                options={RESOURCE_OPTIONS}
                placeholder="All resources"
                className="min-w-0 flex-1 sm:min-w-[160px] sm:flex-none"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">
          {/* Stats pill */}
          {!isEmpty && pagination && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)" }}
              >
                <IoPulseOutline className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-medium text-slate-600">
                <span className="font-semibold text-slate-900">{totalCount}</span> total entries
              </span>
            </div>
          )}

          {/* Timeline list */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]">
            {isLoading ? (
              <div className="p-6 sm:p-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-4 pb-6 last:pb-0">
                    <div className="h-3 w-3 shrink-0 rounded-full bg-slate-200" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-2/3 max-w-xs animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-1/2 max-w-[140px] animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: "linear-gradient(135deg, rgba(255,109,0,0.12) 0%, rgba(255,158,0,0.08) 100%)" }}
                >
                  <IoListOutline className="h-8 w-8 text-[#ff8500]" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">No activity yet</h3>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Logs will show here as your team uses the platform.
                </p>
              </div>
            ) : (
              <div className="relative py-6 sm:py-8">
                {/* Vertical line */}
                <div
                  className="absolute left-[19px] top-6 bottom-6 w-px sm:left-[23px]"
                  style={{ background: "linear-gradient(180deg, #ff8500 0%, #9d4edd 100%)", opacity: 0.35 }}
                  aria-hidden
                />
                <ul className="relative space-y-0">
                  {items.map((row, index) => (
                    <li key={row._id} className="group">
                      <div className="flex gap-4 px-6 py-3 sm:gap-5 sm:px-8 sm:py-4">
                        <div
                          className={cn(
                            "relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-white sm:mt-2 sm:h-4 sm:w-4",
                            index % 2 === 0
                              ? "bg-[#ff8500]"
                              : "bg-[#7b2cbf]"
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors group-hover:border-slate-200 group-hover:bg-white group-hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
                          <p className="text-sm font-semibold text-slate-900">
                            {row.action ?? "—"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <IoPersonOutline className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                              {getUserName(row.userId)}
                            </span>
                            {row.resource && (
                              <span className="flex items-center gap-1.5">
                                <IoDocumentTextOutline className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                                {row.resource}
                                {row.resourceId && (
                                  <span className="font-mono text-slate-400">{row.resourceId}</span>
                                )}
                              </span>
                            )}
                            {row.ipAddress && (
                              <span className="flex items-center gap-1.5">
                                <IoGlobeOutline className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                                {row.ipAddress}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                            <IoTimeOutline className="h-3.5 w-3.5" aria-hidden />
                            {row.createdAt
                              ? format(new Date(row.createdAt), "MMM d, yyyy · HH:mm")
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pagination */}
            {pagination && !isEmpty && (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-4 py-4 sm:flex-row sm:px-6 sm:py-5">
                <p className="text-sm text-slate-500">
                  <span className="font-medium text-slate-700">
                    {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{" "}
                  of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!hasPrev || isLoading}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a189a]/30",
                      hasPrev
                        ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        : "border-slate-100 bg-slate-50 text-slate-400"
                    )}
                    aria-label="Previous page"
                  >
                    <IoChevronBack className="h-4 w-4" />
                    Prev
                  </button>
                  <span className="rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext || isLoading}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#ff8500]/40 focus:ring-offset-2",
                      hasNext && "shadow-[0_2px_8px_-2px_rgba(255,109,0,0.4)]"
                    )}
                    style={
                      hasNext
                        ? { background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)" }
                        : { background: "#94a3b8" }
                    }
                    aria-label="Next page"
                  >
                    Next
                    <IoChevronForward className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
