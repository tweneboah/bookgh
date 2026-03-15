"use client";

import { useState } from "react";
import Link from "next/link";
import {
  usePlaygroundBookings,
  usePlaygroundAreas,
  useCreatePlaygroundBooking,
  useUpdatePlaygroundBooking,
  useDeletePlaygroundBooking,
  usePlaygroundBookingCheckIn,
  usePlaygroundBookingCheckOut,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  EmptyState,
  AppReactSelect,
  AppDatePicker,
  AppTimePicker,
} from "@/components/ui";
import {
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  CalendarCheck,
  Wallet,
  ExternalLink,
  Receipt,
  ReceiptText,
} from "lucide-react";
import toast from "react-hot-toast";
import { PLAYGROUND_BOOKING_STATUS } from "@/constants";

const STATUS_OPTIONS = Object.entries(PLAYGROUND_BOOKING_STATUS).map(
  ([k, v]) => ({
    value: v,
    label: k.replace(/([A-Z])/g, " $1").trim(),
  })
);

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#b45309",
    border: "rgba(245, 158, 11, 0.3)",
  },
  confirmed: {
    bg: "rgba(90, 24, 154, 0.12)",
    text: "#5a189a",
    border: "rgba(90, 24, 154, 0.3)",
  },
  checkedIn: {
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#059669",
    border: "rgba(16, 185, 129, 0.3)",
  },
  completed: {
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#475569",
    border: "rgba(100, 116, 139, 0.3)",
  },
  cancelled: {
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#dc2626",
    border: "rgba(239, 68, 68, 0.3)",
  },
  noShow: {
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#475569",
    border: "rgba(100, 116, 139, 0.3)",
  },
};

const fmt = (n: number) =>
  `₵${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function PlaygroundBookingsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    playgroundAreaId: "",
    rateType: "hourly" as "hourly" | "daily",
    bookingDate: "",
    bookingEndDate: "",
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    startTime: "",
    endTime: "",
    numberOfGuests: "1",
    sessionType: "",
    addOns: [] as {
      name: string;
      quantity: number;
      unitPrice: number;
      totalAmountEntered?: string;
    }[],
    amount: "",
    paidAmount: "",
    notes: "",
    status: PLAYGROUND_BOOKING_STATUS.PENDING,
  });

  const params: Record<string, string> = { page: String(page), limit: "12" };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = usePlaygroundBookings(params);
  const { data: areasData } = usePlaygroundAreas({ limit: "100" });
  const areas = areasData?.data ?? [];
  const createMut = useCreatePlaygroundBooking();
  const updateMut = useUpdatePlaygroundBooking();
  const deleteMut = useDeletePlaygroundBooking();
  const checkInMut = usePlaygroundBookingCheckIn();
  const checkOutMut = usePlaygroundBookingCheckOut();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const areaOptions = areas.map((a: any) => {
    const hr = a.hourlyRate != null && a.hourlyRate > 0 ? ` · ${fmt(a.hourlyRate)}/hr` : "";
    const dr = a.dailyRate != null && a.dailyRate > 0 ? ` · ${fmt(a.dailyRate)}/day` : "";
    return {
      value: String(a._id),
      label: `${a.name} (${a.type ?? "—"})${hr}${dr}`,
    };
  });

  /** Parse "HH:mm" to hours (e.g. "09:00" -> 9, "12:30" -> 12.5) */
  function timeToHours(t: string): number {
    const [h, m] = t.trim().split(":").map(Number);
    return (h ?? 0) + (m ?? 0) / 60;
  }
  /** Duration in hours from start/end time strings */
  function durationHours(start: string, end: string): number {
    if (!start || !end) return 0;
    return Math.max(0, timeToHours(end) - timeToHours(start));
  }

  const selectedArea = areas.find(
    (a: any) => String(a._id) === String(form.playgroundAreaId)
  );
  const durationHrs = durationHours(form.startTime, form.endTime);
  const hasHourlyRate = selectedArea?.hourlyRate != null && selectedArea.hourlyRate > 0;
  const hasDailyRate = selectedArea?.dailyRate != null && selectedArea.dailyRate > 0;
  /** Number of days (inclusive) for date range; 1 if same day or end missing */
  const dailyDays =
    form.rateType === "daily" && form.bookingDate && form.bookingEndDate
      ? (() => {
          const start = new Date(form.bookingDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(form.bookingEndDate);
          end.setHours(0, 0, 0, 0);
          if (end < start) return 0;
          return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        })()
      : form.rateType === "daily" && form.bookingDate
        ? 1
        : 0;
  const venueAmount =
    form.rateType === "daily" && hasDailyRate && dailyDays > 0
      ? Math.round(selectedArea!.dailyRate! * dailyDays * 100) / 100
      : hasHourlyRate && durationHrs > 0
        ? Math.round(durationHrs * selectedArea!.hourlyRate! * 100) / 100
        : 0;
  const addOnsTotal = form.addOns.reduce(
    (sum, a) => sum + a.quantity * (a.unitPrice || 0),
    0
  );
  const estimatedTotal = venueAmount + addOnsTotal;

  const resetForm = () => {
    setForm({
      playgroundAreaId: "",
      rateType: "hourly",
      bookingDate: "",
      bookingEndDate: "",
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      startTime: "",
      endTime: "",
      numberOfGuests: "1",
      sessionType: "",
      addOns: [],
      amount: "",
      paidAmount: "",
      notes: "",
      status: PLAYGROUND_BOOKING_STATUS.PENDING,
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const bookingDate = item.bookingDate
      ? new Date(item.bookingDate).toISOString().slice(0, 10)
      : "";
    const bookingEndDate = item.bookingEndDate
      ? new Date(item.bookingEndDate).toISOString().slice(0, 10)
      : "";
    setForm({
      playgroundAreaId: item.playgroundAreaId?._id ?? item.playgroundAreaId ?? "",
      rateType: "hourly",
      bookingDate,
      bookingEndDate,
      guestName: item.guestName ?? "",
      guestEmail: item.guestEmail ?? "",
      guestPhone: item.guestPhone ?? "",
      startTime: item.startTime ?? "",
      endTime: item.endTime ?? "",
      numberOfGuests: String(item.numberOfGuests ?? 1),
      sessionType: item.sessionType ?? "",
      addOns: Array.isArray(item.addOns)
        ? item.addOns.map((a: any) => ({
            name: a.name ?? "",
            quantity: a.quantity ?? 1,
            unitPrice: a.unitPrice ?? 0,
            totalAmountEntered: "",
          }))
        : [],
      amount: item.amount != null ? String(item.amount) : "",
      paidAmount: item.paidAmount != null ? String(item.paidAmount) : "",
      notes: item.notes ?? "",
      status: item.status ?? PLAYGROUND_BOOKING_STATUS.PENDING,
    });
    setShowModal(true);
  };

  const handleCheckIn = async (bookingId: string) => {
    try {
      await checkInMut.mutateAsync(bookingId);
      toast.success("Guest checked in");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Check-in failed");
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    try {
      await checkOutMut.mutateAsync(bookingId);
      toast.success("Guest checked out");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Check-out failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      playgroundAreaId: form.playgroundAreaId,
      guestName: form.guestName.trim(),
      guestEmail: form.guestEmail.trim() || undefined,
      guestPhone: form.guestPhone.trim() || undefined,
      bookingDate: form.bookingDate
        ? new Date(form.bookingDate).toISOString()
        : undefined,
      bookingEndDate:
        form.rateType === "daily" && form.bookingEndDate
          ? new Date(form.bookingEndDate).toISOString()
          : undefined,
      startTime: form.startTime.trim(),
      endTime: form.endTime.trim(),
      numberOfGuests: parseInt(form.numberOfGuests, 10) || 1,
      sessionType: form.sessionType.trim() || undefined,
      addOns:
        form.addOns.filter((a) => (a.name || "").trim()).length > 0
          ? form.addOns
              .filter((a) => (a.name || "").trim())
              .map((a) => ({
                name: a.name.trim(),
                quantity: a.quantity || 1,
                unitPrice: a.unitPrice ?? 0,
              }))
          : undefined,
      amount: parseFloat(form.amount) || 0,
      paidAmount: form.paidAmount ? parseFloat(form.paidAmount) : undefined,
      notes: form.notes.trim() || undefined,
      status: form.status,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Playground booking updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Playground booking created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Playground booking deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit) || 1
    : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && items.length === 0;

  return (
    <div
      className="min-h-screen bg-white font-sans"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            background:
              "linear-gradient(135deg, #ff6d00 0%, #5a189a 50%, #240046 100%)",
          }}
          aria-hidden
        />
        <div className="relative px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                  boxShadow: "0 4px 14px rgba(255, 109, 0, 0.25)",
                }}
              >
                <CalendarCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Playground Bookings
                </h1>
                <p className="mt-0.5 text-sm text-slate-600">
                  Manage guest bookings, check-ins, and sessions
                </p>
              </div>
            </div>
            <Button
              onClick={openCreate}
              className="shrink-0 font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                color: "white",
                boxShadow: "0 4px 14px rgba(255, 109, 0, 0.25)",
              }}
            >
              <Plus className="h-5 w-5" />
              New Booking
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            Filter by status:
          </span>
          <div className="min-w-[160px]">
            <AppReactSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              options={[
                { value: "", label: "All statuses" },
                ...STATUS_OPTIONS,
              ]}
              placeholder="All statuses"
            />
          </div>
        </div>
        {pagination && !isEmpty && (
          <p className="text-sm text-slate-600">
            Showing {(page - 1) * pagination.limit + 1}–
            {Math.min(page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[280px] animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12">
            <EmptyState
              icon={CalendarCheck}
              title="No playground bookings yet"
              description="Create your first playground booking to start managing guest sessions and check-ins."
              action={{
                label: "New Booking",
                onClick: openCreate,
              }}
              actionClassName="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] text-white hover:opacity-90 focus-visible:ring-[#5a189a]"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any) => {
              const statusStyle =
                STATUS_STYLES[item.status] ?? STATUS_STYLES.completed;
              const statusLabel =
                STATUS_OPTIONS.find((o) => o.value === item.status)?.label ??
                item.status;
              const areaName =
                item.playgroundAreaId?.name ??
                (typeof item.playgroundAreaId === "string" ? "—" : "—");

              return (
                <div
                  key={item._id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-lg"
                >
                  <div
                    className="h-1.5"
                    style={{
                      background:
                        "linear-gradient(90deg, #ff6d00 0%, #5a189a 100%)",
                    }}
                  />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                          {item.bookingReference ?? "—"}
                        </p>
                        <Link
                          href={`/playground/bookings/${item._id}`}
                          className="-m-1 block rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-[#5a189a]/30"
                        >
                          <h3 className="mt-1 truncate text-lg font-semibold text-slate-900 transition hover:text-[#5a189a]">
                            {item.guestName}
                          </h3>
                        </Link>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {areaName}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.text,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{formatDate(item.bookingDate)}</span>
                      </div>
                      {item.startTime && item.endTime && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                          <span>
                            {item.startTime} – {item.endTime}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                      <span className="text-lg font-semibold text-slate-900">
                        {fmt(item.amount ?? 0)}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        <Link
                          href={`/playground/bookings/${item._id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-[#5a189a]/30 hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </Link>
                        <Link
                          href={`/playground/bookings/${item._id}/payments`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-[#5a189a]/30 hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          Payments
                        </Link>
                        <Link
                          href={`/playground/bookings/${item._id}/expenses`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-[#5a189a]/30 hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
                        >
                          <ReceiptText className="h-3.5 w-3.5" />
                          Expenses
                        </Link>
                        {(item.status === "pending" ||
                          item.status === "confirmed") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCheckIn(item._id)}
                            disabled={checkInMut.isPending}
                            aria-label="Check in"
                            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <LogIn className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status === "checkedIn" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCheckOut(item._id)}
                            disabled={checkOutMut.isPending}
                            aria-label="Check out"
                            className="text-[#5a189a] hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                          aria-label="Edit"
                          className="text-slate-600 hover:bg-slate-100 hover:text-[#5a189a]"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDelete(item._id)}
                          aria-label="Delete"
                          className="text-slate-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination && !isEmpty && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={!hasPrev || isLoading}
              aria-label="Previous page"
              className="border-slate-300 hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext || isLoading}
              aria-label="Next page"
              className="border-slate-300 hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title=""
        size="2xl"
        className="max-h-[90vh]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                background:
                  "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
              }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h2
              id="modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              {editItem ? "Edit Playground Booking" : "New Playground Booking"}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
            aria-label="Close modal"
            className="text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 overflow-y-auto px-6 py-4">
            <AppReactSelect
              label="Playground Area"
              value={form.playgroundAreaId}
              onChange={(value) =>
                setForm((f) => {
                  const next = { ...f, playgroundAreaId: value };
                  const area = areas.find((a: any) => String(a._id) === String(value));
                  const hasH = area?.hourlyRate != null && area?.hourlyRate > 0;
                  const hasD = area?.dailyRate != null && area?.dailyRate > 0;
                  if (hasD && !hasH) next.rateType = "daily";
                  else if (hasH && !hasD) next.rateType = "hourly";
                  return next;
                })
              }
              options={areaOptions}
              placeholder="Select playground area"
            />
            {selectedArea && (hasHourlyRate || hasDailyRate) && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Billing
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, rateType: "hourly" }))}
                    disabled={!hasHourlyRate}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      form.rateType === "hourly"
                        ? "border-[#ff6d00] bg-[#ff6d00]/10 text-[#ff6d00]"
                        : hasHourlyRate
                          ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                    }`}
                  >
                    Hourly
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, rateType: "daily" }))}
                    disabled={!hasDailyRate}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      form.rateType === "daily"
                        ? "border-[#5a189a] bg-[#5a189a]/10 text-[#5a189a]"
                        : hasDailyRate
                          ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                    }`}
                  >
                    Daily
                  </button>
                </div>
              </div>
            )}
            <Input
              label="Guest Name"
              value={form.guestName}
              onChange={(e) =>
                setForm((f) => ({ ...f, guestName: e.target.value }))
              }
              required
              placeholder="Full name"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Guest Email"
                type="email"
                value={form.guestEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, guestEmail: e.target.value }))
                }
                placeholder="Optional"
              />
              <Input
                label="Guest Phone"
                value={form.guestPhone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, guestPhone: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AppDatePicker
                label={form.rateType === "daily" ? "Start Date" : "Booking Date"}
                selected={
                  form.bookingDate ? new Date(form.bookingDate) : null
                }
                onChange={(d) =>
                  setForm((f) => ({
                    ...f,
                    bookingDate: d ? d.toISOString().slice(0, 10) : "",
                  }))
                }
                placeholderText="Select date"
              />
              {form.rateType === "daily" && (
                <AppDatePicker
                  label="End Date"
                  selected={
                    form.bookingEndDate ? new Date(form.bookingEndDate) : null
                  }
                  onChange={(d) =>
                    setForm((f) => ({
                      ...f,
                      bookingEndDate: d ? d.toISOString().slice(0, 10) : "",
                    }))
                  }
                  placeholderText="Select end date"
                  minDate={form.bookingDate ? new Date(form.bookingDate) : undefined}
                />
              )}
              <AppTimePicker
                label="Start Time"
                value={form.startTime}
                onChange={(v) => setForm((f) => ({ ...f, startTime: v }))}
                placeholder="Select start time"
                timeIntervals={15}
                required
              />
              <AppTimePicker
                label="End Time"
                value={form.endTime}
                onChange={(v) => setForm((f) => ({ ...f, endTime: v }))}
                placeholder="Select end time"
                timeIntervals={15}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Number of Guests"
                type="number"
                min="1"
                value={form.numberOfGuests}
                onChange={(e) =>
                  setForm((f) => ({ ...f, numberOfGuests: e.target.value }))
                }
                required
              />
              <Input
                label="Session Type"
                value={form.sessionType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sessionType: e.target.value }))
                }
                placeholder="e.g. Play session, Party"
              />
              <div>
                <Input
                  label="Amount (₵)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  required
                />
                {estimatedTotal > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          amount: String(estimatedTotal),
                        }))
                      }
                      className="text-xs border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10"
                    >
                      Use suggested ({fmt(estimatedTotal)})
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {/* Cost summary — show when area is selected or add-ons entered (same as pool) */}
            {(selectedArea || form.addOns.some((a) => (a.name || "").trim())) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#ff6d00]" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Cost summary
                  </h3>
                </div>
                <div className="space-y-2">
                  {selectedArea && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        Playground area ({selectedArea.name})
                        {form.rateType === "hourly" && hasHourlyRate && (
                          <span className="ml-1 text-slate-500">
                            {form.startTime && form.endTime ? (
                              <>· {durationHrs.toFixed(1)} hrs × {fmt(selectedArea.hourlyRate)}/hr</>
                            ) : (
                              <>· {fmt(selectedArea.hourlyRate)}/hr (set start & end time for amount)</>
                            )}
                          </span>
                        )}
                        {form.rateType === "daily" && hasDailyRate && (
                          <span className="ml-1 text-slate-500">
                            {dailyDays > 0 ? (
                              <>{dailyDays} day{dailyDays !== 1 ? "s" : ""} × {fmt(selectedArea.dailyRate)}/day</>
                            ) : (
                              <>Daily rate {fmt(selectedArea.dailyRate)}/day (set date range)</>
                            )}
                          </span>
                        )}
                        {form.rateType === "hourly" && !hasHourlyRate && (
                          <span className="ml-1 text-amber-600 text-xs">
                            (Set hourly rate in Playground Areas)
                          </span>
                        )}
                        {form.rateType === "daily" && !hasDailyRate && (
                          <span className="ml-1 text-amber-600 text-xs">
                            (Set daily rate in Playground Areas)
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {venueAmount > 0 ? fmt(venueAmount) : "—"}
                      </span>
                    </div>
                  )}
                  {form.addOns.filter((a) => (a.name || "").trim()).length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Add-ons</span>
                      <span className="font-semibold text-slate-900">
                        {fmt(addOnsTotal)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-900">
                      Estimated total
                    </span>
                    <span className="text-lg font-bold text-[#ff6d00]">
                      {estimatedTotal > 0 ? fmt(estimatedTotal) : "—"}
                    </span>
                  </div>
                  {selectedArea && estimatedTotal === 0 && (
                    <p className="text-xs text-slate-500 pt-1 border-t border-slate-100 mt-2">
                      {form.rateType === "hourly"
                        ? "Set an hourly rate for this area in Playground Areas, then choose start & end time above to see the estimated cost."
                        : "Set a daily rate for this area in Playground Areas and choose a start and end date to see the estimated cost."}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Add-ons
              </label>
              {form.addOns.map((addOn, idx) => (
                <div
                  key={idx}
                  className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                >
                  <Input
                    placeholder="Name"
                    value={addOn.name}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        addOns: f.addOns.map((a, i) =>
                          i === idx ? { ...a, name: e.target.value } : a
                        ),
                      }))
                    }
                    className="min-w-[100px] flex-1"
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={addOn.quantity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        addOns: f.addOns.map((a, i) =>
                          i === idx
                            ? { ...a, quantity: parseInt(e.target.value, 10) || 1 }
                            : a
                        ),
                      }))
                    }
                    className="w-16"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit price"
                    value={addOn.unitPrice}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        addOns: f.addOns.map((a, i) =>
                          i === idx
                            ? {
                                ...a,
                                unitPrice: parseFloat(e.target.value) || 0,
                              }
                            : a
                        ),
                      }))
                    }
                    className="w-24"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        addOns: f.addOns.filter((_, i) => i !== idx),
                      }))
                    }
                    className="border-slate-300 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    addOns: [
                      ...f.addOns,
                      { name: "", quantity: 1, unitPrice: 0 },
                    ],
                  }))
                }
                className="border-slate-300 hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
              >
                Add add-on
              </Button>
            </div>
            <Input
              label="Paid Amount (₵)"
              type="number"
              min="0"
              step="0.01"
              value={form.paidAmount}
              onChange={(e) =>
                setForm((f) => ({ ...f, paidAmount: e.target.value }))
              }
              placeholder="Optional"
            />
            {editItem && (
              <AppReactSelect
                label="Status"
                value={form.status}
                onChange={(value) =>
                  setForm((f) => ({ ...f, status: value }))
                }
                options={STATUS_OPTIONS}
              />
            )}
            <Input
              label="Notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Optional"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="border-slate-300 hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                color: "white",
                boxShadow: "0 4px 14px rgba(255, 109, 0, 0.25)",
              }}
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Playground Booking"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this playground booking? This action
          cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDelete(null)}
            className="border-slate-300 hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteMut.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
