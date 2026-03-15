"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  useEventBookings,
  useUpdateEventBooking,
} from "@/hooks/api";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  FileText,
  Pencil,
  GripVertical,
  PartyPopper,
  Plus,
  List,
} from "lucide-react";
import { cn } from "@/lib/cn";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { EVENT_BOOKING_STATUS } from "@/constants";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const PIPELINE_COLUMNS = [
  { key: EVENT_BOOKING_STATUS.INQUIRY, label: "Inquiry" },
  { key: EVENT_BOOKING_STATUS.QUOTED, label: "Quoted" },
  { key: EVENT_BOOKING_STATUS.CONFIRMED, label: "Confirmed" },
  { key: EVENT_BOOKING_STATUS.DEPOSIT_PAID, label: "Deposit paid" },
  { key: EVENT_BOOKING_STATUS.ONGOING, label: "Ongoing" },
  { key: EVENT_BOOKING_STATUS.COMPLETED, label: "Completed" },
] as const;

const COLUMN_ACCENT: Record<string, { border: string; headerBg: string; dot: string }> = {
  [EVENT_BOOKING_STATUS.INQUIRY]: {
    border: "border-l-slate-400",
    headerBg: "bg-slate-50/80",
    dot: "bg-slate-500",
  },
  [EVENT_BOOKING_STATUS.QUOTED]: {
    border: "border-l-[#ff8500]",
    headerBg: "bg-[#ff9100]/10",
    dot: "bg-[#ff9e00]",
  },
  [EVENT_BOOKING_STATUS.CONFIRMED]: {
    border: "border-l-[#7b2cbf]",
    headerBg: "bg-[#5a189a]/10",
    dot: "bg-[#7b2cbf]",
  },
  [EVENT_BOOKING_STATUS.DEPOSIT_PAID]: {
    border: "border-l-[#5a189a]",
    headerBg: "bg-[#3c096c]/10",
    dot: "bg-[#5a189a]",
  },
  [EVENT_BOOKING_STATUS.ONGOING]: {
    border: "border-l-emerald-500",
    headerBg: "bg-emerald-500/10",
    dot: "bg-emerald-500",
  },
  [EVENT_BOOKING_STATUS.COMPLETED]: {
    border: "border-l-emerald-600",
    headerBg: "bg-emerald-600/10",
    dot: "bg-emerald-600",
  },
};

const NEXT_STATUS: Record<string, string | undefined> = {
  [EVENT_BOOKING_STATUS.INQUIRY]: EVENT_BOOKING_STATUS.QUOTED,
  [EVENT_BOOKING_STATUS.QUOTED]: EVENT_BOOKING_STATUS.CONFIRMED,
  [EVENT_BOOKING_STATUS.CONFIRMED]: EVENT_BOOKING_STATUS.DEPOSIT_PAID,
  [EVENT_BOOKING_STATUS.DEPOSIT_PAID]: EVENT_BOOKING_STATUS.ONGOING,
  [EVENT_BOOKING_STATUS.ONGOING]: EVENT_BOOKING_STATUS.COMPLETED,
  [EVENT_BOOKING_STATUS.COMPLETED]: undefined,
};

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export default function EventBookingsPipelinePage() {
  const { data, isLoading } = useEventBookings({
    limit: "500",
  });
  const updateMut = useUpdateEventBooking();

  const bookings = data?.data ?? [];
  const byStatus = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const col of PIPELINE_COLUMNS) {
      map[col.key] = [];
    }
    map[EVENT_BOOKING_STATUS.CANCELLED] = [];
    for (const b of bookings) {
      const status = b.status ?? EVENT_BOOKING_STATUS.INQUIRY;
      if (status === EVENT_BOOKING_STATUS.CANCELLED) {
        map[EVENT_BOOKING_STATUS.CANCELLED].push(b);
      } else if (map[status]) {
        map[status].push(b);
      }
    }
    return map;
  }, [bookings]);

  const moveToStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateMut.mutateAsync({ id: bookingId, status: newStatus });
      toast.success("Status updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Update failed");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* White header */}
      <header className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Proposals & quotes pipeline
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <PartyPopper className="h-3.5 w-3.5 text-[#5a189a]" />
              Move events inquiry → quoted → confirmed → completed
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/event-bookings">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-slate-200 font-medium"
              >
                <List className="mr-2 h-4 w-4" />
                View list
              </Button>
            </Link>
            <Link href="/event-bookings">
              <Button
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00] px-4 py-2 font-semibold text-white shadow-lg shadow-[#ff8500]/25 hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                New event
              </Button>
            </Link>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Drag or use actions to move events through the pipeline.
        </p>
      </header>

      <main className="px-4 py-4 sm:px-6 sm:py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5a189a] border-t-transparent" />
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_COLUMNS.map((col) => {
              const accent = COLUMN_ACCENT[col.key] ?? COLUMN_ACCENT[EVENT_BOOKING_STATUS.INQUIRY];
              const count = byStatus[col.key]?.length ?? 0;
              return (
                <div
                  key={col.key}
                  className={cn(
                    "min-w-[280px] max-w-[320px] shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm",
                    "border-l-4",
                    accent.border
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between border-b border-slate-100 px-4 py-3 rounded-t-2xl",
                      accent.headerBg
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className={cn("h-2.5 w-2.5 rounded-full", accent.dot)} />
                      {col.label}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 shadow-sm border border-slate-100">
                      {count}
                    </span>
                  </div>
                  <div className="space-y-3 p-3">
                    {(byStatus[col.key] ?? []).map((b: any) => (
                      <div
                        key={b._id}
                        className="group rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:shadow-md hover:border-slate-200"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900">
                              {b.title ?? b.bookingReference}
                            </p>
                            <p className="truncate text-xs text-slate-500 mt-0.5">
                              {b.clientName}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {b.eventHallId?.name ?? "—"} · {formatDate(b.startDate)}
                            </p>
                            {b.quotedPrice != null && (
                              <p className="mt-1.5 text-xs font-semibold text-[#5a189a]">
                                {fmt(b.quotedPrice)}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <Link href={`/event-bookings?edit=${b._id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <Pencil className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>
                              </Link>
                              <Link href={`/event-bookings/${b._id}/beo`} target="_blank" rel="noopener noreferrer">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <FileText className="mr-1 h-3 w-3" />
                                  BEO
                                </Button>
                              </Link>
                              <Link href={`/event-bookings/${b._id}/expenses`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                >
                                  Expenses
                                </Button>
                              </Link>
                              {NEXT_STATUS[b.status] && (
                                <Button
                                  size="sm"
                                  className="h-7 rounded-lg text-xs font-medium bg-gradient-to-r from-[#5a189a] to-[#7b2cbf] text-white hover:opacity-95 border-0"
                                  onClick={() =>
                                    moveToStatus(b._id, NEXT_STATUS[b.status]!)
                                  }
                                  disabled={updateMut.isPending}
                                >
                                  <ChevronRight className="mr-1 h-3 w-3" />
                                  {PIPELINE_COLUMNS.find((c) => c.key === NEXT_STATUS[b.status])?.label}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(byStatus[col.key] ?? []).length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                        <p className="text-xs font-medium text-slate-400">No events</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
