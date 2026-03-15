"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  useBookings,
  useCreateBooking,
  useUpdateBooking,
  useCheckIn,
  useCheckOut,
  useCancelBooking,
  useMarkBookingNoShow,
  useCancellationPreview,
  useAvailability,
  useBookingQuote,
  useRoomCategories,
  useGuests,
  useCorporateAccounts,
  useBookingFolio,
  useAddRoomCharge,
  useDeleteRoomCharge,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Badge,
  Textarea,
  EmptyState,
  Dropdown,
} from "@/components/ui";
import { SearchInput } from "@/components/ui/search-input";
import { AppReactSelect } from "@/components/ui/react-select";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import {
  Plus,
  Eye,
  LogIn,
  LogOut,
  XCircle,
  Trash2,
  Pencil,
  Calendar,
  CreditCard,
  X,
  BedDouble,
  Sparkles,
  Users,
  MoreHorizontal,
  CalendarDays,
  TrendingUp,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  BOOKING_STATUS,
  BOOKING_SOURCE,
  ROOM_CHARGE_TYPE,
  PAYMENT_METHOD,
  ID_TYPE,
} from "@/constants";

const CHARGE_TYPE_OPTIONS = Object.entries(ROOM_CHARGE_TYPE).map(([k, v]) => ({
  value: v,
  label: k.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim(),
}));

const STATUS_TABS = [
  { value: "", label: "All" },
  ...Object.entries(BOOKING_STATUS).map(([k, v]) => ({
    value: v,
    label: k.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
  })),
];

/** Status card styles — brand palette (orange/purple) */
const STATUS_CARD_STYLES: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  "": {
    label: "All",
    bg: "bg-white",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  [BOOKING_STATUS.PENDING]: {
    label: "Pending",
    bg: "bg-gradient-to-br from-[#ff9e00]/15 via-[#ff9100]/10 to-[#ff8500]/5",
    text: "text-[#c2410c]",
    border: "border-[#ff9e00]/40",
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: "Confirmed",
    bg: "bg-gradient-to-br from-[#5a189a]/15 via-[#7b2cbf]/10 to-[#9d4edd]/5",
    text: "text-[#5a189a]",
    border: "border-[#5a189a]/40",
  },
  [BOOKING_STATUS.CHECKED_IN]: {
    label: "Checked In",
    bg: "bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-teal-500/5",
    text: "text-emerald-700",
    border: "border-emerald-400/50",
  },
  [BOOKING_STATUS.CHECKED_OUT]: {
    label: "Checked Out",
    bg: "bg-gradient-to-br from-[#240046]/10 via-[#3c096c]/5 to-slate-100",
    text: "text-[#3c096c]",
    border: "border-[#5a189a]/25",
  },
  [BOOKING_STATUS.CANCELLED]: {
    label: "Cancelled",
    bg: "bg-gradient-to-br from-red-500/10 via-red-400/5 to-rose-50",
    text: "text-red-700",
    border: "border-red-300/50",
  },
  [BOOKING_STATUS.NO_SHOW]: {
    label: "No Show",
    bg: "bg-gradient-to-br from-slate-200/80 via-slate-100 to-slate-50",
    text: "text-slate-600",
    border: "border-slate-300/60",
  },
};

/** Left border (2–3px) by status for table rows and cards */
const STATUS_ROW_BORDER: Record<string, string> = {
  "": "border-l-[3px] border-l-slate-200",
  [BOOKING_STATUS.PENDING]: "border-l-[3px] border-l-[#ff9e00]",
  [BOOKING_STATUS.CONFIRMED]: "border-l-[3px] border-l-[#5a189a]",
  [BOOKING_STATUS.CHECKED_IN]: "border-l-[3px] border-l-emerald-500",
  [BOOKING_STATUS.CHECKED_OUT]: "border-l-[3px] border-l-[#3c096c]",
  [BOOKING_STATUS.CANCELLED]: "border-l-[3px] border-l-red-400",
  [BOOKING_STATUS.NO_SHOW]: "border-l-[3px] border-l-slate-400",
};

const STATUS_BADGE_VARIANT: Record<string, "warning" | "info" | "success" | "default" | "danger" | "outline"> = {
  pending: "warning",
  confirmed: "info",
  checkedIn: "success",
  checkedOut: "default",
  cancelled: "danger",
  noShow: "outline",
};

const SOURCE_OPTIONS = Object.entries(BOOKING_SOURCE).map(([k, v]) => ({
  value: v,
  label: k
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "),
}));

const ID_TYPE_OPTIONS = Object.entries(ID_TYPE).map(([k, v]) => ({
  value: v,
  label: k.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim(),
}));

function toISO(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString();
}

function toDateTimeLocal(dateValue?: string | Date): string {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function prettyLabel(value?: string): string {
  if (!value) return "-";
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Format amount in Ghana Cedis */
const formatGHS = (amount: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount);

export default function BookingsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [showCheckIn, setShowCheckIn] = useState<any>(null);
  /** When true, availability for check-in ignores room category so staff can assign any available room. */
  const [checkInFallbackAnyCategory, setCheckInFallbackAnyCategory] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState<any>(null);
  const [showView, setShowView] = useState<any>(null);
  const [showCancel, setShowCancel] = useState<any>(null);

  const [createForm, setCreateForm] = useState({
    guestId: "",
    corporateAccountId: "",
    roomCategoryId: "",
    checkInDate: "",
    checkOutDate: "",
    numberOfGuests: "1",
    source: BOOKING_SOURCE.WALK_IN as string,
    isGroupBooking: false,
    groupId: "",
    groupSize: "1",
    specialRequests: "",
  });

  const [checkInForm, setCheckInForm] = useState({
    roomId: "",
    depositPaid: "",
    idType: "",
    idNumber: "",
    idImages: [] as UploadedImage[],
  });

  /** Initial check-in form when opening modal; pre-fill deposit from booking when already paid (e.g. online). */
  const getInitialCheckInForm = (row: any) => ({
    roomId: "",
    depositPaid:
      row?.depositPaid != null && Number(row.depositPaid) > 0 ? String(row.depositPaid) : "",
    idType: "",
    idNumber: "",
    idImages: [] as UploadedImage[],
  });

  const [editForm, setEditForm] = useState({
    checkInDate: "",
    checkOutDate: "",
    numberOfGuests: "1",
    specialRequests: "",
  });
  const [checkOutForm, setCheckOutForm] = useState({
    damageCharges: "",
    lateCheckOutFee: "",
    paymentMethod: "cash" as string,
  });

  const [cancellationReason, setCancellationReason] = useState("");
  const [refundAmountOverride, setRefundAmountOverride] = useState<number | undefined>(undefined);
  const [chargeForm, setChargeForm] = useState({
    chargeType: ROOM_CHARGE_TYPE.ROOM_SERVICE as string,
    description: "",
    unitPrice: "",
    quantity: "1",
    totalAmountEntered: "",
  });

  const [searchQuery, setSearchQuery] = useState("");

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useBookings(params);
  const { data: categoriesData } = useRoomCategories({ limit: "100" });
  const { data: corporateData } = useCorporateAccounts({ limit: "100", status: "active" });
  const { data: guestsData } = useGuests(
    showCreate ? { limit: "200" } : undefined
  );

  const checkInMut = useCheckIn();
  const checkOutMut = useCheckOut();
  const cancelMut = useCancelBooking();
  const markNoShowMut = useMarkBookingNoShow();
  const createMut = useCreateBooking();
  const updateMut = useUpdateBooking();
  const addChargeMut = useAddRoomCharge();
  const deleteChargeMut = useDeleteRoomCharge();

  const viewBookingId = showView?._id ?? "";
  const isCheckedIn = showView?.status === BOOKING_STATUS.CHECKED_IN;
  const { data: folioData, isLoading: folioLoading } = useBookingFolio(viewBookingId);

  const checkOutBookingId = showCheckOut?._id ?? "";
  const { data: checkOutFolioData, isLoading: checkOutFolioLoading } =
    useBookingFolio(checkOutBookingId);

  const cancelPreviewBookingId = showCancel?._id ?? "";
  const { data: cancelPreviewData } = useCancellationPreview(cancelPreviewBookingId);
  const cancelPreview = cancelPreviewData?.data;

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const categories = categoriesData?.data ?? [];
  const corporateAccounts = corporateData?.data ?? [];
  const guests = guestsData?.data ?? [];

  /** Count of confirmed/pending bookings that can be checked in today (for hero CTA) */
  const readyToCheckInToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return items.filter(
      (b: any) =>
        (b.status === BOOKING_STATUS.CONFIRMED || b.status === BOOKING_STATUS.PENDING) &&
        b.checkInDate &&
        new Date(b.checkInDate).toISOString().slice(0, 10) <= today
    ).length;
  }, [items]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /** Quick stats for strip under hero: total, check-in today, check-out today, pending, revenue (GHS) */
  const quickStats = useMemo(() => {
    const total = pagination?.total ?? items.length;
    const checkInToday = items.filter(
      (b: any) => b.checkInDate && new Date(b.checkInDate).toISOString().slice(0, 10) === todayStr
    ).length;
    const checkOutToday = items.filter(
      (b: any) => b.checkOutDate && new Date(b.checkOutDate).toISOString().slice(0, 10) === todayStr
    ).length;
    const pending =
      statusFilter === BOOKING_STATUS.PENDING
        ? total
        : items.filter((b: any) => b.status === BOOKING_STATUS.PENDING).length;
    const revenue = items.reduce(
      (sum: number, b: any) => sum + (Number(b.totalAmount) || 0),
      0
    );
    return { total, checkInToday, checkOutToday, pending, revenue };
  }, [items, pagination?.total, statusFilter, todayStr]);

  /** Client-side filter by guest name or booking ref */
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter((b: any) => {
      const ref = (b.bookingReference ?? "").toLowerCase();
      const firstName = (b.guestId?.firstName ?? "").toLowerCase();
      const lastName = (b.guestId?.lastName ?? "").toLowerCase();
      const email = (b.guestId?.email ?? "").toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      return ref.includes(q) || fullName.includes(q) || firstName.includes(q) || lastName.includes(q) || email.includes(q);
    });
  }, [items, searchQuery]);

  /** Nights total for hero hint (current view) */
  const totalNightsThisView = useMemo(
    () => filteredItems.reduce((sum: number, b: any) => sum + (Number(b.numberOfNights) || 0), 0),
    [filteredItems]
  );

  const categoryOptions = categories.map((c: any) => ({
    value: c._id,
    label: c.name,
  }));

  /** Quote + availability when room category and dates are set (for New Booking confirmation) */
  const quoteParams =
    showCreate &&
    createForm.roomCategoryId &&
    createForm.checkInDate &&
    createForm.checkOutDate &&
    toISO(createForm.checkInDate) &&
    toISO(createForm.checkOutDate)
      ? {
          roomCategoryId: createForm.roomCategoryId,
          checkInDate: toISO(createForm.checkInDate),
          checkOutDate: toISO(createForm.checkOutDate),
          ...(createForm.source === BOOKING_SOURCE.CORPORATE && createForm.corporateAccountId
            ? { corporateAccountId: createForm.corporateAccountId }
            : {}),
        }
      : null;
  const { data: quoteResponse, isLoading: quoteLoading } = useBookingQuote(
    quoteParams ?? { roomCategoryId: "", checkInDate: "", checkOutDate: "" }
  );
  const quoteData = quoteResponse?.data;
  const quote = quoteData?.quote;

  const selectedCategory = createForm.roomCategoryId
    ? (categories as any[]).find((c: any) => c._id === createForm.roomCategoryId)
    : null;

  const guestOptions = guests.map((g: any) => ({
    value: g._id,
    label: g.firstName && g.lastName
      ? `${g.firstName} ${g.lastName}`
      : g.email ?? g._id,
  }));

  const corporateOptions = corporateAccounts.map((c: any) => ({
    value: c._id,
    label: `${c.companyName} (${c.negotiatedRate ?? 0}% off)`,
  }));


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      createForm.source === BOOKING_SOURCE.CORPORATE &&
      !createForm.corporateAccountId
    ) {
      toast.error("Select a corporate account for corporate bookings");
      return;
    }
    try {
      const groupSize = Math.max(1, parseInt(createForm.groupSize, 10) || 1);
      const isGroupMode = createForm.isGroupBooking || groupSize > 1;
      const computedGroupId = isGroupMode
        ? (createForm.groupId.trim() || `GRP-${Date.now().toString(36).toUpperCase()}`)
        : undefined;

      const payload = {
        guestId: createForm.guestId,
        corporateAccountId:
          createForm.source === BOOKING_SOURCE.CORPORATE
            ? createForm.corporateAccountId
            : undefined,
        roomCategoryId: createForm.roomCategoryId,
        checkInDate: toISO(createForm.checkInDate),
        checkOutDate: toISO(createForm.checkOutDate),
        numberOfGuests: parseInt(createForm.numberOfGuests, 10) || 1,
        source: createForm.source,
        isGroupBooking: isGroupMode || undefined,
        groupId: computedGroupId,
        specialRequests: createForm.specialRequests || undefined,
      };

      if (isGroupMode && groupSize > 1) {
        for (let i = 0; i < groupSize; i++) {
          await createMut.mutateAsync(payload);
        }
        toast.success(`Created ${groupSize} linked group bookings`);
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Booking created");
      }
      setShowCreate(false);
      setCreateForm({
        guestId: "",
        corporateAccountId: "",
        roomCategoryId: "",
        checkInDate: "",
        checkOutDate: "",
        numberOfGuests: "1",
        source: BOOKING_SOURCE.WALK_IN,
        isGroupBooking: false,
        groupId: "",
        groupSize: "1",
        specialRequests: "",
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckIn || !checkInForm.roomId) return;
    try {
      await checkInMut.mutateAsync({
        id: showCheckIn._id,
        roomId: checkInForm.roomId,
        depositPaid: Number(checkInForm.depositPaid) || 0,
        idType: checkInForm.idType || undefined,
        idNumber: checkInForm.idNumber || undefined,
        idDocument: checkInForm.idImages[0]?.url || undefined,
      });
      toast.success("Guest checked in");
      setShowCheckIn(null);
      setCheckInForm(getInitialCheckInForm(null));
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const openEditBooking = (row: any) => {
    setShowEdit(row);
    setEditForm({
      checkInDate: toDateTimeLocal(row.checkInDate),
      checkOutDate: toDateTimeLocal(row.checkOutDate),
      numberOfGuests: String(row.numberOfGuests ?? 1),
      specialRequests: row.specialRequests ?? "",
    });
  };

  const handleEditBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    try {
      await updateMut.mutateAsync({
        id: showEdit._id,
        checkInDate: toISO(editForm.checkInDate),
        checkOutDate: toISO(editForm.checkOutDate),
        numberOfGuests: parseInt(editForm.numberOfGuests, 10) || 1,
        specialRequests: editForm.specialRequests || undefined,
      });
      toast.success("Booking updated");
      setShowEdit(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckOut) return;
    try {
      await checkOutMut.mutateAsync({
        id: showCheckOut._id,
        damageCharges: checkOutForm.damageCharges
          ? parseFloat(checkOutForm.damageCharges)
          : undefined,
        lateCheckOutFee: checkOutForm.lateCheckOutFee
          ? parseFloat(checkOutForm.lateCheckOutFee)
          : undefined,
        paymentMethod: checkOutForm.paymentMethod,
      });
      toast.success("Guest checked out — invoice generated");
      setShowCheckOut(null);
      setCheckOutForm({ damageCharges: "", lateCheckOutFee: "", paymentMethod: "cash" });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCancel || !cancellationReason.trim()) return;
    const refund = refundAmountOverride ?? cancelPreview?.refundAmount;
    try {
      await cancelMut.mutateAsync({
        id: showCancel._id,
        cancellationReason: cancellationReason.trim(),
        ...(refund !== undefined && { refundAmount: refund }),
      });
      toast.success("Booking cancelled");
      setShowCancel(null);
      setCancellationReason("");
      setRefundAmountOverride(undefined);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleMarkNoShow = async (booking: any) => {
    try {
      await markNoShowMut.mutateAsync(booking._id);
      toast.success("Booking marked as no-show");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewBookingId) return;
    try {
      await addChargeMut.mutateAsync({
        bookingId: viewBookingId,
        chargeType: chargeForm.chargeType,
        description: chargeForm.description,
        unitPrice: parseFloat(chargeForm.unitPrice),
        quantity: parseInt(chargeForm.quantity) || 1,
      });
      toast.success("Room charge added");
      setChargeForm({
        chargeType: ROOM_CHARGE_TYPE.ROOM_SERVICE,
        description: "",
        unitPrice: "",
        quantity: "1",
        totalAmountEntered: "",
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to add charge");
    }
  };

  const handleDeleteCharge = async (chargeId: string) => {
    if (!viewBookingId) return;
    try {
      await deleteChargeMut.mutateAsync({ bookingId: viewBookingId, chargeId });
      toast.success("Charge removed");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to remove charge");
    }
  };

  const folio = folioData?.data;

  const columns = [
    {
      key: "bookingReference",
      header: "Booking Ref",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.bookingReference ?? "-"}</span>
          {row.source === BOOKING_SOURCE.CORPORATE && (
            <Badge variant="info">Corporate</Badge>
          )}
        </div>
      ),
    },
    {
      key: "guestId",
      header: "Guest",
      render: (row: any) => {
        const g = row.guestId;
        if (!g) return "-";
        return g.firstName && g.lastName
          ? `${g.firstName} ${g.lastName}`
          : g.email ?? "-";
      },
    },
    {
      key: "roomId",
      header: "Room",
      render: (row: any) => {
        const r = row.roomId;
        return r?.roomNumber ?? "-";
      },
    },
    {
      key: "checkInDate",
      header: "Check-in",
      render: (row: any) =>
        row.checkInDate
          ? format(new Date(row.checkInDate), "MMM d, yyyy")
          : "-",
    },
    {
      key: "checkOutDate",
      header: "Check-out",
      render: (row: any) =>
        row.checkOutDate
          ? format(new Date(row.checkOutDate), "MMM d, yyyy")
          : "-",
    },
    {
      key: "numberOfNights",
      header: "Nights",
      render: (row: any) => row.numberOfNights ?? "-",
    },
    {
      key: "source",
      header: "Source",
      render: (row: any) =>
        row.source === BOOKING_SOURCE.CORPORATE ? (
          <Badge variant="info">Corporate</Badge>
        ) : (
          <span>{prettyLabel(row.source)}</span>
        ),
    },
    {
      key: "groupId",
      header: "Group",
      render: (row: any) =>
        row.groupId ? <Badge variant="outline">{row.groupId}</Badge> : "-",
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => renderStatusPill(row.status),
    },
    {
      key: "totalAmount",
      header: "Total",
      render: (row: any) =>
        row.totalAmount != null
          ? formatGHS(row.totalAmount)
          : "-",
    },
    {
      key: "actions",
      header: "",
      render: (row: any) => {
        const isPendingOrConfirmed =
          row.status === BOOKING_STATUS.PENDING || row.status === BOOKING_STATUS.CONFIRMED;
        const canCancel =
          row.status !== BOOKING_STATUS.CHECKED_OUT &&
          row.status !== BOOKING_STATUS.CANCELLED &&
          row.status !== BOOKING_STATUS.NO_SHOW;

        const actionItems = [
          { id: "view", label: "View details", onClick: () => setShowView(row) },
          ...(isPendingOrConfirmed
            ? [
                { id: "edit", label: "Edit booking", onClick: () => openEditBooking(row) },
{
                id: "check-in",
                label: "Check in",
                onClick: () => {
                  setShowCheckIn(row);
                  setCheckInFallbackAnyCategory(false);
                  setCheckInForm(getInitialCheckInForm(row));
                },
              },
                {
                  id: "no-show",
                  label: "Mark no-show",
                  onClick: () => handleMarkNoShow(row),
                  disabled: markNoShowMut.isPending,
                },
              ]
            : []),
          ...(row.status === BOOKING_STATUS.CHECKED_IN
            ? [
                {
                  id: "check-out",
                  label: "Check out",
                  onClick: () => {
                    setShowCheckOut(row);
                    setCheckOutForm({
                      damageCharges: "",
                      lateCheckOutFee: "",
                      paymentMethod: "cash",
                    });
                  },
                },
              ]
            : []),
          ...(canCancel
            ? [
                {
                  id: "cancel",
                  label: "Cancel booking",
                  onClick: () => {
                    setShowCancel(row);
                    setCancellationReason("");
                    setRefundAmountOverride(undefined);
                  },
                },
              ]
            : []),
        ];

        return (
          <div className="flex justify-end">
            <Dropdown
              align="right"
              trigger={
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                  Actions
                </span>
              }
              items={actionItems}
              className="shrink-0"
            />
          </div>
        );
      },
    },
  ];

  const isEmpty = !isLoading && items.length === 0;
  const isFilteredEmpty = !isLoading && items.length > 0 && filteredItems.length === 0;
  const isEmptyOrFiltered = isEmpty || isFilteredEmpty;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) || 1 : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;

  const checkInAvailabilityParams =
    showCheckIn?.checkInDate && showCheckIn?.checkOutDate
      ? (() => {
          const checkIn = new Date(showCheckIn.checkInDate);
          const checkOut = new Date(showCheckIn.checkOutDate);
          if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
            return { checkInDate: "", checkOutDate: "" };
          }
          const roomCategoryId = showCheckIn.roomCategoryId
            ? String(
                typeof showCheckIn.roomCategoryId === "object"
                  ? (showCheckIn.roomCategoryId as any)._id
                  : showCheckIn.roomCategoryId
              )
            : "";
          return {
            checkInDate: checkIn.toISOString(),
            checkOutDate: checkOut.toISOString(),
            excludeBookingId: String(showCheckIn._id),
            ...(roomCategoryId && !checkInFallbackAnyCategory && { roomCategoryId }),
          };
        })()
      : { checkInDate: "", checkOutDate: "" };

  const { data: checkInRoomsData, isLoading: checkInRoomsLoading } = useAvailability(checkInAvailabilityParams);
  const checkInRoomsRaw = checkInRoomsData?.data;
  const checkInRooms = Array.isArray(checkInRoomsRaw) ? checkInRoomsRaw : [];
  const checkInRoomOptions = checkInRooms.map((r: any) => ({
    value: String(r._id ?? r.id ?? ""),
    label: `${r.roomNumber ?? "—"}${r.floor != null ? ` (Floor ${r.floor})` : ""} - ${r.roomCategoryId?.name ?? ""}`.trim() || `Room ${r.roomNumber ?? r._id}`,
  })).filter((o) => o.value);

  /** Render status as a small color card (pill) matching filter cards */
  const renderStatusPill = (status: string) => {
    const style = STATUS_CARD_STYLES[status] ?? STATUS_CARD_STYLES[""];
    const label = STATUS_TABS.find((t) => t.value === status)?.label ?? status;
    return (
      <span
        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${style.bg} ${style.border} ${style.text}`}
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {label}
      </span>
    );
  };

  return (
    <div
      className="min-h-screen bg-white text-slate-800"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Hero: white header + check-in focus */}
      <header className="relative overflow-hidden border-b border-slate-100 bg-white">
        <div
          className="absolute left-0 top-0 h-full w-1.5 min-w-0 rounded-r-full bg-gradient-to-b from-[#ff8500] via-[#ff9100] to-[#5a189a] sm:w-2"
          aria-hidden
        />
        <div className="absolute right-0 top-0 h-32 w-48 rounded-bl-[80px] bg-gradient-to-br from-[#ff9100]/10 to-[#5a189a]/5 sm:h-40 sm:w-64 sm:rounded-bl-[100px]" aria-hidden />
        <div className="relative px-4 py-5 sm:px-6 sm:py-6 md:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3 pl-3 sm:pl-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a189a]/15 to-[#9d4edd]/10 text-[#5a189a] ring-1 ring-[#5a189a]/20">
                  <Calendar className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Accommodation
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Bookings
              </h1>
              <p className="max-w-lg text-sm font-normal text-slate-600">
                Manage reservations, check-in, check-out and guest folios.
              </p>
              {/* Dashboard hint: nights + revenue (this view) */}
              {(quickStats.total > 0 || totalNightsThisView > 0 || quickStats.revenue > 0) && (
                <p className="text-xs font-medium text-slate-500">
                  {quickStats.total} bookings
                  {totalNightsThisView > 0 && ` · ${totalNightsThisView} nights`}
                  {quickStats.revenue > 0 && ` · ${formatGHS(quickStats.revenue)} revenue`}
                  {" (this view)"}
                </p>
              )}
              {/* Check-in highlight: ready count + CTA */}
              {readyToCheckInToday > 0 && (statusFilter === "" || statusFilter === BOOKING_STATUS.CONFIRMED || statusFilter === BOOKING_STATUS.PENDING) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
                    <LogIn className="h-4 w-4" />
                    {readyToCheckInToday} ready to check in
                  </span>
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/bookings/calendar"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#5a189a]/30 bg-white px-4 py-2.5 font-semibold text-[#5a189a] shadow-sm transition hover:border-[#5a189a]/50 hover:bg-[#5a189a]/5 focus-visible:ring-2 focus-visible:ring-[#5a189a]/50"
              >
                <CalendarDays className="h-5 w-5" aria-hidden />
                Room timeline
              </Link>
              <Button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6d00] to-[#ff9100] px-4 py-2.5 font-semibold text-white shadow-lg shadow-[#ff8500]/25 transition hover:opacity-95 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[#ff8500]/50"
              >
                <Plus className="h-5 w-5" aria-hidden />
                New Booking
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick stats strip — data at a glance */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 px-4 py-4 sm:px-6 md:px-8">
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5a189a]/15 to-[#9d4edd]/10 text-[#5a189a]">
              <Calendar className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Total bookings</p>
              <p className="text-lg font-bold text-slate-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{quickStats.total}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff9e00]/20 to-[#ff8500]/10 text-[#c2410c]">
              <LogIn className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Check-in today</p>
              <p className="text-lg font-bold text-slate-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{quickStats.checkInToday}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5a189a]/20 to-[#7b2cbf]/10 text-[#5a189a]">
              <LogOut className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Check-out today</p>
              <p className="text-lg font-bold text-slate-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{quickStats.checkOutToday}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff9e00]/15 to-[#ff8500]/5 text-[#c2410c]">
              <Clock className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Pending</p>
              <p className="text-lg font-bold text-slate-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{quickStats.pending}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-700">
              <TrendingUp className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Revenue (GHS)</p>
              <p className="text-lg font-bold text-slate-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{formatGHS(quickStats.revenue)}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        {/* Status filter — beautiful color cards with sliding pill */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-slate-500">
            Filter by status
          </p>
          <div className="relative">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {STATUS_TABS.map((tab) => {
                const style = STATUS_CARD_STYLES[tab.value ?? ""] ?? STATUS_CARD_STYLES[""];
                const isActive = statusFilter === tab.value;
                return (
                  <button
                    key={tab.value || "all"}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.value);
                      setPage(1);
                    }}
                    className={`flex items-center justify-center rounded-xl border-2 px-3 py-2.5 text-center text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8500]/50 focus-visible:ring-offset-2 ${style.bg} ${style.border} ${
                      isActive
                        ? "ring-2 ring-[#5a189a] ring-offset-2 shadow-[0_4px_14px_rgba(90,24,154,0.15)]"
                        : "hover:border-opacity-80"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${style.text}`}
                      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Sliding pill under active tab */}
            <div
              className="absolute bottom-0 left-0 h-0.5 rounded-full bg-[#5a189a] transition-all duration-300 ease-out"
              style={{
                width: `${100 / STATUS_TABS.length}%`,
                transform: `translateX(${STATUS_TABS.findIndex((t) => t.value === statusFilter) * 100}%)`,
              }}
              aria-hidden
            />
          </div>
        </div>

        {/* Search by guest name or booking ref */}
        <div className="mb-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by guest name or booking ref..."
            className="max-w-sm"
          />
          {searchQuery && (
            <p className="mt-1.5 text-xs text-slate-500">
              Showing {filteredItems.length} of {items.length} on this page
            </p>
          )}
        </div>

        {/* Table (desktop) + Cards (mobile) */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          {isLoading ? (
            <div className="p-8">
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : isEmpty && statusFilter ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                No {STATUS_TABS.find((t) => t.value === statusFilter)?.label ?? "filtered"} bookings
              </p>
              <Button
                variant="outline"
                onClick={() => { setStatusFilter(""); setPage(1); }}
                className="border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/5"
              >
                View all
              </Button>
            </div>
          ) : isFilteredEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-sm font-medium text-slate-600">No bookings match your search</p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/5"
              >
                Clear search
              </Button>
            </div>
          ) : isEmpty ? (
            <div className="p-8">
              <EmptyState
                icon={Calendar}
                title="No bookings"
                description="Create your first booking to get started."
                action={{ label: "New Booking", onClick: () => setShowCreate(true) }}
                actionClassName="bg-gradient-to-r from-[#ff6d00] to-[#ff9100] text-white hover:opacity-95 focus-visible:ring-[#ff8500]/50"
              />
            </div>
          ) : (
            <>
              {/* Desktop: table with sticky header */}
              <div className="hidden max-h-[calc(100vh-20rem)] overflow-auto lg:block">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] backdrop-blur-sm">
                    <tr className="border-b border-slate-200">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="bg-slate-50/95 px-4 py-3.5 text-left text-xs font-medium text-slate-500"
                          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((row: any) => {
                      const isArrivingToday = row.checkInDate && new Date(row.checkInDate).toISOString().slice(0, 10) === todayStr;
                      const isDepartingToday = row.checkOutDate && new Date(row.checkOutDate).toISOString().slice(0, 10) === todayStr;
                      const rowHighlight =
                        isArrivingToday && isDepartingToday
                          ? "bg-emerald-50/40"
                          : isArrivingToday
                            ? "bg-emerald-50/30"
                            : isDepartingToday
                              ? "bg-slate-100/50"
                              : "";
                      return (
                        <tr
                          key={row._id}
                          className={`group transition-colors hover:bg-[#5a189a]/5 ${STATUS_ROW_BORDER[row.status] ?? STATUS_ROW_BORDER[""]} ${rowHighlight}`}
                        >
                          {columns.map((col, colIndex) => (
                            <td
                              key={col.key}
                              className="relative whitespace-nowrap px-4 py-3 text-sm font-normal text-slate-800"
                              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                            >
                              {colIndex === 0 ? (
                                <>
                                  <div className="relative">
                                    {col.render ? col.render(row) : (row[col.key] ?? "—")}
                                    {(isArrivingToday || isDepartingToday) && (
                                      <span className="ml-1.5 inline-flex flex-wrap items-center gap-1">
                                        {isArrivingToday && (
                                          <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">Arriving</span>
                                        )}
                                        {isDepartingToday && (
                                          <span className="inline-flex items-center rounded-md bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-700">Departing</span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  {/* Hover preview card — pointer-events-auto so View/Check in are clickable */}
                                  <div className="absolute left-0 bottom-full z-20 mb-1 hidden min-w-[200px] rounded-lg border border-slate-200 bg-white p-3 shadow-lg group-hover:block pointer-events-auto">
                                    <p className="font-medium text-slate-900">{row.guestId?.firstName && row.guestId?.lastName ? `${row.guestId.firstName} ${row.guestId.lastName}` : row.guestId?.email ?? "—"}</p>
                                    <p className="text-xs text-slate-500">{row.bookingReference ?? "—"}</p>
                                    <p className="mt-1 text-xs text-slate-600">
                                      {row.checkInDate ? format(new Date(row.checkInDate), "MMM d, yyyy") : "—"} → {row.checkOutDate ? format(new Date(row.checkOutDate), "MMM d, yyyy") : "—"}
                                    </p>
                                    <div className="mt-2 flex gap-1.5">
                                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowView(row); }}>View</Button>
                                      {(row.status === BOOKING_STATUS.PENDING || row.status === BOOKING_STATUS.CONFIRMED) && (
                                        <Button size="sm" className="h-7 bg-[#5a189a] text-xs text-white hover:bg-[#4a1480]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCheckIn(row); setCheckInFallbackAnyCategory(false); setCheckInForm(getInitialCheckInForm(row)); }}>Check in</Button>
                                      )}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                col.render ? col.render(row) : (row[col.key] ?? "—")
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-4 p-4 lg:hidden">
                {filteredItems.map((row: any) => {
                  const isArrivingToday = row.checkInDate && new Date(row.checkInDate).toISOString().slice(0, 10) === todayStr;
                  const isDepartingToday = row.checkOutDate && new Date(row.checkOutDate).toISOString().slice(0, 10) === todayStr;
                  const cardHighlight =
                    isArrivingToday && isDepartingToday
                      ? "bg-emerald-50/40"
                      : isArrivingToday
                        ? "bg-emerald-50/30"
                        : isDepartingToday
                          ? "bg-slate-100/50"
                          : "";
                  return (
                  <div
                    key={row._id}
                    className={`overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/80 transition-all hover:shadow-md hover:ring-[#5a189a]/20 ${STATUS_ROW_BORDER[row.status] ?? STATUS_ROW_BORDER[""]} ${cardHighlight}`}
                  >
                    <div className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
                            {row.bookingReference ?? "—"}
                          </p>
                          <p className="text-sm font-normal text-slate-600" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
                            {row.guestId?.firstName && row.guestId?.lastName
                              ? `${row.guestId.firstName} ${row.guestId.lastName}`
                              : row.guestId?.email ?? "—"}
                          </p>
                          {(isArrivingToday || isDepartingToday) && (
                            <span className="mt-1 inline-flex flex-wrap items-center gap-1">
                              {isArrivingToday && (
                                <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">Arriving</span>
                              )}
                              {isDepartingToday && (
                                <span className="inline-flex items-center rounded-md bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-700">Departing</span>
                              )}
                            </span>
                          )}
                        </div>
                        {renderStatusPill(row.status)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>Room {row.roomId?.roomNumber ?? "—"}</span>
                        <span>
                          {row.checkInDate
                            ? format(new Date(row.checkInDate), "MMM d")
                            : "—"}{" "}
                          →{" "}
                          {row.checkOutDate
                            ? format(new Date(row.checkOutDate), "MMM d")
                            : "—"}
                        </span>
                        {row.totalAmount != null && (
                          <span className="font-medium text-slate-700">
                            {formatGHS(row.totalAmount)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-end border-t border-slate-100 mt-3 pt-3">
                        <Dropdown
                          align="right"
                          trigger={
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                              Actions
                            </span>
                          }
                          items={(() => {
                            const isPendingOrConfirmed =
                              row.status === BOOKING_STATUS.PENDING || row.status === BOOKING_STATUS.CONFIRMED;
                            const canCancel =
                              row.status !== BOOKING_STATUS.CHECKED_OUT &&
                              row.status !== BOOKING_STATUS.CANCELLED &&
                              row.status !== BOOKING_STATUS.NO_SHOW;
                            return [
                              { id: "view", label: "View details", onClick: () => setShowView(row) },
                              ...(isPendingOrConfirmed
                                ? [
                                    { id: "edit", label: "Edit booking", onClick: () => openEditBooking(row) },
                                    {
                                      id: "check-in",
                                      label: "Check in",
                                      onClick: () => {
                                        setShowCheckIn(row);
                                        setCheckInFallbackAnyCategory(false);
                                        setCheckInForm(getInitialCheckInForm(row));
                                      },
                                    },
                                    {
                                      id: "no-show",
                                      label: "Mark no-show",
                                      onClick: () => handleMarkNoShow(row),
                                      disabled: markNoShowMut.isPending,
                                    },
                                  ]
                                : []),
                              ...(row.status === BOOKING_STATUS.CHECKED_IN
                                ? [
                                    {
                                      id: "check-out",
                                      label: "Check out",
                                      onClick: () => {
                                        setShowCheckOut(row);
                                        setCheckOutForm({
                                          damageCharges: "",
                                          lateCheckOutFee: "",
                                          paymentMethod: "cash",
                                        });
                                      },
                                    },
                                  ]
                                : []),
                              ...(canCancel
                                ? [
                                    {
                                      id: "cancel",
                                      label: "Cancel booking",
                                      onClick: () => {
                                        setShowCancel(row);
                                        setCancellationReason("");
                                        setRefundAmountOverride(undefined);
                                      },
                                    },
                                  ]
                                : []),
                            ];
                          })()}
                        />
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              {pagination && pagination.total > pagination.limit && (
                <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/30 px-4 py-4 sm:flex-row sm:px-6">
                  <p className="text-sm text-slate-500">
                    Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev || isLoading}
                      className="border-slate-200 hover:border-[#5a189a]/30 hover:text-[#5a189a]"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium text-slate-600">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNext || isLoading}
                      className="border-slate-200 hover:border-[#5a189a]/30 hover:text-[#5a189a]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Booking Modal — premium redesign with price, room details & availability */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title=""
        size="lg"
        className="max-h-[90vh] overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-xl"
      >
        <form onSubmit={handleCreate} className="flex max-h-[90vh] flex-col">
          {/* Modal hero */}
          <div className="relative shrink-0 overflow-hidden rounded-t-2xl bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00] px-4 py-5 sm:px-6 sm:py-6">
            <div className="absolute inset-0 bg-white/10 pointer-events-none" aria-hidden />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCreate(false);
              }}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 text-white hover:bg-white/20 sm:right-4 sm:top-4"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="relative flex items-center gap-3 pr-10">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm">
                <Sparkles className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  New Booking
                </h2>
                <p className="text-sm font-medium text-white/90">
                  Select guest, room, dates — we’ll confirm price and availability
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {/* 1. Guest */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-slate-800">
                <Users className="h-4 w-4 text-[#5a189a]" />
                <span className="text-sm font-semibold">Guest</span>
              </div>
              <AppReactSelect
                options={[{ value: "", label: "Select guest..." }, ...guestOptions]}
                value={createForm.guestId}
                onChange={(v) => setCreateForm((f) => ({ ...f, guestId: v }))}
                placeholder="Search or select guest..."
              />
            </section>

            {/* 2. Room category */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-slate-800">
                <BedDouble className="h-4 w-4 text-[#5a189a]" />
                <span className="text-sm font-semibold">Room category</span>
              </div>
              <AppReactSelect
                options={[{ value: "", label: "Select category..." }, ...categoryOptions]}
                value={createForm.roomCategoryId}
                onChange={(v) => setCreateForm((f) => ({ ...f, roomCategoryId: v }))}
                placeholder="Select category..."
              />
            </section>

            {/* 3. Check-in & check-out */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-slate-800">
                <Calendar className="h-4 w-4 text-[#5a189a]" />
                <span className="text-sm font-semibold">Dates</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0 overflow-visible">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Check-in</label>
                  <ReactDatePicker
                    selected={createForm.checkInDate ? new Date(createForm.checkInDate) : null}
onChange={(date: Date | null) =>
                        setCreateForm((f) => ({
                          ...f,
                          checkInDate: date ? toDateTimeLocal(date) : "",
                      }))
                    }
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="MMM d, yyyy h:mm aa"
                    withPortal
                    popperClassName="react-datepicker-popper-z"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                    placeholderText="Select date & time"
                    required
                  />
                </div>
                <div className="min-w-0 overflow-visible">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Check-out</label>
                  <ReactDatePicker
selected={createForm.checkOutDate ? new Date(createForm.checkOutDate) : null}
                    onChange={(date: Date | null) =>
                        setCreateForm((f) => ({
                          ...f,
                          checkOutDate: date ? toDateTimeLocal(date) : "",
                      }))
                    }
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="MMM d, yyyy h:mm aa"
                    withPortal
                    popperClassName="react-datepicker-popper-z"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                    placeholderText="Select date & time"
                    required
                  />
                </div>
              </div>
            </section>

            {/* Room & rate confirmation — price and room details; room assigned at check-in */}
            {createForm.roomCategoryId && createForm.checkInDate && createForm.checkOutDate && (
              <section className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-md sm:p-5">
                <p className="mb-3 text-sm font-bold text-slate-800">
                  Confirmation — price & room details
                </p>
                {quoteLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-3 px-4 text-sm text-slate-500">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5a189a] border-t-transparent" />
                    Loading price…
                  </div>
                ) : quote && selectedCategory ? (
                  <div className="space-y-4">
                    <p className="rounded-lg border border-slate-200 bg-slate-50/80 py-2 px-3 text-xs text-slate-600">
                      A specific room will be assigned from this category at check-in.
                    </p>
                    {/* Room details */}
                    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-semibold text-slate-900">{selectedCategory.name}</p>
                      {selectedCategory.description && (
                        <p className="mt-1 text-slate-600">{selectedCategory.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
                        {selectedCategory.maxOccupancy != null && (
                          <span>Max {selectedCategory.maxOccupancy} guests</span>
                        )}
                        {selectedCategory.roomSize != null && (
                          <span>{selectedCategory.roomSize} m²</span>
                        )}
                        {selectedCategory.bedType && (
                          <span className="capitalize">{String(selectedCategory.bedType).replace(/_/g, " ")}</span>
                        )}
                      </div>
                      {Array.isArray(selectedCategory.amenities) && selectedCategory.amenities.length > 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          {selectedCategory.amenities.slice(0, 5).join(" · ")}
                          {selectedCategory.amenities.length > 5 && " …"}
                        </p>
                      )}
                    </div>
                    {/* Price summary */}
                    <div className="rounded-lg border border-[#5a189a]/20 bg-[#5a189a]/5 p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            {quote.numberOfNights} night{quote.numberOfNights !== 1 ? "s" : ""} · {quote.roomRatePerNight != null && formatGHS(quote.roomRatePerNight)}/night
                          </p>
                          {Number(quote.corporateDiscountRate ?? 0) > 0 && (
                            <p className="mt-0.5 text-xs text-[#5a189a]">
                              Corporate discount applied
                            </p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-[#5a189a]">
                          {quote.totalAmount != null && formatGHS(quote.totalAmount)} total
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            )}

            {/* 4. Guests count & source */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-slate-800">Guests & source</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Number of guests"
                  type="number"
                  min="1"
                  value={createForm.numberOfGuests}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, numberOfGuests: e.target.value }))
                  }
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
                <AppReactSelect
                  label="Source"
                  options={SOURCE_OPTIONS}
                  value={createForm.source}
                  onChange={(v) =>
                    setCreateForm((f) => ({
                      ...f,
                      source: v,
                      corporateAccountId: v === BOOKING_SOURCE.CORPORATE ? f.corporateAccountId : "",
                    }))
                  }
                />
              </div>
              <div className="mt-3">
                <AppReactSelect
                  label="Corporate account"
                  options={[
                    {
                      value: "",
                      label:
                        createForm.source === BOOKING_SOURCE.CORPORATE
                          ? "Select corporate account..."
                          : "Choose Corporate source first",
                    },
                    ...corporateOptions,
                  ]}
                  value={createForm.corporateAccountId}
                  onChange={(v) =>
                    setCreateForm((f) => ({ ...f, corporateAccountId: v }))
                  }
                  placeholder={createForm.source === BOOKING_SOURCE.CORPORATE ? "Select..." : "—"}
                />
                {createForm.source === BOOKING_SOURCE.CORPORATE && corporateOptions.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Negotiated rate will be applied when dates and room are set.
                  </p>
                )}
              </div>
            </section>

            {/* Group booking */}
            <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.isGroupBooking}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      isGroupBooking: e.target.checked,
                      groupSize: e.target.checked ? f.groupSize : "1",
                      groupId: e.target.checked ? f.groupId : "",
                    }))
                  }
                  className="rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/30"
                />
                Group booking
              </label>
              {createForm.isGroupBooking && (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Group ID (optional)"
                    value={createForm.groupId}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, groupId: e.target.value }))
                    }
                    placeholder="Auto-generated if blank"
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                  <Input
                    label="Rooms in group"
                    type="number"
                    min="1"
                    value={createForm.groupSize}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, groupSize: e.target.value }))
                    }
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                </div>
              )}
            </section>

            {/* Special requests */}
            <Textarea
              label="Special requests (optional)"
              value={createForm.specialRequests}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, specialRequests: e.target.value }))
              }
              placeholder="e.g. late arrival, accessibility, diet"
              rows={2}
              className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
            />
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/30 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="border-slate-200 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6d00] to-[#ff9100] px-5 py-2.5 font-semibold text-white shadow-lg shadow-[#ff8500]/25 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ff8500]/50 disabled:opacity-60"
            >
                <Plus className="h-4 w-4" />
                Create booking
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Booking Modal */}
      <Modal
        open={!!showEdit}
        onClose={() => setShowEdit(null)}
        title="Edit Booking"
        size="lg"
        className="bg-white"
      >
        {showEdit && (
          <form onSubmit={handleEditBooking} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 overflow-visible">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Check-in</label>
                <ReactDatePicker
                  selected={editForm.checkInDate ? new Date(editForm.checkInDate) : null}
                  onChange={(date: Date | null) =>
                    setEditForm((f) => ({ ...f, checkInDate: date ? toDateTimeLocal(date) : "" }))
                  }
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMM d, yyyy h:mm aa"
                  withPortal
                  popperClassName="react-datepicker-popper-z"
                  className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  placeholderText="Select date & time"
                  required
                />
              </div>
              <div className="min-w-0 overflow-visible">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Check-out</label>
                <ReactDatePicker
                  selected={editForm.checkOutDate ? new Date(editForm.checkOutDate) : null}
                  onChange={(date: Date | null) =>
                    setEditForm((f) => ({ ...f, checkOutDate: date ? toDateTimeLocal(date) : "" }))
                  }
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMM d, yyyy h:mm aa"
                  withPortal
                  popperClassName="react-datepicker-popper-z"
                  className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  placeholderText="Select date & time"
                  required
                />
              </div>
            </div>
            <Input
              label="Number of Guests"
              type="number"
              min="1"
              value={editForm.numberOfGuests}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, numberOfGuests: e.target.value }))
              }
              className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
            />
            <Textarea
              label="Special Requests"
              value={editForm.specialRequests}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, specialRequests: e.target.value }))
              }
              rows={2}
              placeholder="Optional"
              className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
            />
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setShowEdit(null)} className="border-slate-200">
                Cancel
              </Button>
              <Button
                type="submit"
                loading={updateMut.isPending}
                className="bg-gradient-to-r from-[#ff6d00] to-[#ff9100] font-semibold text-white shadow-md shadow-[#ff8500]/25 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ff8500]/50"
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Check-in Modal — premium, white theme, step-driven UX */}
      <Modal
        open={!!showCheckIn}
        onClose={() => {
          setShowCheckIn(null);
          setCheckInFallbackAnyCategory(false);
          setCheckInForm(getInitialCheckInForm(null));
        }}
        title=""
        size="lg"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-2xl shadow-slate-200/40"
      >
        {showCheckIn && (
          <form onSubmit={handleCheckIn} className="flex flex-col">
            {/* White header — clean, professional */}
            <div className="relative border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff8500]/30 to-transparent" aria-hidden />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCheckIn(null);
                  setCheckInFallbackAnyCategory(false);
                  setCheckInForm(getInitialCheckInForm(null));
                }}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:right-4 sm:top-4"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="flex items-start gap-4 pr-10">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8500] to-[#ff9e00] text-white shadow-lg shadow-[#ff8500]/25">
                  <LogIn className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Check In Guest
                  </h2>
                  <p className="mt-0.5 text-sm font-medium text-slate-600">
                    {showCheckIn.guestId?.firstName && showCheckIn.guestId?.lastName
                      ? `${showCheckIn.guestId.firstName} ${showCheckIn.guestId.lastName}`
                      : showCheckIn.guestId?.email ?? "Guest"}
                  </p>
                  {showCheckIn.bookingReference && (
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {showCheckIn.bookingReference}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 p-4 sm:p-6">
                {/* Step 1: Assign room — primary card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5a189a] text-xs font-bold text-white">1</span>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Assign room</h3>
                  </div>
                  <p className="mb-4 text-xs text-slate-500">
                    Select the specific room from this category for the guest.
                  </p>
                  {checkInRoomsLoading ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Loading available rooms...
                    </div>
                  ) : checkInRoomOptions.length === 0 ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-800">
                        {checkInFallbackAnyCategory
                          ? "No rooms available for these dates in this branch. Add rooms under Rooms → Floors, or adjust booking dates."
                          : "No rooms available in this category for these dates."}
                      </div>
                      {showCheckIn?.roomCategoryId && !checkInFallbackAnyCategory && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-[#5a189a] text-[#5a189a] hover:bg-[#5a189a]/10"
                          onClick={() => setCheckInFallbackAnyCategory(true)}
                        >
                          Show all available rooms in this branch
                        </Button>
                      )}
                    </div>
                  ) : (
                    <AppReactSelect
                      label=""
                      options={[
                        { value: "", label: "Select room..." },
                        ...checkInRoomOptions,
                      ]}
                      value={checkInForm.roomId}
                      onChange={(v) => setCheckInForm((f) => ({ ...f, roomId: v }))}
                      placeholder="Select room..."
                    />
                  )}
                </div>

                {/* Step 2: Payment — expected + input + confirm bar; allow equal or more, show change */}
                {(() => {
                  const expectedAmount = Number(showCheckIn.depositRequired ?? showCheckIn.totalAmount ?? 0);
                  const amountPaying = checkInForm.depositPaid !== "" ? Number(checkInForm.depositPaid) || 0 : null;
                  const amountOk = amountPaying !== null && amountPaying >= expectedAmount - 0.01;
                  const changeToGive = amountPaying !== null && amountPaying > expectedAmount
                    ? amountPaying - expectedAmount
                    : 0;
                  return (
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5a189a] text-xs font-bold text-white">2</span>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Payment</h3>
                        {amountPaying !== null && amountOk ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Paid online</span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Required</span>
                        )}
                      </div>
                      <div className="mb-4 flex items-baseline justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <span className="text-sm font-medium text-slate-600">Expected to collect</span>
                        <span className="text-lg font-bold text-slate-900">{formatGHS(expectedAmount)}</span>
                      </div>
                      <Input
                        label="Amount received"
                        type="number"
                        min="0"
                        step="0.01"
                        value={checkInForm.depositPaid}
                        onChange={(e) =>
                          setCheckInForm((f) => ({ ...f, depositPaid: e.target.value }))
                        }
                        placeholder="0.00"
                        required
                        className="rounded-xl border-slate-200 text-base font-medium focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                      />
                      {/* Confirm bar — at a glance; show change to give when paying more */}
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm before check-in</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                          <span className="text-slate-600">
                            <span className="font-medium text-slate-500">Check-in</span>{" "}
                            {showCheckIn.checkInDate ? format(new Date(showCheckIn.checkInDate), "MMM d, h:mm a") : "—"}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600">
                            <span className="font-medium text-slate-500">Check-out</span>{" "}
                            {showCheckIn.checkOutDate ? format(new Date(showCheckIn.checkOutDate), "MMM d, h:mm a") : "—"}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600">
                            <span className="font-medium text-slate-500">Expected</span>{" "}
                            <span className="font-semibold text-slate-900">{formatGHS(expectedAmount)}</span>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600">
                            <span className="font-medium text-slate-500">Paying</span>{" "}
                            <span className={`font-semibold ${amountOk ? "text-emerald-600" : "text-[#5a189a]"}`}>
                              {amountPaying !== null ? formatGHS(amountPaying) : "—"}
                            </span>
                          </span>
                        </div>
                        {amountPaying !== null && amountPaying < expectedAmount - 0.01 && (
                          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-sm font-medium text-amber-800">
                            Enter {formatGHS(expectedAmount)} or more to confirm.
                          </p>
                        )}
                        {changeToGive > 0 && (
                          <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-800">
                            Change to give guest: {formatGHS(changeToGive)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Step 3: ID — optional, lighter card */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-xs font-semibold text-slate-500">3</span>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">ID (optional)</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AppReactSelect
                      label="ID type"
                      options={[{ value: "", label: "Select..." }, ...ID_TYPE_OPTIONS]}
                      value={checkInForm.idType}
                      onChange={(v) => setCheckInForm((f) => ({ ...f, idType: v }))}
                      placeholder="Select..."
                    />
                    <Input
                      label="ID number"
                      value={checkInForm.idNumber}
                      onChange={(e) =>
                        setCheckInForm((f) => ({ ...f, idNumber: e.target.value }))
                      }
                      placeholder="Enter ID number"
                      className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                    />
                  </div>
                  <div className="mt-4">
                    <ImageUpload
                      label="ID document"
                      value={checkInForm.idImages}
                      onChange={(images) =>
                        setCheckInForm((f) => ({ ...f, idImages: images.slice(0, 1) }))
                      }
                      folder="hotel-hub/guest-ids"
                      single
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer — primary CTA orange */}
            <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)] sm:px-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCheckIn(null);
                    setCheckInFallbackAnyCategory(false);
                    setCheckInForm(getInitialCheckInForm(null));
                  }}
                  className="border-slate-200 font-medium text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={checkInMut.isPending}
                  disabled={
                    !checkInForm.roomId ||
                    checkInForm.depositPaid === "" ||
                    (Number(checkInForm.depositPaid) || 0) <
                      Number(showCheckIn.depositRequired ?? showCheckIn.totalAmount ?? 0) - 0.01
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00] px-6 py-3 font-semibold text-white shadow-lg shadow-[#ff8500]/30 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ff8500]/50"
                >
                  <LogIn className="h-4 w-4" />
                  Confirm Check In
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Check-out Modal */}
      <Modal
        open={!!showCheckOut}
        onClose={() => {
          setShowCheckOut(null);
          setCheckOutForm({ damageCharges: "", lateCheckOutFee: "", paymentMethod: "cash" });
        }}
        title="Check Out — Payment Reconciliation"
        size="xl"
      >
        {showCheckOut && (
          <form onSubmit={handleCheckOut} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* Guest info header */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div>
                <p className="font-medium">
                  {showCheckOut.guestId?.firstName} {showCheckOut.guestId?.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  Room {showCheckOut.roomId?.roomNumber ?? "-"} &middot;{" "}
                  {showCheckOut.bookingReference}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {showCheckOut.source === BOOKING_SOURCE.CORPORATE && (
                  <Badge variant="info">Corporate</Badge>
                )}
                {renderStatusPill(showCheckOut.status)}
              </div>
            </div>

            {/* Folio summary */}
            {checkOutFolioLoading ? (
              <p className="text-slate-400 text-center py-4">Loading folio...</p>
            ) : checkOutFolioData?.data ? (
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700">Folio Summary</h4>
                <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                  {Number(checkOutFolioData.data.summary.corporateDiscountRate ?? 0) > 0 &&
                    Number(checkOutFolioData.data.summary.corporateBaseRate ?? 0) > 0 && (
                      <>
                        <div className="flex justify-between px-4 py-2 bg-indigo-50/60">
                          <span className="text-slate-600">Corporate Base Room Total</span>
                          <span className="font-medium">
                            {formatGHS(Number(checkOutFolioData.data.summary.corporateBaseRate ?? 0))}
                          </span>
                        </div>
                        <div className="flex justify-between px-4 py-2 bg-indigo-50/60">
                          <span className="text-slate-600">
                            Corporate Discount ({checkOutFolioData.data.summary.corporateDiscountRate?.toFixed(2)}%)
                          </span>
                          <span className="font-medium text-green-700">
                            -
                            {formatGHS(
                              Number(checkOutFolioData.data.summary.corporateBaseRate ?? 0) -
                              Number(checkOutFolioData.data.summary.roomRate ?? 0)
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-slate-600">Room Rate</span>
                    <span className="font-medium">
                      {formatGHS(Number(checkOutFolioData.data.summary.roomRate ?? 0))}
                    </span>
                  </div>
                  {checkOutFolioData.data.roomCharges?.length > 0 && (
                    <>
                      {checkOutFolioData.data.roomCharges.map((ch: any) => (
                        <div key={ch._id} className="flex justify-between px-4 py-2 bg-amber-50/50">
                          <span className="text-slate-600">
                            <Badge variant="default" className="text-xs mr-2 capitalize">
                              {ch.chargeType?.replace(/([A-Z])/g, " $1").trim()}
                            </Badge>
                            {ch.description || ""}
                            {ch.quantity > 1 && ` x${ch.quantity}`}
                          </span>
                          <span className="font-medium">{formatGHS(Number(ch.totalAmount ?? 0))}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {checkOutFolioData.data.summary.earlyCheckInFee > 0 && (
                    <div className="flex justify-between px-4 py-2">
                      <span className="text-slate-600">Early Check-in Fee</span>
                      <span className="font-medium">
                        {formatGHS(Number(checkOutFolioData.data.summary.earlyCheckInFee ?? 0))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-2 bg-slate-50 font-semibold">
                    <span>Total Charges (before checkout fees)</span>
                    <span>
                      {formatGHS(Number(checkOutFolioData.data.summary.totalCharges ?? 0))}
                    </span>
                  </div>
                  {checkOutFolioData.data.summary.depositPaid > 0 && (
                    <div className="flex justify-between px-4 py-2 text-green-700">
                      <span>Deposit Paid (applied to charges)</span>
                      <span>{formatGHS(Number(checkOutFolioData.data.summary.depositPaid ?? 0))}</span>
                    </div>
                  )}
                  {checkOutFolioData.data.summary.totalPayments > 0 && (
                    <div className="flex justify-between px-4 py-2 text-green-700">
                      <span>Payments Received (applied)</span>
                      <span>{formatGHS(Number(checkOutFolioData.data.summary.totalPayments ?? 0))}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-3 bg-blue-50 font-bold text-base">
                    {Number(checkOutFolioData.data.summary.balanceDue ?? 0) >= 0 ? (
                      <>
                        <span>Balance Due</span>
                        <span className="text-red-600">
                          {formatGHS(Number(checkOutFolioData.data.summary.balanceDue ?? 0))}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Refund to guest</span>
                        <span className="text-green-600">
                          {formatGHS(Math.abs(Number(checkOutFolioData.data.summary.balanceDue ?? 0)))}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Payment History</h4>
                  {checkOutFolioData.data.payments?.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-slate-500">Date</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-500">Method</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-500">Status</th>
                            <th className="text-right px-3 py-2 font-medium text-slate-500">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {checkOutFolioData.data.payments.map((pay: any) => (
                            <tr key={pay._id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-600">
                                {pay.createdAt ? format(new Date(pay.createdAt), "PPp") : "-"}
                              </td>
                              <td className="px-3 py-2">{prettyLabel(pay.paymentMethod)}</td>
                              <td className="px-3 py-2">
                                <Badge
                                  variant={pay.status === "success" ? "success" : pay.status === "pending" ? "warning" : "default"}
                                  className="capitalize"
                                >
                                  {prettyLabel(pay.status)}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-green-700">
                                {formatGHS(Number(pay.amount ?? 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No recorded payment entries yet.</p>
                  )}
                </div>
              </div>
            ) : null}

            <hr className="border-slate-200" />

            {/* Additional checkout charges */}
            <h4 className="font-medium text-slate-700">Additional Checkout Charges</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Damage Charges"
                type="number"
                min="0"
                step="0.01"
                value={checkOutForm.damageCharges}
                onChange={(e) =>
                  setCheckOutForm((f) => ({
                    ...f,
                    damageCharges: e.target.value,
                  }))
                }
                placeholder="0.00"
              />
              <Input
                label="Late Check-out Fee"
                type="number"
                min="0"
                step="0.01"
                value={checkOutForm.lateCheckOutFee}
                onChange={(e) =>
                  setCheckOutForm((f) => ({
                    ...f,
                    lateCheckOutFee: e.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>

            {/* Final total preview — guest owes or refund */}
            {checkOutFolioData?.data && (() => {
              const finalAmount =
                (checkOutFolioData.data.summary.balanceDue ?? 0) +
                (parseFloat(checkOutForm.damageCharges) || 0) +
                (parseFloat(checkOutForm.lateCheckOutFee) || 0);
              const isRefund = finalAmount < 0;
              return (
                <div className={`rounded-lg border-2 p-4 text-center ${isRefund ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}>
                  <p className="text-sm text-slate-500">
                    {isRefund ? "Refund to guest" : "Final amount guest owes"}
                  </p>
                  <p className={`mt-1 text-2xl font-bold ${isRefund ? "text-green-700" : "text-slate-900"}`}>
                    {formatGHS(isRefund ? Math.abs(finalAmount) : finalAmount)}
                  </p>
                </div>
              );
            })()}

            {/* Payment method */}
            <AppReactSelect
              label="Payment Method"
              value={checkOutForm.paymentMethod}
              onChange={(v) =>
                setCheckOutForm((f) => ({ ...f, paymentMethod: v }))
              }
              options={[
                { value: PAYMENT_METHOD.CASH, label: "Cash" },
                { value: PAYMENT_METHOD.CARD, label: "Card" },
                { value: PAYMENT_METHOD.MOBILE_MONEY, label: "Mobile Money" },
                { value: PAYMENT_METHOD.BANK_TRANSFER, label: "Bank Transfer" },
              ]}
            />

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCheckOut(null);
                  setCheckOutForm({ damageCharges: "", lateCheckOutFee: "", paymentMethod: "cash" });
                }}
                className="border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={checkOutMut.isPending}
                className="bg-gradient-to-r from-[#ff6d00] to-[#ff9100] font-semibold text-white shadow-md shadow-[#ff8500]/25 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ff8500]/50"
              >
                Complete Checkout
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View / Folio Modal — premium redesign, payment required callout */}
      <Modal
        open={!!showView}
        onClose={() => setShowView(null)}
        title=""
        size="xl"
        className="max-h-[90vh] overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-xl"
      >
        {showView && (
          <div className="flex max-h-[90vh] flex-col">
            {/* Hero */}
            <div className="relative shrink-0 overflow-hidden rounded-t-2xl bg-gradient-to-r from-[#5a189a] via-[#7b2cbf] to-[#9d4edd] px-4 py-5 sm:px-6 sm:py-6">
              <div className="absolute inset-0 bg-white/5 pointer-events-none" aria-hidden />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowView(null);
                }}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 text-white hover:bg-white/20 sm:right-4 sm:top-4"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="relative z-0 flex items-center gap-3 pr-10">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm">
                  <Eye className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    Booking Details & Folio
                  </h2>
                  <p className="mt-0.5 text-sm font-medium text-white/90">
                    {showView.bookingReference}
                    {showView.guestId?.firstName || showView.guestId?.lastName
                      ? ` · ${showView.guestId?.firstName ?? ""} ${showView.guestId?.lastName ?? ""}`.trim()
                      : showView.guestId?.email ?? ""}
                  </p>
                </div>
                {renderStatusPill(showView.status)}
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              {/* Payment required — when folio has balance due */}
              {(isCheckedIn || showView.status === BOOKING_STATUS.CHECKED_OUT) && folio?.summary && Number(folio.summary?.balanceDue ?? 0) > 0 && (
                <div className="rounded-xl border-2 border-[#ff8500]/40 bg-gradient-to-r from-[#ff9100]/15 to-[#ff6d00]/10 px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[#c2410c]">
                      <CreditCard className="h-5 w-5 shrink-0" />
                      <span className="font-semibold">Payment required</span>
                    </div>
                    <p className="text-lg font-bold text-[#5a189a]">
                      Balance due: {formatGHS(Number(folio.summary.balanceDue ?? 0))}
                    </p>
                  </div>
                </div>
              )}

              {/* Booking info cards */}
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Booking summary</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Reference</span>
                    <p className="mt-0.5 flex items-center gap-2 font-medium text-slate-900">
                      {showView.bookingReference}
                      {showView.source === BOOKING_SOURCE.CORPORATE && (
                        <Badge variant="info" className="text-xs">Corporate</Badge>
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Guest</span>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {showView.guestId?.firstName && showView.guestId?.lastName
                        ? `${showView.guestId.firstName} ${showView.guestId.lastName}`
                        : showView.guestId?.email ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Category</span>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {(showView.roomCategoryId as { name?: string })?.name ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Room</span>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {showView.roomId?.roomNumber ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Floor</span>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {showView.roomId?.floor != null ? String(showView.roomId.floor) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Recorded by</span>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {(() => {
                        const by = showView.createdBy as { firstName?: string; lastName?: string; email?: string } | undefined;
                        if (!by || typeof by !== "object") return "—";
                        const name = [by.firstName, by.lastName].filter(Boolean).join(" ");
                        return (name || by.email) ?? "—";
                      })()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Check-in</span>
                    <p className="mt-0.5 text-slate-900">
                      {showView.checkInDate ? format(new Date(showView.checkInDate), "PPp") : "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Check-out</span>
                    <p className="mt-0.5 text-slate-900">
                      {showView.checkOutDate ? format(new Date(showView.checkOutDate), "PPp") : "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Nights</span>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {showView.numberOfNights != null ? String(showView.numberOfNights) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Guests</span>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {showView.numberOfGuests != null ? String(showView.numberOfGuests) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Source</span>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {showView.source ? String(showView.source).replace(/_/g, " ") : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Total</span>
                    <p className="mt-0.5 font-semibold text-[#5a189a]">
                      {showView.totalAmount != null ? formatGHS(showView.totalAmount) : "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Date recorded</span>
                    <p className="mt-0.5 text-slate-900">
                      {showView.createdAt ? format(new Date(showView.createdAt), "PP") : "—"}
                    </p>
                  </div>
                  {showView.corporateAccountId && typeof showView.corporateAccountId === "object" && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <span className="text-xs font-medium text-slate-500">Corporate account</span>
                      <p className="mt-0.5 font-medium text-slate-900">
                        {(showView.corporateAccountId as { companyName?: string }).companyName ?? "—"}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <span className="text-xs font-medium text-slate-500">Deposit paid</span>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {showView.depositPaid != null ? formatGHS(Number(showView.depositPaid)) : "—"}
                    </p>
                  </div>
                </div>
                {showView.specialRequests && (
                  <div className="mt-3 rounded-lg border border-slate-100 bg-amber-50/30 p-3">
                    <span className="text-xs font-medium text-slate-500">Special requests</span>
                    <p className="mt-0.5 text-sm text-slate-700">{showView.specialRequests}</p>
                  </div>
                )}
              </section>

              {/* Folio Section — visible for checked-in and checked-out bookings */}
              {(isCheckedIn || showView.status === BOOKING_STATUS.CHECKED_OUT) && (
                <>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">Guest folio</h3>

                {folioLoading ? (
                  <p className="text-slate-400">Loading folio...</p>
                ) : folio ? (
                  <div className="space-y-4">
                    {/* Folio summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">Room Rate</p>
                        <p className="text-lg font-semibold">
                          {formatGHS(Number(folio.summary?.roomRate ?? 0))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">Room Charges</p>
                        <p className="text-lg font-semibold">
                          {formatGHS(Number(folio.summary?.roomChargesTotal ?? 0))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">Payments</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatGHS(Number(folio.summary?.totalCredits ?? 0))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs text-slate-500">Balance Due</p>
                        <p className={`text-lg font-bold ${(folio.summary?.balanceDue ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                          {formatGHS(Number(folio.summary?.balanceDue ?? 0))}
                        </p>
                      </div>
                    </div>

                    {Number(folio.summary?.corporateDiscountRate ?? 0) > 0 &&
                      Number(folio.summary?.corporateBaseRate ?? 0) > 0 && (
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Corporate Base Room Total</span>
                            <span className="font-medium">
                              {formatGHS(Number(folio.summary?.corporateBaseRate ?? 0))}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-slate-600">
                              Corporate Discount ({Number(folio.summary?.corporateDiscountRate ?? 0).toFixed(2)}%)
                            </span>
                            <span className="font-medium text-green-700">
                              -
                              {formatGHS(
                                Number(folio.summary?.corporateBaseRate ?? 0) -
                                Number(folio.summary?.roomRate ?? 0)
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                    {/* Room charges table */}
                    {folio.roomCharges && folio.roomCharges.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-700 mb-2">Room Charges</h4>
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium text-slate-500">Type</th>
                                <th className="text-left px-3 py-2 font-medium text-slate-500">Description</th>
                                <th className="text-right px-3 py-2 font-medium text-slate-500">Qty</th>
                                <th className="text-right px-3 py-2 font-medium text-slate-500">Unit</th>
                                <th className="text-right px-3 py-2 font-medium text-slate-500">Total</th>
                                <th className="text-left px-3 py-2 font-medium text-slate-500">Added By</th>
                                {isCheckedIn && (
                                  <th className="text-right px-3 py-2 font-medium text-slate-500 w-10"></th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {folio.roomCharges.map((ch: any) => (
                                <tr key={ch._id} className="hover:bg-slate-50">
                                  <td className="px-3 py-2">
                                    <Badge variant="default" className="capitalize text-xs">
                                      {ch.chargeType?.replace(/([A-Z])/g, " $1").trim()}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">{ch.description || "-"}</td>
                                  <td className="px-3 py-2 text-right">{ch.quantity}</td>
                                  <td className="px-3 py-2 text-right">{formatGHS(Number(ch.unitPrice ?? 0))}</td>
                                  <td className="px-3 py-2 text-right font-medium">{formatGHS(Number(ch.totalAmount ?? 0))}</td>
                                  <td className="px-3 py-2 text-slate-500 text-xs">
                                    {ch.addedBy
                                      ? `${ch.addedBy.firstName ?? ""} ${ch.addedBy.lastName ?? ""}`.trim()
                                      : "-"}
                                  </td>
                                  {isCheckedIn && (
                                    <td className="px-3 py-2 text-right">
                                      <button
                                        onClick={() => handleDeleteCharge(ch._id)}
                                        className="text-red-400 hover:text-red-600 transition-colors"
                                        title="Remove charge"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {folio.roomCharges?.length === 0 && !isCheckedIn && (
                      <p className="text-slate-400 text-center py-4">No room charges recorded</p>
                    )}

                    <div>
                      <h4 className="font-medium text-slate-700 mb-2">Payment History</h4>
                      {folio.payments?.length > 0 ? (
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium text-slate-500">Date</th>
                                <th className="text-left px-3 py-2 font-medium text-slate-500">Method</th>
                                <th className="text-left px-3 py-2 font-medium text-slate-500">Status</th>
                                <th className="text-right px-3 py-2 font-medium text-slate-500">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {folio.payments.map((pay: any) => (
                                <tr key={pay._id} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 text-slate-600">
                                    {pay.createdAt ? format(new Date(pay.createdAt), "PPp") : "-"}
                                  </td>
                                  <td className="px-3 py-2">{prettyLabel(pay.paymentMethod)}</td>
                                  <td className="px-3 py-2">
                                    <Badge
                                      variant={pay.status === "success" ? "success" : pay.status === "pending" ? "warning" : "default"}
                                      className="capitalize"
                                    >
                                      {prettyLabel(pay.status)}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium text-green-700">
                                    {formatGHS(Number(pay.amount ?? 0))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">No recorded payment entries yet.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">No folio data available</p>
                )}
                  </section>

                {/* Add Charge form — only for checked-in bookings */}
                {isCheckedIn && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
                    <h4 className="font-medium text-slate-700 mb-3">Add Room Charge</h4>
                    <p className="text-xs text-slate-500 mb-3">
                      Enter unit price and qty, or use “Total (optional)” to auto-fill unit price from the line total.
                    </p>
                    <form onSubmit={handleAddCharge} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <AppReactSelect
                          label="Type"
                          value={chargeForm.chargeType}
                          onChange={(v) =>
                            setChargeForm((f) => ({ ...f, chargeType: v }))
                          }
                          options={CHARGE_TYPE_OPTIONS}
                          placeholder="Type"
                        />
                        <Input
                          label="Description"
                          value={chargeForm.description}
                          onChange={(e) =>
                            setChargeForm((f) => ({ ...f, description: e.target.value }))
                          }
                          placeholder="e.g. 2x Coca-Cola"
                        />
                        <Input
                          label="Unit price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={chargeForm.unitPrice}
                          onChange={(e) =>
                            setChargeForm((f) => ({
                              ...f,
                              unitPrice: e.target.value,
                              totalAmountEntered: "",
                            }))
                          }
                          placeholder="0.00"
                          required
                        />
                        <Input
                          label="Qty"
                          type="number"
                          min="1"
                          value={chargeForm.quantity}
                          onChange={(e) => {
                            const q = e.target.value;
                            setChargeForm((f) => {
                              const next = { ...f, quantity: q };
                              const totalVal = Number(f.totalAmountEntered) || 0;
                              const qty = Number(q) || 0;
                              if (totalVal > 0 && qty > 0)
                                next.unitPrice = String(
                                  Math.round((totalVal / qty) * 100) / 100
                                );
                              return next;
                            });
                          }}
                          className="w-20"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Total (optional)</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g. 1000"
                            value={chargeForm.totalAmountEntered}
                            onChange={(e) => {
                              const totalStr = e.target.value;
                              setChargeForm((f) => {
                                const next = { ...f, totalAmountEntered: totalStr };
                                const totalVal = Number(totalStr) || 0;
                                const qty = Number(f.quantity) || 0;
                                if (totalVal > 0 && qty > 0)
                                  next.unitPrice = String(
                                    Math.round((totalVal / qty) * 100) / 100
                                  );
                                return next;
                              });
                            }}
                          />
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <p className="text-xs text-slate-500">Line total</p>
                          <p className="font-semibold text-slate-900">
                            {new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(
                              (Number(chargeForm.quantity) || 0) * (Number(chargeForm.unitPrice) || 0)
                            )}
                          </p>
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          loading={addChargeMut.isPending}
                          disabled={!chargeForm.unitPrice}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        open={!!showCancel}
        onClose={() => {
          setShowCancel(null);
          setCancellationReason("");
          setRefundAmountOverride(undefined);
        }}
        title="Cancel Booking"
      >
        {showCancel && (
          <form onSubmit={handleCancel} className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to cancel booking{" "}
              <strong>{showCancel.bookingReference}</strong>?
            </p>
            {cancelPreview && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                {cancelPreview.freeCancel ? (
                  <p className="font-medium text-emerald-700">Free cancellation — full refund</p>
                ) : (
                  <>
                    <p className="text-slate-600">
                      Cancellation fee: <strong>{new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(Number(cancelPreview.cancellationFee ?? 0))}</strong>
                    </p>
                    <p className="text-slate-600">
                      Refund amount: <strong>{new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(Number(cancelPreview.refundAmount ?? 0))}</strong>
                    </p>
                  </>
                )}
                {!cancelPreview.freeCancel && (
                  <Input
                    label="Override refund amount (optional)"
                    type="number"
                    min={0}
                    step={0.01}
                    value={refundAmountOverride !== undefined ? String(refundAmountOverride) : ""}
                    onChange={(e) => setRefundAmountOverride(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={cancelPreview.refundAmount != null ? String(cancelPreview.refundAmount) : ""}
                    className="mt-2"
                  />
                )}
              </div>
            )}
            <Input
              label="Cancellation Reason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Required"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancel(null);
                  setCancellationReason("");
                  setRefundAmountOverride(undefined);
                }}
              >
                Keep Booking
              </Button>
              <Button
                type="submit"
                variant="destructive"
                loading={cancelMut.isPending}
                disabled={!cancellationReason.trim()}
              >
                Cancel Booking
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
