"use client";

import { useState } from "react";
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "@/hooks/api";
import {
  Button,
  Card,
  CardContent,
  Modal,
  Input,
  Badge,
  Textarea,
  AppReactSelect,
} from "@/components/ui";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiMail,
  FiPhone,
  FiUser,
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { SUPPLIER_STATUS } from "@/constants";
import { useSearchParams } from "next/navigation";

const STATUS_OPTIONS = Object.entries(SUPPLIER_STATUS).map(([k, v]) => ({
  value: v,
  label: k
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "),
}));

const statusVariant = (
  status: string
): "success" | "warning" | "danger" | "default" => {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  if (status === "blacklisted") return "danger";
  return "default";
};

export default function SuppliersPage() {
  const searchParams = useSearchParams();
  const department = searchParams.get("department") ?? "inventoryProcurement";
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

  const params: Record<string, string> = { page: String(page), limit: "12" };
  if (statusFilter) params.status = statusFilter;
  if (department) params.department = department;

  const { data, isLoading } = useSuppliers(params);
  const createMut = useCreateSupplier();
  const updateMut = useUpdateSupplier();
  const deleteMut = useDeleteSupplier();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

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
        await updateMut.mutateAsync({
          id: editItem._id,
          department,
          ...payload,
        });
        toast.success("Supplier updated");
      } else {
        await createMut.mutateAsync({ department, ...payload });
        toast.success("Supplier created");
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
      await deleteMut.mutateAsync({ id: showDelete, department });
      toast.success("Supplier deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const pageTitle =
    department === "restaurant" ? "Restaurant Suppliers" : "Suppliers";
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit) || 1
    : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero strip with gradient */}
      <div
        className="h-1 w-full shrink-0 rounded-b-sm"
        style={{
          background:
            "linear-gradient(90deg, #ff6d00 0%, #ff9100 50%, #7b2cbf 100%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#1f2937] sm:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm font-normal text-[#6b7280] sm:text-base">
            Manage your supplier contacts and procurement partners in one place.
          </p>
        </header>

        {/* Toolbar: filter + CTA */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 sm:max-w-[220px]">
            <AppReactSelect
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS]}
              placeholder="Filter by status"
              isClearable
            />
          </div>
          <Button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-[#ff7900] hover:to-[#ff9100] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8500] focus-visible:ring-offset-2"
          >
            <FiPlus className="h-4 w-4" aria-hidden />
            Add supplier
          </Button>
        </div>

        {/* Content: card grid or empty state */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card
                key={i}
                className="overflow-hidden rounded-2xl border-[#e5e7eb] bg-white shadow-sm"
              >
                <div className="h-28 animate-pulse bg-[#f3f4f6]" />
                <CardContent className="p-5">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-[#f3f4f6]" />
                  <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-[#f3f4f6]" />
                  <div className="mt-2 h-4 w-full animate-pulse rounded bg-[#f3f4f6]" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isEmpty ? (
          <Card className="overflow-hidden rounded-2xl border border-dashed border-[#e5e7eb] bg-[#fafafa] shadow-sm">
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="rounded-full bg-linear-to-br from-[#7b2cbf]/10 to-[#ff9100]/10 p-5">
                <FiInbox className="h-10 w-10 text-[#5a189a]" aria-hidden />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#1f2937]">
                No suppliers yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[#6b7280]">
                Add your first supplier to start tracking contacts and orders.
              </p>
              <Button
                onClick={openCreate}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-[#ff7900] hover:to-[#ff9100] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8500] focus-visible:ring-offset-2"
              >
                <FiPlus className="h-4 w-4" aria-hidden />
                Add supplier
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((row: any) => {
                const imgs = Array.isArray(row.images) ? row.images : [];
                const firstImg = imgs[0] as { url: string; caption?: string } | undefined;
                return (
                  <Card
                    key={row._id}
                    className="overflow-hidden rounded-2xl border-[#e5e7eb] bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative h-32 shrink-0 bg-linear-to-br from-[#f3f4f6] to-[#e5e7eb]">
                      {firstImg?.url ? (
                        <img
                          src={firstImg.url}
                          alt={firstImg.caption || row.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <FiPackage className="h-12 w-12 text-[#9ca3af]" aria-hidden />
                        </div>
                      )}
                      <div className="absolute right-3 top-3">
                        <Badge variant={statusVariant(row.status)}>
                          {STATUS_OPTIONS.find((o) => o.value === row.status)
                            ?.label ?? row.status}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="truncate text-base font-semibold text-[#1f2937]">
                        {row.name}
                      </h3>
                      {row.contactPerson && (
                        <p className="mt-1 flex items-center gap-2 text-sm text-[#6b7280]">
                          <FiUser className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                          <span className="truncate">{row.contactPerson}</span>
                        </p>
                      )}
                      {row.email && (
                        <p className="mt-1 flex items-center gap-2 text-sm text-[#6b7280]">
                          <FiMail className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                          <span className="truncate">{row.email}</span>
                        </p>
                      )}
                      {row.phone && (
                        <p className="mt-1 flex items-center gap-2 text-sm text-[#6b7280]">
                          <FiPhone className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                          <span className="truncate">{row.phone}</span>
                        </p>
                      )}
                      {!row.contactPerson && !row.email && !row.phone && (
                        <p className="mt-1 text-sm italic text-[#9ca3af]">
                          No contact details
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#f3f4f6] pt-4">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#5a189a] transition-colors hover:bg-[#5a189a]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5a189a] focus-visible:ring-offset-2"
                          aria-label="Edit supplier"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDelete(row._id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#dc2626] transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                          aria-label="Delete supplier"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.total > pagination.limit && (
              <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[#e5e7eb] pt-6 sm:flex-row">
                <p className="text-sm text-[#6b7280]">
                  Showing{" "}
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!hasPrev || isLoading}
                    className="inline-flex items-center gap-1 rounded-xl border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
                    aria-label="Previous page"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="px-3 text-sm font-medium text-[#6b7280]">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext || isLoading}
                    className="inline-flex items-center gap-1 rounded-xl border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
                    aria-label="Next page"
                  >
                    Next
                    <FiChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit supplier" : "Add supplier"}
        size="lg"
        className="rounded-2xl border-[#e5e7eb] bg-white shadow-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. FreshFarm Produce Ltd"
            className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
          />
          <Input
            label="Contact person"
            value={form.contactPerson}
            onChange={(e) =>
              setForm((f) => ({ ...f, contactPerson: e.target.value }))
            }
            placeholder="e.g. Ama Boateng"
            className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="e.g. procurement@freshfarm.test"
            className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. +233240000101"
            className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
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
            className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
          />
          <ImageUpload
            label="Supplier images"
            value={form.images}
            onChange={(images) => setForm((f) => ({ ...f, images }))}
            folder={`suppliers/${department}`}
            maxFiles={10}
            showCaptions
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="rounded-xl border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 font-semibold text-white shadow-md hover:from-[#ff7900] hover:to-[#ff9100] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8500] focus-visible:ring-offset-2"
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation Modal */}
      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete supplier"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Are you sure you want to delete this supplier? This action cannot be
          undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDelete(null)}
            className="rounded-xl border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]"
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
