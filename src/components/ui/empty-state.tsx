"use client";

import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionClassName?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionClassName,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center",
        className
      )}
    >
      <div className="rounded-full bg-slate-200 p-4">
        <Icon className="h-8 w-8 text-slate-500" aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-medium text-slate-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "mt-6 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            actionClassName ??
              "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
