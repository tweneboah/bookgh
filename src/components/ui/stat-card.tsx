"use client";

import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  description?: string;
  change?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export function StatCard({
  icon: Icon,
  title,
  value,
  description,
  change,
  className,
}: StatCardProps) {
  const isPositive = change && change.value > 0;
  const isNegative = change && change.value < 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
          {change && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  isPositive && "text-emerald-500",
                  isNegative && "text-red-500",
                  !isPositive && !isNegative && "text-slate-500"
                )}
              >
                {isPositive && "+"}
                {change.value}%
              </span>
              {change.label && (
                <span className="text-sm text-slate-500">{change.label}</span>
              )}
            </div>
          )}
        </div>
        <div className="rounded-lg bg-slate-100 p-3">
          <Icon className="h-6 w-6 text-slate-600" aria-hidden />
        </div>
      </div>
    </div>
  );
}
