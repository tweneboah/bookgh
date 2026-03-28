"use client";

import { useMemo, useState, useCallback, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Manrope } from "next/font/google";
import { useActivityLogs, useBookings, useNotifications, useRooms } from "@/hooks/api";
import { AppDatePicker } from "@/components/ui/date-picker";
import { AppReactSelect } from "@/components/ui/react-select";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/cn";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-dashboard-manrope",
  display: "swap",
});

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

const sortOptions = [
  { value: "checkInDesc", label: "Newest check-in" },
  { value: "checkInAsc", label: "Oldest check-in" },
  { value: "createdDesc", label: "Newest created" },
];

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

function formatCurrency(value: number) {
  return `₵${Number(value || 0).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bookingAmount(item: BookingItem) {
  return asNumber(item.totalAmount, item.totalPrice, item.totalCost, item.grandTotal, item.amount);
}

/** Reference-style status chips (Amos Royal palette). */
function statusPillClasses(status?: string) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("checkedin"))
    return "bg-[#059eff] text-white";
  if (s.includes("pending"))
    return "bg-[#cfe2f9] text-[#526478]";
  if (s.includes("confirmed"))
    return "bg-[#d0e4ff] text-[#00497b]";
  if (s.includes("cancel"))
    return "bg-[#ffdad6] text-[#93000a]";
  if (s.includes("checkedout"))
    return "bg-[#e6e8ea] text-[#5a4136]";
  return "bg-[#e6e8ea] text-[#5a4136]";
}

function guestInitials(row: BookingItem) {
  if (typeof row.guestId === "object" && row.guestId) {
    const f = row.guestId.firstName?.[0] ?? "";
    const l = row.guestId.lastName?.[0] ?? "";
    return `${f}${l}`.toUpperCase() || "G";
  }
  return "G";
}

function guestName(row: BookingItem) {
  if (typeof row.guestId === "object" && row.guestId) {
    const n = `${row.guestId.firstName ?? ""} ${row.guestId.lastName ?? ""}`.trim();
    return n || "Guest";
  }
  return "Guest";
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
  const [sortKey, setSortKey] = useState("checkInDesc");
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 5;

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

  const sortedBookings = useMemo(() => {
    const list = [...filteredBookings];
    list.sort((a, b) => {
      if (sortKey === "createdDesc") {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }
      const da = a.checkInDate ? new Date(a.checkInDate).getTime() : 0;
      const db = b.checkInDate ? new Date(b.checkInDate).getTime() : 0;
      return sortKey === "checkInAsc" ? da - db : db - da;
    });
    return list;
  }, [filteredBookings, sortKey]);

  const totalTablePages = Math.max(1, Math.ceil(sortedBookings.length / pageSize));

  useEffect(() => {
    if (tablePage > totalTablePages) setTablePage(totalTablePages);
  }, [tablePage, totalTablePages]);

  const safeTablePage = Math.min(tablePage, totalTablePages);
  const pagedBookings = useMemo(() => {
    const start = (safeTablePage - 1) * pageSize;
    return sortedBookings.slice(start, start + pageSize);
  }, [sortedBookings, safeTablePage, pageSize]);

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

  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const checkInsToday = filteredBookings.filter((item) => {
    if (!item.checkInDate) return false;
    const d = new Date(item.checkInDate);
    return d >= todayStart && d < todayEnd;
  }).length;

  const checkOutsToday = filteredBookings.filter((item) => {
    if (!item.checkOutDate) return false;
    const d = new Date(item.checkOutDate);
    return d >= todayStart && d < todayEnd;
  }).length;

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
    ["cleaning", "maintenance", "outofservice"].includes((item.status ?? "").toLowerCase())
  ).length;

  const totalRevenue = filteredBookings.reduce((sum, item) => sum + bookingAmount(item), 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = todayStart;

  const revenueToday = filteredBookings
    .filter((item) => {
      if (!item.createdAt) return false;
      const c = new Date(item.createdAt);
      return c >= todayStart && c < todayEnd;
    })
    .reduce((sum, item) => sum + bookingAmount(item), 0);

  const revenueYesterday = filteredBookings
    .filter((item) => {
      if (!item.createdAt) return false;
      const c = new Date(item.createdAt);
      return c >= yesterdayStart && c < yesterdayEnd;
    })
    .reduce((sum, item) => sum + bookingAmount(item), 0);

  const revenueDayPct = percentChange(revenueToday, revenueYesterday);

  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;
  const activityRows = logs.slice(0, 6);
  const taskRows = notifications.slice(0, 4);

  const firstName =
    user?.firstName?.trim() ||
    user?.email?.split("@")[0] ||
    "there";

  const dotCount = Math.min(Math.max(rooms.length, 1), 8);
  const filledDots =
    rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * dotCount) : 0;

  const downloadCsv = useCallback(() => {
    const headers = [
      "Booking",
      "Guest",
      "Room",
      "Nights",
      "Check-in",
      "Check-out",
      "Status",
    ];
    const rows = sortedBookings.map((row) => {
      const guest = guestName(row);
      const room =
        typeof row.roomId === "object" ? row.roomId?.roomNumber ?? "" : "";
      const ci = row.checkInDate ? new Date(row.checkInDate).toISOString() : "";
      const co = row.checkOutDate ? new Date(row.checkOutDate).toISOString() : "";
      let nights = "";
      if (row.checkInDate && row.checkOutDate) {
        const n = Math.max(
          1,
          Math.ceil(
            (new Date(row.checkOutDate).getTime() - new Date(row.checkInDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        nights = String(n);
      }
      return [
        row.bookingReference ?? row._id,
        guest,
        room,
        nights,
        ci,
        co,
        row.status ?? "",
      ];
    });
    const esc = (cell: string) => `"${String(cell).replace(/"/g, '""')}"`;
    const body = [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
    const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedBookings]);

  return (
    <div
      className={cn(
        manrope.variable,
        "min-h-full bg-[#f7f9fb] pb-10 font-sans text-[#191c1e]"
      )}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:space-y-10 lg:p-8">
        {/* Welcome Header */}
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1
              className={cn(
                manrope.className,
                "mb-2 text-3xl font-extrabold tracking-tight text-[#191c1e] sm:text-4xl"
              )}
            >
              Executive Overview
            </h1>
            <p className="font-medium text-[#5a4136]">
              Welcome back to the Bookgh Command Center, {firstName}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/reports/accommodation"
              className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-[#a04100] shadow-sm transition-all hover:bg-[#f7f9fb]"
            >
              Generate Report
            </Link>
            <button
              type="button"
              onClick={downloadCsv}
              className="rounded-xl bg-[#ff6b00] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[rgba(255,107,0,0.25)] transition-all hover:-translate-y-0.5"
            >
              Download CSV
            </button>
          </div>
        </section>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#a04100] to-[#ff6b00] p-8 text-white shadow-[0_12px_32px_rgba(255,107,0,0.15)] lg:col-span-2">
            <div className="relative z-10">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
                Total Revenue
              </span>
              <div className={cn(manrope.className, "mt-2 text-5xl font-black")}>
                {formatCurrency(totalRevenue)}
              </div>
              <p className="mt-4 inline-block rounded-full bg-white/10 px-3 py-1 text-sm text-white/90 backdrop-blur-md">
                {typeof revenueDayPct === "number" ? (
                  <>
                    {revenueDayPct >= 0 ? "+" : ""}
                    {revenueDayPct.toFixed(0)}% from yesterday
                  </>
                ) : revenueYesterday <= 0 && revenueToday > 0 ? (
                  "New revenue today"
                ) : typeof newBookingsChange === "number" ? (
                  <>
                    {newBookingsChange >= 0 ? "+" : ""}
                    {newBookingsChange.toFixed(0)}% new bookings vs last week
                  </>
                ) : (
                  "Track performance at a glance"
                )}
              </p>
            </div>
            <div className="absolute -bottom-5 -right-5 opacity-10 transition-transform duration-500 group-hover:scale-110">
              <MsIcon name="payments" className="text-[12rem]" />
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white p-6 shadow-sm transition-all hover:shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <div className="mb-6 flex items-center justify-between">
              <div className="rounded-2xl bg-[#cfe2f9] p-3 text-[#526478]">
                <MsIcon name="bed" />
              </div>
              <span className="rounded-lg bg-[#059eff] px-2 py-1 text-xs font-bold text-white">
                LIVE
              </span>
            </div>
            <div className={cn(manrope.className, "text-3xl font-extrabold text-[#191c1e]")}>
              {roomsLoading ? "—" : `${occupancyRate}%`}
            </div>
            <p className="mt-1 text-sm text-[#5a4136]">
              Occupancy ({occupiedRooms} of {rooms.length || "—"} rooms)
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f2f4f6]">
              <div
                className="h-full rounded-full bg-[#ff6b00] transition-all"
                style={{ width: `${Math.min(100, occupancyRate)}%` }}
              />
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white p-6 shadow-sm transition-all hover:shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <div className="mb-6 flex items-center justify-between">
              <div className="rounded-2xl bg-[#ffdbcc] p-3 text-[#7a3000]">
                <MsIcon name="domain" />
              </div>
            </div>
            <div className={cn(manrope.className, "text-3xl font-extrabold text-[#191c1e]")}>
              {roomsLoading ? "—" : `${rooms.length} Room${rooms.length === 1 ? "" : "s"}`}
            </div>
            <p className="mt-1 text-sm text-[#5a4136]">
              {newBookings} new booking{newBookings === 1 ? "" : "s"} this week
            </p>
            <div className="mt-4 flex gap-2">
              {Array.from({ length: dotCount }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full",
                    i < filledDots ? "bg-[#ff6b00]" : "bg-[#eceef0]"
                  )}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Secondary Stats + Side panel */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-2">
            <div className="flex items-center gap-5 rounded-[1.5rem] bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#059eff]/10 text-[#059eff]">
                <MsIcon name="login" className="!text-3xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#5a4136]">Check-ins today</p>
                <div className="flex items-baseline gap-2">
                  <span className={cn(manrope.className, "text-3xl font-bold text-[#191c1e]")}>
                    {checkInsToday}
                  </span>
                  <span className="text-xs font-bold text-[#ff6b00]">(Live)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 rounded-[1.5rem] bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#cfe2f9] text-[#526478]">
                <MsIcon name="logout" className="!text-3xl" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#5a4136]">Check-outs today</p>
                <span className={cn(manrope.className, "text-3xl font-bold text-[#191c1e]")}>
                  {checkOutsToday}
                </span>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[#f2f4f6] p-8 sm:col-span-2">
              <h3
                className={cn(
                  manrope.className,
                  "mb-6 flex items-center gap-2 text-lg font-bold text-[#191c1e]"
                )}
              >
                <MsIcon name="meeting_room" className="text-[#ff6b00]" />
                Room Availability
              </h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: "Occupied", value: occupiedRooms, emphasize: "primary" },
                  { label: "Reserved", value: reservedRooms, emphasize: "muted" },
                  { label: "Available", value: availableRooms, emphasize: "tertiary" },
                  { label: "Not Ready", value: notReadyRooms, emphasize: "muted" },
                ].map(({ label, value, emphasize }) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-white p-4 text-center shadow-sm"
                  >
                    <p
                      className={cn(
                        manrope.className,
                        "text-2xl font-black",
                        emphasize === "primary" && "text-[#ff6b00]",
                        emphasize === "tertiary" && "text-[#0062a1]",
                        emphasize === "muted" && "text-[#5a4136]/40"
                      )}
                    >
                      {roomsLoading ? "—" : value}
                    </p>
                    <p className="text-xs font-bold uppercase text-[#5a4136]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.5rem] bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className={cn(manrope.className, "font-bold text-[#191c1e]")}>
                  Active Tasks
                </h3>
                <Link href="/notifications" className="text-xs font-bold text-[#a04100] hover:underline">
                  View all
                </Link>
              </div>
              {taskRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eceef0]">
                    <MsIcon name="task_alt" className="text-[#5a4136]" />
                  </div>
                  <p className="font-medium text-[#5a4136]">No tasks yet</p>
                  <p className="mt-1 text-xs text-[#5a4136]/60">Check back later for updates</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {taskRows.map((task) => (
                    <li
                      key={task._id}
                      className="rounded-xl border border-[#eceef0] bg-[#f7f9fb] px-3 py-2.5 text-sm"
                    >
                      <p className="font-semibold text-[#191c1e]">
                        {task.title ?? task.message ?? "Notification"}
                      </p>
                      {task.createdAt && (
                        <p className="text-xs text-[#5a4136]/70">
                          {new Date(task.createdAt).toLocaleString()}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[1.5rem] bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className={cn(manrope.className, "font-bold text-[#191c1e]")}>
                  Recent Activity
                </h3>
                <Link href="/activity-logs" className="text-xs font-bold text-[#a04100] hover:underline">
                  View all
                </Link>
              </div>
              {activityRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eceef0]">
                    <MsIcon name="history" className="text-[#5a4136]" />
                  </div>
                  <p className="font-medium text-[#5a4136]">No recent activity</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {activityRows.map((item) => (
                    <li key={item._id} className="flex gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6b00]" />
                      <div>
                        <p className="font-medium text-[#191c1e]">{item.action ?? "Activity"}</p>
                        <p className="text-xs text-[#5a4136]/70">{timeAgo(item.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Recent Bookings */}
        <section className="rounded-[2rem] bg-white p-6 shadow-[0px_12px_32px_rgba(25,28,30,0.04)] sm:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <h2 className={cn(manrope.className, "text-2xl font-extrabold tracking-tight text-[#191c1e]")}>
              Recent Bookings
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex min-w-[200px] items-center gap-2 rounded-xl bg-[#eceef0] px-3 py-2">
                <MsIcon name="filter_list" className="text-sm text-[#5a4136]" />
                <AppDatePicker
                  selected={fromDate}
                  onChange={(d) => {
                    setFromDate(d);
                    setTablePage(1);
                  }}
                  placeholder="Check-in from"
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none"
                />
              </div>
              <div className="flex min-w-[200px] items-center gap-2 rounded-xl bg-[#eceef0] px-3 py-2">
                <AppReactSelect
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setTablePage(1);
                  }}
                  options={statusOptions}
                  className="min-w-0 flex-1 border-0"
                />
              </div>
              <div className="flex min-w-[180px] items-center gap-2 rounded-xl bg-[#eceef0] px-3 py-2">
                <MsIcon name="sort" className="text-sm text-[#5a4136]" />
                <AppReactSelect
                  value={sortKey}
                  onChange={(v) => {
                    setSortKey(v);
                    setTablePage(1);
                  }}
                  options={sortOptions}
                  className="min-w-0 flex-1 border-0"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-widest text-[#5a4136]">
                  <th className="px-4 pb-6">Booking</th>
                  <th className="px-4 pb-6">Guest</th>
                  <th className="px-4 pb-6">Room</th>
                  <th className="px-4 pb-6">Duration</th>
                  <th className="px-4 pb-6">Dates</th>
                  <th className="px-4 pb-6">Status</th>
                  <th className="px-4 pb-6" />
                </tr>
              </thead>
              <tbody>
                {bookingsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#5a4136]">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#eceef0] border-t-[#ff6b00]" />
                      <p className="mt-2 text-sm">Loading bookings…</p>
                    </td>
                  </tr>
                ) : pagedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#5a4136]">
                      No bookings match the filter
                    </td>
                  </tr>
                ) : (
                  pagedBookings.map((row) => {
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
                    const initials = guestInitials(row);
                    const pill = statusPillClasses(row.status);
                    return (
                      <FragmentRow key={row._id}>
                        <tr className="group transition-colors hover:bg-[#f2f4f6]">
                          <td className="rounded-l-2xl px-4 py-5 font-bold text-[#ff6b00] first:rounded-l-2xl">
                            {row.bookingReference ?? `BK-${row._id.slice(-6).toUpperCase()}`}
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                                  (row.status ?? "").toLowerCase().includes("checkedin")
                                    ? "bg-[#059eff]/20 text-[#0062a1]"
                                    : "bg-slate-200 text-slate-500"
                                )}
                              >
                                {initials}
                              </div>
                              <span className="font-semibold text-[#191c1e]">{guestName(row)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-5 font-medium text-[#5a4136]">
                            {typeof row.roomId === "object"
                              ? row.roomId.roomNumber ?? "—"
                              : "—"}
                          </td>
                          <td className="px-4 py-5 font-medium text-[#191c1e]">
                            {nights != null ? `${nights} night${nights > 1 ? "s" : ""}` : "—"}
                          </td>
                          <td className="px-4 py-5 text-sm text-[#5a4136]">
                            {checkIn
                              ? checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "—"}{" "}
                            –{" "}
                            {checkOut
                              ? checkOut.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "—"}
                          </td>
                          <td className="px-4 py-5">
                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-bold capitalize",
                                pill
                              )}
                            >
                              {row.status ?? "—"}
                            </span>
                          </td>
                          <td className="rounded-r-2xl px-4 py-5 text-right last:rounded-r-2xl">
                            <Link
                              href="/bookings"
                              className="inline-flex text-[#5a4136] hover:text-[#ff6b00]"
                              aria-label="Booking actions"
                            >
                              <MsIcon name="more_vert" />
                            </Link>
                          </td>
                        </tr>
                      </FragmentRow>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#5a4136]">
              Showing{" "}
              <span className="font-bold text-[#191c1e]">{sortedBookings.length}</span> bookings
              {sortedBookings.length > 0 && (
                <>
                  {" "}
                  (page {safeTablePage} of {totalTablePages})
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={safeTablePage <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eceef0] text-[#5a4136] disabled:opacity-50"
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <MsIcon name="chevron_left" />
              </button>
              {Array.from({ length: totalTablePages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalTablePages <= 5) return true;
                  return (
                    p === 1 ||
                    p === totalTablePages ||
                    Math.abs(p - safeTablePage) <= 1
                  );
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev !== undefined && p - prev > 1;
                  return (
                    <span key={p} className="flex items-center gap-2">
                      {showEllipsis && <span className="text-[#5a4136]">…</span>}
                      <button
                        type="button"
                        onClick={() => setTablePage(p)}
                        className={cn(
                          "flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl px-2 font-bold",
                          p === safeTablePage
                            ? "bg-[#ff6b00] text-white"
                            : "bg-[#eceef0] text-[#5a4136]"
                        )}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}
              <button
                type="button"
                disabled={safeTablePage >= totalTablePages}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eceef0] text-[#5a4136] disabled:opacity-50"
                onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                aria-label="Next page"
              >
                <MsIcon name="chevron_right" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Table row + spacer row like the reference HTML */
function FragmentRow({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <tr className="h-2" aria-hidden />
    </>
  );
}
