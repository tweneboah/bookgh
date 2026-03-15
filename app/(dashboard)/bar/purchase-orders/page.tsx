"use client";

import { useMemo, useState } from "react";
import {
  useBarPurchaseOrders,
  useCreateBarPurchaseOrder,
  useUpdateBarPurchaseOrder,
  useDeleteBarPurchaseOrder,
  useReceiveBarPurchaseOrder,
  useBarSuppliers,
  useInventoryItems,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Badge,
  Card,
  CardContent,
  EmptyState,
  AppReactSelect,
  AppDatePicker,
} from "@/components/ui";
import {
  Plus,
  Pencil,
  Trash2,
  PackageCheck,
  Truck,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import { PROCUREMENT_ORDER_STATUS } from "@/constants";

const STATUS_OPTIONS = Object.entries(PROCUREMENT_ORDER_STATUS).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const BAR_PO_UNIT_OPTIONS = [
  { value: "ml", label: "ml" },
  { value: "L", label: "L" },
  { value: "litre", label: "litre" },
  { value: "bottle", label: "bottle" },
  { value: "can", label: "can" },
  { value: "pcs", label: "pcs" },
  { value: "unit", label: "unit" },
  { value: "box", label: "box" },
  { value: "pack", label: "pack" },
  { value: "carton", label: "carton" },
  { value: "case", label: "case" },
  { value: "keg", label: "keg" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const ORANGE_GRADIENT = "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)";
const CARD_SHADOW = "0 4px 20px rgba(0,0,0,0.06)";

export default function BarPurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [receivePo, setReceivePo] = useState<any>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, number>>({});
  const [deliveryNote, setDeliveryNote] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");

  const [form, setForm] = useState({
    poNumber: "",
    supplierId: "",
    orderDate: "",
    expectedDate: "",
    status: PROCUREMENT_ORDER_STATUS.DRAFT as string,
    isNewItem: false,
    inventoryItemId: "",
    itemName: "",
    unit: "ml",
    quantity: "1",
    unitCost: "0",
    totalAmountEntered: "",
  });
  const [detailPo, setDetailPo] = useState<any>(null);

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useBarPurchaseOrders(params);
  const { data: suppliersData } = useBarSuppliers({ limit: "200" });
  const { data: itemsData } = useInventoryItems({ limit: "500", department: "bar" });
  const createMut = useCreateBarPurchaseOrder();
  const updateMut = useUpdateBarPurchaseOrder();
  const deleteMut = useDeleteBarPurchaseOrder();
  const receiveMut = useReceiveBarPurchaseOrder();

  const records = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;
  const suppliers = suppliersData?.data ?? [];
  const allInventoryItems = itemsData?.data ?? [];
  const inventoryItems = useMemo(
    () =>
      allInventoryItems.filter((i: any) =>
        ["liquor", "bar", "beverage", "mixer"].includes(String(i.category).toLowerCase())
      ),
    [allInventoryItems]
  );

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
    const base = [...BAR_PO_UNIT_OPTIONS];
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
      isNewItem: false,
      inventoryItemId: "",
      itemName: "",
      unit: "ml",
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
      poNumber: `BAR-PO-${Date.now().toString().slice(-6)}`,
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
      orderDate: row.orderDate ? new Date(row.orderDate).toISOString().slice(0, 10) : "",
      expectedDate: row.expectedDate
        ? new Date(row.expectedDate).toISOString().slice(0, 10)
        : "",
      status: row.status ?? PROCUREMENT_ORDER_STATUS.DRAFT,
      isNewItem: !(first?.inventoryItemId?._id ?? first?.inventoryItemId),
      inventoryItemId: first?.inventoryItemId?._id ?? first?.inventoryItemId ?? "",
      itemName: first?.itemName ?? "",
      unit: first?.unit ?? "ml",
      quantity: String(first?.quantity ?? 1),
      unitCost: String(first?.unitCost ?? 0),
      totalAmountEntered: "",
    });
    setShowModal(true);
  };

  const openReceive = (row: any) => {
    setReceivePo(row);
    const initial: Record<number, number> = {};
    (row.lines ?? []).forEach((line: any, idx: number) => {
      const total = Number(line.quantity ?? 0);
      const received = Number(line.receivedQuantity ?? 0);
      initial[idx] = Math.max(0, total - received);
    });
    setReceiveQuantities(initial);
    setDeliveryNote("");
    setReceiveNotes("");
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
      toast.error("Select a BAR inventory item");
      return;
    }
    if (form.isNewItem && !form.unit?.trim()) {
      toast.error("Unit is required (use the same unit for this item everywhere)");
      return;
    }
    const selectedItem = itemOptions.find((i: any) => i.value === form.inventoryItemId);
    const selectedInventory = form.inventoryItemId
      ? inventoryItems.find((i: any) => String(i._id) === String(form.inventoryItemId))
      : null;
    const itemName = form.isNewItem
      ? form.itemName.trim()
      : selectedItem?.label?.split(" (")[0] ?? form.itemName.trim();
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
      expectedDate: form.expectedDate ? `${form.expectedDate}T00:00:00.000Z` : undefined,
      sourceDepartment: "bar",
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
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("BAR purchase order updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("BAR purchase order created");
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
      toast.success("BAR purchase order deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivePo) return;
    const lines = (receivePo.lines ?? [])
      .map((line: any, idx: number) => {
        const qty = Number(receiveQuantities[idx] ?? 0);
        if (qty <= 0) return null;
        const total = Number(line.quantity ?? 0);
        const received = Number(line.receivedQuantity ?? 0);
        if (qty > total - received) return null;
        return { lineIndex: idx, quantity: qty, inventoryItemId: line.inventoryItemId };
      })
      .filter(Boolean) as Array<{ lineIndex: number; quantity: number; inventoryItemId?: string }>;
    if (!lines.length) {
      toast.error("Enter at least one quantity to receive");
      return;
    }
    try {
      await receiveMut.mutateAsync({
        id: receivePo._id,
        lines,
        deliveryNoteNumber: deliveryNote.trim() || undefined,
        notes: receiveNotes.trim() || undefined,
      });
      toast.success("BAR stock received");
      setReceivePo(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Receive failed");
    }
  };

  const statusLabel = (status: string) =>
    STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  const statusVariant = (status: string) =>
    status === "received" ? "success" : status === "cancelled" ? "danger" : "info";

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
              <PackageCheck className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="font-bold text-[#1a1a2e] text-2xl tracking-tight sm:text-3xl">
                BAR Purchase Orders
              </h1>
              <p className="mt-1 max-w-lg text-sm font-normal text-[#64748b] sm:text-base">
                Orders to BAR suppliers. Receiving updates BAR inventory only.
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
              Add PO
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
                  <div className="h-5 w-28 animate-pulse rounded bg-[#e2e8f0]" />
                  <div className="mt-3 h-4 w-40 animate-pulse rounded bg-[#e2e8f0]" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-6 w-20 animate-pulse rounded-lg bg-[#e2e8f0]" />
                    <div className="h-6 w-16 animate-pulse rounded-lg bg-[#e2e8f0]" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No BAR purchase orders yet"
            description="Create a purchase order to track goods bought from BAR suppliers and receive stock into BAR inventory."
            action={{ label: "Add Purchase Order", onClick: openCreate }}
            actionClassName="bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white hover:opacity-95 focus:ring-[#ff8500]"
            className="rounded-2xl border-[#e2e8f0] bg-[#f8fafc] py-16"
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {records.map((row: any) => {
                const line = row.lines?.[0];
                const canReceive =
                  row.status !== "received" && row.status !== "cancelled";
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
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailPo(row)}
                          className="text-left font-semibold text-[#5a189a] hover:text-[#7b2cbf] hover:underline focus:outline-none focus:ring-2 focus:ring-[#5a189a] focus:ring-offset-2 rounded-lg"
                        >
                          {row.poNumber}
                        </button>
                        <Badge
                          variant={statusVariant(row.status)}
                          className="shrink-0 text-xs font-medium"
                        >
                          {statusLabel(row.status)}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-[#475569]">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#5a189a]" aria-hidden />
                          {row.supplierId?.name ?? row.supplierId ?? "—"}
                        </span>
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#ff8500]" aria-hidden />
                          {line?.itemName ?? "—"}
                        </span>
                        {line?.unitCost != null && (
                          <span className="text-[#64748b]">
                            {fmt(Number(line.unitCost))}
                            {line.unit && line.unit !== "unit" ? ` per ${line.unit}` : ""}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-[#f1f5f9] pt-4">
                        <p className="font-semibold text-[#1a1a2e]">
                          {fmt(Number(row.totalAmount ?? 0))}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailPo(row)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#475569] transition-colors hover:border-[#5a189a] hover:bg-[#f5f0ff] hover:text-[#5a189a] focus:outline-none focus:ring-2 focus:ring-[#5a189a] focus:ring-offset-2"
                          >
                            Details
                          </button>
                          {canReceive && (
                            <button
                              type="button"
                              onClick={() => openReceive(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                            >
                              <Truck className="h-4 w-4" />
                              Receive
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569] transition-colors hover:border-[#5a189a] hover:bg-[#f5f0ff] hover:text-[#5a189a] focus:outline-none focus:ring-2 focus:ring-[#5a189a] focus:ring-offset-2"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDelete(row._id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
        title={editItem ? "Edit BAR Purchase Order" : "Add BAR Purchase Order"}
        size="lg"
        className="border-0 shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="PO Number"
            value={form.poNumber}
            onChange={(e) => setForm((f) => ({ ...f, poNumber: e.target.value }))}
            required
            placeholder="e.g. BAR-PO-123456"
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <AppReactSelect
            label="Supplier"
            value={form.supplierId}
            onChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}
            options={[{ value: "", label: "Select supplier..." }, ...supplierOptions]}
            placeholder="Select BAR supplier..."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AppDatePicker
              label="Order Date"
              selected={form.orderDate ? new Date(form.orderDate + "T12:00:00") : null}
              onChange={(d) =>
                setForm((f) => ({
                  ...f,
                  orderDate: d ? d.toISOString().slice(0, 10) : "",
                }))
              }
              placeholder="Select date"
            />
            <AppDatePicker
              label="Expected Date"
              selected={form.expectedDate ? new Date(form.expectedDate + "T12:00:00") : null}
              onChange={(d) =>
                setForm((f) => ({
                  ...f,
                  expectedDate: d ? d.toISOString().slice(0, 10) : "",
                }))
              }
              placeholder="Optional"
            />
          </div>
          <AppReactSelect
            label="BAR Inventory Item"
            value={form.inventoryItemId}
            onChange={(v) => {
              const selectedItem = itemOptions.find((i: any) => i.value === v);
              const selectedInventory = inventoryItems.find(
                (i: any) => String(i._id) === v
              );
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
            options={[{ value: "", label: "Select item..." }, ...itemOptions]}
            placeholder="Select BAR inventory item..."
          />
          {!form.isNewItem && form.inventoryItemId && (() => {
            const inv = inventoryItems.find(
              (i: any) => String(i._id) === String(form.inventoryItemId)
            );
            const u = inv?.unit ?? form.unit?.trim();
            return u ? (
              <p className="text-sm text-[#64748b]">
                Unit for this order: <strong className="text-[#1a1a2e]">{u}</strong> (same
                as inventory item — use consistently)
              </p>
            ) : null;
          })()}
          <label className="flex items-center gap-3">
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
              className="h-4 w-4 rounded border-[#cbd5e1] text-[#5a189a] focus:ring-[#5a189a]"
            />
            <span className="text-sm font-medium text-[#475569]">
              New item (not yet in BAR inventory)
            </span>
          </label>
          {form.isNewItem && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Item Name"
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                placeholder="e.g. Vodka 750ml"
                required
                className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
              />
              <AppReactSelect
                label="Unit (required)"
                value={form.unit}
                onChange={(v) => setForm((f) => ({ ...f, unit: v ?? "" }))}
                options={unitOptions}
                placeholder="Select unit (e.g. ml, bottle)"
              />
            </div>
          )}
          <div
            className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3"
            style={{ borderColor: "rgba(90, 24, 154, 0.15)" }}
          >
            <p className="text-sm font-medium text-[#475569]">
              What you&apos;re recording
            </p>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Total quantity in the chosen unit and either the total amount you paid or
              the cost per unit. The app works out the other.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Quantity"
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
                    next.unitCost = String(Math.round((totalVal / qty) * 100) / 100);
                  return next;
                });
              }}
              className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
            />
            <Input
              label="Unit cost (per unit)"
              type="number"
              min="0"
              step="0.01"
              value={form.unitCost}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  unitCost: e.target.value,
                  totalAmountEntered: "",
                }))
              }
              className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#475569]">
              Total amount (optional)
            </label>
            <p className="text-xs text-[#64748b]">
              If you know the total you paid, enter it here and we&apos;ll fill unit
              cost for you.
            </p>
            <Input
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
              className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
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
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
                  <p className="text-sm font-medium text-[#64748b]">
                    Line total (Quantity × Unit cost)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#1a1a2e]">
                    {fmt(total)}
                  </p>
                </div>
                {hasSummary && (
                  <div
                    className="rounded-xl border px-4 py-3"
                    style={{
                      borderColor: "rgba(255, 109, 0, 0.25)",
                      backgroundColor: "rgba(255, 109, 0, 0.06)",
                    }}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-[#ff6d00]">
                      In plain terms
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-[#475569]">
                      <span className="font-semibold text-[#1a1a2e]">
                        {qty} {unit}
                      </span>{" "}
                      for{" "}
                      <span className="font-semibold text-[#1a1a2e]">
                        {fmt(total)}
                      </span>{" "}
                      total
                      {cost > 0 && (
                        <>
                          {" "}
                          →{" "}
                          <span className="font-semibold text-[#1a1a2e]">
                            {fmt(cost)}
                          </span>{" "}
                          per {unit}
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

      {/* Detail Modal */}
      <Modal
        open={!!detailPo}
        onClose={() => setDetailPo(null)}
        title="Order details"
        size="lg"
        className="border-0 shadow-2xl"
      >
        {detailPo && (
          <div className="space-y-5">
            {(detailPo.lines ?? []).length > 0 && (
              <div
                className="rounded-xl border px-4 py-3"
                style={{
                  borderColor: "rgba(90, 24, 154, 0.2)",
                  backgroundColor: "rgba(90, 24, 154, 0.05)",
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5a189a]">
                  Summary
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-[#475569]">
                  {(detailPo.lines ?? []).map((line: any, idx: number) => {
                    const qty = Number(line.quantity ?? 0);
                    const cost = Number(line.unitCost ?? 0);
                    const lineTotal = qty * cost;
                    const unit = (line.unit || "unit").trim();
                    if (qty <= 0) return null;
                    return (
                      <li key={idx}>
                        <span className="font-semibold text-[#1a1a2e]">
                          {qty} {unit}
                        </span>{" "}
                        of {line.itemName ?? "—"} for {fmt(lineTotal)} total
                        {cost > 0 && (
                          <>
                            {" "}
                            → {fmt(cost)} per {unit}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="grid gap-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                  PO Number
                </p>
                <p className="mt-0.5 font-semibold text-[#1a1a2e]">
                  {detailPo.poNumber}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                  Status
                </p>
                <p className="mt-0.5">
                  <Badge variant={statusVariant(detailPo.status)}>
                    {statusLabel(detailPo.status)}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                  Supplier
                </p>
                <p className="mt-0.5 text-[#1a1a2e]">
                  {detailPo.supplierId?.name ?? detailPo.supplierId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                  Order date
                </p>
                <p className="mt-0.5 text-[#1a1a2e]">
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Expected date
                  </p>
                  <p className="mt-0.5 text-[#1a1a2e]">
                    {new Date(detailPo.expectedDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-[#475569]">
                Line items
              </p>
              <div className="overflow-x-auto rounded-xl border border-[#e2e8f0]">
                <table className="w-full text-sm">
                  <thead className="bg-[#f8fafc]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#64748b]">
                        Item
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#64748b]">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#64748b]">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#64748b]">
                        Unit cost
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#64748b]">
                        Line total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {(detailPo.lines ?? []).map((line: any, idx: number) => {
                      const qty = Number(line.quantity ?? 0);
                      const cost = Number(line.unitCost ?? 0);
                      const lineTotal = qty * cost;
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-medium text-[#1a1a2e]">
                            {line.itemName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-[#475569]">
                            {qty}
                          </td>
                          <td className="px-4 py-3 text-right text-[#475569]">
                            {line.unit ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-[#475569]">
                            {fmt(cost)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[#1a1a2e]">
                            {fmt(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className="rounded-xl border-2 px-4 py-4"
              style={{
                borderColor: "rgba(255, 109, 0, 0.3)",
                backgroundColor: "rgba(255, 109, 0, 0.06)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                Total amount paid
              </p>
              <p className="mt-1 text-2xl font-bold text-[#1a1a2e]">
                {fmt(Number(detailPo.totalAmount ?? 0))}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#f1f5f9] pt-4">
              <button
                type="button"
                onClick={() => {
                  setDetailPo(null);
                  openEdit(detailPo);
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#5a189a]/40 bg-white px-4 py-2 text-sm font-medium text-[#5a189a] transition-colors hover:bg-[#f5f0ff] focus:outline-none focus:ring-2 focus:ring-[#5a189a] focus:ring-offset-2"
              >
                <Pencil className="h-4 w-4" />
                Edit order
              </button>
              <Button
                variant="outline"
                onClick={() => setDetailPo(null)}
                className="rounded-xl border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc]"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Receive Modal */}
      <Modal
        open={!!receivePo}
        onClose={() => setReceivePo(null)}
        title="Receive BAR Stock"
        size="lg"
        className="border-0 shadow-2xl"
      >
        <form onSubmit={handleReceive} className="space-y-5">
          <p className="text-sm text-[#64748b]">
            PO: <strong className="text-[#1a1a2e]">{receivePo?.poNumber}</strong>.
            Receiving adds stock to BAR inventory only.
          </p>
          <div className="space-y-3">
            {(receivePo?.lines ?? []).map((line: any, idx: number) => {
              const total = Number(line.quantity ?? 0);
              const received = Number(line.receivedQuantity ?? 0);
              const remaining = total - received;
              if (remaining <= 0) return null;
              return (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#1a1a2e]">
                    {line.itemName}
                  </span>
                  <span className="text-xs text-[#64748b]">
                    Ordered: {total} {line.unit} · Received: {received}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={remaining}
                    step="0.01"
                    value={receiveQuantities[idx] ?? remaining}
                    onChange={(e) =>
                      setReceiveQuantities((prev) => ({
                        ...prev,
                        [idx]: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-24 rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
                  />
                  <span className="text-xs text-[#64748b]">{line.unit}</span>
                </div>
              );
            })}
          </div>
          <Input
            label="Delivery note number"
            value={deliveryNote}
            onChange={(e) => setDeliveryNote(e.target.value)}
            placeholder="Optional"
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <Input
            label="Notes"
            value={receiveNotes}
            onChange={(e) => setReceiveNotes(e.target.value)}
            placeholder="Optional"
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[#5a189a]"
          />
          <div className="flex flex-col-reverse gap-3 border-t border-[#f1f5f9] pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReceivePo(null)}
              className="rounded-xl border-[#e2e8f0] hover:bg-[#f8fafc]"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={receiveMut.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#ff8500] focus:ring-offset-2"
              style={{ background: ORANGE_GRADIENT }}
            >
              {receiveMut.isPending ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : null}
              Receive
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete BAR Purchase Order"
      >
        <p className="text-sm text-[#64748b] leading-relaxed">
          Are you sure you want to delete this BAR purchase order? This action cannot
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
