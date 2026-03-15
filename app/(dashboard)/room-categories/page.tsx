"use client";

import { useState } from "react";
import {
  useRoomCategories,
  useCreateRoomCategory,
  useUpdateRoomCategory,
  useDeleteRoomCategory,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Badge,
  Textarea,
  Card,
  CardContent,
  EmptyState,
  AppReactSelect,
} from "@/components/ui";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import {
  Plus,
  Pencil,
  Trash2,
  BedDouble,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import toast from "react-hot-toast";
import { BED_TYPE } from "@/constants";

const BED_TYPE_OPTIONS = Object.entries(BED_TYPE).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}));

const ORANGE_GRADIENT = "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)";
const PURPLE_GRADIENT = "linear-gradient(135deg, #5a189a 0%, #9d4edd 100%)";
const CARD_SHADOW = "0 4px 20px rgba(0,0,0,0.06)";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function RoomCategoriesPage() {
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    maxOccupancy: "",
    bedType: "",
    roomSize: "",
    amenities: "",
    isActive: true,
    images: [] as UploadedImage[],
  });

  const { data, isLoading } = useRoomCategories({
    page: String(page),
    limit: "20",
  });
  const createMut = useCreateRoomCategory();
  const updateMut = useUpdateRoomCategory();
  const deleteMut = useDeleteRoomCategory();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 0;

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      basePrice: "",
      maxOccupancy: "",
      bedType: "",
      roomSize: "",
      amenities: "",
      isActive: true,
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
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      basePrice: String(item.basePrice ?? ""),
      maxOccupancy: String(item.maxOccupancy ?? ""),
      bedType: item.bedType ?? "",
      roomSize: item.roomSize ? String(item.roomSize) : "",
      amenities: Array.isArray(item.amenities)
        ? item.amenities.join(", ")
        : "",
      isActive: item.isActive !== false,
      images: Array.isArray(item.images)
        ? item.images.map((img: any) => ({
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
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      basePrice: parseFloat(form.basePrice) || 0,
      maxOccupancy: parseInt(form.maxOccupancy, 10) || 1,
      bedType: form.bedType || undefined,
      roomSize: form.roomSize ? parseFloat(form.roomSize) : undefined,
      amenities: form.amenities
        ? form.amenities.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      images: form.images.map((img) => ({
        url: img.url,
        caption: img.caption || undefined,
      })),
      ...(editItem && { isActive: form.isActive }),
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Room category updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Room category created");
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
      toast.success("Room category deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const bedLabel = (value: string) =>
    BED_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="min-h-full bg-white">
      {/* Hero / Header */}
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
        style={{
          background: "linear-gradient(135deg, #fff8f5 0%, #f5f0ff 50%, #ffffff 100%)",
          boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
        }}
      >
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute -top-12 -right-12 h-48 w-48 rounded-full blur-3xl"
            style={{ background: "#ff9e00" }}
          />
          <div
            className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full blur-3xl"
            style={{ background: "#9d4edd" }}
          />
        </div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold text-[#1a1a2e] text-2xl tracking-tight sm:text-3xl">
              Room Categories
            </h1>
            <p className="mt-1 max-w-lg text-sm font-normal text-[#64748b] sm:text-base">
              Define room types, pricing, and amenities to power your property&apos;s inventory.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-95 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#ff8500] focus:ring-offset-2"
            style={{ background: ORANGE_GRADIENT }}
          >
            <Plus className="h-5 w-5" aria-hidden />
            Add Category
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 sm:mt-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card
                key={i}
                className="overflow-hidden"
                style={{ boxShadow: CARD_SHADOW }}
              >
                <div className="aspect-4/3 bg-[#f1f5f9]" />
                <CardContent className="p-4 sm:p-5">
                  <div className="h-5 w-32 animate-pulse rounded bg-[#e2e8f0]" />
                  <div className="mt-3 h-4 w-24 animate-pulse rounded bg-[#e2e8f0]" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-8 w-16 animate-pulse rounded-lg bg-[#e2e8f0]" />
                    <div className="h-8 w-16 animate-pulse rounded-lg bg-[#e2e8f0]" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No room categories yet"
            description="Create your first room category to start managing room types, rates, and availability."
            action={{ label: "Add Category", onClick: openCreate }}
            actionClassName="bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white hover:opacity-95 focus:ring-[#ff8500]"
            className="rounded-2xl border-[#e2e8f0] bg-[#f8fafc] py-16"
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((row: any) => {
                const img = row.images?.[0];
                return (
                  <Card
                    key={row._id}
                    className="overflow-hidden transition-all hover:shadow-lg"
                    style={{
                      boxShadow: CARD_SHADOW,
                      borderColor: "rgba(0,0,0,0.06)",
                    }}
                  >
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-[#f1f5f9]">
                      {img ? (
                        <img
                          src={img.url}
                          alt={row.name}
                          className="h-full w-full object-cover transition-transform hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#94a3b8]">
                          <LayoutGrid className="h-12 w-12" aria-hidden />
                        </div>
                      )}
                      <div className="absolute right-3 top-3">
                        <Badge
                          variant={row.isActive !== false ? "success" : "outline"}
                          className="border-white/80 bg-white/90 text-xs font-medium backdrop-blur-sm"
                        >
                          {row.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 sm:p-5">
                      <h3 className="font-semibold text-[#1a1a2e] text-lg">
                        {row.name}
                      </h3>
                      {row.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-[#64748b]">
                          {row.description}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-3 text-sm">
                        <span className="flex items-center gap-1.5 text-[#475569]">
                          <DollarSign className="h-4 w-4 text-[#ff8500]" aria-hidden />
                          <span className="font-medium text-[#1a1a2e]">
                            {row.basePrice != null
                              ? formatPrice(row.basePrice)
                              : "—"}
                          </span>
                          <span className="text-[#94a3b8]">/ night</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-[#475569]">
                          <Users className="h-4 w-4 text-[#5a189a]" aria-hidden />
                          <span className="font-medium text-[#1a1a2e]">
                            {row.maxOccupancy ?? "—"}
                          </span>
                          <span className="text-[#94a3b8]">guests</span>
                        </span>
                        {row.bedType ? (
                          <span className="flex items-center gap-1.5 text-[#475569]">
                            <BedDouble className="h-4 w-4 text-[#5a189a]" aria-hidden />
                            <span className="text-[#1a1a2e]">
                              {bedLabel(row.bedType)}
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f1f5f9] pt-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#475569] transition-colors hover:border-[#5a189a] hover:bg-[#f5f0ff] hover:text-[#5a189a] focus:outline-none focus:ring-2 focus:ring-[#5a189a] focus:ring-offset-2"
                            aria-label="Edit category"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDelete(row._id)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#64748b] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label="Delete category"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[#5a189a] focus:ring-offset-2"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="px-4 text-sm font-medium text-[#64748b]">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[#5a189a] focus:ring-offset-2"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Room Category" : "Add Room Category"}
        size="lg"
        className="border-0 shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. Deluxe King"
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Brief description"
            rows={3}
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Base Price"
              type="number"
              min="0"
              step="0.01"
              value={form.basePrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, basePrice: e.target.value }))
              }
              required
              placeholder="0.00"
              className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
            />
            <Input
              label="Max Occupancy"
              type="number"
              min="1"
              value={form.maxOccupancy}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxOccupancy: e.target.value }))
              }
              required
              placeholder="2"
              className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AppReactSelect
              label="Bed Type"
              options={[{ value: "", label: "Select..." }, ...BED_TYPE_OPTIONS]}
              value={form.bedType}
              onChange={(v) => setForm((f) => ({ ...f, bedType: v }))}
              placeholder="Optional"
            />
            <Input
              label="Room Size (sq ft)"
              type="number"
              min="0"
              value={form.roomSize}
              onChange={(e) =>
                setForm((f) => ({ ...f, roomSize: e.target.value }))
              }
              placeholder="Optional"
              className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
            />
          </div>
          <Input
            label="Amenities (comma-separated)"
            value={form.amenities}
            onChange={(e) =>
              setForm((f) => ({ ...f, amenities: e.target.value }))
            }
            placeholder="e.g. WiFi, TV, Mini-bar"
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <ImageUpload
            label="Images"
            value={form.images}
            onChange={(images) => setForm((f) => ({ ...f, images }))}
            folder="room-categories"
            maxFiles={8}
            showCaptions
          />
          {editItem && (
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="h-4 w-4 rounded border-[#cbd5e1] text-[#5a189a] focus:ring-[#5a189a]"
              />
              <span className="text-sm font-medium text-[#475569]">Active</span>
            </label>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-[#f1f5f9] pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="rounded-xl border-[#e2e8f0] hover:bg-[#f8fafc]"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#ff8500] focus:ring-offset-2"
              style={{ background: ORANGE_GRADIENT }}
            >
              {createMut.isPending || updateMut.isPending ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : null}
              {editItem ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation Modal */}
      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Room Category"
      >
        <p className="text-[#64748b] text-sm leading-relaxed">
          Are you sure you want to delete this room category? This action cannot
          be undone.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setShowDelete(null)}
            className="rounded-xl border-[#e2e8f0]"
          >
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
