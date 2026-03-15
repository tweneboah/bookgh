"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useEventBookings,
  useEventBooking,
  useCreateEventBooking,
  useUpdateEventBooking,
  useDeleteEventBooking,
  useEventHalls,
  useEventResources,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Badge,
  Textarea,
  AppDatePicker,
} from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { Plus, Pencil, Trash2, FileText, Calendar, Building2, User, Receipt, Clock, DollarSign, LayoutGrid, Sparkles, Users, Info, Wallet, Package, CheckCircle, CalendarDays, ListOrdered } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { EVENT_BOOKING_STATUS, EVENT_TYPE, INSTALLMENT_STATUS } from "@/constants";
import { getApiErrorMessage, getApiValidationFieldErrors } from "@/lib/api-client";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 0 }).format(n);

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...Object.entries(EVENT_BOOKING_STATUS).map(([k, v]) => ({
    value: v,
    label: k.replace(/([A-Z])/g, " $1").trim(),
  })),
];

const STATUS_BADGE_VARIANT: Record<string, "outline" | "default" | "info" | "warning" | "success" | "danger"> = {
  inquiry: "outline",
  quoted: "default",
  confirmed: "info",
  depositPaid: "warning",
  ongoing: "success",
  completed: "success",
  cancelled: "danger",
};

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPE).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

function toISO(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString();
}

/** Compute suggested total from hall hourly rate and start/end. Returns null if cannot compute. */
function computeSuggestedTotal(
  hall: { hourlyRate?: number } | null | undefined,
  startDateStr: string,
  endDateStr: string
): number | null {
  if (!hall || hall.hourlyRate == null || hall.hourlyRate <= 0 || !startDateStr || !endDateStr) return null;
  const start = new Date(startDateStr).getTime();
  const end = new Date(endDateStr).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  const durationHours = (end - start) / (1000 * 60 * 60);
  return Math.round(durationHours * hall.hourlyRate * 100) / 100;
}

type EquipmentBookedRow = { resourceId: string; quantity: string };

type Booking = {
  _id: string;
  bookingReference?: string;
  title?: string;
  clientName?: string;
  eventType?: string;
  eventHallId?: { name?: string } | string;
  selectedLayoutName?: string;
  startDate?: string;
  endDate?: string;
  expectedAttendees?: number;
  status?: string;
  quotedPrice?: number;
  netProfit?: number;
  outstandingAmount?: number;
  equipmentBooked?: Array<{
    resourceId: { _id?: string; name?: string; type?: string; unitPrice?: number } | string;
    quantity: number;
  }>;
};

export default function EventBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdFromUrl = searchParams.get("edit");

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [editItem, setEditItem] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addEquipmentResourceId, setAddEquipmentResourceId] = useState("");
  const [addEquipmentQuantity, setAddEquipmentQuantity] = useState("1");
  const openedEditIdRef = useRef<string | null>(null);

  const [form, setForm] = useState({
    eventHallId: "",
    selectedLayoutName: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    eventType: EVENT_TYPE.MEETING as string,
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    expectedAttendees: "",
    quotedPrice: "",
    agreedPrice: "",
    depositRequired: "",
    depositPaid: "",
    finalSettlementPaid: "",
    totalExpenses: "",
    pricingOverrideReason: "",
    installments: [
      { dueDate: "", amount: "", status: INSTALLMENT_STATUS.PENDING as string },
    ],
    equipmentBooked: [] as EquipmentBookedRow[],
    specialRequests: "",
  });

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (statusFilter) params.status = statusFilter;
  if (eventTypeFilter) params.eventType = eventTypeFilter;

  const { data, isLoading } = useEventBookings(params);
  const { data: hallsData } = useEventHalls({ limit: "100" });
  const { data: resourcesData } = useEventResources({ limit: "200" });
  const { data: singleBookingRes } = useEventBooking(editIdFromUrl ?? "");
  const createMut = useCreateEventBooking();
  const updateMut = useUpdateEventBooking();
  const deleteMut = useDeleteEventBooking();

  const bookingFromUrl = singleBookingRes?.data as Booking | undefined;
  useEffect(() => {
    if (!editIdFromUrl || !bookingFromUrl || openedEditIdRef.current === editIdFromUrl) return;
    openEdit(bookingFromUrl as Booking & Record<string, unknown>);
    openedEditIdRef.current = editIdFromUrl;
  }, [editIdFromUrl, bookingFromUrl]);

  const items = (data?.data ?? []) as Booking[];
  const pagination = data?.meta?.pagination;
  type HallRow = {
    _id: string;
    name?: string;
    description?: string;
    capacity?: number;
    layoutTemplates?: { name: string; capacity: number }[];
    hourlyRate?: number;
    amenities?: string[];
    status?: string;
  };
  const halls = (hallsData?.data ?? []) as HallRow[];
  type ResourceRow = { _id: string; name?: string; type?: string; unitPrice?: number; priceUnit?: string; quantity?: number };
  const resources = (resourcesData?.data ?? []) as ResourceRow[];
  const resourceOptions = resources.map((r) => ({
    value: String(r._id),
    label: `${r.name ?? "Resource"}${r.type ? ` (${String(r.type).replace(/([A-Z])/g, " $1").trim()})` : ""}${r.unitPrice != null ? ` · ${fmt(r.unitPrice)} ${r.priceUnit === "perHour" ? "/hr" : r.priceUnit === "perDay" ? "/day" : "each"}` : ""}`,
  }));
  const selectedResourceForPreview = addEquipmentResourceId
    ? resources.find((r) => String(r._id) === addEquipmentResourceId)
    : null;
  function resourcePriceLabel(res: ResourceRow | undefined): string {
    if (!res) return "—";
    if (res.unitPrice == null) return "No rate set";
    const unit = res.priceUnit === "perHour" ? "per hour" : res.priceUnit === "perDay" ? "per day" : "per unit";
    return `${fmt(res.unitPrice)} ${unit}`;
  }

  const quotedAmount = form.quotedPrice ? parseFloat(form.quotedPrice) : 0;
  const agreedAmount = form.agreedPrice ? parseFloat(form.agreedPrice) : 0;
  const venueAmount = Number.isFinite(agreedAmount) && agreedAmount > 0 ? agreedAmount : (Number.isFinite(quotedAmount) ? quotedAmount : 0);

  const eventDurationHours = (() => {
    if (!form.startDate || !form.endDate) return 0;
    const s = new Date(form.startDate).getTime();
    const e = new Date(form.endDate).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
    return (e - s) / (1000 * 60 * 60);
  })();
  const eventDurationDays = Math.ceil(eventDurationHours / 24) || 0;

  function computeEquipmentLineTotal(row: EquipmentBookedRow): { total: number; label: string } {
    const res = resources.find((r) => String(r._id) === row.resourceId);
    const qty = parseInt(row.quantity, 10) || 0;
    const rate = res?.unitPrice ?? 0;
    if (rate <= 0 || qty <= 0) return { total: 0, label: "No rate" };
    if (res?.priceUnit === "perHour") {
      if (eventDurationHours <= 0) return { total: 0, label: `${fmt(rate)}/hr × ${qty} — set dates to compute` };
      const t = Math.round(rate * qty * eventDurationHours * 100) / 100;
      return { total: t, label: `${fmt(rate)}/hr × ${qty} × ${eventDurationHours.toFixed(1)}h = ${fmt(t)}` };
    }
    if (res?.priceUnit === "perDay") {
      if (eventDurationDays <= 0) return { total: 0, label: `${fmt(rate)}/day × ${qty} — set dates to compute` };
      const t = Math.round(rate * qty * eventDurationDays * 100) / 100;
      return { total: t, label: `${fmt(rate)}/day × ${qty} × ${eventDurationDays}d = ${fmt(t)}` };
    }
    const t = rate * qty;
    return { total: t, label: `${fmt(rate)} × ${qty} = ${fmt(t)}` };
  }

  const equipmentTotalAll = form.equipmentBooked.reduce(
    (sum, row) => sum + computeEquipmentLineTotal(row).total, 0
  );
  const estimatedTotal = venueAmount + equipmentTotalAll;

  const resetForm = () => {
    setForm({
      eventHallId: "",
      selectedLayoutName: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      eventType: EVENT_TYPE.MEETING,
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      expectedAttendees: "",
      quotedPrice: "",
      agreedPrice: "",
      depositRequired: "",
      depositPaid: "",
      finalSettlementPaid: "",
      totalExpenses: "",
      pricingOverrideReason: "",
      installments: [{ dueDate: "", amount: "", status: INSTALLMENT_STATUS.PENDING }],
      equipmentBooked: [],
      specialRequests: "",
    });
    setEditItem(null);
    setFieldErrors({});
    setSubmitError(null);
    setAddEquipmentResourceId("");
    setAddEquipmentQuantity("1");
  };

  const selectedHall = halls.find((h) => String(h._id) === form.eventHallId);
  const layoutOptions = selectedHall?.layoutTemplates?.length
    ? [
        { value: "", label: "No specific layout" },
        ...selectedHall.layoutTemplates.map((t) => ({
          value: t.name,
          label: `${t.name} (${t.capacity})`,
        })),
      ]
    : [];

  const hallOptions = [
    { value: "", label: "Select hall…" },
    ...halls.map((h) => ({ value: String(h._id), label: h.name ?? String(h._id) })),
  ];

  const eventTypeSelectOptions = [
    { value: "", label: "All event types" },
    ...EVENT_TYPE_OPTIONS,
  ];

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: Booking & Record<string, unknown>) => {
    setEditItem(item);
    setFieldErrors({});
    setSubmitError(null);
    const hall = item.eventHallId as { _id?: string } | undefined;
    const installments = Array.isArray(item.installments) ? item.installments as { dueDate?: string; amount?: number; status?: string }[] : [];
    const equipmentBooked = Array.isArray(item.equipmentBooked)
      ? (item.equipmentBooked as { resourceId: { _id?: string } | string; quantity: number }[]).map((row) => ({
          resourceId: typeof row.resourceId === "object" && row.resourceId?._id
            ? String((row.resourceId as { _id: string })._id)
            : String(row.resourceId),
          quantity: row.quantity != null ? String(row.quantity) : "1",
        }))
      : [];
    setForm({
      eventHallId: hall?._id ?? (item.eventHallId as string) ?? "",
      selectedLayoutName: (item.selectedLayoutName as string) ?? "",
      clientName: (item.clientName as string) ?? "",
      clientEmail: (item.clientEmail as string) ?? "",
      clientPhone: (item.clientPhone as string) ?? "",
      eventType: (item.eventType as string) ?? EVENT_TYPE.MEETING,
      title: (item.title as string) ?? "",
      description: (item.description as string) ?? "",
      startDate: item.startDate ? String(item.startDate).slice(0, 16) : "",
      endDate: item.endDate ? String(item.endDate).slice(0, 16) : "",
      startTime: (item.startTime as string) ?? "",
      endTime: (item.endTime as string) ?? "",
      expectedAttendees: item.expectedAttendees != null ? String(item.expectedAttendees) : "",
      quotedPrice: item.quotedPrice != null ? String(item.quotedPrice) : "",
      agreedPrice: item.agreedPrice != null ? String(item.agreedPrice) : "",
      depositRequired: item.depositRequired != null ? String(item.depositRequired) : "",
      depositPaid: item.depositPaid != null ? String(item.depositPaid) : "",
      finalSettlementPaid: item.finalSettlementPaid != null ? String(item.finalSettlementPaid) : "",
      totalExpenses: item.totalExpenses != null ? String(item.totalExpenses) : "",
      pricingOverrideReason: (item.pricingOverrideReason as string) ?? "",
      installments:
        installments.length > 0
          ? installments.map((row) => ({
              dueDate: row.dueDate ? String(row.dueDate).slice(0, 16) : "",
              amount: row.amount != null ? String(row.amount) : "",
              status: row.status ?? INSTALLMENT_STATUS.PENDING,
            }))
          : [{ dueDate: "", amount: "", status: INSTALLMENT_STATUS.PENDING }],
      equipmentBooked,
      specialRequests: (item.specialRequests as string) ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      eventHallId: form.eventHallId,
      selectedLayoutName: form.selectedLayoutName.trim() || undefined,
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim() || undefined,
      clientPhone: form.clientPhone.trim() || undefined,
      eventType: form.eventType,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      startDate: toISO(form.startDate),
      endDate: toISO(form.endDate),
      startTime: form.startTime.trim() || undefined,
      endTime: form.endTime.trim() || undefined,
      expectedAttendees: form.expectedAttendees ? parseInt(form.expectedAttendees, 10) : undefined,
      quotedPrice: form.quotedPrice ? parseFloat(form.quotedPrice) : undefined,
      agreedPrice: form.agreedPrice ? parseFloat(form.agreedPrice) : undefined,
      depositRequired: form.depositRequired ? parseFloat(form.depositRequired) : undefined,
      depositPaid: form.depositPaid ? parseFloat(form.depositPaid) : undefined,
      finalSettlementPaid: form.finalSettlementPaid ? parseFloat(form.finalSettlementPaid) : undefined,
      totalExpenses: form.totalExpenses ? parseFloat(form.totalExpenses) : undefined,
      pricingOverrideReason: form.pricingOverrideReason.trim() || undefined,
      installments: form.installments
        .filter((row) => row.dueDate && row.amount)
        .map((row) => ({
          dueDate: toISO(row.dueDate),
          amount: parseFloat(row.amount),
          status: row.status || INSTALLMENT_STATUS.PENDING,
        })),
      equipmentBooked: form.equipmentBooked
        .filter((row) => row.resourceId && row.quantity && parseInt(row.quantity, 10) > 0)
        .map((row) => ({
          resourceId: row.resourceId,
          quantity: parseInt(row.quantity, 10),
        })),
      specialRequests: form.specialRequests.trim() || undefined,
    };

    setFieldErrors({});
    setSubmitError(null);
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload } as Parameters<typeof updateMut.mutateAsync>[0]);
        toast.success("Event booking updated");
      } else {
        await createMut.mutateAsync(payload as Parameters<typeof createMut.mutateAsync>[0]);
        toast.success("Event booking created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(
        err,
        editItem ? "Could not update event booking. Please check your entries and try again." : "Could not create event booking. Please check your entries and try again."
      );
      setSubmitError(msg);
      const validationErrors = getApiValidationFieldErrors(err);
      if (validationErrors) setFieldErrors(validationErrors);
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Event booking deleted");
      setShowDelete(null);
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, "Could not delete event booking. Please try again.")
      );
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

  return (
    <div
      className="min-h-0 bg-slate-50/40 font-sans text-slate-900 antialiased"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Hero: bold, gradient strip, glass-style stats */}
      <header className="relative overflow-hidden border-b border-slate-200/60 bg-white">
        <div className="absolute inset-0 h-full w-full min-w-[400px] max-w-2xl bg-gradient-to-br from-[#ff6d00]/5 via-transparent to-[#5a189a]/5" aria-hidden />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-[#ff6d00] via-[#ff9100] to-[#5a189a]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5a189a]/20 bg-[#5a189a]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#5a189a]">
                Conference & Events
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Event Bookings
              </h1>
              <p className="mt-2 max-w-lg text-base font-medium text-slate-500 sm:text-lg">
                Create and manage conference and event bookings in one place.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <Link
                href="/event-bookings/calendar"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-[#5a189a]/30 hover:bg-[#5a189a]/5 hover:text-[#5a189a] hover:shadow-md"
              >
                <CalendarDays className="h-4 w-4" aria-hidden />
                Calendar
              </Link>
              <Link
                href="/event-bookings/pipeline"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-[#5a189a]/30 hover:bg-[#5a189a]/5 hover:text-[#5a189a] hover:shadow-md"
              >
                <ListOrdered className="h-4 w-4" aria-hidden />
                Pipeline
              </Link>
              <Button
                onClick={openCreate}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00] px-6 py-3 font-semibold text-white shadow-lg shadow-[#ff6d00]/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#ff6d00]/35 sm:w-auto"
              >
                <Plus className="h-5 w-5" aria-hidden />
                New Booking
              </Button>
            </div>
          </div>
          {!isLoading && pagination != null && (
            <div className="relative mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-baseline gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/60">
                <span className="text-2xl font-bold tabular-nums text-[#ff8500] sm:text-3xl">{pagination.total}</span>
                <span className="text-sm font-medium text-slate-500">booking{pagination.total !== 1 ? "s" : ""}</span>
              </div>
              {statusFilter && (
                <span className="rounded-full bg-[#5a189a]/10 px-3 py-1.5 text-xs font-semibold text-[#5a189a]">
                  Filtered
                </span>
              )}
              {eventTypeFilter && (
                <span className="rounded-full bg-[#5a189a]/10 px-3 py-1.5 text-xs font-semibold text-[#5a189a]">
                  By type
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-bold text-slate-900">All bookings</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full min-w-0 sm:w-40">
                <AppReactSelect
                  label="Status"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v ?? "");
                    setPage(1);
                  }}
                  options={STATUS_OPTIONS}
                  placeholder="Status"
                />
              </div>
              <div className="w-full min-w-0 sm:w-40">
                <AppReactSelect
                  label="Type"
                  value={eventTypeFilter}
                  onChange={(v) => {
                    setEventTypeFilter(v ?? "");
                    setPage(1);
                  }}
                  options={eventTypeSelectOptions}
                  placeholder="Type"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          {isLoading ? (
            <div className="flex min-h-[360px] items-center justify-center p-12">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-[#ff8500]" />
                <p className="text-sm font-medium text-slate-500">Loading bookings…</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center p-12 text-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#ff6d00]/10 to-[#5a189a]/10 blur-xl" aria-hidden />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6d00]/20 to-[#5a189a]/20 text-[#5a189a]">
                  <Calendar className="h-10 w-10" aria-hidden />
                </div>
              </div>
              <p className="mt-6 text-xl font-bold text-slate-900">No event bookings yet</p>
              <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
                Create your first booking to get started.
              </p>
              <Button
                onClick={openCreate}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00] px-6 py-3 font-semibold text-white shadow-lg shadow-[#ff6d00]/30 transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                New Booking
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
                {items.map((row, idx) => (
                  <div
                    key={row._id}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] ${
                      idx % 2 === 0
                        ? "hover:border-[#ff8500]/40"
                        : "hover:border-[#5a189a]/40"
                    }`}
                  >
                    <div
                      className={`absolute left-0 top-0 h-full w-1.5 rounded-r-full ${
                        idx % 2 === 0
                          ? "bg-gradient-to-b from-slate-200 to-slate-100 group-hover:from-[#ff8500] group-hover:to-[#ff9e00]"
                          : "bg-gradient-to-b from-[#5a189a] to-[#9d4edd] group-hover:from-[#7b2cbf] group-hover:to-[#9d4edd]"
                      }`}
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-start justify-between gap-3 pl-1">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/event-bookings/${row._id}`}
                          className="block focus:outline-none focus:ring-2 focus:ring-[#5a189a]/30 focus:ring-offset-2 rounded-xl -m-1 p-1"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {row.bookingReference ?? "—"}
                          </p>
                          <h3 className="mt-1.5 text-lg font-bold text-slate-900 hover:text-[#5a189a] transition-colors">
                            {row.title ?? row.clientName ?? "Untitled"}
                          </h3>
                        </Link>
                      </div>
                      <Badge
                        variant={STATUS_BADGE_VARIANT[row.status ?? ""] ?? "default"}
                        className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                      >
                        {STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status ?? "—"}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-4 pl-1 text-sm font-medium text-slate-600">
                      <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <User className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        {row.clientName ?? "—"}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <Building2 className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        {typeof row.eventHallId === "object"
                          ? (row.eventHallId as { name?: string })?.name
                          : row.eventHallId ?? "—"}
                      </span>
                    </div>
                    <p className="mt-2 pl-1 text-xs font-medium text-slate-500">
                      {formatDate(row.startDate)} → {formatDate(row.endDate)}
                      {row.expectedAttendees != null && ` · ${row.expectedAttendees} attendees`}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 pl-1">
                      {row.quotedPrice != null && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {fmt(row.quotedPrice)}
                        </span>
                      )}
                      {row.netProfit != null && (
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${row.netProfit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {fmt(row.netProfit)}
                        </span>
                      )}
                      {row.outstandingAmount != null && row.outstandingAmount > 0 && (
                        <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {fmt(row.outstandingAmount)} due
                        </span>
                      )}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 pl-1">
                      <Link
                        href={`/event-bookings/${row._id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#ff6d00]/25 transition-all hover:scale-[1.02] hover:shadow-lg"
                      >
                        View details
                      </Link>
                      <Link
                        href={`/event-bookings/${row._id}/beo`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all hover:border-[#5a189a]/40 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                        title="BEO"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href={`/event-bookings/${row._id}/payments`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all hover:border-[#5a189a]/40 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                        title="Payments"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href={`/event-bookings/${row._id}/expenses`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all hover:border-[#5a189a]/40 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                        title="Expenses"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(row as Booking & Record<string, unknown>)}
                        className="h-8 w-8 rounded-full text-slate-500 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDelete(row._id)}
                        aria-label="Delete"
                        className="h-8 w-8 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {pagination && totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
                  <p className="text-sm font-medium text-slate-500">
                    Page <span className="font-semibold text-slate-700">{pagination.page}</span> of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-full border-slate-200 font-semibold hover:bg-white"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-full border-slate-200 font-semibold hover:bg-white"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </section>
      </main>

      {/* Create/Edit Modal — New Event Booking */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
          openedEditIdRef.current = null;
          if (editIdFromUrl) router.replace("/event-bookings");
        }}
        title={editItem ? "Edit Event Booking" : "New Event Booking"}
        size="6xl"
      >
        <div className="flex min-h-0 flex-1 flex-col">
        {/* Modal header: white, gradient accent */}
        <div className="relative shrink-0 border-b border-slate-100 bg-white">
          <div
            className="absolute bottom-0 left-0 h-1 w-32 rounded-r-full bg-gradient-to-r from-[#ff6d00] to-[#ff9e00]"
            aria-hidden
          />
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-medium text-slate-500">
              {editItem ? "Update booking details." : "Create a new event booking."}
            </p>
            <button
              type="button"
              onClick={() => setShowHowItWorks((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-[#ff6d00]/20 bg-[#ff6d00]/5 px-4 py-2.5 font-semibold text-[#ff6d00] transition-colors hover:bg-[#ff6d00]/10"
            >
              <Info className="h-5 w-5" />
              How event booking & payment works
            </button>
          </div>
          {showHowItWorks && (
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">Pricing</p>
              <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-slate-600">
                <li><strong>Quoted price</strong> — What you send to the client (use hall rates as a guide; enter the total you are quoting).</li>
                <li><strong>Agreed price</strong> — Optional; use if the final deal differs from the quote.</li>
              </ul>
              <p className="mb-2 text-sm font-semibold text-slate-800">How much to pay / how much is left</p>
              <ul className="mb-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                <li><strong>Total to pay</strong> = Quoted price (or agreed price when set).</li>
                <li><strong>Deposit paid</strong> + <strong>Final settlement paid</strong> = What the client has already paid.</li>
                <li><strong>Outstanding</strong> = Total − (Deposit paid + Final settlement paid).</li>
              </ul>
              <p className="text-xs text-slate-500">Installments are optional. Update deposit paid and final settlement paid as the client pays.</p>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {(submitError || Object.keys(fieldErrors).length > 0) && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                <p className="font-medium">
                  {submitError ?? "Please fix the errors below and try again."}
                </p>
                {Object.keys(fieldErrors).length > 0 && submitError && (
                  <p className="mt-1 text-red-700">See field errors below.</p>
                )}
              </div>
            )}
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="flex flex-col gap-8 lg:col-span-2">
              {/* Venue & Setup */}
              <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-[#5a189a]" />
                  <h3 className="text-lg font-bold text-[#5a189a]">Venue & Setup</h3>
                </div>
                <div className="space-y-4">
                  <AppReactSelect
                    label="Event hall"
                    value={form.eventHallId}
                    onChange={(v) => {
                      const nextHallId = v ?? "";
                      const nextHall = halls.find((h) => String(h._id) === nextHallId);
                      const suggested =
                        nextHall && form.startDate && form.endDate
                          ? computeSuggestedTotal(nextHall, form.startDate, form.endDate)
                          : null;
                      setForm((f) => ({
                        ...f,
                        eventHallId: nextHallId,
                        selectedLayoutName: "",
                        quotedPrice: suggested != null ? String(suggested) : f.quotedPrice,
                      }));
                      setFieldErrors({});
                    }}
                    options={hallOptions}
                    placeholder="Select hall…"
                    className="w-full"
                    error={fieldErrors.eventHallId}
                  />
                  {layoutOptions.length > 0 && (
                    <AppReactSelect
                      label="Room setup (layout)"
                      value={form.selectedLayoutName}
                      onChange={(v) => {
                        setForm((f) => ({ ...f, selectedLayoutName: v ?? "" }));
                        setFieldErrors((e) => ({ ...e, selectedLayoutName: "" }));
                      }}
                      options={layoutOptions}
                      placeholder="Optional"
                      className="w-full"
                      error={fieldErrors.selectedLayoutName}
                    />
                  )}
                  {selectedHall && (
                    <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#ff6d00_0%,#ff9e00_100%)] text-white">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{selectedHall.name ?? "Hall"}</h4>
                          {selectedHall.status && (
                            <span className="text-xs font-medium capitalize text-slate-500">{selectedHall.status}</span>
                          )}
                        </div>
                      </div>
                      {selectedHall.description && (
                        <p className="mt-3 text-sm text-slate-600">{selectedHall.description}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-3">
                        {selectedHall.capacity != null && (
                          <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                            Capacity: {selectedHall.capacity}
                          </span>
                        )}
                        {selectedHall.layoutTemplates?.length ? (
                          <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                            <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
                            {selectedHall.layoutTemplates.length} layout(s)
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Pricing</p>
                        {selectedHall.hourlyRate != null && selectedHall.hourlyRate > 0 ? (
                          <>
                            {form.startDate && form.endDate && (() => {
                              const start = new Date(form.startDate).getTime();
                              const end = new Date(form.endDate).getTime();
                              if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
                              const durationHours = (end - start) / (1000 * 60 * 60);
                              return (
                                <div className="mb-3 rounded-lg border border-[#5a189a]/30 bg-[#5a189a]/5 px-3 py-2">
                                  <p className="text-xs font-semibold text-[#5a189a]">Venue total</p>
                                  <p className="mt-0.5 text-sm text-slate-700">
                                    {durationHours.toFixed(1)} hrs × {fmt(selectedHall.hourlyRate)}/hr
                                  </p>
                                </div>
                              );
                            })()}
                            <div className="flex items-center justify-between rounded-lg bg-amber-50/80 px-3 py-2">
                              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                <Clock className="h-3.5 w-3.5 text-amber-600" />
                                Hourly rate
                              </span>
                              <span className="text-sm font-semibold text-slate-900">{fmt(selectedHall.hourlyRate)}</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500">No hourly rate set for this hall.</p>
                        )}
                      </div>
                      {selectedHall.amenities?.length ? (
                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Amenities</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedHall.amenities.map((a, i) => (
                              <span key={i} className="rounded-md bg-[#5a189a]/10 px-2 py-1 text-xs font-medium text-[#5a189a]">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </section>

              {/* Client Information */}
              <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <User className="h-6 w-6 text-[#5a189a]" />
                  <h3 className="text-lg font-bold text-[#5a189a]">Client Information</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Client name"
                    value={form.clientName}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, clientName: e.target.value }));
                      setFieldErrors((e) => ({ ...e, clientName: "" }));
                    }}
                    required
                    placeholder="Full name"
                    className="sm:col-span-2 lg:col-span-1"
                    error={fieldErrors.clientName}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, clientEmail: e.target.value }));
                      setFieldErrors((e) => ({ ...e, clientEmail: "" }));
                    }}
                    placeholder="Optional"
                    error={fieldErrors.clientEmail}
                  />
                  <Input
                    label="Phone"
                    value={form.clientPhone}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, clientPhone: e.target.value }));
                      setFieldErrors((e) => ({ ...e, clientPhone: "" }));
                    }}
                    placeholder="Optional"
                    error={fieldErrors.clientPhone}
                  />
                </div>
              </section>

              {/* Event details */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5a189a]/10">
                    <LayoutGrid className="h-4 w-4 text-[#5a189a]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#5a189a]">Event Details</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="mb-2 block text-sm font-semibold">Event type</span>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, eventType: opt.value }));
                            setFieldErrors((e) => ({ ...e, eventType: "" }));
                          }}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            form.eventType === opt.value
                              ? "bg-[#ff6d00] text-white shadow-sm"
                              : "border border-transparent bg-slate-100 text-slate-600 hover:border-[#ff6d00]/30"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {fieldErrors.eventType && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.eventType}</p>
                    )}
                  </div>
                  <Input
                    label="Title"
                    value={form.title}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, title: e.target.value }));
                      setFieldErrors((e) => ({ ...e, title: "" }));
                    }}
                    required
                    placeholder="e.g. Annual Corporate Retreat"
                    error={fieldErrors.title}
                  />
                  <Textarea
                    label="Description"
                    value={form.description}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, description: e.target.value }));
                      setFieldErrors((e) => ({ ...e, description: "" }));
                    }}
                    placeholder="Optional"
                    rows={2}
                    error={fieldErrors.description}
                  />
                </div>
              </section>

              {/* Equipment */}
              <section className="rounded-2xl border border-slate-200/80 bg-slate-50/30 p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7b2cbf]/10">
                    <Package className="h-4 w-4 text-[#5a189a]" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600">Equipment & resources</h3>
                </div>
                <div className="mb-6 flex gap-3 rounded-xl border border-[#ff6d00]/10 bg-[#ff6d00]/5 p-4">
                  <Info className="h-5 w-5 shrink-0 text-[#ff6d00]" />
                  <p className="text-sm text-slate-600">
                    Select resources from our standard equipment catalog. Additional charges may apply for premium audio-visual tools.
                  </p>
                </div>
                {form.equipmentBooked.length > 0 && (
                  <ul className="mb-4 space-y-2">
                    {form.equipmentBooked.map((row, idx) => {
                      const res = resources.find((r) => String(r._id) === row.resourceId);
                      const label = res?.name ?? row.resourceId ?? "—";
                      const line = computeEquipmentLineTotal(row);
                      return (
                        <li
                          key={`eq-${idx}-${row.resourceId}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
                        >
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-slate-800">{label}</span>
                            <p className="text-xs text-slate-500 mt-0.5">{line.label}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={row.quantity}
                              onChange={(e) => {
                                const v = e.target.value;
                                setForm((f) => {
                                  const next = [...f.equipmentBooked];
                                  next[idx] = { ...next[idx], quantity: v };
                                  return { ...f, equipmentBooked: next };
                                });
                              }}
                              className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  equipmentBooked: f.equipmentBooked.filter((_, i) => i !== idx),
                                }))
                              }
                              className="h-8 w-8 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {selectedResourceForPreview && (
                  <div className="mb-4 rounded-xl border border-[#5a189a]/20 bg-[#5a189a]/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected resource</p>
                    <p className="mt-1 font-medium text-slate-900">{selectedResourceForPreview.name ?? "—"}</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      Rate: <span className="font-semibold text-[#5a189a]">{resourcePriceLabel(selectedResourceForPreview)}</span>
                      {selectedResourceForPreview.priceUnit === "perHour" && (
                        <span className="ml-1 text-slate-500">(charged by event duration)</span>
                      )}
                      {selectedResourceForPreview.priceUnit === "perDay" && (
                        <span className="ml-1 text-slate-500">(charged by event duration)</span>
                      )}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-0 flex-1 sm:min-w-[200px]">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Resource</label>
                    <AppReactSelect
                      value={addEquipmentResourceId}
                      onChange={(v) => setAddEquipmentResourceId(v ?? "")}
                      options={resourceOptions.filter(
                        (o) => !form.equipmentBooked.some((r) => r.resourceId === o.value)
                      )}
                      placeholder="Select resource…"
                      className="w-full"
                    />
                  </div>
                  <div className="w-20">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Qty</label>
                    <Input
                      type="number"
                      min={1}
                      value={addEquipmentQuantity}
                      onChange={(e) => setAddEquipmentQuantity(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!addEquipmentResourceId) return;
                      const qty = parseInt(addEquipmentQuantity, 10) || 1;
                      if (qty < 1) return;
                      setForm((f) => ({
                        ...f,
                        equipmentBooked: [
                          ...f.equipmentBooked,
                          { resourceId: addEquipmentResourceId, quantity: String(qty) },
                        ],
                      }));
                      setAddEquipmentResourceId("");
                      setAddEquipmentQuantity("1");
                    }}
                    disabled={!addEquipmentResourceId}
                    className="rounded-xl border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add
                  </Button>
                </div>
                {resourceOptions.length === 0 && !resourcesData ? (
                  <p className="mt-2 text-xs text-slate-500">Loading resources…</p>
                ) : resourceOptions.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No resources in catalog. Add equipment at{" "}
                    <Link href="/event-resources" className="font-medium text-[#5a189a] hover:underline">
                      Event Resources
                    </Link>
                    .
                  </p>
                ) : null}
              </section>

              {/* Schedule */}
              <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-6 w-6 text-[#5a189a]" />
                  <h3 className="text-lg font-bold text-[#5a189a]">Schedule</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AppDatePicker
                      label="Start date & time"
                      selected={form.startDate ? new Date(form.startDate) : null}
                      onChange={(d) => {
                        const nextStart = d ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
                        setForm((f) => {
                          const hall = halls.find((h) => String(h._id) === f.eventHallId);
                          const suggested =
                            hall && nextStart && f.endDate
                              ? computeSuggestedTotal(hall, nextStart, f.endDate)
                              : null;
                          return {
                            ...f,
                            startDate: nextStart,
                            startTime: d ? format(d, "HH:mm") : "",
                            quotedPrice: suggested != null ? String(suggested) : f.quotedPrice,
                          };
                        });
                        setFieldErrors((e) => ({ ...e, startDate: "" }));
                      }}
                      showTimeSelect
                      timeIntervals={15}
                      placeholder="Select start…"
                      error={fieldErrors.startDate}
                    />
                    <AppDatePicker
                      label="End date & time"
                      selected={form.endDate ? new Date(form.endDate) : null}
                      onChange={(d) => {
                        const nextEnd = d ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
                        setForm((f) => {
                          const hall = halls.find((h) => String(h._id) === f.eventHallId);
                          const suggested =
                            hall && f.startDate && nextEnd
                              ? computeSuggestedTotal(hall, f.startDate, nextEnd)
                              : null;
                          return {
                            ...f,
                            endDate: nextEnd,
                            endTime: d ? format(d, "HH:mm") : "",
                            quotedPrice: suggested != null ? String(suggested) : f.quotedPrice,
                          };
                        });
                        setFieldErrors((e) => ({ ...e, endDate: "" }));
                      }}
                      showTimeSelect
                      timeIntervals={15}
                      placeholder="Select end…"
                      error={fieldErrors.endDate}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-1">
                    <Input
                      label="Expected attendees"
                      type="number"
                      min="1"
                      value={form.expectedAttendees}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, expectedAttendees: e.target.value }));
                        setFieldErrors((e) => ({ ...e, expectedAttendees: "" }));
                      }}
                      placeholder="Optional"
                      error={fieldErrors.expectedAttendees}
                    />
                  </div>
                </div>
              </section>

              {/* Pricing */}
              <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-[#5a189a]" />
                  <h3 className="text-lg font-bold text-[#5a189a]">Pricing</h3>
                </div>
                <p className="mb-4 text-sm text-slate-500">
                  Standard rates apply based on venue and resources. Pricing overrides require a valid business reason.
                </p>
                <div className="space-y-4">
                  <div>
                    <Input
                      label="Quoted price (GHS)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.quotedPrice}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, quotedPrice: e.target.value }));
                        setFieldErrors((e) => ({ ...e, quotedPrice: "" }));
                      }}
                      placeholder="Auto-filled when hall and dates are set"
                      error={fieldErrors.quotedPrice}
                    />
                    {selectedHall && selectedHall.hourlyRate != null && selectedHall.hourlyRate > 0 && (
                      form.startDate && form.endDate ? (() => {
                        const start = new Date(form.startDate).getTime();
                        const end = new Date(form.endDate).getTime();
                        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
                          return <p className="mt-1 text-xs text-slate-500">Set valid start and end dates to see the suggested total. You can edit.</p>;
                        }
                        const durationHours = (end - start) / (1000 * 60 * 60);
                        return (
                          <p className="mt-1 text-xs text-slate-600">
                            {durationHours.toFixed(1)} hrs × {fmt(selectedHall.hourlyRate)}/hr. You can edit.
                          </p>
                        );
                      })() : (
                        <p className="mt-1 text-xs text-slate-500">
                          Set start and end dates to see the suggested total. You can edit.
                        </p>
                      )
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Agreed price (GHS)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.agreedPrice}
                      onChange={(e) => setForm((f) => ({ ...f, agreedPrice: e.target.value }))}
                      placeholder="Optional override"
                    />
                    <Input
                      label="Total event expenses (GHS)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.totalExpenses}
                      onChange={(e) => setForm((f) => ({ ...f, totalExpenses: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <Input
                    label="Pricing override reason"
                    value={form.pricingOverrideReason}
                    onChange={(e) => setForm((f) => ({ ...f, pricingOverrideReason: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </section>

              {/* Special Requests */}
              <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-[#5a189a]" />
                  <h3 className="text-lg font-bold text-[#5a189a]">Special Requests</h3>
                </div>
                <Textarea
                  label=""
                  value={form.specialRequests}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, specialRequests: e.target.value }));
                    setFieldErrors((e) => ({ ...e, specialRequests: "" }));
                  }}
                  placeholder="Optional notes or special requests…"
                  rows={2}
                  error={fieldErrors.specialRequests}
                />
              </section>
              </div>

              {/* Sidebar — Cost summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-6">
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] relative">
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#5a189a]/5" aria-hidden />
                    <h3 className="relative mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
                      <Receipt className="h-5 w-5 text-[#ff6d00]" />
                      Cost summary
                    </h3>
                    <div className="relative space-y-4">
                      {/* Venue breakdown */}
                      <div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Venue (hall)</span>
                          <span className="font-semibold text-slate-900">
                            {venueAmount > 0 ? fmt(venueAmount) : "GHS 0.00"}
                          </span>
                        </div>
                        {selectedHall && selectedHall.hourlyRate != null && selectedHall.hourlyRate > 0 && form.startDate && form.endDate && venueAmount > 0 && (() => {
                          const start = new Date(form.startDate).getTime();
                          const end = new Date(form.endDate).getTime();
                          if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
                          const durationHours = (end - start) / (1000 * 60 * 60);
                          return (
                            <p className="mt-1 text-xs text-slate-500">
                              {durationHours.toFixed(1)} hrs × {fmt(selectedHall.hourlyRate)}/hr
                            </p>
                          );
                        })()}
                      </div>
                      {/* Resources breakdown */}
                      <div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Resources</span>
                          <span className="font-semibold text-slate-900">
                            {equipmentTotalAll > 0 ? fmt(equipmentTotalAll) : "GHS 0.00"}
                          </span>
                        </div>
                        {form.equipmentBooked.length > 0 && (
                          <div className="mt-2 space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                            {form.equipmentBooked.map((row, idx) => {
                              const res = resources.find((r) => String(r._id) === row.resourceId);
                              const line = computeEquipmentLineTotal(row);
                              return (
                                <div
                                  key={`cs-${idx}`}
                                  className={`flex flex-col gap-0.5 ${idx > 0 ? "border-t border-slate-100 pt-2" : ""}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-slate-700 truncate">
                                      {res?.name ?? "Resource"} × {parseInt(row.quantity, 10) || 0}
                                    </span>
                                    <span className="shrink-0 text-xs font-semibold text-slate-900">
                                      {line.total > 0 ? fmt(line.total) : "—"}
                                    </span>
                                  </div>
                                  {line.label && line.label !== "No rate" && (
                                    <p className="text-[11px] text-slate-500">{line.label}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                        <span className="text-base font-bold">Estimated total</span>
                        <span className="text-2xl font-extrabold text-[#ff6d00]">
                          {estimatedTotal > 0 ? fmt(estimatedTotal) : "GHS 0.00"}
                        </span>
                      </div>
                    </div>
                    <div className="relative mt-6 flex gap-3 rounded-xl border border-[#5a189a]/10 bg-[#5a189a]/5 p-4">
                      <Info className="h-5 w-5 shrink-0 text-[#5a189a]" />
                      <p className="text-xs leading-relaxed text-slate-600">
                        Prices exclude 15% VAT and service charges. Final total will be confirmed upon reservation approval.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end sm:p-6">
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="order-2 w-full rounded-xl bg-[linear-gradient(135deg,#ff6d00_0%,#ff8500_100%)] py-4 font-bold text-white shadow-lg shadow-[#ff6d00]/20 transition-transform hover:scale-[1.02] sm:order-1 sm:w-auto sm:px-8"
            >
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5" />
                {editItem ? "Update booking" : "Create booking"}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="order-1 w-full rounded-xl border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 sm:order-2 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Event Booking">
        <p className="font-medium text-slate-600">
          Are you sure you want to delete this event booking? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowDelete(null)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteMut.isPending}
            className="rounded-xl"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
