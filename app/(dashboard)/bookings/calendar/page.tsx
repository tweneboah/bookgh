"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useBookingCalendar } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Eye, LogIn, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import { BOOKING_STATUS } from "@/constants";

type ViewMode = "day" | "week" | "month";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  [BOOKING_STATUS.PENDING]: {
    label: "PENDING",
    bg: "bg-gradient-to-r from-[#ff9100] to-[#ff9e00]",
    text: "text-white",
    dot: "bg-amber-400",
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: "CONFIRMED",
    bg: "bg-gradient-to-r from-[#5a189a] to-[#7b2cbf]",
    text: "text-white",
    dot: "bg-[#7b2cbf]",
  },
  [BOOKING_STATUS.CHECKED_IN]: {
    label: "CHECKED-IN",
    bg: "bg-emerald-600",
    text: "text-white",
    dot: "bg-emerald-400",
  },
};

function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(23, 59, 59, 999);
  while (current <= endNorm) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(date: Date, checkIn: Date, checkOut: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(checkIn);
  start.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

function getInitials(guest: { firstName?: string; lastName?: string } | null): string {
  if (!guest) return "?";
  const f = (guest.firstName ?? "").trim().charAt(0);
  const l = (guest.lastName ?? "").trim().charAt(0);
  if (f && l) return `${f}${l}`.toUpperCase();
  if (f) return f.toUpperCase();
  if (l) return l.toUpperCase();
  return "?";
}

function getGuestName(guest: { firstName?: string; lastName?: string } | null): string {
  if (!guest) return "Guest";
  return `${(guest.firstName ?? "").trim()} ${(guest.lastName ?? "").trim()}`.trim() || "Guest";
}

function toId(x: unknown): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object" && x !== null && "_id" in x) return String((x as { _id: unknown })._id);
  return String(x);
}

export default function BookingCalendarPage() {
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay();
    const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + toMonday);
    return d;
  });

  const { startDate, endDate, days } = useMemo(() => {
    let start: Date;
    let end: Date;
    if (viewMode === "day") {
      start = new Date(rangeStart);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else if (viewMode === "week") {
      const d = new Date(rangeStart);
      d.setHours(0, 0, 0, 0);
      const dayOfWeek = d.getDay();
      const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start = new Date(d);
      start.setDate(d.getDate() + toMonday);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
    } else {
      start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      end = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0, 23, 59, 59);
    }
    const dayList = getDaysInRange(start, end);
    return {
      startDate: start,
      endDate: end,
      days: dayList,
    };
  }, [viewMode, rangeStart]);

  const params = useMemo(
    () => ({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    [startDate, endDate]
  );

  const { data, isLoading } = useBookingCalendar(params);
  const rooms = data?.data?.rooms ?? [];
  const bookings = data?.data?.bookings ?? [];

  const prevRange = () => {
    setRangeStart((prev) => {
      const d = new Date(prev);
      if (viewMode === "day") d.setDate(d.getDate() - 1);
      else if (viewMode === "week") d.setDate(d.getDate() - 7);
      else d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const nextRange = () => {
    setRangeStart((prev) => {
      const d = new Date(prev);
      if (viewMode === "day") d.setDate(d.getDate() + 1);
      else if (viewMode === "week") d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (viewMode === "month") {
      d.setDate(1);
    } else if (viewMode === "week") {
      const dayOfWeek = d.getDay();
      const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      d.setDate(d.getDate() + toMonday);
    }
    setRangeStart(d);
  };

  const rangeLabel = useMemo(() => {
    if (viewMode === "day") {
      return startDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    }
    if (viewMode === "week") {
      const end = new Date(startDate);
      end.setDate(startDate.getDate() + 6);
      return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [viewMode, startDate]);

  const firstRoomIdByCategoryId = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach((room: any) => {
      const cid = toId(room.roomCategoryId?._id ?? room.roomCategoryId);
      if (cid && !map.has(cid)) map.set(cid, toId(room._id));
    });
    return map;
  }, [rooms]);

  const getRoomBookingSegments = (room: any) => {
    const roomId = toId(room._id);
    const roomCategoryId = toId(room.roomCategoryId?._id ?? room.roomCategoryId);
    const firstRoomId = roomCategoryId ? firstRoomIdByCategoryId.get(roomCategoryId) : undefined;
    const isFirstInCategory = !!roomCategoryId && firstRoomId === roomId;

    const roomBookings = bookings.filter((b: any) => {
      const rid = toId(b.roomId?._id ?? b.roomId);
      if (rid) return rid === roomId;
      const bCategoryId = toId(b.roomCategoryId?._id ?? b.roomCategoryId);
      return isFirstInCategory && bCategoryId && bCategoryId === roomCategoryId;
    });

    const segments: { firstDayIndex: number; span: number; booking: any }[] = [];
    for (const b of roomBookings) {
      const checkIn = new Date(b.checkInDate);
      const checkOut = new Date(b.checkOutDate);
      let firstDayIndex = -1;
      let lastDayIndex = -1;
      days.forEach((day, i) => {
        if (isInRange(day, checkIn, checkOut)) {
          if (firstDayIndex === -1) firstDayIndex = i;
          lastDayIndex = i;
        }
      });
      if (firstDayIndex >= 0 && lastDayIndex >= 0) {
        segments.push({ firstDayIndex, span: lastDayIndex - firstDayIndex + 1, booking: b });
      }
    }
    segments.sort((a, b) => a.firstDayIndex - b.firstDayIndex);
    return segments;
  };

  const segmentStartsByRoom = useMemo(() => {
    const map = new Map<string, Map<number, { span: number; booking: any }>>();
    rooms.forEach((room: any) => {
      const segs = getRoomBookingSegments(room);
      const startMap = new Map<number, { span: number; booking: any }>();
      segs.forEach((s) => startMap.set(s.firstDayIndex, { span: s.span, booking: s.booking }));
      map.set(toId(room._id), startMap);
    });
    return map;
  }, [rooms, bookings, days, firstRoomIdByCategoryId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    console.group("[Room Timeline] Debug");
    console.log("Date range:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      dayCount: days.length,
      firstDay: days[0]?.toLocaleDateString(),
      lastDay: days[days.length - 1]?.toLocaleDateString(),
    });
    console.log("Rooms:", rooms.length, rooms.map((r: any) => ({
      id: toId(r._id),
      number: r.roomNumber,
      categoryId: toId(r.roomCategoryId?._id ?? r.roomCategoryId),
      categoryName: r.roomCategoryId?.name,
    })));
    console.log("Bookings:", bookings.length, bookings.map((b: any) => ({
      ref: b.bookingReference,
      guest: b.guestId ? `${b.guestId.firstName} ${b.guestId.lastName}` : "-",
      roomId: toId(b.roomId?._id ?? b.roomId) || "(unassigned)",
      categoryId: toId(b.roomCategoryId?._id ?? b.roomCategoryId),
      status: b.status,
      checkIn: b.checkInDate,
      checkOut: b.checkOutDate,
    })));
    console.log("firstRoomIdByCategoryId:", Object.fromEntries(firstRoomIdByCategoryId));
    const segmentSummary: Record<string, number> = {};
    segmentStartsByRoom.forEach((startMap, roomId) => {
      segmentSummary[roomId] = startMap.size;
    });
    console.log("Segments per room:", segmentSummary);
    console.groupEnd();
  }, [startDate, endDate, days, rooms, bookings, firstRoomIdByCategoryId, segmentStartsByRoom]);

  const dayColWidth = viewMode === "month" ? 36 : viewMode === "week" ? 80 : 120;

  const todayIndex = useMemo(
    () => days.findIndex((d) => isSameDay(d, now)),
    [days, now]
  );

  const occupancy = useMemo(() => {
    let occupied = 0;
    segmentStartsByRoom.forEach((startMap) => {
      if (startMap.size > 0) occupied += 1;
    });
    const total = rooms.length;
    return { occupied, total, pct: total ? Math.round((occupied / total) * 100) : 0 };
  }, [segmentStartsByRoom, rooms.length]);

  const densityLabel = useMemo(() => {
    if (occupancy.total === 0) return null;
    if (occupancy.pct >= 70) return { text: "High occupancy", dot: "bg-emerald-500" };
    if (occupancy.pct < 30) return { text: "Low occupancy", dot: "bg-slate-400" };
    return { text: "Moderate occupancy", dot: "bg-[#ff8500]" };
  }, [occupancy.pct, occupancy.total]);

  return (
    <div className="min-h-screen bg-white">
      {/* White header — Room Timeline + view toggles + legend + New Booking */}
      <header className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Room Timeline
            </h1>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
              {(["day", "week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                    viewMode === mode
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                CHECKED-IN
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#7b2cbf]" />
                CONFIRMED
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff9e00]" />
                PENDING
              </span>
            </div>
            <Link href="/bookings">
              <Button
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00] px-4 py-2 font-semibold text-white shadow-lg shadow-[#ff8500]/25 hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                New Booking
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevRange} className="rounded-lg border-slate-200">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="rounded-lg border-slate-200 font-medium">
            Today
          </Button>
          <span className="min-w-[180px] text-center text-sm font-semibold text-slate-800">
            {rangeLabel}
          </span>
          {densityLabel && rooms.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <span className={cn("h-1.5 w-1.5 rounded-full", densityLabel.dot)} />
              {densityLabel.text}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={nextRange} className="rounded-lg border-slate-200">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="overflow-x-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5a189a] border-t-transparent" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-24 text-center text-slate-500">
              <CalendarIcon className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 font-medium">No rooms found</p>
              <p className="text-sm">Add rooms to see the timeline.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Occupancy strip */}
              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Occupancy
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {occupancy.occupied} of {occupancy.total} rooms occupied
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5a189a] to-[#ff8500] transition-all duration-300"
                    style={{ width: `${occupancy.pct}%` }}
                  />
                </div>
              </div>
              <div key={`${viewMode}-${startDate.toISOString()}`} className="animate-fade-in">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                  <tr>
                    <th className="sticky left-0 z-30 min-w-[160px] border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Room details
                      </span>
                    </th>
                    {days.map((day, idx) => {
                      const isToday = isSameDay(day, now);
                      return (
                        <th
                          key={day.toISOString()}
                          className={cn(
                            "min-w-[36px] border-b border-slate-200 px-1 py-2 text-center",
                            isToday
                              ? "border-l-2 border-r-2 border-[#5a189a] bg-[#5a189a]/10 text-[#5a189a]"
                              : "border-r border-slate-200 bg-white text-slate-600"
                          )}
                          style={viewMode !== "month" ? { minWidth: dayColWidth } : undefined}
                        >
                          <div className="text-[10px] font-medium uppercase text-slate-500">
                            {day.toLocaleDateString("en-US", { weekday: "short" })}
                          </div>
                          <div className={cn("text-base font-bold", isToday && "text-[#5a189a]")}>
                            {day.getDate()}
                          </div>
                          {isToday && (
                            <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] font-semibold text-[#5a189a]">
                              <CalendarIcon className="h-3 w-3" />
                              Today
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room: any) => {
                    const startMap = segmentStartsByRoom.get(toId(room._id)) ?? new Map();
                    const hasNoBookings = startMap.size === 0;
                    return (
                      <tr key={room._id} className="group">
                        <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-2 group-hover:bg-slate-50/50">
                          <div className="font-semibold text-slate-900">
                            {room.roomNumber}
                          </div>
                          <div className="text-xs text-slate-500">
                            {room.roomCategoryId?.name ?? "—"}
                            {room.floor != null ? ` · Floor ${room.floor}` : ""}
                          </div>
                        </td>
                        {hasNoBookings ? (
                          <td
                            colSpan={days.length}
                            className="border-b border-r border-slate-100 bg-slate-50/50 align-middle"
                          >
                            <div className="flex min-h-[52px] items-center justify-center border border-dashed border-slate-200 rounded-lg mx-1 bg-white/60">
                              <span className="text-xs font-medium text-slate-400">Available</span>
                            </div>
                          </td>
                        ) : (
                          (() => {
                            const cells: React.ReactNode[] = [];
                            let dayIndex = 0;
                            while (dayIndex < days.length) {
                              const segment = startMap.get(dayIndex);
                              if (segment) {
                                const { span, booking } = segment;
                                const config = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG[BOOKING_STATUS.PENDING];
                                const guestName = getGuestName(booking.guestId);
                                const initials = getInitials(booking.guestId);
                                const checkInDay = new Date(booking.checkInDate);
                                const checkOutDay = new Date(booking.checkOutDate);
                                const isArriving = isSameDay(days[dayIndex], checkInDay);
                                const isDeparting = isSameDay(days[dayIndex + span - 1], checkOutDay);
                                const cellIncludesToday = todayIndex >= dayIndex && todayIndex < dayIndex + span;
                                const canCheckIn = booking.status === BOOKING_STATUS.PENDING || booking.status === BOOKING_STATUS.CONFIRMED;
                                cells.push(
                                  <td
                                    key={dayIndex}
                                    colSpan={span}
                                    className={cn(
                                      "border-b border-slate-100 align-top p-1",
                                      cellIncludesToday ? "border-l-2 border-r-2 border-[#5a189a] bg-[#5a189a]/5" : "border-r border-slate-100"
                                    )}
                                  >
                                    <div className="relative group">
                                      <Link
                                        href={`/bookings?view=${booking._id}`}
                                        className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#5a189a] focus-visible:ring-offset-1"
                                      >
                                        <div
                                          className={cn(
                                            "flex min-h-[52px] cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 shadow-sm transition-opacity hover:opacity-95",
                                            config.bg,
                                            config.text
                                          )}
                                        >
                                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                                            {initials}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1">
                                              {isArriving && (
                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-semibold">
                                                  <ArrowDownToLine className="h-2.5 w-2.5" />
                                                  Arriving
                                                </span>
                                              )}
                                              {isDeparting && (
                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-semibold">
                                                  <ArrowUpFromLine className="h-2.5 w-2.5" />
                                                  Departing
                                                </span>
                                              )}
                                            </div>
                                            <p className="truncate font-semibold">{guestName}</p>
                                            <p className="text-[10px] font-medium opacity-90">
                                              {config.label}
                                            </p>
                                            <p className="mt-0.5 text-[10px] opacity-90">
                                              {booking.checkInDate && format(checkInDay, "MMM d, h:mm a")}
                                              {" → "}
                                              {booking.checkOutDate && format(checkOutDay, "MMM d, h:mm a")}
                                            </p>
                                          </div>
                                        </div>
                                      </Link>
                                      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto">
                                        <p className="font-semibold text-slate-900">{guestName}</p>
                                        <p className="text-xs text-slate-500">{booking.bookingReference}</p>
                                        <p className="mt-1 text-xs font-medium text-slate-700">{config.label}</p>
                                        <p className="mt-0.5 text-xs text-slate-600">
                                          {booking.checkInDate && format(checkInDay, "PPp")}
                                          {" → "}
                                          {booking.checkOutDate && format(checkOutDay, "PPp")}
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                          <Link
                                            href={`/bookings?view=${booking._id}`}
                                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                                          >
                                            <Eye className="h-3 w-3" />
                                            View
                                          </Link>
                                          {canCheckIn && (
                                            <Link
                                              href="/bookings"
                                              className="inline-flex items-center gap-1 rounded-lg bg-[#5a189a] px-2 py-1 text-xs font-medium text-white hover:bg-[#7b2cbf]"
                                            >
                                              <LogIn className="h-3 w-3" />
                                              Check in
                                            </Link>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                );
                                dayIndex += span;
                              } else {
                                const isTodayCol = todayIndex === dayIndex;
                                cells.push(
                                  <td
                                    key={dayIndex}
                                    className={cn(
                                      "border-b border-slate-100 bg-slate-50/30",
                                      isTodayCol ? "border-l-2 border-r-2 border-[#5a189a] bg-[#5a189a]/5" : "border-r border-slate-100"
                                    )}
                                  >
                                    <div className="min-h-[52px]" />
                                  </td>
                                );
                                dayIndex += 1;
                              }
                            }
                            return cells;
                          })()
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
