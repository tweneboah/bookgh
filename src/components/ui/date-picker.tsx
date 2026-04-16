"use client";

import { useId } from "react";
import ReactDatePicker from "react-datepicker";

interface AppDatePickerProps {
  label?: string;
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  placeholderText?: string;
  className?: string;
  /** When true, show time picker (datetime). */
  showTimeSelect?: boolean;
  timeIntervals?: number;
  error?: string;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Override default date display format (date-only mode). */
  dateFormat?: string;
  /** Full class string for the date input (overrides default input styling when set). */
  inputClassName?: string;
}

export function AppDatePicker({
  label,
  selected,
  onChange,
  placeholder,
  placeholderText,
  className,
  showTimeSelect = false,
  timeIntervals = 15,
  error,
  minDate,
  maxDate,
  dateFormat: dateFormatProp,
  inputClassName,
}: AppDatePickerProps) {
  const id = useId();
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <ReactDatePicker
        id={id}
        selected={selected}
        onChange={onChange}
        showTimeSelect={showTimeSelect}
        timeIntervals={showTimeSelect ? timeIntervals : undefined}
        timeCaption="Time"
        dateFormat={
          showTimeSelect ? "yyyy-MM-dd HH:mm" : dateFormatProp ?? "yyyy-MM-dd"
        }
        className={
          inputClassName ??
          `h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-slate-200 focus:border-[#5a189a] focus:ring-[#5a189a]/20"
          }`
        }
        placeholderText={placeholderText ?? placeholder}
        minDate={minDate}
        maxDate={maxDate}
      />
      {error ? (
        <p className="mt-1.5 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
