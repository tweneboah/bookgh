"use client";

import { useId } from "react";
import ReactSelect, { type GroupBase, type StylesConfig } from "react-select";

export type AppSelectOption = { value: string; label: string };

interface AppReactSelectProps {
  label?: string;
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  isClearable?: boolean;
  className?: string;
  error?: string;
}

/* Brand: purple #5a189a, #7b2cbf — dropdown above all content */
function getSelectStyles(hasError: boolean): StylesConfig<AppSelectOption, false, GroupBase<AppSelectOption>> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: 40,
      borderRadius: 10,
      borderColor: hasError ? "#ef4444" : state.isFocused ? "#5a189a" : "#e2e8f0",
      boxShadow: state.isFocused && !hasError ? "0 0 0 2px rgba(90, 24, 154, 0.2)" : hasError ? "0 0 0 1px #ef4444" : "none",
      "&:hover": { borderColor: hasError ? "#ef4444" : "#7b2cbf" },
      backgroundColor: "#ffffff",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#5a189a"
        : state.isFocused
        ? "rgba(90, 24, 154, 0.08)"
        : "#ffffff",
      color: state.isSelected ? "#ffffff" : "#0f172a",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
  };
}

export function AppReactSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  isClearable = false,
  className,
  error,
}: AppReactSelectProps) {
  const id = useId();
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <ReactSelect
        inputId={id}
        options={options}
        value={options.find((opt) => opt.value === value) ?? null}
        onChange={(option) => onChange(option?.value ?? "")}
        placeholder={placeholder}
        isClearable={isClearable}
        menuPortalTarget={typeof window !== "undefined" ? document.body : null}
        menuPosition="fixed"
        menuPlacement="top"
        maxMenuHeight={280}
        styles={getSelectStyles(!!error)}
      />
      {error ? (
        <p className="mt-1.5 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
