"use client";

import { useId } from "react";
import ReactSelect, { type GroupBase, type StylesConfig } from "react-select";
import { cn } from "@/lib/cn";

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
  /** Warm pricing-rules modal styling */
  visualVariant?: "default" | "solar";
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

/** Pricing rules / solar curator panels */
function getSolarSelectStyles(hasError: boolean): StylesConfig<AppSelectOption, false, GroupBase<AppSelectOption>> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 0,
      borderColor: "transparent",
      boxShadow: state.isFocused && !hasError ? "0 0 0 2px rgba(155, 63, 0, 0.12)" : hasError ? "0 0 0 1px #ef4444" : "none",
      "&:hover": { backgroundColor: "#ffffff" },
      backgroundColor: state.isFocused ? "#ffffff" : "#eff1f2",
    }),
    singleValue: (base) => ({ ...base, color: "#2c2f30", fontWeight: 500 }),
    placeholder: (base) => ({ ...base, color: "#757778" }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#9b3f00"
        : state.isFocused
        ? "rgba(155, 63, 0, 0.08)"
        : "#ffffff",
      color: state.isSelected ? "#ffffff" : "#2c2f30",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, zIndex: 9999, borderRadius: 12 }),
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
  visualVariant = "default",
}: AppReactSelectProps) {
  const id = useId();
  const styles =
    visualVariant === "solar" ? getSolarSelectStyles(!!error) : getSelectStyles(!!error);
  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={id}
          className={cn(
            "mb-1.5 block text-sm font-medium",
            visualVariant === "solar" ? "ml-1 font-bold text-[#595c5d]" : "text-slate-700"
          )}
        >
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
        menuPlacement="auto"
        maxMenuHeight={280}
        styles={styles}
      />
      {error ? (
        <p className="mt-1.5 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
