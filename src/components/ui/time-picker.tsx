"use client";

import { useId } from "react";
import ReactDatePicker from "react-datepicker";

/** Parse "HH:mm" to a Date (uses fixed base date 2000-01-01). */
function parseTimeToDate(value: string): Date | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const d = new Date(2000, 0, 1, hours, minutes, 0, 0);
  return d;
}

/** Format Date to "HH:mm". */
function formatDateToTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface AppTimePickerProps {
  label?: string;
  /** Value in "HH:mm" format */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  timeIntervals?: number;
  error?: string;
  required?: boolean;
}

export function AppTimePicker({
  label,
  value,
  onChange,
  placeholder = "Select time",
  className,
  timeIntervals = 15,
  error,
  required,
}: AppTimePickerProps) {
  const id = useId();
  const selected = parseTimeToDate(value);

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}
      <ReactDatePicker
        id={id}
        selected={selected}
        onChange={(d) => onChange(d ? formatDateToTime(d) : "")}
        showTimeSelect
        showTimeSelectOnly
        timeIntervals={timeIntervals}
        timeCaption="Time"
        dateFormat="HH:mm"
        className={`h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
            : "border-slate-200 focus:border-[#5a189a] focus:ring-[#5a189a]/20"
        }`}
        placeholderText={placeholder}
      />
      {error ? (
        <p className="mt-1.5 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
