"use client";

import { useState, useRef, useLayoutEffect, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getCalendarDays(
  year: number,
  month: number
): ({ type: "empty" } | { type: "day"; date: string; day: number })[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  const cells: ({ type: "empty" } | { type: "day"; date: string; day: number })[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ type: "empty" });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ type: "day", date: date.toISOString().split("T")[0], day: d });
  }
  return cells;
}

export type StayDatePickerValue = {
  checkIn: string;
  checkOut: string;
};

export type StayDatePickerGuests = {
  adults: number;
  children: number;
};

export interface StayDatePickerProps {
  value: StayDatePickerValue;
  onChange: (value: StayDatePickerValue) => void;
  primaryColor: string;
  /** Show adults/children inputs */
  guests?: StayDatePickerGuests;
  onGuestsChange?: (guests: StayDatePickerGuests) => void;
  minDate?: string;
  className?: string;
  /** Compact layout (e.g. for sidebar card) */
  variant?: "default" | "compact";
}

export function StayDatePicker({
  value,
  onChange,
  primaryColor,
  guests,
  onGuestsChange,
  minDate = getToday(),
  className = "",
  variant = "default",
}: StayDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date((value.checkIn || minDate) + "Z");
    d.setDate(1);
    return d;
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const calendarDays = useMemo(
    () => getCalendarDays(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );

  // Sync viewMonth when value.checkIn changes from outside
  useEffect(() => {
    if (!value.checkIn) return;
    const d = new Date(value.checkIn + "Z");
    d.setDate(1);
    setViewMonth(d);
  }, [value.checkIn]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPosition(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const w = 320;
    let left = rect.left;
    if (left + w > window.innerWidth - 16) left = Math.max(16, window.innerWidth - w - 16);
    setPosition({ top: rect.bottom + 8, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || portalRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const handleDayClickRange = useCallback(
    (dateStr: string) => {
      if (dateStr < minDate) return;
      // If we already have a full range, start fresh with this day as check-in
      if (value.checkIn && value.checkOut) {
        onChange({ checkIn: dateStr, checkOut: "" });
        const d = new Date(dateStr + "Z");
        d.setDate(1);
        setViewMonth(d);
        return;
      }
      if (!value.checkIn) {
        onChange({ checkIn: dateStr, checkOut: "" });
        const d = new Date(dateStr + "Z");
        d.setDate(1);
        setViewMonth(d);
        return;
      }
      if (dateStr > value.checkIn) {
        onChange({ checkIn: value.checkIn, checkOut: dateStr });
      } else {
        onChange({ checkIn: dateStr, checkOut: value.checkOut || "" });
      }
    },
    [minDate, value.checkIn, value.checkOut, onChange]
  );

  const nights =
    value.checkIn && value.checkOut && value.checkIn < value.checkOut
      ? Math.ceil(
          (new Date(value.checkOut).getTime() - new Date(value.checkIn).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;

  const isCompact = variant === "compact";

  return (
    <div className={className}>
      {/* Dates row */}
      <div className={isCompact ? "space-y-3" : "space-y-4"}>
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`w-full flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left ${
              isCompact ? "p-3" : "p-3 sm:p-4"
            }`}
          >
            <span
              className="material-symbols-outlined shrink-0"
              style={{ color: primaryColor }}
              aria-hidden
            >
              calendar_month
            </span>
            <div className="min-w-0 flex-1 flex flex-col">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Check-in → Check-out
              </span>
              <span className="text-sm font-semibold text-slate-900 truncate">
                {formatDateLabel(value.checkIn)} → {formatDateLabel(value.checkOut)}
              </span>
            </div>
            <span className="material-symbols-outlined text-slate-400 shrink-0 text-xl" aria-hidden>
              {open ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>

        {/* Guests row (optional) */}
        {guests != null && onGuestsChange && (
          <div
            className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 ${
              isCompact ? "p-3" : "p-3 sm:p-4"
            }`}
          >
            <span
              className="material-symbols-outlined shrink-0"
              style={{ color: primaryColor }}
              aria-hidden
            >
              group
            </span>
            <div className="flex-1 flex items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-slate-600 shrink-0">Adults</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={guests.adults}
                  onChange={(e) =>
                    onGuestsChange({
                      ...guests,
                      adults: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-12 h-9 rounded-lg border border-slate-200 bg-white text-center text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent shrink-0"
                  style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties}
                />
              </label>
              <label className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-slate-600 shrink-0">Children</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={guests.children}
                  onChange={(e) =>
                    onGuestsChange({
                      ...guests,
                      children: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-12 h-9 rounded-lg border border-slate-200 bg-white text-center text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent shrink-0"
                  style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Portaled calendar */}
      {open && position && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={portalRef}
            className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 p-4 min-w-[300px] w-[320px]"
            style={{ top: position.top, left: position.left }}
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() =>
                  setViewMonth((m) => {
                    const n = new Date(m);
                    n.setMonth(n.getMonth() - 1);
                    return n;
                  })
                }
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                style={{ color: primaryColor }}
                aria-label="Previous month"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <span className="text-sm font-bold text-slate-900">
                {viewMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() =>
                  setViewMonth((m) => {
                    const n = new Date(m);
                    n.setMonth(n.getMonth() + 1);
                    return n;
                  })
                }
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                style={{ color: primaryColor }}
                aria-label="Next month"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((cell, i) =>
                cell.type === "empty" ? (
                  <div key={`e-${i}`} className="h-9 w-9" />
                ) : (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => handleDayClickRange(cell.date)}
                    disabled={cell.date < minDate}
                    className={`h-9 w-9 flex items-center justify-center text-sm font-medium rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      cell.date === value.checkIn
                        ? "rounded-l-lg text-white"
                        : cell.date === value.checkOut
                        ? "rounded-r-lg text-white"
                        : value.checkIn &&
                          value.checkOut &&
                          cell.date > value.checkIn &&
                          cell.date < value.checkOut
                        ? "text-slate-900"
                        : "text-slate-900 hover:bg-slate-100"
                    }`}
                    style={
                      cell.date === value.checkIn || cell.date === value.checkOut
                        ? { backgroundColor: primaryColor }
                        : value.checkIn &&
                          value.checkOut &&
                          cell.date > value.checkIn &&
                          cell.date < value.checkOut
                        ? { backgroundColor: `${primaryColor}20` }
                        : undefined
                    }
                  >
                    {cell.day}
                  </button>
                )
              )}
            </div>
            <p className="text-center text-xs font-medium mt-2" style={{ color: primaryColor }}>
              {value.checkIn && value.checkOut && value.checkIn < value.checkOut
                ? `${nights} night${nights !== 1 ? "s" : ""}`
                : "Select check-in, then check-out"}
            </p>
          </div>,
          document.body
        )}
    </div>
  );
}
