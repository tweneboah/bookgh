"use client";

import { cn } from "@/lib/cn";

export interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  /** Optional swatches (e.g. from logo extraction) — clicking sets value */
  swatches?: string[];
  /** Hint text below the control */
  hint?: string;
  className?: string;
  id?: string;
}

/** Normalize input to a valid hex color for the native picker (#RRGGBB). */
function toHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
  if (/^[0-9A-Fa-f]{6}$/.test(v)) return `#${v}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    const r = v[1] + v[1], g = v[2] + v[2], b = v[3] + v[3];
    return `#${r}${g}${b}`;
  }
  return "#5a189a";
}

export function ColorPicker({
  label,
  value,
  onChange,
  swatches = [],
  hint,
  className,
  id: idProp,
}: ColorPickerProps) {
  const id = idProp ?? (label ? `color-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  const hex = toHex(value);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <input
            type="color"
            id={id}
            value={hex}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border-0 border-transparent bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-slate-200"
            aria-label={label ?? "Color"}
          />
          <input
            type="text"
            value={value.trim() || hex}
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith("#") || /^[0-9A-Fa-f]{0,6}$/.test(v.replace("#", ""))) {
                onChange(v ? (v.startsWith("#") ? v : `#${v}`) : hex);
              }
            }}
            className="h-9 w-24 rounded border-0 bg-transparent px-2 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5a189a]/30"
            placeholder={hex}
          />
        </div>
        {swatches.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">From logo:</span>
            {swatches.map((swatchHex) => {
              const s = toHex(swatchHex);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(s)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 shadow-sm transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#5a189a]/50",
                    toHex(value) === s
                      ? "border-[#5a189a] ring-2 ring-[#5a189a]/30"
                      : "border-slate-200 hover:border-[#7b2cbf]/50"
                  )}
                  style={{ backgroundColor: s }}
                  title={s}
                  aria-label={`Use color ${s}`}
                />
              );
            })}
          </div>
        )}
      </div>
      {hint && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}
