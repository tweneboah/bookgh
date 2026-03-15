"use client";

import { cn } from "@/lib/cn";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Input } from "./input";

const DEBOUNCE_MS = 300;

export interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = "Search...",
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(controlledValue ?? "");
  const isControlled = controlledValue !== undefined;

  const displayValue = isControlled ? controlledValue : localValue;

  const debouncedSearch = useCallback(() => {
    const v = isControlled ? controlledValue : localValue;
    onSearch?.(v ?? "");
  }, [isControlled, controlledValue, localValue, onSearch]);

  useEffect(() => {
    if (!onSearch) return;

    const timer = setTimeout(debouncedSearch, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [displayValue, debouncedSearch, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (!isControlled) setLocalValue(v);
    onChange?.(v);
  };

  const handleClear = () => {
    if (!isControlled) setLocalValue("");
    onChange?.("");
    onSearch?.("");
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        type="search"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        icon={<Search className="h-4 w-4" />}
        className="pr-10"
        aria-label="Search"
      />
      {displayValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
