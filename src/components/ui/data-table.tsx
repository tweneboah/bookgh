"use client";

import { cn } from "@/lib/cn";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "./empty-state";
import { Inbox } from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  getRowClassName?: (row: T) => string | undefined;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sort?: {
    column: string | null;
    direction: "asc" | "desc";
    onSort: (column: string, direction: "asc" | "desc") => void;
  };
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="whitespace-nowrap px-6 py-4">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  pagination,
  sort,
  loading = false,
  emptyTitle = "No data",
  emptyDescription = "Get started by adding your first item.",
  className,
  getRowClassName,
}: DataTableProps<T>) {
  const safeData = data ?? [];

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit) || 1
    : 1;
  const hasNext = pagination && pagination.page < totalPages;
  const hasPrev = pagination && pagination.page > 1;

  const handleSort = (key: string) => {
    if (!sort) return;
    const col = columns.find((c) => c.key === key);
    if (!col?.sortable) return;

    const nextDir: "asc" | "desc" =
      sort.column === key && sort.direction === "asc" ? "desc" : "asc";
    sort.onSort(key, nextDir);
  };

  const isEmpty = !loading && safeData.length === 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-600",
                    col.sortable && "cursor-pointer select-none hover:bg-slate-100"
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sort?.column === col.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sort?.column === col.key && (
                      <span className="inline-flex" aria-hidden>
                        {sort.direction === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} colCount={columns.length} />
              ))
            ) : isEmpty ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12"
                >
                  <EmptyState
                    icon={Inbox}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              safeData.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className={cn(
                    "transition-colors hover:bg-slate-50",
                    getRowClassName?.(row)
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-6 py-4 text-sm text-slate-900"
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !isEmpty && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing{" "}
            {(pagination.page - 1) * pagination.limit + 1}
            {" - "}
            {Math.min(
              pagination.page * pagination.limit,
              pagination.total
            )}{" "}
            of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={!hasPrev || loading}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={!hasNext || loading}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
