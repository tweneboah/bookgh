"use client";

import { useMemo, useState } from "react";
import {
  useStockTransfers,
  useCreateStockTransfer,
  useUpdateStockTransfer,
  useDeleteStockTransfer,
  useInventoryItems,
  useBranches,
} from "@/hooks/api";
import {
  Button,
  Card,
  CardContent,
  Modal,
  Input,
  Badge,
  AppReactSelect,
  AppDatePicker,
} from "@/components/ui";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiArrowRight,
  FiPackage,
  FiMapPin,
  FiCalendar,
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { DEPARTMENT, TRANSFER_STATUS } from "@/constants";
import { useSearchParams } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  [TRANSFER_STATUS.PENDING]: "Pending",
  [TRANSFER_STATUS.APPROVED]: "Approved",
  [TRANSFER_STATUS.IN_TRANSIT]: "In transit",
  [TRANSFER_STATUS.COMPLETED]: "Completed",
  [TRANSFER_STATUS.REJECTED]: "Rejected",
};

const STATUS_OPTIONS = Object.entries(TRANSFER_STATUS).map(([, v]) => ({
  value: v,
  label: STATUS_LABELS[v] ?? v,
}));

const statusVariant = (
  status: string
): "success" | "warning" | "danger" | "info" | "default" => {
  if (status === "completed") return "success";
  if (status === "rejected") return "danger";
  if (status === "inTransit") return "warning";
  if (status === "approved") return "info";
  return "default";
};

export default function TransfersPage() {
  const searchParams = useSearchParams();
  const department =
    searchParams.get("department") ?? DEPARTMENT.INVENTORY_PROCUREMENT;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    transferNumber: "",
    fromBranchId: "",
    toBranchId: "",
    transferDate: "",
    expectedArrival: "",
    status: TRANSFER_STATUS.PENDING as string,
    inventoryItemId: "",
    quantity: "1",
  });

  const params: Record<string, string> = { page: String(page), limit: "12" };
  if (statusFilter) params.status = statusFilter;
  if (department) params.department = department;

  const { data, isLoading } = useStockTransfers(params);
  const { data: itemsData } = useInventoryItems({
    limit: "500",
    department,
  });
  const { data: branchesData } = useBranches({ limit: "200" });
  const createMut = useCreateStockTransfer();
  const updateMut = useUpdateStockTransfer();
  const deleteMut = useDeleteStockTransfer();

  const records = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const inventoryItems = itemsData?.data ?? [];
  const branches = branchesData?.data ?? [];

  const itemOptions = useMemo(
    () =>
      inventoryItems.map((i: any) => ({
        value: i._id,
        label: `${i.name} (${i.unit})`,
        unit: i.unit,
      })),
    [inventoryItems]
  );
  const branchOptions = useMemo(
    () => branches.map((b: any) => ({ value: b._id, label: b.name ?? b._id })),
    [branches]
  );

  const resetForm = () => {
    setForm({
      transferNumber: "",
      fromBranchId: "",
      toBranchId: "",
      transferDate: "",
      expectedArrival: "",
      status: TRANSFER_STATUS.PENDING,
      inventoryItemId: "",
      quantity: "1",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    const today = new Date().toISOString().slice(0, 10);
    setForm((f) => ({
      ...f,
      transferNumber: `TRF-${Date.now().toString().slice(-6)}`,
      transferDate: today,
    }));
    setShowModal(true);
  };

  const openEdit = (row: any) => {
    setEditItem(row);
    const first = row.lines?.[0];
    setForm({
      transferNumber: row.transferNumber ?? "",
      fromBranchId: row.fromBranchId?._id ?? row.fromBranchId ?? "",
      toBranchId: row.toBranchId?._id ?? row.toBranchId ?? "",
      transferDate: row.transferDate
        ? new Date(row.transferDate).toISOString().slice(0, 10)
        : "",
      expectedArrival: row.expectedArrival
        ? new Date(row.expectedArrival).toISOString().slice(0, 10)
        : "",
      status: row.status ?? TRANSFER_STATUS.PENDING,
      inventoryItemId:
        first?.inventoryItemId?._id ?? first?.inventoryItemId ?? "",
      quantity: String(first?.quantity ?? 1),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(form.quantity);
    if (
      !form.transferNumber ||
      !form.fromBranchId ||
      !form.toBranchId ||
      !form.transferDate ||
      !form.inventoryItemId
    ) {
      toast.error("Transfer number, branches, date, and item are required");
      return;
    }
    if (form.fromBranchId === form.toBranchId) {
      toast.error("Source and destination branch must differ");
      return;
    }
    const selectedItem = itemOptions.find(
      (i: any) => i.value === form.inventoryItemId
    );
    const itemName = selectedItem?.label?.split(" (")[0] ?? "Inventory Item";
    const unit = selectedItem?.unit ?? "unit";
    const payload = {
      transferNumber: form.transferNumber,
      fromBranchId: form.fromBranchId,
      toBranchId: form.toBranchId,
      transferDate: `${form.transferDate}T00:00:00.000Z`,
      expectedArrival: form.expectedArrival
        ? `${form.expectedArrival}T00:00:00.000Z`
        : undefined,
      status: form.status,
      lines: [
        {
          inventoryItemId: form.inventoryItemId,
          itemName,
          quantity: qty > 0 ? qty : 1,
          unit,
        },
      ],
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({
          id: editItem._id,
          department,
          ...payload,
        });
        toast.success("Transfer updated");
      } else {
        await createMut.mutateAsync({ department, ...payload });
        toast.success("Transfer created");
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
      toast.success("Transfer deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const pageTitle =
    department === DEPARTMENT.RESTAURANT
      ? "Restaurant inter-branch transfers"
      : "Inter-branch transfers";
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit) || 1
    : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;
  const isEmpty = !isLoading && records.length === 0;

  return (
    <div className="min-h-screen bg-white font-sans">
      <div
        className="h-1 w-full shrink-0 rounded-b-sm"
        style={{
          background:
            "linear-gradient(90deg, #ff6d00 0%, #ff9100 50%, #7b2cbf 100%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#1f2937] sm:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm font-normal text-[#6b7280] sm:text-base">
            Move stock between branches. Track transfer requests and deliveries
            in one place.
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 sm:max-w-[220px]">
            <AppReactSelect
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "All statuses" },
                ...STATUS_OPTIONS,
              ]}
              placeholder="Filter by status"
              isClearable
            />
          </div>
          <Button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-[#ff7900] hover:to-[#ff9100] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8500] focus-visible:ring-offset-2"
          >
            <FiPlus className="h-4 w-4" aria-hidden />
            Add transfer
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={i}
                className="overflow-hidden rounded-2xl border-[#e5e7eb] bg-white shadow-sm"
              >
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-28 animate-pulse rounded bg-[#f3f4f6]" />
                    <div className="flex gap-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-[#f3f4f6]" />
                      <div className="h-4 w-24 animate-pulse rounded bg-[#f3f4f6]" />
                    </div>
                  </div>
                  <div className="h-8 w-20 animate-pulse rounded-lg bg-[#f3f4f6]" />
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
                No transfers yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[#6b7280]">
                Create your first transfer to move stock between branches.
              </p>
              <Button
                onClick={openCreate}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-[#ff7900] hover:to-[#ff9100] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8500] focus-visible:ring-offset-2"
              >
                <FiPlus className="h-4 w-4" aria-hidden />
                Add transfer
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <ul className="space-y-4" role="list">
              {records.map((row: any) => {
                const firstLine = row.lines?.[0];
                const itemLabel = firstLine?.itemName
                  ? `${firstLine.itemName}${firstLine.quantity ? ` × ${firstLine.quantity}` : ""}`
                  : null;
                return (
                  <li key={row._id}>
                    <Card className="overflow-hidden rounded-2xl border-[#e5e7eb] bg-white shadow-sm transition-shadow hover:shadow-md">
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-base font-semibold text-[#1f2937]">
                                <FiPackage className="h-4 w-4 shrink-0 text-[#5a189a]" />
                                {row.transferNumber}
                              </span>
                              <Badge variant={statusVariant(row.status)}>
                                {STATUS_LABELS[row.status] ?? row.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-[#6b7280]">
                              <span className="inline-flex items-center gap-1.5">
                                <FiMapPin className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                                {row.fromBranchId?.name ?? row.fromBranchId ?? "—"}
                              </span>
                              <FiArrowRight className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                              <span className="inline-flex items-center gap-1.5">
                                <FiMapPin className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                                {row.toBranchId?.name ?? row.toBranchId ?? "—"}
                              </span>
                            </div>
                            {itemLabel && (
                              <p className="text-sm text-[#6b7280]">
                                {itemLabel}
                              </p>
                            )}
                            {row.transferDate && (
                              <p className="flex items-center gap-2 text-sm text-[#6b7280]">
                                <FiCalendar className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                                {new Date(row.transferDate).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#5a189a] transition-colors hover:bg-[#5a189a]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5a189a] focus-visible:ring-offset-2"
                                aria-label="Edit transfer"
                              >
                                <FiEdit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDelete(row._id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#dc2626] transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                aria-label="Delete transfer"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>

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

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit transfer" : "Add transfer"}
        size="lg"
        className="rounded-2xl border-[#e5e7eb] bg-white shadow-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Transfer number"
            value={form.transferNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, transferNumber: e.target.value }))
            }
            required
            className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
          />
          <AppReactSelect
            label="From branch"
            value={form.fromBranchId}
            onChange={(v) => setForm((f) => ({ ...f, fromBranchId: v }))}
            options={[
              { value: "", label: "Select branch…" },
              ...branchOptions,
            ]}
          />
          <AppReactSelect
            label="To branch"
            value={form.toBranchId}
            onChange={(v) => setForm((f) => ({ ...f, toBranchId: v }))}
            options={[
              { value: "", label: "Select branch…" },
              ...branchOptions,
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AppDatePicker
              label="Transfer date"
              selected={
                form.transferDate ? new Date(form.transferDate) : null
              }
              onChange={(d) =>
                setForm((f) => ({
                  ...f,
                  transferDate: d ? d.toISOString().slice(0, 10) : "",
                }))
              }
            />
            <AppDatePicker
              label="Expected arrival"
              selected={
                form.expectedArrival
                  ? new Date(form.expectedArrival)
                  : null
              }
              onChange={(d) =>
                setForm((f) => ({
                  ...f,
                  expectedArrival: d ? d.toISOString().slice(0, 10) : "",
                }))
              }
            />
          </div>
          <AppReactSelect
            label="Inventory item"
            value={form.inventoryItemId}
            onChange={(v) => setForm((f) => ({ ...f, inventoryItemId: v }))}
            options={[
              { value: "", label: "Select item…" },
              ...itemOptions,
            ]}
          />
          <Input
            label="Quantity"
            type="number"
            min="0.01"
            step="0.01"
            value={form.quantity}
            onChange={(e) =>
              setForm((f) => ({ ...f, quantity: e.target.value }))
            }
            className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
          />
          <AppReactSelect
            label="Status"
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={STATUS_OPTIONS}
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

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete transfer"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Are you sure you want to delete this transfer? This action cannot be
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
