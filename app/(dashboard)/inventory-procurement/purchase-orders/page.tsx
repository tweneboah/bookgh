"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
  useSuppliers,
  useInventoryItems,
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
  FiInfo,
  FiFileText,
  FiTruck,
  FiCalendar,
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { PROCUREMENT_ORDER_STATUS, DEPARTMENT } from "@/constants";
import { useSearchParams } from "next/navigation";

/** Unit options for purchase order line (dropdown). */
const PO_UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "litre", label: "litre" },
  { value: "ml", label: "ml" },
  { value: "L", label: "L" },
  { value: "pcs", label: "pcs" },
  { value: "unit", label: "unit" },
  { value: "bottle", label: "bottle" },
  { value: "can", label: "can" },
  { value: "box", label: "box" },
  { value: "pack", label: "pack" },
  { value: "bunch", label: "bunch" },
  { value: "bag", label: "bag" },
  { value: "jar", label: "jar" },
  { value: "tin", label: "tin" },
  { value: "carton", label: "carton" },
  { value: "dozen", label: "dozen" },
  { value: "slice", label: "slice" },
  { value: "portion", label: "portion" },
];

const PO_FIELD_INFOS: Record<string, string> = {
  quantity:
    "Total quantity you are buying, in the unit selected above (e.g. 50 kg, 10 bottles).",
  unitCost:
    "Cost per single unit (calculated from total amount ÷ quantity, or enter manually).",
};

function LabelWithInfo({
  id,
  label,
  infoKey,
  openKey,
  onToggle,
  containerRef,
}: {
  id: string;
  label: string;
  infoKey: string;
  openKey: string | null;
  onToggle: (key: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const info = PO_FIELD_INFOS[infoKey] ?? "";
  const isOpen = openKey === infoKey;

  return (
    <div
      ref={isOpen ? containerRef : undefined}
      className="relative flex items-center gap-1.5"
    >
      <label
        htmlFor={id}
        className="text-sm font-medium text-[#374151]"
      >
        {label}
      </label>
      {info && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggle(isOpen ? "" : infoKey);
            }}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5a189a] focus-visible:ring-offset-2"
            aria-label={`Info: ${label}`}
          >
            <FiInfo className="h-3 w-3" />
          </button>
          {isOpen && (
            <div className="absolute left-0 top-full z-9999 mt-1 max-w-xs rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280] shadow-lg">
              {info}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  [PROCUREMENT_ORDER_STATUS.DRAFT]: "Draft",
  [PROCUREMENT_ORDER_STATUS.PENDING_APPROVAL]: "Pending approval",
  [PROCUREMENT_ORDER_STATUS.APPROVED]: "Approved",
  [PROCUREMENT_ORDER_STATUS.ORDERED]: "Ordered",
  [PROCUREMENT_ORDER_STATUS.PARTIALLY_RECEIVED]: "Partially received",
  [PROCUREMENT_ORDER_STATUS.RECEIVED]: "Received",
  [PROCUREMENT_ORDER_STATUS.CANCELLED]: "Cancelled",
};

const STATUS_OPTIONS = Object.entries(PROCUREMENT_ORDER_STATUS).map(
  ([, v]) => ({
    value: v,
    label: STATUS_LABELS[v] ?? v,
  })
);

const DEPARTMENT_OPTIONS = [
  { value: DEPARTMENT.INVENTORY_PROCUREMENT, label: "Inventory & Procurement" },
  { value: DEPARTMENT.RESTAURANT, label: "Restaurant" },
  { value: DEPARTMENT.BAR, label: "Bar" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(
    n
  );

const statusVariant = (
  status: string
): "success" | "warning" | "danger" | "info" | "default" => {
  if (status === "received") return "success";
  if (status === "cancelled") return "danger";
  if (
    status === "pendingApproval" ||
    status === "partiallyReceived"
  )
    return "warning";
  if (status === "approved" || status === "ordered") return "info";
  return "default";
};

export default function PurchaseOrdersPage() {
  const searchParams = useSearchParams();
  const department =
    searchParams.get("department") ?? DEPARTMENT.INVENTORY_PROCUREMENT;
  const isRestaurantDepartment = department === DEPARTMENT.RESTAURANT;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [detailPo, setDetailPo] = useState<any>(null);
  const [openInfoKey, setOpenInfoKey] = useState<string | null>(null);
  const infoPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openInfoKey) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        infoPopoverRef.current &&
        !infoPopoverRef.current.contains(e.target as Node)
      ) {
        setOpenInfoKey(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openInfoKey]);

  const [form, setForm] = useState({
    poNumber: "",
    supplierId: "",
    orderDate: "",
    expectedDate: "",
    status: PROCUREMENT_ORDER_STATUS.DRAFT as string,
    receiveToDepartment: department,
    isNewItem: false,
    inventoryItemId: "",
    itemName: "",
    unit: "unit",
    quantity: "1",
    unitCost: "0",
    totalAmountEntered: "", // optional: "1000" → auto-fill unit cost from total ÷ quantity
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "12",
  };
  if (statusFilter) params.status = statusFilter;
  if (department) params.department = department;

  const { data, isLoading } = usePurchaseOrders(params);
  const { data: suppliersData } = useSuppliers({
    limit: "200",
    ...(department ? { department } : {}),
  });
  const { data: itemsData } = useInventoryItems({
    limit: "500",
    department,
  });
  const createMut = useCreatePurchaseOrder();
  const updateMut = useUpdatePurchaseOrder();
  const deleteMut = useDeletePurchaseOrder();

  const records = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const suppliers = suppliersData?.data ?? [];
  const inventoryItems = itemsData?.data ?? [];

  const supplierOptions = useMemo(
    () => suppliers.map((s: any) => ({ value: s._id, label: s.name ?? s._id })),
    [suppliers]
  );
  const itemOptions = useMemo(
    () =>
      inventoryItems.map((i: any) => ({
        value: i._id,
        label: `${i.name} (${i.unit})`,
        unit: i.unit,
      })),
    [inventoryItems]
  );

  const unitOptions = useMemo(() => {
    const base = [...PO_UNIT_OPTIONS];
    const current = form.unit?.trim();
    if (current && !base.some((o) => o.value === current))
      base.push({ value: current, label: current });
    return base;
  }, [form.unit]);

  const resetForm = () => {
    setForm({
      poNumber: "",
      supplierId: "",
      orderDate: "",
      expectedDate: "",
      status: PROCUREMENT_ORDER_STATUS.DRAFT,
      receiveToDepartment: department,
      isNewItem: false,
      inventoryItemId: "",
      itemName: "",
      unit: "unit",
      quantity: "1",
      unitCost: "0",
      totalAmountEntered: "",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    const today = new Date().toISOString().slice(0, 10);
    setForm((f) => ({
      ...f,
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      orderDate: today,
    }));
    setShowModal(true);
  };

  const openEdit = (row: any) => {
    setEditItem(row);
    const first = row.lines?.[0];
    setForm({
      poNumber: row.poNumber ?? "",
      supplierId: row.supplierId?._id ?? row.supplierId ?? "",
      orderDate: row.orderDate
        ? new Date(row.orderDate).toISOString().slice(0, 10)
        : "",
      expectedDate: row.expectedDate
        ? new Date(row.expectedDate).toISOString().slice(0, 10)
        : "",
      status: row.status ?? PROCUREMENT_ORDER_STATUS.DRAFT,
      receiveToDepartment: row.sourceDepartment ?? department,
      isNewItem: !(first?.inventoryItemId?._id ?? first?.inventoryItemId),
      inventoryItemId:
        first?.inventoryItemId?._id ?? first?.inventoryItemId ?? "",
      itemName: first?.itemName ?? "",
      unit: first?.unit ?? "unit",
      quantity: String(first?.quantity ?? 1),
      unitCost: String(first?.unitCost ?? 0),
      totalAmountEntered: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(form.quantity);
    const unitCost = Number(form.unitCost);
    if (!form.poNumber || !form.supplierId || !form.orderDate) {
      toast.error("PO number, supplier, and date are required");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      toast.error("Unit cost must be greater than zero");
      return;
    }
    if (!form.isNewItem && !form.inventoryItemId) {
      toast.error("Select an inventory item");
      return;
    }
    if (form.isNewItem && !form.unit?.trim()) {
      toast.error("Unit is required (use the same unit for this item everywhere)");
      return;
    }
    const selectedItem = itemOptions.find(
      (i: any) => i.value === form.inventoryItemId
    );
    const selectedInventory = form.inventoryItemId
      ? inventoryItems.find((i: any) => String(i._id) === String(form.inventoryItemId))
      : null;
    const itemName = form.isNewItem
      ? form.itemName.trim()
      : selectedItem?.label?.split(" (")[0] ?? form.itemName.trim();
    // For consistency: always use the inventory item's unit when an existing item is selected
    const unit = form.isNewItem
      ? form.unit.trim()
      : (selectedInventory?.unit ?? selectedItem?.unit ?? form.unit ?? "").trim();
    if (!itemName || !unit) {
      toast.error(
        form.isNewItem
          ? "Enter item name and unit for the new item"
          : "Selected inventory item is missing name/unit"
      );
      return;
    }
    const lineTotal = qty * unitCost;
    const payload = {
      poNumber: form.poNumber,
      supplierId: form.supplierId,
      orderDate: `${form.orderDate}T00:00:00.000Z`,
      expectedDate: form.expectedDate
        ? `${form.expectedDate}T00:00:00.000Z`
        : undefined,
      sourceDepartment: department,
      lines: [
        {
          inventoryItemId: form.isNewItem ? undefined : form.inventoryItemId,
          itemName,
          quantity: qty,
          unit,
          unitCost,
          totalCost: lineTotal,
        },
      ],
      subtotal: lineTotal,
      totalAmount: lineTotal,
      status: form.status,
      receiveToDepartment: isRestaurantDepartment
        ? DEPARTMENT.RESTAURANT
        : form.receiveToDepartment,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({
          id: editItem._id,
          department,
          ...payload,
        });
        toast.success("Purchase order updated");
      } else {
        await createMut.mutateAsync({ department, ...payload });
        toast.success("Purchase order created");
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
      toast.success("Purchase order deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const pageTitle =
    department === DEPARTMENT.RESTAURANT
      ? "Restaurant Purchase Orders"
      : "Purchase Orders";
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
            Create and track purchase orders from suppliers. Manage approvals and
            deliveries in one place.
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 sm:max-w-[240px]">
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
            Add purchase order
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
                    <div className="h-5 w-32 animate-pulse rounded bg-[#f3f4f6]" />
                    <div className="h-4 w-48 animate-pulse rounded bg-[#f3f4f6]" />
                  </div>
                  <div className="h-8 w-24 animate-pulse rounded-lg bg-[#f3f4f6]" />
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
                No purchase orders yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[#6b7280]">
                Create your first purchase order to start tracking supplier
                orders and deliveries.
              </p>
              <Button
                onClick={openCreate}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-[#ff7900] hover:to-[#ff9100] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8500] focus-visible:ring-offset-2"
              >
                <FiPlus className="h-4 w-4" aria-hidden />
                Add purchase order
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <ul className="space-y-4" role="list">
              {records.map((row: any) => (
                <li key={row._id}>
                  <Card className="overflow-hidden rounded-2xl border-[#e5e7eb] bg-white shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailPo(row)}
                              className="inline-flex items-center gap-1.5 text-base font-semibold text-[#1f2937] hover:text-[#5a189a] hover:underline underline-offset-2 text-left"
                            >
                              <FiFileText className="h-4 w-4 shrink-0 text-[#5a189a]" />
                              {row.poNumber}
                            </button>
                            <Badge variant={statusVariant(row.status)}>
                              {STATUS_LABELS[row.status] ?? row.status}
                            </Badge>
                          </div>
                          <p className="flex items-center gap-2 text-sm text-[#6b7280]">
                            <FiTruck className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                            <span className="truncate">
                              {row.supplierId?.name ?? row.supplierId ?? "—"}
                            </span>
                          </p>
                          {row.lines?.[0]?.itemName && (
                            <p className="text-sm font-medium text-[#374151]">
                              {row.lines[0].itemName}
                            </p>
                          )}
                          {row.orderDate && (
                            <p className="flex items-center gap-2 text-sm text-[#6b7280]">
                              <FiCalendar className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                              {new Date(row.orderDate).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </p>
                          )}
                          {(row.lines?.[0]?.unitCost != null || row.lines?.[0]?.unit) && (
                            <p className="text-sm text-[#6b7280]">
                              <span className="font-medium text-slate-600">Unit cost:</span>{" "}
                              {row.lines[0].unitCost != null ? fmt(Number(row.lines[0].unitCost)) : "—"}
                              {(row.lines[0].unit && row.lines[0].unit !== "unit") && ` per ${row.lines[0].unit}`}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 sm:gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Total amount paid
                          </p>
                          <p className="text-lg font-semibold text-[#1f2937]">
                            {fmt(Number(row.totalAmount ?? 0))}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailPo(row)}
                            className="rounded-lg border-[#e5e7eb] text-[#5a189a] hover:bg-[#5a189a]/5"
                          >
                            View details
                          </Button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#5a189a] transition-colors hover:bg-[#5a189a]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5a189a] focus-visible:ring-offset-2"
                              aria-label="Edit purchase order"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDelete(row._id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#dc2626] transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                              aria-label="Delete purchase order"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
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
        title={editItem ? "Edit purchase order" : "Add purchase order"}
        size="lg"
        className="rounded-2xl border-[#e5e7eb] bg-white shadow-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="PO Number"
            value={form.poNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, poNumber: e.target.value }))
            }
            required
            className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
          />
          <AppReactSelect
            label="Supplier"
            value={form.supplierId}
            onChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}
            options={[{ value: "", label: "Select supplier…" }, ...supplierOptions]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AppDatePicker
              label="Order date"
              selected={
                form.orderDate ? new Date(form.orderDate) : null
              }
              onChange={(d) =>
                setForm((f) => ({
                  ...f,
                  orderDate: d ? d.toISOString().slice(0, 10) : "",
                }))
              }
            />
            <AppDatePicker
              label="Expected date"
              selected={
                form.expectedDate ? new Date(form.expectedDate) : null
              }
              onChange={(d) =>
                setForm((f) => ({
                  ...f,
                  expectedDate: d ? d.toISOString().slice(0, 10) : "",
                }))
              }
            />
          </div>
          {!isRestaurantDepartment ? (
            <AppReactSelect
              label="Receive to department"
              value={form.receiveToDepartment}
              onChange={(v) =>
                setForm((f) => ({ ...f, receiveToDepartment: v }))
              }
              options={DEPARTMENT_OPTIONS}
            />
          ) : null}
          <AppReactSelect
            label="Inventory item"
            value={form.inventoryItemId}
            onChange={(v) => {
              const selectedItem = itemOptions.find((i: any) => i.value === v);
              const selectedInventory = inventoryItems.find(
                (i: any) => String(i._id) === String(v)
              );
              // Use same unit from inventory item for consistency
              const itemUnit = selectedInventory?.unit ?? selectedItem?.unit ?? "";
              setForm((f) => ({
                ...f,
                inventoryItemId: v,
                itemName: selectedItem?.label?.split(" (")[0] ?? f.itemName,
                unit: itemUnit || f.unit,
                unitCost:
                  selectedInventory?.unitCost != null
                    ? String(selectedInventory.unitCost)
                    : f.unitCost,
              }));
            }}
            options={[{ value: "", label: "Select item…" }, ...itemOptions]}
          />
          {!form.isNewItem && form.inventoryItemId && (() => {
            const inv = inventoryItems.find((i: any) => String(i._id) === String(form.inventoryItemId));
            const u = inv?.unit ?? form.unit?.trim();
            return u ? (
              <p className="text-sm text-slate-600">
                Unit for this order: <strong>{u}</strong> (same as inventory item — use consistently)
              </p>
            ) : null;
          })()}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
            <input
              type="checkbox"
              checked={form.isNewItem}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  isNewItem: e.target.checked,
                  ...(e.target.checked ? { inventoryItemId: "" } : {}),
                }))
              }
              className="h-4 w-4 rounded border-[#e5e7eb] text-[#5a189a] focus:ring-[#5a189a]/20"
            />
            This item is new (not yet in inventory)
          </label>
          {form.isNewItem && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Item name"
                value={form.itemName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, itemName: e.target.value }))
                }
                placeholder="e.g. Vegetable Oil"
                required
                className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
              />
              <AppReactSelect
                label="Unit (required)"
                value={form.unit}
                onChange={(v) => setForm((f) => ({ ...f, unit: v || "" }))}
                options={unitOptions}
                placeholder="Select unit (e.g. kg, litre, pcs)"
              />
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
            <p className="text-sm font-medium text-slate-700">
              What you’re recording
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Total quantity in the chosen unit (e.g. <strong>25 kg</strong>) and either the <strong>total amount</strong> you paid or the <strong>cost per unit</strong>. The app works out the other: 25 kg for GH₵500 total → GH₵20 per kg.
            </p>
          </div>
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <LabelWithInfo
                id="po-quantity"
                label="Quantity"
                infoKey="quantity"
                openKey={openInfoKey}
                onToggle={setOpenInfoKey}
                containerRef={infoPopoverRef}
              />
              <Input
                id="po-quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={form.quantity}
                onChange={(e) => {
                  const q = e.target.value;
                  setForm((f) => {
                    const next = { ...f, quantity: q };
                    const totalVal = Number(f.totalAmountEntered) || 0;
                    const qty = Number(q) || 0;
                    if (totalVal > 0 && qty > 0)
                      next.unitCost = String(
                        Math.round((totalVal / qty) * 100) / 100
                      );
                    return next;
                  });
                }}
                className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
              />
            </div>
            <div className="space-y-1.5">
              <LabelWithInfo
                id="po-unit-cost"
                label="Unit cost (per unit)"
                infoKey="unitCost"
                openKey={openInfoKey}
                onToggle={setOpenInfoKey}
                containerRef={infoPopoverRef}
              />
              <Input
                id="po-unit-cost"
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    unitCost: e.target.value,
                    totalAmountEntered: "", // user editing unit cost → clear "total" helper
                  }))
                }
                className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="po-total-amount"
              className="text-sm font-medium text-slate-700"
            >
              Total amount (optional)
            </label>
            <p className="text-xs text-slate-500">
              If you know the total you paid (e.g. GH₵1,000 for 25 kg), enter it
              here and we’ll fill unit cost for you.
            </p>
            <Input
              id="po-total-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 1000"
              value={form.totalAmountEntered}
              onChange={(e) => {
                const totalStr = e.target.value;
                setForm((f) => {
                  const next = { ...f, totalAmountEntered: totalStr };
                  const totalVal = Number(totalStr) || 0;
                  const qty = Number(f.quantity) || 0;
                  if (totalVal > 0 && qty > 0)
                    next.unitCost = String(
                      Math.round((totalVal / qty) * 100) / 100
                    );
                  return next;
                });
              }}
              className="rounded-xl border-[#e5e7eb] focus:border-[#5a189a] focus:ring-[#5a189a]/20"
            />
          </div>
          {(() => {
            const qty = Number(form.quantity) || 0;
            const cost = Number(form.unitCost) || 0;
            const total = qty * cost;
            const unit = (form.unit || "unit").trim();
            const hasSummary = qty > 0 && (cost > 0 || total > 0);
            return (
              <>
                <div className="rounded-xl border border-[#e5e7eb] bg-slate-50/80 px-4 py-3">
                  <p className="text-sm font-medium text-slate-600">
                    Line total (Quantity × Unit cost)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#1f2937]">
                    {fmt(total)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    This is the total amount for this order (what you pay or paid
                    the supplier).
                  </p>
                </div>
                {hasSummary && (
                  <div className="rounded-xl border border-[#5a189a]/30 bg-[#5a189a]/5 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#5a189a]/80">
                      In plain terms
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-slate-800">
                      <span className="font-semibold text-[#1f2937]">{qty} {unit}</span>
                      {" "}for{" "}
                      <span className="font-semibold text-[#1f2937]">{fmt(total)}</span>
                      {" "}total
                      {cost > 0 && (
                        <>
                          {" "}→{" "}
                          <span className="font-semibold text-[#1f2937]">{fmt(cost)}</span>
                          {" "}per {unit}
                        </>
                      )}
                    </p>
                  </div>
                )}
              </>
            );
          })()}
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
        title="Delete purchase order"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Are you sure you want to delete this purchase order? This action cannot
          be undone.
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

      {/* Order details modal */}
      <Modal
        open={!!detailPo}
        onClose={() => setDetailPo(null)}
        title="Order details"
        size="lg"
        className="rounded-2xl border-[#e5e7eb] bg-white shadow-xl"
      >
        {detailPo && (
          <div className="space-y-5">
            {/* Summary in plain terms */}
            {(detailPo.lines ?? []).length > 0 && (
              <div className="rounded-xl border border-[#5a189a]/25 bg-[#5a189a]/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5a189a]/80">
                  Summary
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                  {(detailPo.lines ?? []).map((line: any, idx: number) => {
                    const qty = Number(line.quantity ?? 0);
                    const cost = Number(line.unitCost ?? 0);
                    const lineTotal = qty * cost;
                    const unit = (line.unit || "unit").trim();
                    if (qty <= 0) return null;
                    return (
                      <li key={idx}>
                        <span className="font-semibold text-[#1f2937]">{qty} {unit}</span>
                        {" "}of {line.itemName ?? "—"} for {fmt(lineTotal)} total
                        {cost > 0 && (
                          <> → {fmt(cost)} per {unit}</>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="grid gap-4 rounded-xl border border-[#e5e7eb] bg-slate-50/50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">PO Number</p>
                <p className="mt-0.5 font-semibold text-[#1f2937]">{detailPo.poNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
                <p className="mt-0.5">
                  <Badge variant={statusVariant(detailPo.status)}>
                    {STATUS_LABELS[detailPo.status] ?? detailPo.status}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier</p>
                <p className="mt-0.5 text-[#1f2937]">
                  {detailPo.supplierId?.name ?? detailPo.supplierId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Order date</p>
                <p className="mt-0.5 text-[#1f2937]">
                  {detailPo.orderDate
                    ? new Date(detailPo.orderDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              {detailPo.expectedDate && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected date</p>
                  <p className="mt-0.5 text-[#1f2937]">
                    {new Date(detailPo.expectedDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              {(detailPo.sourceDepartment || detailPo.receiveToDepartment) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Department</p>
                  <p className="mt-0.5 text-[#1f2937]">
                    {detailPo.receiveToDepartment ?? detailPo.sourceDepartment ?? "—"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-[#374151]">Line items</p>
              <div className="overflow-hidden rounded-xl border border-[#e5e7eb]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] bg-slate-50/80 text-left">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Item</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Quantity</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Unit</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Unit cost</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb]">
                    {(detailPo.lines ?? []).map((line: any, idx: number) => {
                      const qty = Number(line.quantity ?? 0);
                      const cost = Number(line.unitCost ?? 0);
                      const lineTotal = qty * cost;
                      return (
                        <tr key={idx} className="bg-white">
                          <td className="px-4 py-3 font-medium text-[#1f2937]">{line.itemName ?? "—"}</td>
                          <td className="px-4 py-3 text-right text-[#374151]">{qty.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-[#6b7280]">{line.unit ?? "—"}</td>
                          <td className="px-4 py-3 text-right text-[#374151]">{fmt(cost)}</td>
                          <td className="px-4 py-3 text-right font-medium text-[#1f2937]">{fmt(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total amount paid - prominent */}
            <div className="rounded-xl border-2 border-[#ff6d00]/30 bg-[#ff6d00]/5 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total amount paid
              </p>
              <p className="mt-1 text-2xl font-bold text-[#1f2937]">
                {fmt(Number(detailPo.totalAmount ?? 0))}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                This is the total you pay or paid the supplier for this order.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#e5e7eb] pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDetailPo(null);
                  openEdit(detailPo);
                  setShowModal(true);
                }}
                className="rounded-xl border-[#e5e7eb] text-[#5a189a] hover:bg-[#f5f3ff]"
              >
                <FiEdit2 className="mr-1.5 h-4 w-4" />
                Edit order
              </Button>
              <Button
                variant="outline"
                onClick={() => setDetailPo(null)}
                className="rounded-xl border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
