"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IoBedOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoCashOutline,
  IoExitOutline,
  IoAddCircleOutline,
  IoListOutline,
  IoTimeOutline,
  IoArrowUpOutline,
  IoArrowDownOutline,
  IoSparklesOutline,
  IoStatsChartOutline,
  IoNotificationsOutline,
  IoChevronForwardOutline,
  IoFlashOutline,
  IoEllipsisHorizontalOutline,
  IoDocumentTextOutline,
} from "react-icons/io5";
import { useActivityLogs, useBookings, useNotifications, useRooms } from "@/hooks/api";
import { AppDatePicker } from "@/components/ui/date-picker";
import { AppReactSelect } from "@/components/ui/react-select";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/cn";

/* ---------- types ---------- */
type BookingItem = {
  _id: string;
  bookingReference?: string;
  guestId?: { firstName?: string; lastName?: string } | string;
  roomId?: { roomNumber?: string } | string;
  checkInDate?: string;
  checkOutDate?: string;
  status?: string;
  source?: string;
  createdAt?: string;
  totalAmount?: number;
  totalPrice?: number;
  totalCost?: number;
  grandTotal?: number;
  amount?: number;
};
type RoomItem = { _id: string; roomNumber?: string; status?: string };

/* ---------- utilities ---------- */
const statusOptions = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checkedIn", label: "Checked-In" },
  { value: "checkedOut", label: "Checked-Out" },
  { value: "cancelled", label: "Cancelled" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function asNumber(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function statusPill(status?: string) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("checkedin"))
    return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
  if (s.includes("pending"))
    return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
  if (s.includes("confirmed"))
    return { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" };
  if (s.includes("cancel"))
    return { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" };
  if (s.includes("checkedout"))
    return { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  return { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "Just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ---------- main component ---------- */
export default function DashboardPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState<Date | null>(null);

  const bookingParams: Record<string, string> = { page: "1", limit: "50" };
  if (statusFilter) bookingParams.status = statusFilter;

  const { data: bookingsData, isLoading: bookingsLoading } = useBookings(bookingParams);
  const { data: roomsData, isLoading: roomsLoading } = useRooms({ page: "1", limit: "300" });
  const { data: logsData } = useActivityLogs({ page: "1", limit: "6" });
  const { data: notificationsData } = useNotifications({ page: "1", limit: "4" });

  const bookings = (bookingsData?.data ?? []) as BookingItem[];
  const rooms = (roomsData?.data ?? []) as RoomItem[];
  const logs = (logsData?.data ?? logsData ?? []) as Array<{
    _id: string;
    action?: string;
    createdAt?: string;
  }>;
  const notifications = (notificationsData?.data ?? []) as Array<{
    _id: string;
    title?: string;
    message?: string;
    createdAt?: string;
    read?: boolean;
  }>;

  const filteredBookings = useMemo(() => {
    if (!fromDate) return bookings;
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    return bookings.filter((item) => {
      if (!item.checkInDate) return false;
      return new Date(item.checkInDate) >= start;
    });
  }, [bookings, fromDate]);

  /* ----- computed stats ----- */
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const prevWeekStart = new Date(now);
  prevWeekStart.setDate(now.getDate() - 14);

  const newBookings = filteredBookings.filter(
    (item) => item.createdAt && new Date(item.createdAt) >= weekStart
  ).length;
  const previousNewBookings = filteredBookings.filter(
    (item) =>
      item.createdAt &&
      new Date(item.createdAt) >= prevWeekStart &&
      new Date(item.createdAt) < weekStart
  ).length;
  const newBookingsChange = percentChange(newBookings, previousNewBookings);

  const checkedInCount = filteredBookings.filter(
    (item) => (item.status ?? "").toLowerCase() === "checkedin"
  ).length;
  const checkedOutCount = filteredBookings.filter(
    (item) => (item.status ?? "").toLowerCase() === "checkedout"
  ).length;

  const availableRooms = rooms.filter(
    (item) => (item.status ?? "").toLowerCase() === "available"
  ).length;
  const occupiedRooms = rooms.filter(
    (item) => (item.status ?? "").toLowerCase() === "occupied"
  ).length;
  const reservedRooms = rooms.filter(
    (item) => (item.status ?? "").toLowerCase() === "reserved"
  ).length;
  const notReadyRooms = rooms.filter((item) =>
    ["cleaning", "maintenance", "outofservice"].includes(
      (item.status ?? "").toLowerCase()
    )
  ).length;

  const totalRevenue = filteredBookings.reduce(
    (sum, item) =>
      sum +
      asNumber(item.totalAmount, item.totalPrice, item.totalCost, item.grandTotal, item.amount),
    0
  );

  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;
  const recentBookingRows = filteredBookings.slice(0, 6);
  const activityRows = logs.slice(0, 6);
  const taskRows = notifications.slice(0, 4);

  const fullName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "there";
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50/80 to-white pb-10 font-sans">
      {/* ═══════ HERO WELCOME BANNER ═══════ */}
      <section className="relative overflow-hidden px-4 pb-2 pt-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div
            className="relative overflow-hidden rounded-2xl px-5 py-6 sm:px-8 sm:py-8"
            style={{
              background:
                "linear-gradient(135deg, #240046 0%, #3c096c 30%, #5a189a 60%, #7b2cbf 100%)",
              boxShadow: "0 8px 40px -12px rgba(90, 24, 154, 0.5)",
            }}
          >
            {/* Decorative circles */}
            <div
              className="absolute -right-10 -top-10 h-40 w-40 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,133,0,0.25) 0%, transparent 70%)" }}
              aria-hidden
            />
            <div
              className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(157,78,221,0.3) 0%, transparent 70%)" }}
              aria-hidden
            />
            <div
              className="absolute right-20 top-6 h-2 w-2 rounded-full bg-[#ff9e00] opacity-60"
              aria-hidden
            />
            <div
              className="absolute right-32 bottom-8 h-1.5 w-1.5 rounded-full bg-[#ff8500] opacity-40"
              aria-hidden
            />

            <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">
                  {greeting} 👋
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {fullName}
                </h1>
                <p className="mt-1.5 text-sm text-white/60">
                  {now.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/bookings"
                  className="flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/25"
                >
                  <IoAddCircleOutline className="h-4 w-4" />
                  New Booking
                </Link>
                <Link
                  href="/rooms"
                  className="flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/25"
                >
                  <IoBedOutline className="h-4 w-4" />
                  Rooms
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="px-4 pt-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          {/* ═══════ KPI STAT CARDS ═══════ */}
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {/* New Bookings */}
            <article className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:shadow-lg sm:p-5">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: "linear-gradient(90deg, #ff6d00, #ff9e00)" }}
              />
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "rgba(255, 133, 0, 0.1)" }}
              >
                <IoSparklesOutline className="h-5 w-5 text-[#ff8500]" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{newBookings}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">New this week</p>
              {typeof newBookingsChange === "number" && (
                <div
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    newBookingsChange >= 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  )}
                >
                  {newBookingsChange >= 0 ? (
                    <IoArrowUpOutline className="h-3 w-3" />
                  ) : (
                    <IoArrowDownOutline className="h-3 w-3" />
                  )}
                  {newBookingsChange >= 0 ? "+" : ""}
                  {newBookingsChange.toFixed(1)}%
                </div>
              )}
            </article>

            {/* Check-ins */}
            <article className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:shadow-lg sm:p-5">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: "linear-gradient(90deg, #059669, #34d399)" }}
              />
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <IoCheckmarkCircleOutline className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{checkedInCount}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">Check-ins today</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </article>

            {/* Check-outs */}
            <article className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:shadow-lg sm:p-5">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: "linear-gradient(90deg, #5a189a, #9d4edd)" }}
              />
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "rgba(90, 24, 154, 0.08)" }}
              >
                <IoExitOutline className="h-5 w-5 text-[#7b2cbf]" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{checkedOutCount}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">Check-outs today</p>
            </article>

            {/* Revenue */}
            <article className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:shadow-lg sm:p-5">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: "linear-gradient(90deg, #ff6d00, #5a189a)" }}
              />
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "linear-gradient(135deg, rgba(255,133,0,0.12), rgba(90,24,154,0.08))" }}
              >
                <IoCashOutline className="h-5 w-5 text-[#ff8500]" />
              </div>
              <p
                className="mt-3 text-2xl font-bold sm:text-3xl"
                style={{
                  background: "linear-gradient(135deg, #ff6d00, #5a189a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {formatCurrency(totalRevenue)}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">Total revenue</p>
            </article>
          </section>

          {/* ═══════ ROOM AVAILABILITY + OCCUPANCY ═══════ */}
          <section className="mt-6 grid grid-cols-1 gap-4 sm:gap-5 lg:mt-8 lg:grid-cols-3">
            {/* Occupancy rate ring */}
            <article className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:p-6">
              <div className="relative h-28 w-28 sm:h-32 sm:w-32">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${occupancyRate * 2.639} ${263.9 - occupancyRate * 2.639}`}
                    style={{
                      stroke: "url(#occupancyGrad)",
                      transition: "stroke-dasharray 0.6s ease",
                    }}
                  />
                  <defs>
                    <linearGradient id="occupancyGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ff6d00" />
                      <stop offset="100%" stopColor="#5a189a" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    {occupancyRate}%
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 sm:text-xs">Occupancy</span>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {occupiedRooms} of {rooms.length} rooms
              </p>
            </article>

            {/* Room breakdown */}
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-2 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Room Availability</h2>
                <Link
                  href="/rooms"
                  className="flex items-center gap-1 text-sm font-semibold text-[#5a189a] hover:text-[#7b2cbf]"
                >
                  View all <IoChevronForwardOutline className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Segmented bar */}
              <div className="mb-5 h-3 overflow-hidden rounded-full bg-slate-100">
                {roomsLoading ? (
                  <div className="h-full w-full animate-pulse rounded-full bg-slate-200" />
                ) : (
                  <div className="flex h-full">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(occupiedRooms / Math.max(rooms.length, 1)) * 100}%`,
                        background: "linear-gradient(90deg, #5a189a, #7b2cbf)",
                      }}
                    />
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(reservedRooms / Math.max(rooms.length, 1)) * 100}%`,
                        background: "linear-gradient(90deg, #7b2cbf, #9d4edd)",
                      }}
                    />
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(availableRooms / Math.max(rooms.length, 1)) * 100}%`,
                        background: "linear-gradient(90deg, #ff8500, #ff9e00)",
                      }}
                    />
                    <div
                      className="h-full bg-slate-200 transition-all duration-500"
                      style={{
                        width: `${(notReadyRooms / Math.max(rooms.length, 1)) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Legend cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Occupied", value: occupiedRooms, color: "#5a189a", bg: "rgba(90,24,154,0.06)" },
                  { label: "Reserved", value: reservedRooms, color: "#7b2cbf", bg: "rgba(123,44,191,0.06)" },
                  { label: "Available", value: availableRooms, color: "#ff8500", bg: "rgba(255,133,0,0.06)" },
                  { label: "Not ready", value: notReadyRooms, color: "#64748b", bg: "rgba(100,116,139,0.06)" },
                ].map(({ label, value, color, bg }) => (
                  <div
                    key={label}
                    className="rounded-xl p-3 text-center transition-all hover:shadow-md"
                    style={{ background: bg }}
                  >
                    <p className="text-xl font-bold" style={{ color }}>
                      {value}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {/* ═══════ TASKS + ACTIVITY ═══════ */}
          <section className="mt-6 grid grid-cols-1 gap-4 sm:gap-5 lg:mt-8 lg:grid-cols-2">
            {/* Tasks */}
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: "rgba(255, 133, 0, 0.1)" }}
                  >
                    <IoFlashOutline className="h-4 w-4 text-[#ff8500]" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">Tasks</h2>
                </div>
                <Link
                  href="/notifications"
                  className="flex items-center gap-1 text-sm font-semibold text-[#5a189a] hover:text-[#7b2cbf]"
                >
                  View all <IoChevronForwardOutline className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-2.5">
                {taskRows.length === 0 ? (
                  <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 py-10">
                    <IoNotificationsOutline className="h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">No tasks yet</p>
                  </div>
                ) : (
                  taskRows.map((task, idx) => (
                    <div
                      key={task._id}
                      className={cn(
                        "rounded-xl border p-3.5 transition-all",
                        idx === 0
                          ? "border-transparent text-white"
                          : "border-slate-100 bg-slate-50/60 text-slate-800 hover:bg-slate-50"
                      )}
                      style={
                        idx === 0
                          ? {
                            background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 50%, #9d4edd 100%)",
                            boxShadow: "0 4px 16px -4px rgba(90, 24, 154, 0.35)",
                          }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={cn("text-xs font-medium", idx === 0 ? "text-white/70" : "text-slate-500")}>
                            {task.createdAt
                              ? new Date(task.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                              : "Pending"}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold leading-snug">
                            {task.title ?? task.message ?? "Task"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={cn(
                            "shrink-0 rounded-lg p-1 transition-colors",
                            idx === 0 ? "hover:bg-white/15" : "hover:bg-slate-200/60"
                          )}
                        >
                          <IoEllipsisHorizontalOutline
                            className={cn("h-4 w-4", idx === 0 ? "text-white/80" : "text-slate-400")}
                          />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            {/* Activity */}
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: "rgba(90, 24, 154, 0.08)" }}
                  >
                    <IoStatsChartOutline className="h-4 w-4 text-[#5a189a]" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
                </div>
                <Link
                  href="/activity-logs"
                  className="flex items-center gap-1 text-sm font-semibold text-[#5a189a] hover:text-[#7b2cbf]"
                >
                  View all <IoChevronForwardOutline className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-0">
                {activityRows.length === 0 ? (
                  <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 py-10">
                    <IoListOutline className="h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">No recent activity</p>
                  </div>
                ) : (
                  activityRows.map((item, idx) => (
                    <div key={item._id} className="flex gap-3.5 py-3">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            background:
                              idx % 2 === 0
                                ? "linear-gradient(135deg, #ff8500, #ff9e00)"
                                : "linear-gradient(135deg, #5a189a, #7b2cbf)",
                          }}
                        />
                        {idx < activityRows.length - 1 && (
                          <div className="mt-1 w-px flex-1 bg-slate-100" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 -mt-1">
                        <p className="text-sm font-medium text-slate-900 leading-snug">
                          {item.action ?? "Activity"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <IoTimeOutline className="h-3 w-3" />
                          {timeAgo(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          {/* ═══════ RECENT BOOKINGS TABLE ═══════ */}
          <section className="mt-6 lg:mt-8">
            <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              {/* Table header */}
              <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: "rgba(90, 24, 154, 0.08)" }}
                  >
                    <IoCalendarOutline className="h-4 w-4 text-[#5a189a]" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">Recent Bookings</h2>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <AppDatePicker
                    selected={fromDate}
                    onChange={setFromDate}
                    placeholder="Check-in from"
                    className="min-w-[160px]"
                  />
                  <AppReactSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions}
                    className="min-w-[160px]"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3.5 sm:px-6">Booking</th>
                      <th className="px-4 py-3.5">Guest</th>
                      <th className="px-4 py-3.5">Room</th>
                      <th className="px-4 py-3.5">Duration</th>
                      <th className="px-4 py-3.5">Dates</th>
                      <th className="px-4 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#5a189a]" />
                          <p className="mt-2 text-sm">Loading bookings…</p>
                        </td>
                      </tr>
                    ) : recentBookingRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <IoDocumentTextOutline className="mx-auto h-8 w-8 text-slate-300" />
                          <p className="mt-2 text-sm text-slate-500">No bookings match the filter</p>
                        </td>
                      </tr>
                    ) : (
                      recentBookingRows.map((row) => {
                        const checkIn = row.checkInDate ? new Date(row.checkInDate) : null;
                        const checkOut = row.checkOutDate ? new Date(row.checkOutDate) : null;
                        const nights =
                          checkIn && checkOut
                            ? Math.max(
                              1,
                              Math.ceil(
                                (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
                              )
                            )
                            : null;
                        const s = statusPill(row.status);
                        return (
                          <tr
                            key={row._id}
                            className="border-b border-slate-50 transition-colors hover:bg-slate-50/70"
                          >
                            <td className="px-4 py-3.5 font-semibold text-[#5a189a] sm:px-6">
                              {row.bookingReference ?? row._id.slice(-8).toUpperCase()}
                            </td>
                            <td className="px-4 py-3.5 text-slate-700">
                              {typeof row.guestId === "object"
                                ? `${row.guestId.firstName ?? ""} ${row.guestId.lastName ?? ""}`.trim() ||
                                "Guest"
                                : "Guest"}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600">
                              {typeof row.roomId === "object"
                                ? row.roomId.roomNumber ?? "—"
                                : "—"}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600">
                              {nights != null
                                ? `${nights} night${nights > 1 ? "s" : ""}`
                                : "—"}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600">
                              {checkIn
                                ? checkIn.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                                : "—"}{" "}
                              –{" "}
                              {checkOut
                                ? checkOut.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                                : "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                                  s.bg,
                                  s.text
                                )}
                              >
                                <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                                {row.status ?? "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
