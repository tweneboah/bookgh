"use client";

import { useState } from "react";
import {
  IoAddOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoLocationOutline,
  IoCardOutline,
  IoShieldCheckmarkOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoChevronBack,
  IoChevronForward,
  IoBusinessOutline,
  IoMailOutline,
  IoCallOutline,
  IoCalendarOutline,
  IoImageOutline,
  IoTimeOutline,
  IoOptionsOutline,
} from "react-icons/io5";
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useBranchPaystackConfig,
  useSavePaystackConfig,
} from "@/hooks/api";
import { Button, Modal, Input, Badge } from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { TwoStepAddressPicker, type AddressResult } from "@/components/location/TwoStepAddressPicker";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "closed", label: "Closed" },
];

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "outline"> = {
  active: "success",
  inactive: "warning",
  closed: "danger",
};

type BranchImage = { url?: string; caption?: string; publicId?: string };

type BranchItem = {
  _id: string;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  city?: string;
  region?: string;
  country?: string;
  address?: { street?: string; city?: string; region?: string; country?: string };
  status?: string;
  isPublished?: boolean;
  createdAt?: string;
  images?: BranchImage[];
};

export default function BranchesPage() {
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<BranchItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [paystackBranch, setPaystackBranch] = useState<BranchItem | null>(null);
  const [paystackForm, setPaystackForm] = useState({
    publicKey: "",
    secretKey: "",
    webhookSecret: "",
  });
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    street: "",
    city: "",
    region: "",
    country: "Ghana",
    status: "active",
    isPublished: false,
    amenities: "",
    breakfastIncluded: false,
    refundableBooking: false,
    checkIn: "14:00",
    checkOut: "12:00",
    images: [] as UploadedImage[],
  });
  /** Map-verified address (sets location for discovery). */
  const [addressResult, setAddressResult] = useState<AddressResult | null>(null);

  const { data, isLoading } = useBranches({ page: String(page), limit: "20" });
  const createMut = useCreateBranch();
  const updateMut = useUpdateBranch();
  const deleteMut = useDeleteBranch();
  const savePaystackMut = useSavePaystackConfig();
  const { data: psConfigData, isLoading: psConfigLoading } =
    useBranchPaystackConfig(paystackBranch?._id ?? "");

  const items = (data?.data ?? []) as BranchItem[];
  const pagination = data?.meta?.pagination as
    | { page: number; limit: number; total: number }
    | undefined;

  const resetForm = () => {
    setForm({
      name: "",
      contactEmail: "",
      contactPhone: "",
      street: "",
      city: "",
      region: "",
      country: "Ghana",
      status: "active",
      isPublished: false,
      amenities: "",
      breakfastIncluded: false,
      refundableBooking: false,
      checkIn: "14:00",
      checkOut: "12:00",
      images: [],
    });
    setAddressResult(null);
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: BranchItem) => {
    setEditItem(item);
    setForm({
      name: item.name ?? "",
      contactEmail: item.contactEmail ?? "",
      contactPhone: item.contactPhone ?? "",
      street: item.address?.street ?? "",
      city: item.city ?? item.address?.city ?? "",
      region: item.region ?? item.address?.region ?? "",
      country: item.country ?? item.address?.country ?? "Ghana",
      status: item.status ?? "active",
      isPublished: item.isPublished ?? false,
      amenities: Array.isArray((item as any).amenities) ? (item as any).amenities.join(", ") : "",
      breakfastIncluded: (item as any).breakfastIncluded ?? false,
      refundableBooking: (item as any).refundableBooking ?? false,
      checkIn: (item as any).operatingHours?.checkIn ?? "14:00",
      checkOut: (item as any).operatingHours?.checkOut ?? "12:00",
      images: Array.isArray((item as any).images)
        ? (item as any).images.map((img: any) => ({
            url: img.url,
            publicId: img.publicId,
            caption: img.caption,
          }))
        : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = addressResult;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      address: {
        street: (r ? r.address : form.street.trim()) || undefined,
        city: (r ? r.city : form.city.trim()) || undefined,
        region: (r ? r.state : form.region.trim()) || undefined,
        country: (r ? r.country : form.country.trim()) || undefined,
      },
      city: (r ? r.city : form.city.trim()) || undefined,
      region: (r ? r.state : form.region.trim()) || undefined,
      country: (r ? r.country : form.country.trim()) || undefined,
      ...(r && {
        location: { type: "Point" as const, coordinates: [r.lng, r.lat] },
        googlePlaceId: r.placeId,
      }),
      status: form.status,
      isPublished: form.isPublished,
      amenities: form.amenities
        ? form.amenities.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      breakfastIncluded: form.breakfastIncluded,
      refundableBooking: form.refundableBooking,
      operatingHours: { checkIn: form.checkIn, checkOut: form.checkOut },
      images: form.images.map((img) => ({ url: img.url, caption: img.caption || undefined })),
    };
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Branch updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Branch created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Branch deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) || 1 : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && items.length === 0;

  const locationStr = (row: BranchItem) => {
    const parts = [row.city, row.region, row.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  return (
    <div className="min-h-full bg-white font-sans">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="border-l-4 border-[#ff8500] pl-4">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Branches
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your hotel locations and properties
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="inline-flex items-center gap-2 border-0 text-white shadow-[0_4px_14px_-2px_rgba(255,109,0,0.4)] transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ff8500]/40 focus-visible:ring-offset-2"
            style={{
              background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
            }}
          >
            <IoAddOutline className="h-5 w-5" aria-hidden />
            Add Branch
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                >
                  <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                  <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-[#5a189a]"
                style={{ background: "rgba(90, 24, 154, 0.1)" }}
              >
                <IoBusinessOutline className="h-8 w-8" aria-hidden />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-slate-900">No branches yet</h2>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Create your first branch to start managing locations and availability.
              </p>
              <Button
                onClick={openCreate}
                className="mt-6 border-0 text-white shadow-[0_4px_14px_-2px_rgba(255,109,0,0.4)] hover:opacity-95"
                style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)" }}
              >
                <IoAddOutline className="mr-2 h-4 w-4" aria-hidden />
                Add Branch
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => {
                  const firstImage = row.images?.[0]?.url;
                  return (
                  <article
                    key={row._id}
                    className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]"
                  >
                    {/* Branch image or placeholder */}
                    <div className="relative h-36 w-full shrink-0 overflow-hidden bg-slate-100">
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={row.name ?? "Branch"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center text-slate-300"
                          style={{
                            background: "linear-gradient(135deg, rgba(90,24,154,0.06) 0%, rgba(255,133,0,0.06) 100%)",
                          }}
                        >
                          <IoImageOutline className="h-10 w-10" aria-hidden />
                        </div>
                      )}
                      <div className="absolute right-2 top-2">
                        <Badge variant={STATUS_BADGE[row.status ?? ""] ?? "outline"}>
                          {row.status ?? "—"}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-semibold text-slate-900">
                          {row.name ?? "Unnamed branch"}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                          <IoLocationOutline className="h-4 w-4 shrink-0 text-[#5a189a]" aria-hidden />
                          <span className="truncate">{locationStr(row)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      {row.contactEmail && (
                        <p className="flex items-center gap-2">
                          <IoMailOutline className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                          <span className="truncate">{row.contactEmail}</span>
                        </p>
                      )}
                      {row.contactPhone && (
                        <p className="flex items-center gap-2">
                          <IoCallOutline className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                          {row.contactPhone}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge variant={row.isPublished ? "success" : "outline"}>
                        {row.isPublished ? "Published" : "Draft"}
                      </Badge>
                      {row.createdAt && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <IoCalendarOutline className="h-3.5 w-3.5" aria-hidden />
                          {format(new Date(row.createdAt), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#5a189a]/20"
                        title="Edit"
                      >
                        <IoCreateOutline className="h-4 w-4" aria-hidden />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaystackBranch(row);
                          setPaystackForm({ publicKey: "", secretKey: "", webhookSecret: "" });
                          setShowSecretKey(false);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#5a189a] transition-colors hover:bg-[#5a189a]/5 focus:outline-none focus:ring-2 focus:ring-[#5a189a]/20"
                        title="Paystack config"
                      >
                        <IoCardOutline className="h-4 w-4" aria-hidden />
                        Paystack
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDelete(row._id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        title="Delete"
                      >
                        <IoTrashOutline className="h-4 w-4" aria-hidden />
                        Delete
                      </button>
                    </div>
                    </div>
                  </article>
                  );
                })}
              </div>

              {pagination && (
                <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <p className="text-sm text-slate-500">
                    Showing{" "}
                    <span className="font-medium text-slate-700">
                      {(pagination.page - 1) * pagination.limit + 1}–
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{" "}
                    of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#5a189a]/20 focus:ring-offset-2",
                        hasPrev
                          ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "border-slate-100 bg-slate-50 text-slate-400"
                      )}
                      aria-label="Previous page"
                    >
                      <IoChevronBack className="h-4 w-4" aria-hidden />
                      Previous
                    </button>
                    <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700">
                      {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNext}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#5a189a]/30 focus:ring-offset-2",
                        hasNext && "shadow-[0_2px_8px_-2px_rgba(90,24,154,0.35)]"
                      )}
                      style={
                        hasNext
                          ? { background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 100%)" }
                          : { background: "#94a3b8" }
                      }
                      aria-label="Next page"
                    >
                      Next
                      <IoChevronForward className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add / Edit Branch Modal — styled sections */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Branch" : "Add Branch"}
        size="xl"
        className="max-w-2xl rounded-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <p className="mb-6 text-sm text-slate-500">
            {editItem ? "Update branch details and settings below." : "Fill in the details to add a new property location."}
          </p>

          <div className="space-y-8">
            {/* Section: Basic info */}
            <section>
              <h3 className="mb-4 flex items-center gap-2 border-l-4 border-[#ff8500] pl-3 text-sm font-semibold uppercase tracking-wider text-slate-700">
                Basic information
              </h3>
              <div className="space-y-4">
                <Input
                  label="Branch name *"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="e.g. Airport Branch"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#5a189a]/40"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Contact email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    placeholder="branch@hotel.com"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#5a189a]/40"
                  />
                  <Input
                    label="Contact phone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    placeholder="+233 30 000 0000"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#5a189a]/40"
                  />
                </div>
              </div>
            </section>

            {/* Section: Address */}
            <section>
              <h3 className="mb-4 flex items-center gap-2 border-l-4 border-[#5a189a] pl-3 text-sm font-semibold uppercase tracking-wider text-slate-700">
                <IoLocationOutline className="h-4 w-4 text-[#5a189a]" aria-hidden />
                Address
              </h3>
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-3 text-sm font-medium text-slate-700">
                    Search on map (for discovery &amp; nearby search)
                  </p>
                  <TwoStepAddressPicker
                    onSelect={(result) => {
                      setAddressResult(result);
                      setForm((f) => ({
                        ...f,
                        street: result.address,
                        city: result.city,
                        region: result.state,
                        country: result.country,
                      }));
                    }}
                    country="gh"
                    initialResult={addressResult}
                  />
                </div>
                <p className="text-xs text-slate-500">Or enter manually:</p>
                <Input
                  label="Street"
                  value={form.street}
                  onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                  placeholder="123 Main Street"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#5a189a]/40"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Input
                    label="City"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Accra"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#5a189a]/40"
                  />
                  <Input
                    label="Region"
                    value={form.region}
                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                    placeholder="Greater Accra"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#5a189a]/40"
                  />
                  <Input
                    label="Country"
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="Ghana"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#5a189a]/40"
                  />
                </div>
              </div>
            </section>

            {/* Section: Operating hours & status */}
            <section>
              <h3 className="mb-4 flex items-center gap-2 border-l-4 border-[#7b2cbf] pl-3 text-sm font-semibold uppercase tracking-wider text-slate-700">
                <IoTimeOutline className="h-4 w-4 text-[#7b2cbf]" aria-hidden />
                Operating hours & status
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <AppReactSelect
                  label="Status"
                  value={form.status}
                  onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  options={STATUS_OPTIONS}
                />
                <Input
                  label="Check-in time"
                  type="time"
                  value={form.checkIn}
                  onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                  className="rounded-xl border-slate-200 focus-visible:ring-[#5a189a]/40"
                />
                <Input
                  label="Check-out time"
                  type="time"
                  value={form.checkOut}
                  onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                  className="rounded-xl border-slate-200 focus-visible:ring-[#5a189a]/40"
                />
              </div>
            </section>

            {/* Section: Amenities & options */}
            <section>
              <h3 className="mb-4 flex items-center gap-2 border-l-4 border-[#ff8500] pl-3 text-sm font-semibold uppercase tracking-wider text-slate-700">
                <IoOptionsOutline className="h-4 w-4 text-[#ff8500]" aria-hidden />
                Amenities & options
              </h3>
              <div className="space-y-4">
                <Input
                  label="Amenities (comma-separated)"
                  value={form.amenities}
                  onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
                  placeholder="WiFi, Pool, AC, Gym, Parking"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#5a189a]/40"
                />
                <div className="flex flex-wrap gap-6 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/30"
                    />
                    <span className="text-sm font-medium text-slate-700">Published on discovery</span>
                  </label>
                  {form.isPublished && !addressResult && (
                    <p className="w-full text-sm text-amber-700">
                      Add an address using the map picker above so this branch appears in &quot;near me&quot; and distance-based search.
                    </p>
                  )}
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.breakfastIncluded}
                      onChange={(e) => setForm((f) => ({ ...f, breakfastIncluded: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/30"
                    />
                    <span className="text-sm font-medium text-slate-700">Breakfast included</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.refundableBooking}
                      onChange={(e) => setForm((f) => ({ ...f, refundableBooking: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/30"
                    />
                    <span className="text-sm font-medium text-slate-700">Refundable bookings</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Section: Branch images */}
            <section>
              <h3 className="mb-4 flex items-center gap-2 border-l-4 border-[#5a189a] pl-3 text-sm font-semibold uppercase tracking-wider text-slate-700">
                <IoImageOutline className="h-4 w-4 text-[#5a189a]" aria-hidden />
                Branch images
              </h3>
              <ImageUpload
                label=""
                value={form.images}
                onChange={(images) => setForm((f) => ({ ...f, images }))}
                folder="branches"
                maxFiles={10}
                showCaptions
              />
            </section>
          </div>

          {/* Footer */}
          <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="rounded-xl border-0 text-white shadow-[0_4px_14px_-2px_rgba(255,109,0,0.4)] hover:opacity-95"
              style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)" }}
            >
              {editItem ? "Update branch" : "Create branch"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Branch">
        <p className="text-slate-600">
          Are you sure you want to delete this branch? All data associated with this branch will be
          affected.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDelete(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} loading={deleteMut.isPending}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Paystack Config Modal */}
      <Modal
        open={!!paystackBranch}
        onClose={() => setPaystackBranch(null)}
        title={`Paystack — ${paystackBranch?.name ?? ""}`}
        size="lg"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <IoShieldCheckmarkOutline className="mt-0.5 h-5 w-5 shrink-0 text-[#5a189a]" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-slate-900">Payments go to your Paystack account</p>
              <p className="mt-1 text-slate-500">
                Configure API keys so guests can pay online. Secret keys are encrypted before
                storage.
              </p>
            </div>
          </div>

          {psConfigLoading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-[#5a189a] border-t-transparent"
                aria-hidden
              />
            </div>
          ) : (
            <>
              {psConfigData?.data?.hasSecretKey && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-800">
                  <IoShieldCheckmarkOutline className="h-4 w-4 shrink-0" aria-hidden />
                  Paystack keys are configured. Enter new keys to update.
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!paystackForm.publicKey || !paystackForm.secretKey) {
                    toast.error("Public key and secret key are required");
                    return;
                  }
                  try {
                    await savePaystackMut.mutateAsync({
                      branchId: paystackBranch!._id,
                      publicKey: paystackForm.publicKey.trim(),
                      secretKey: paystackForm.secretKey.trim(),
                      webhookSecret: paystackForm.webhookSecret.trim() || undefined,
                    });
                    toast.success("Paystack configuration saved!");
                    setPaystackBranch(null);
                  } catch (err: any) {
                    toast.error(
                      err?.response?.data?.error?.message ?? "Failed to save config"
                    );
                  }
                }}
                className="space-y-4"
              >
                <Input
                  label="Public Key *"
                  value={paystackForm.publicKey}
                  onChange={(e) =>
                    setPaystackForm((f) => ({ ...f, publicKey: e.target.value }))
                  }
                  placeholder={
                    psConfigData?.data?.publicKey || "pk_live_xxxxxxxx or pk_test_xxxxxxxx"
                  }
                  required
                />
                <div className="relative">
                  <Input
                    label="Secret Key *"
                    type={showSecretKey ? "text" : "password"}
                    value={paystackForm.secretKey}
                    onChange={(e) =>
                      setPaystackForm((f) => ({ ...f, secretKey: e.target.value }))
                    }
                    placeholder="sk_live_xxxxxxxx or sk_test_xxxxxxxx"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-8 text-slate-500 hover:text-slate-700"
                    aria-label={showSecretKey ? "Hide secret key" : "Show secret key"}
                  >
                    {showSecretKey ? (
                      <IoEyeOffOutline className="h-4 w-4" aria-hidden />
                    ) : (
                      <IoEyeOutline className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
                <Input
                  label="Webhook Secret (optional)"
                  type="password"
                  value={paystackForm.webhookSecret}
                  onChange={(e) =>
                    setPaystackForm((f) => ({ ...f, webhookSecret: e.target.value }))
                  }
                  placeholder="whsec_xxxxxxxx"
                />
                <p className="text-xs text-slate-500">
                  Get your API keys from{" "}
                  <a
                    href="https://dashboard.paystack.com/#/settings/developer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#5a189a] hover:text-[#7b2cbf] hover:underline"
                  >
                    Paystack Dashboard → Settings → API Keys & Webhooks
                  </a>
                </p>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" type="button" onClick={() => setPaystackBranch(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={savePaystackMut.isPending}
                    className="border-0 text-white shadow-[0_2px_10px_-2px_rgba(90,24,154,0.35)] hover:opacity-95"
                    style={{ background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 100%)" }}
                  >
                    <IoCardOutline className="mr-2 h-4 w-4" aria-hidden />
                    Save Paystack Config
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
