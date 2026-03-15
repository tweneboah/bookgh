"use client";

import { useState } from "react";
import {
  useBarSuppliers,
  useCreateBarSupplier,
  useUpdateBarSupplier,
  useDeleteBarSupplier,
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
  Truck,
  Mail,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
  Building2,
  ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { SUPPLIER_STATUS } from "@/constants";

const STATUS_OPTIONS = Object.entries(SUPPLIER_STATUS).map(([k, v]) => ({
  value: v,
  label: k
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "),
}));

const ORANGE_GRADIENT = "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)";
const CARD_SHADOW = "0 4px 20px rgba(0,0,0,0.06)";

export default function BarSuppliersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    status: SUPPLIER_STATUS.ACTIVE as string,
    notes: "",
    images: [] as UploadedImage[],
  });

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useBarSuppliers(params);
  const createMut = useCreateBarSupplier();
  const updateMut = useUpdateBarSupplier();
  const deleteMut = useDeleteBarSupplier();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 0;

  const resetForm = () => {
    setForm({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      status: SUPPLIER_STATUS.ACTIVE,
      notes: "",
      images: [],
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (row: any) => {
    setEditItem(row);
    const images = Array.isArray(row.images)
      ? (row.images as { url: string; caption?: string }[]).map((img) => ({
          url: img.url,
          caption: img.caption,
        }))
      : [];
    setForm({
      name: row.name ?? "",
      contactPerson: row.contactPerson ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      status: row.status ?? SUPPLIER_STATUS.ACTIVE,
      notes: row.notes ?? "",
      images,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
      images: form.images.length
        ? form.images.map((img) => ({
            url: img.url,
            caption: img.caption || undefined,
          }))
        : undefined,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("BAR supplier updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("BAR supplier created");
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
      toast.success("BAR supplier deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const statusLabel = (status: string) =>
    STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  const statusVariant = (status: string) =>
    status === "active" ? "success" : status === "inactive" ? "warning" : "danger";

  return (
    <div className="min-h-full bg-white">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
        style={{
          background:
            "linear-gradient(135deg, #fff8f5 0%, #f5f0ff 50%, #ffffff 100%)",
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
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: ORANGE_GRADIENT }}
            >
              <Truck className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="font-bold text-[#1a1a2e] text-2xl tracking-tight sm:text-3xl">
                BAR Suppliers
              </h1>
              <p className="mt-1 max-w-lg text-sm font-normal text-[#64748b] sm:text-base">
                Suppliers for beverage stock only. Data is not shared with other
                departments.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full min-w-[160px] sm:w-44">
              <AppReactSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS]}
                placeholder="Status"
              />
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-95 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#ff8500] focus:ring-offset-2"
              style={{ background: ORANGE_GRADIENT }}
            >
              <Plus className="h-5 w-5" aria-hidden />
              Add Supplier
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 sm:mt-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card
                key={i}
                className="overflow-hidden"
                style={{ boxShadow: CARD_SHADOW }}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-[#e2e8f0]" />
                    <div className="min-w-0 flex-1">
                      <div className="h-5 w-32 animate-pulse rounded bg-[#e2e8f0]" />
                      <div className="mt-2 h-4 w-40 animate-pulse rounded bg-[#e2e8f0]" />
                      <div className="mt-2 h-4 w-28 animate-pulse rounded bg-[#e2e8f0]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No BAR suppliers yet"
            description="Add suppliers you buy beverages from. They are used only for BAR purchase orders."
            action={{ label: "Add Supplier", onClick: openCreate }}
            actionClassName="bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white hover:opacity-95 focus:ring-[#ff8500]"
            className="rounded-2xl border-[#e2e8f0] bg-[#f8fafc] py-16"
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((row: any) => {
                const imgs = Array.isArray(row.images) ? row.images : [];
                const firstImg = imgs[0] as { url: string; caption?: string } | undefined;
                return (
                  <Card
                    key={row._id}
                    className="overflow-hidden transition-all hover:shadow-lg"
                    style={{
                      boxShadow: CARD_SHADOW,
                      borderColor: "rgba(0,0,0,0.06)",
                    }}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex gap-4">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f1f5f9]">
                          {firstImg ? (
                            <img
                              src={firstImg.url}
                              alt={firstImg.caption || row.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#94a3b8]">
                              <ImageIcon className="h-6 w-6" aria-hidden />
                            </div>
                          )}
                          {imgs.length > 1 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#5a189a] text-[10px] font-medium text-white">
                              +{imgs.length - 1}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-[#1a1a2e] text-lg truncate">
                              {row.name}
                            </h3>
                            <Badge
                              variant={statusVariant(row.status)}
                              className="shrink-0 text-xs font-medium"
                            >
                              {statusLabel(row.status)}
                            </Badge>
                          </div>
                          {row.contactPerson ? (
                            <p className="mt-1 flex items-center gap-2 text-sm text-[#475569]">
                              <User className="h-3.5 w-3.5 shrink-0 text-[#5a189a]" aria-hidden />
                              <span className="truncate">{row.contactPerson}</span>
                            </p>
                          ) : null}
                          {row.email ? (
                            <a
                              href={`mailto:${row.email}`}
                              className="mt-1 flex items-center gap-2 text-sm text-[#5a189a] hover:text-[#7b2cbf] hover:underline truncate"
                            >
                              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="truncate">{row.email}</span>
                            </a>
                          ) : null}
                          {row.phone ? (
                            <a
                              href={`tel:${row.phone.replace(/\s/g, "")}`}
                              className="mt-1 flex items-center gap-2 text-sm text-[#475569] hover:text-[#5a189a] truncate"
                            >
                              <Phone className="h-3.5 w-3.5 shrink-0 text-[#ff8500]" aria-hidden />
                              <span className="truncate">{row.phone}</span>
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#f1f5f9] pt-4">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#475569] transition-colors hover:border-[#5a189a] hover:bg-[#f5f0ff] hover:text-[#5a189a] focus:outline-none focus:ring-2 focus:ring-[#5a189a] focus:ring-offset-2"
                          aria-label="Edit supplier"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDelete(row._id)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#64748b] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          aria-label="Delete supplier"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

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
        title={editItem ? "Edit BAR Supplier" : "Add BAR Supplier"}
        size="lg"
        className="border-0 shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. Main Beverage Supplier"
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <Input
            label="Contact Person"
            value={form.contactPerson}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactPerson: e.target.value }))
            }
            placeholder="e.g. John Doe"
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="e.g. orders@supplier.test"
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. +233240000101"
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <AppReactSelect
            label="Status"
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={STATUS_OPTIONS}
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
            rows={3}
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <ImageUpload
            label="Supplier images"
            value={form.images}
            onChange={(images) => setForm((f) => ({ ...f, images }))}
            folder="suppliers/bar"
            maxFiles={10}
            showCaptions
          />
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

      {/* Delete Modal */}
      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete BAR Supplier"
      >
        <p className="text-sm text-[#64748b] leading-relaxed">
          Are you sure you want to delete this BAR supplier? This action cannot
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
