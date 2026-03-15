"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useLostAndFound,
  useCreateLostAndFound,
  useUpdateLostAndFound,
  useDeleteLostAndFound,
  useRooms,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Badge,
  Textarea,
  EmptyState,
  Dropdown,
  AppReactSelect,
} from "@/components/ui";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { SearchInput } from "@/components/ui/search-input";
import {
  Plus,
  Trash2,
  CheckCircle,
  Package,
  MoreHorizontal,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { LOST_FOUND_STATUS } from "@/constants";

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

const STATUS_OPTIONS = Object.entries(LOST_FOUND_STATUS).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const STATUS_TABS = [
  { value: "", label: "All" },
  ...STATUS_OPTIONS,
];

const STATUS_CARD_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  "": {
    bg: "bg-white",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  [LOST_FOUND_STATUS.FOUND]: {
    bg: "bg-gradient-to-br from-[#ff9e00]/15 via-[#ff9100]/10 to-[#ff8500]/5",
    text: "text-[#c2410c]",
    border: "border-[#ff9e00]/40",
  },
  [LOST_FOUND_STATUS.CLAIMED]: {
    bg: "bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-teal-500/5",
    text: "text-emerald-700",
    border: "border-emerald-400/50",
  },
  [LOST_FOUND_STATUS.DISPOSED]: {
    bg: "bg-gradient-to-br from-slate-200/80 via-slate-100 to-slate-50",
    text: "text-slate-600",
    border: "border-slate-300/60",
  },
};

function toISO(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString();
}

export default function LostAndFoundPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showClaim, setShowClaim] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    itemDescription: "",
    roomId: "",
    foundDate: "",
    foundLocation: "",
    notes: "",
    images: [] as UploadedImage[],
  });

  const [claimForm, setClaimForm] = useState({ claimedBy: "" });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useLostAndFound(params);
  const { data: roomsData } = useRooms({ limit: "500" });
  const createMut = useCreateLostAndFound();
  const updateMut = useUpdateLostAndFound();
  const deleteMut = useDeleteLostAndFound();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const rooms = roomsData?.data ?? [];

  const roomOptions = useMemo(
    () =>
      rooms.map((r: any) => {
        const id = r._id != null ? String(r._id) : "";
        return {
          value: id,
          label: `${r.roomNumber ?? id}${r.roomCategoryId?.name ? ` · ${r.roomCategoryId.name}` : ""}`,
        };
      }).filter((o: { value: string; label: string }) => o.value),
    [rooms]
  );

  // [DEBUG] Lost & Found: log fetched items and roomId shape
  useEffect(() => {
    if (items.length === 0) return;
    const first = items[0] as Record<string, unknown>;
    console.group("[lost-and-found] FETCHED DATA");
    console.log("items count:", items.length);
    console.log("rooms count:", rooms.length);
    console.log("roomOptions count:", roomOptions.length);
    console.log("first item _id:", first._id);
    console.log("first item roomId:", first.roomId);
    console.log("first item roomId type:", typeof first.roomId);
    if (first.roomId && typeof first.roomId === "object") {
      const r = first.roomId as Record<string, unknown>;
      console.log("first item roomId.roomNumber:", r.roomNumber);
      console.log("first item roomId keys:", Object.keys(r));
    }
    items.forEach((it: any, i: number) => {
      console.log(`item[${i}] roomId:`, it.roomId, "roomNumber:", it.roomId?.roomNumber);
    });
    console.groupEnd();
  }, [items, rooms.length, roomOptions.length]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter(
      (i: any) =>
        (i.itemDescription ?? "").toLowerCase().includes(q) ||
        (i.foundLocation ?? "").toLowerCase().includes(q) ||
        (i.claimedBy ?? "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const stats = useMemo(
    () => ({
      total: pagination?.total ?? items.length,
      found: items.filter((i: any) => i.status === LOST_FOUND_STATUS.FOUND).length,
      claimed: items.filter((i: any) => i.status === LOST_FOUND_STATUS.CLAIMED).length,
      disposed: items.filter((i: any) => i.status === LOST_FOUND_STATUS.DISPOSED).length,
    }),
    [items, pagination?.total]
  );

  const resetForm = () => {
    setForm({
      itemDescription: "",
      roomId: "",
      foundDate: "",
      foundLocation: "",
      notes: "",
      images: [],
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const r = item.roomId;
    const roomIdVal = r != null ? (r._id != null ? String(r._id) : String(r)) : "";
    setForm({
      itemDescription: item.itemDescription ?? "",
      roomId: roomIdVal,
      foundDate: item.foundDate ? item.foundDate.slice(0, 16) : "",
      foundLocation: item.foundLocation ?? "",
      notes: item.notes ?? "",
      images: Array.isArray(item.images)
        ? item.images.map((url: string) => ({ url }))
        : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const roomIdRaw = form.roomId ? String(form.roomId).trim() : "";
    const payload = {
      itemDescription: form.itemDescription.trim(),
      roomId: editItem ? (roomIdRaw || null) : (roomIdRaw || undefined),
      foundDate: toISO(form.foundDate),
      foundLocation: form.foundLocation.trim() || undefined,
      notes: form.notes.trim() || undefined,
      images: form.images.map((img) => img.url),
    };

    console.log("[lost-and-found SUBMIT] form.roomId:", form.roomId, "roomIdRaw:", roomIdRaw);
    console.log("[lost-and-found SUBMIT] payload.roomId:", payload.roomId);
    console.log("[lost-and-found SUBMIT] full payload:", payload);

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload } as any);
        toast.success("Item updated");
      } else {
        await createMut.mutateAsync(payload as any);
        toast.success("Item added");
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showClaim || !claimForm.claimedBy.trim()) return;
    try {
      await updateMut.mutateAsync({
        id: showClaim._id,
        status: LOST_FOUND_STATUS.CLAIMED,
        claimedBy: claimForm.claimedBy.trim(),
      });
      toast.success("Item marked as claimed");
      setShowClaim(null);
      setClaimForm({ claimedBy: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Item deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const renderStatusBadge = (status: string) => {
    const style = STATUS_CARD_STYLES[status] ?? STATUS_CARD_STYLES[""];
    const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
    return (
      <span
        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${style.bg} ${style.border} ${style.text}`}
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {label}
      </span>
    );
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) || 1 : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && items.length === 0;
  const isFilteredEmpty = !isLoading && items.length > 0 && filteredItems.length === 0;

  return (
    <div
      className="min-h-screen bg-white text-slate-800"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-slate-100 bg-white">
        <div
          className="absolute left-0 top-0 h-full w-1.5 min-w-0 rounded-r-full bg-gradient-to-b from-[#ff8500] via-[#ff9100] to-[#5a189a] sm:w-2"
          aria-hidden
        />
        <div
          className="absolute right-0 top-0 h-32 w-48 rounded-bl-[80px] bg-gradient-to-br from-[#ff9100]/10 to-[#5a189a]/5 sm:h-40 sm:w-64 sm:rounded-bl-[100px]"
          aria-hidden
        />
        <div className="relative px-4 py-5 sm:px-6 sm:py-6 md:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3 pl-3 sm:pl-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a189a]/15 to-[#9d4edd]/10 text-[#5a189a] ring-1 ring-[#5a189a]/20">
                  <Package className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Housekeeping
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Lost & Found
              </h1>
              <p className="max-w-lg text-sm font-normal text-slate-600">
                Record found items, track claims and disposal.
              </p>
            </div>
            <div className="flex shrink-0">
              <Button
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6d00] to-[#ff9100] px-4 py-2.5 font-semibold text-white shadow-lg shadow-[#ff8500]/25 transition hover:opacity-95 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[#ff8500]/50"
              >
                <Plus className="h-5 w-5" aria-hidden />
                Add Item
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick stats */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 px-4 py-4 sm:px-6 md:px-8">
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5a189a]/15 to-[#9d4edd]/10 text-[#5a189a]">
              <Package className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Total items</p>
              <p className="text-lg font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff9e00]/20 to-[#ff8500]/10 text-[#c2410c]">
              <span className="text-lg font-semibold">!</span>
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Unclaimed</p>
              <p className="text-lg font-bold text-slate-900">{stats.found}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-700">
              <CheckCircle className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Claimed</p>
              <p className="text-lg font-bold text-slate-900">{stats.claimed}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 text-slate-600">
              <Trash2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Disposed</p>
              <p className="text-lg font-bold text-slate-900">{stats.disposed}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        {/* Status filter */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-slate-500">Filter by status</p>
          <div className="flex flex-wrap gap-2">
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
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 ${style.bg} ${style.border} ${style.text} ${
                    isActive
                      ? "ring-2 ring-[#5a189a] ring-offset-2 shadow-[0_4px_14px_rgba(90,24,154,0.15)]"
                      : "hover:border-opacity-80"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by item, location or claimant..."
            className="max-w-sm"
          />
          {searchQuery && (
            <p className="mt-1.5 text-xs text-slate-500">
              Showing {filteredItems.length} of {items.length} on this page
            </p>
          )}
        </div>

        {/* Content */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          {isLoading ? (
            <div className="p-8">
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : isFilteredEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-sm font-medium text-slate-600">No items match your search</p>
              <Button variant="outline" onClick={() => setSearchQuery("")} className="border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/5">
                Clear search
              </Button>
            </div>
          ) : isEmpty && statusFilter ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                No {STATUS_TABS.find((t) => t.value === statusFilter)?.label ?? "filtered"} items
              </p>
              <Button
                variant="outline"
                onClick={() => { setStatusFilter(""); setPage(1); }}
                className="border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/5"
              >
                View all
              </Button>
            </div>
          ) : isEmpty ? (
            <div className="p-8">
              <EmptyState
                icon={Package}
                title="No lost and found items"
                description="Add your first item to get started."
                action={{ label: "Add Item", onClick: openCreate }}
                actionClassName="bg-gradient-to-r from-[#ff6d00] to-[#ff9100] text-white hover:opacity-95 focus-visible:ring-[#ff8500]/50"
              />
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden max-h-[calc(100vh-22rem)] overflow-auto lg:block">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] backdrop-blur-sm">
                    <tr className="border-b border-slate-200">
                      <th className="bg-slate-50/95 px-4 py-3.5 text-left text-xs font-medium text-slate-500">Item</th>
                      <th className="bg-slate-50/95 px-4 py-3.5 text-left text-xs font-medium text-slate-500">Room</th>
                      <th className="bg-slate-50/95 px-4 py-3.5 text-left text-xs font-medium text-slate-500">Location</th>
                      <th className="bg-slate-50/95 px-4 py-3.5 text-left text-xs font-medium text-slate-500">Found</th>
                      <th className="bg-slate-50/95 px-4 py-3.5 text-left text-xs font-medium text-slate-500">Found By</th>
                      <th className="bg-slate-50/95 px-4 py-3.5 text-left text-xs font-medium text-slate-500">Status</th>
                      <th className="bg-slate-50/95 px-4 py-3.5 text-left text-xs font-medium text-slate-500">Claimed By</th>
                      <th className="bg-slate-50/95 px-4 py-3.5 text-right text-xs font-medium text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((row: any) => (
                      <tr key={row._id} className="transition-colors hover:bg-[#5a189a]/5">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-800">
                          {row.itemDescription ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {row.roomId?.roomNumber ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {row.foundLocation ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {formatDate(row.foundDate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {row.foundBy?.firstName && row.foundBy?.lastName
                            ? `${row.foundBy.firstName} ${row.foundBy.lastName}`
                            : row.foundBy?.email ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{renderStatusBadge(row.status)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {row.claimedBy ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Dropdown
                            align="right"
                            trigger={
                              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                <MoreHorizontal className="h-4 w-4" aria-hidden />
                                Actions
                              </span>
                            }
                            items={[
                              ...(row.status === LOST_FOUND_STATUS.FOUND
                                ? [
                                    {
                                      id: "claim",
                                      label: "Mark as claimed",
                                      onClick: () => {
                                        setShowClaim(row);
                                        setClaimForm({ claimedBy: "" });
                                      },
                                    },
                                  ]
                                : []),
                              { id: "edit", label: "Edit", onClick: () => openEdit(row) },
                              {
                                id: "delete",
                                label: "Delete",
                                onClick: () => setShowDelete(row._id),
                                className: "text-red-600",
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-4 p-4 lg:hidden">
                {filteredItems.map((row: any) => (
                  <div
                    key={row._id}
                    className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/80 transition-all hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{row.itemDescription ?? "—"}</p>
                          <p className="text-sm text-slate-500">
                            {row.foundLocation ?? "—"} · {formatDate(row.foundDate)}
                          </p>
                        </div>
                        {renderStatusBadge(row.status)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>Room {row.roomId?.roomNumber ?? "—"}</span>
                        <span>{row.foundBy?.firstName ? `${row.foundBy.firstName} ${row.foundBy.lastName}` : row.foundBy?.email ?? "—"}</span>
                        {row.claimedBy && <span>Claimed by {row.claimedBy}</span>}
                      </div>
                      <div className="flex justify-end border-t border-slate-100 pt-3">
                        <Dropdown
                          align="right"
                          trigger={
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                              Actions
                            </span>
                          }
                          items={[
                            ...(row.status === LOST_FOUND_STATUS.FOUND
                              ? [
                                  {
                                    id: "claim",
                                    label: "Mark as claimed",
                                    onClick: () => {
                                      setShowClaim(row);
                                      setClaimForm({ claimedBy: "" });
                                    },
                                  },
                                ]
                              : []),
                            { id: "edit", label: "Edit", onClick: () => openEdit(row) },
                            { id: "delete", label: "Delete", onClick: () => setShowDelete(row._id), className: "text-red-600" },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                ))}
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

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title=""
        size="lg"
      >
        <div className="relative overflow-hidden rounded-t-xl border-b border-slate-100 bg-gradient-to-r from-[#5a189a] to-[#7b2cbf] px-6 py-5">
          <div className="absolute right-4 top-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full text-white/90 hover:bg-white/20 hover:text-white"
              onClick={() => { setShowModal(false); resetForm(); }}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 pr-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
              <Package className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {editItem ? "Edit Item" : "Add Lost & Found Item"}
              </h2>
              <p className="text-sm text-white/80">Item details and location</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <Input
            label="Item Description"
            value={form.itemDescription}
            onChange={(e) => setForm((f) => ({ ...f, itemDescription: e.target.value }))}
            required
            placeholder="e.g. Black wallet, gold chain"
          />
          <AppReactSelect
            label="Room (optional)"
            options={roomOptions}
            value={form.roomId}
            onChange={(value) => setForm((f) => ({ ...f, roomId: value ?? "" }))}
            placeholder="Select room..."
            isClearable
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Found Date & Time</label>
            <div className="min-w-0 overflow-visible">
              <ReactDatePicker
                selected={form.foundDate ? new Date(form.foundDate) : null}
                onChange={(d) => setForm((f) => ({ ...f, foundDate: d ? d.toISOString() : "" }))}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMM d, yyyy h:mm aa"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#5a189a] focus:outline-none focus:ring-1 focus:ring-[#5a189a]"
                withPortal
                popperClassName="react-datepicker-popper-z"
                required
              />
            </div>
          </div>
          <Input
            label="Found Location"
            value={form.foundLocation}
            onChange={(e) => setForm((f) => ({ ...f, foundLocation: e.target.value }))}
            placeholder="e.g. Lobby, Room 101"
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
            rows={3}
          />
          <ImageUpload
            label="Photos"
            value={form.images}
            onChange={(images) => setForm((f) => ({ ...f, images }))}
            folder="lost-and-found"
            maxFiles={5}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="bg-gradient-to-r from-[#ff6d00] to-[#ff9100] text-white hover:opacity-95 focus-visible:ring-[#ff8500]/50"
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Claim Modal */}
      <Modal
        open={!!showClaim}
        onClose={() => { setShowClaim(null); setClaimForm({ claimedBy: "" }); }}
        title=""
      >
        <div className="relative overflow-hidden rounded-t-xl border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
          <div className="absolute right-4 top-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full text-white/90 hover:bg-white/20 hover:text-white"
              onClick={() => { setShowClaim(null); setClaimForm({ claimedBy: "" }); }}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 pr-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
              <CheckCircle className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Claim Item</h2>
              <p className="text-sm text-white/90">Record who claimed this item</p>
            </div>
          </div>
        </div>
        {showClaim && (
          <form onSubmit={handleClaim} className="space-y-4 p-6">
            <p className="text-slate-600">
              Mark <strong>{showClaim.itemDescription}</strong> as claimed.
            </p>
            <Input
              label="Claimed By (name)"
              value={claimForm.claimedBy}
              onChange={(e) => setClaimForm((f) => ({ ...f, claimedBy: e.target.value }))}
              required
              placeholder="Full name of claimant"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowClaim(null); setClaimForm({ claimedBy: "" }); }}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={updateMut.isPending}
                disabled={!claimForm.claimedBy.trim()}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Mark Claimed
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Item">
        <div className="p-6">
          <p className="text-slate-600">
            Are you sure you want to delete this lost and found item? This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleteMut.isPending}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
