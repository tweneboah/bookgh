"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePoolBookingCalendar } from "@/hooks/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/cn";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 border-amber-300 text-amber-800",
  confirmed: "bg-blue-100 border-blue-300 text-blue-800",
  checkedIn: "bg-green-100 border-green-300 text-green-800",
  completed: "bg-slate-100 border-slate-300 text-slate-700",
};

function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
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

export default function PoolCalendarPage() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const startDate = useMemo(
    () => new Date(currentMonth.year, currentMonth.month, 1),
    [currentMonth]
  );
  const endDate = useMemo(
    () => new Date(currentMonth.year, currentMonth.month + 1, 0, 23, 59, 59),
    [currentMonth]
  );
  const days = useMemo(
    () => getDaysInRange(startDate, endDate),
    [startDate, endDate]
  );

  const params = useMemo(
    () => ({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    [startDate, endDate]
  );

  const { data, isLoading } = usePoolBookingCalendar(params);
  const poolAreas = data?.data?.poolAreas ?? [];
  const bookings = data?.data?.bookings ?? [];
  const maintenance = data?.data?.maintenance ?? [];

  const prevMonth = () =>
    setCurrentMonth((m) => {
      const d = new Date(m.year, m.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const nextMonth = () =>
    setCurrentMonth((m) => {
      const d = new Date(m.year, m.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const today = () => {
    const n = new Date();
    setCurrentMonth({ year: n.getFullYear(), month: n.getMonth() });
  };

  const monthLabel = new Date(
    currentMonth.year,
    currentMonth.month,
    1
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const getBookingsForAreaDay = (areaId: string, day: Date) => {
    return (bookings as any[]).filter((b) => {
      const bAreaId = b.poolAreaId?._id ?? b.poolAreaId;
      if (String(bAreaId) !== String(areaId)) return false;
      const bookingDate = b.bookingDate ? new Date(b.bookingDate) : null;
      return bookingDate && isSameDay(bookingDate, day);
    });
  };

  const getMaintenanceForAreaDay = (areaId: string, day: Date) => {
    return (maintenance as any[]).filter((m) => {
      const mAreaId = m.poolAreaId?._id ?? m.poolAreaId;
      if (String(mAreaId) !== String(areaId)) return false;
      const sched = m.scheduledDate ? new Date(m.scheduledDate) : null;
      return sched && isSameDay(sched, day);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Pool Booking Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View pool bookings and maintenance by date
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/pool/bookings">
              <CalendarCheck className="mr-1.5 h-4 w-4" />
              Manage Bookings
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={today}>
            Today
          </Button>
          <span className="min-w-[160px] text-center text-sm font-medium text-slate-700">
            {monthLabel}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-amber-300 bg-amber-100" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-blue-300 bg-blue-100" />
          Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-green-300 bg-green-100" />
          Checked In
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-orange-300 bg-orange-100" />
          Maintenance
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600" />
            </div>
          ) : poolAreas.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-400">
              No pool areas found. Add pool areas to see the calendar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[140px] border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left font-medium text-slate-600">
                      Pool Area
                    </th>
                    {days.map((day) => {
                      const isToday = isSameDay(day, now);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <th
                          key={day.toISOString()}
                          className={cn(
                            "min-w-[44px] border-b border-r border-slate-200 px-1 py-2 text-center font-medium",
                            isToday
                              ? "bg-cyan-50 text-cyan-700"
                              : isWeekend
                                ? "bg-slate-100 text-slate-500"
                                : "bg-slate-50 text-slate-600"
                          )}
                        >
                          <div>{day.getDate()}</div>
                          <div className="text-[10px] font-normal">
                            {day.toLocaleDateString("en-US", {
                              weekday: "narrow",
                            })}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(poolAreas as any[]).map((area) => (
                    <tr key={area._id}>
                      <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-2">
                        <div className="font-medium text-slate-800">
                          {area.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {area.type}
                          {area.capacity != null ? ` · Cap ${area.capacity}` : ""}
                        </div>
                      </td>
                      {days.map((day) => {
                        const dayBookings = getBookingsForAreaDay(area._id, day);
                        const dayMaintenance = getMaintenanceForAreaDay(
                          area._id,
                          day
                        );
                        const isToday = isSameDay(day, now);
                        const isWeekend =
                          day.getDay() === 0 || day.getDay() === 6;

                        if (dayMaintenance.length > 0) {
                          const m = dayMaintenance[0];
                          return (
                            <td
                              key={day.toISOString()}
                              className={cn(
                                "border-b border-r border-slate-200 px-0.5 py-1",
                                isToday && "bg-cyan-50/50"
                              )}
                              title={`${(m as any).type}: ${(m as any).description}`}
                            >
                              <div className="h-6 rounded border border-orange-300 bg-orange-100 px-1 text-[10px] leading-6 text-orange-800">
                                Maint
                              </div>
                            </td>
                          );
                        }

                        if (dayBookings.length > 0) {
                          const b = dayBookings[0];
                          const colorClass =
                            STATUS_COLORS[b.status] ??
                            "bg-slate-100 border-slate-300 text-slate-700";
                          const guestShort =
                            (b.guestName || "").split(" ")[0] || "Guest";
                          return (
                            <td
                              key={day.toISOString()}
                              className={cn(
                                "border-b border-r border-slate-200 px-0.5 py-1",
                                isToday && "bg-cyan-50/50"
                              )}
                              title={`${b.guestName} (${b.status}) ${b.startTime}–${b.endTime} - ${b.bookingReference}`}
                            >
                              <div
                                className={cn(
                                  "h-6 rounded border text-[10px] leading-6",
                                  colorClass,
                                  "px-1 font-medium"
                                )}
                              >
                                {guestShort}
                              </div>
                              {dayBookings.length > 1 && (
                                <div className="mt-0.5 text-[9px] text-slate-500">
                                  +{dayBookings.length - 1}
                                </div>
                              )}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={day.toISOString()}
                            className={cn(
                              "border-b border-r border-slate-200 px-0.5 py-1",
                              isToday
                                ? "bg-cyan-50/50"
                                : isWeekend
                                  ? "bg-slate-50/50"
                                  : ""
                            )}
                          >
                            <div className="h-6" />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
