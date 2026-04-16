"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
  useSuppliers,
  useInventoryItems,
  useItemYields,
} from "@/hooks/api";
import {
  Button,
  Card,
  CardContent,
  Modal,
  Input,
  Badge,
  AppReactSelect,
  Textarea,
} from "@/components/ui";
import { Manrope } from "next/font/google";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
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
import { PROCUREMENT_ORDER_STATUS, DEPARTMENT, PAYMENT_METHOD } from "@/constants";
import { useRouter, useSearchParams } from "next/navigation";

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

const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD).map(([, value]) => ({
  value,
  label:
    value === PAYMENT_METHOD.MOBILE_MONEY
      ? "Mobile Money"
      : value === PAYMENT_METHOD.BANK_TRANSFER
      ? "Bank Transfer"
      : value.charAt(0).toUpperCase() + value.slice(1),
}));

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(
    n
  );

const getPaymentDueMeta = (paymentDueDate?: string | Date | null) => {
  if (!paymentDueDate) return null;
  const due = new Date(paymentDueDate);
  if (Number.isNaN(due.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDue = new Date(due);
  startOfDue.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil(
    (startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );
  return { due, daysLeft };
};

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

/** Status badge classes matching reference design: emerald=Approved, blue=Received, amber=Pending. */
const statusBadgeClass: Record<string, string> = {
  [PROCUREMENT_ORDER_STATUS.RECEIVED]: "bg-blue-100 text-blue-700",
  [PROCUREMENT_ORDER_STATUS.APPROVED]: "bg-emerald-100 text-emerald-700",
  [PROCUREMENT_ORDER_STATUS.ORDERED]: "bg-emerald-100 text-emerald-700",
  [PROCUREMENT_ORDER_STATUS.PENDING_APPROVAL]: "bg-amber-100 text-amber-700",
  [PROCUREMENT_ORDER_STATUS.PARTIALLY_RECEIVED]: "bg-amber-100 text-amber-700",
  [PROCUREMENT_ORDER_STATUS.DRAFT]: "bg-slate-100 text-slate-700",
  [PROCUREMENT_ORDER_STATUS.CANCELLED]: "bg-red-100 text-red-700",
};

const PO_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-po-manrope",
  display: "swap",
});

function MsIcon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={cn("material-symbols-outlined inline-flex select-none", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  );
}

const getInventoryItemImageUrl = (inventoryItems: any[], inventoryItemId: any) => {
  const id = String(
    typeof inventoryItemId === "object" && inventoryItemId?._id
      ? inventoryItemId._id
      : inventoryItemId ?? ""
  );
  if (!id) return "";
  const item = inventoryItems.find((i: any) => String(i?._id ?? "") === id);
  const imgs = Array.isArray(item?.images) ? item.images : [];
  const first = imgs[0] as { url?: string } | undefined;
  return String(first?.url ?? "");
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const department =
    searchParams.get("department") ?? DEPARTMENT.INVENTORY_PROCUREMENT;
  const supplierIdParam = searchParams.get("supplierId") ?? "";
  const isRestaurantDepartment = department === DEPARTMENT.RESTAURANT;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [detailPo, setDetailPo] = useState<any>(null);
  const [openInfoKey, setOpenInfoKey] = useState<string | null>(null);
  const infoPopoverRef = useRef<HTMLDivElement | null>(null);
  const [extraLines, setExtraLines] = useState<
    Array<{
      isNewItem: boolean;
      inventoryItemId: string;
      itemName: string;
      unit: string;
      quantity: string;
      unitCost: string;
    }>
  >([]);

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
    paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
    paymentDueDate: "",
    negotiatedTotalAmount: "",
    paymentNotes: "",
    negotiationNotes: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "12",
  };
  if (statusFilter) params.status = statusFilter;
  if (supplierIdParam) params.supplierId = supplierIdParam;
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
  const { data: yieldsData } = useItemYields(
    isRestaurantDepartment ? { limit: "1000" } : { limit: "0" }
  );
  const createMut = useCreatePurchaseOrder();
  const updateMut = useUpdatePurchaseOrder();
  const deleteMut = useDeletePurchaseOrder();

  const records = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const suppliers = suppliersData?.data ?? [];
  const inventoryItems = itemsData?.data ?? [];
  const yieldMappings = yieldsData?.data ?? [];

  const yieldByItem = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const y of yieldMappings) {
      const itemId = String(
        typeof y.inventoryItemId === "object" && y.inventoryItemId?._id
          ? y.inventoryItemId._id
          : y.inventoryItemId ?? ""
      );
      if (!itemId) continue;
      if (!m.has(itemId)) m.set(itemId, []);
      m.get(itemId)!.push(y);
    }
    return m;
  }, [yieldMappings]);

  const formatChefUnitName = (unitObj: any, qty: number) => {
    const raw = String(unitObj?.name ?? unitObj?.abbreviation ?? "unit").trim();
    if (!raw) return "unit";
    if (qty === 1 || raw.endsWith("s")) return raw;
    return `${raw}s`;
  };

  const chefReadableText = (inventoryItemId: string, baseQty: number) => {
    const mappings = yieldByItem.get(inventoryItemId) ?? [];
    const first = mappings.find((y: any) => Number(y.baseUnitQty ?? 0) > 0 && Number(y.toQty ?? 0) > 0);
    if (!first) return null;
    const baseUnitQty = Number(first.baseUnitQty);
    const fromQty = Number(first.fromQty ?? 0);
    const toQty = Number(first.toQty ?? 0);
    if (baseUnitQty <= 0 || fromQty <= 0 || toQty <= 0) return null;
    const purchaseQty = (baseQty / baseUnitQty) * fromQty;
    const chefQty = (baseQty / baseUnitQty) * toQty;
    const purchaseName = formatChefUnitName(first.fromUnitId, purchaseQty);
    const chefName = formatChefUnitName(first.toUnitId, chefQty);
    return `${purchaseQty.toFixed(2)} ${purchaseName} / ${chefQty.toFixed(1)} ${chefName}`;
  };

  const chefFormulaText = (inventoryItemId: string) => {
    const mappings = yieldByItem.get(inventoryItemId) ?? [];
    const first = mappings.find(
      (y: any) => Number(y.baseUnitQty ?? 0) > 0 && Number(y.toQty ?? 0) > 0
    );
    if (!first) return null;
    const baseUnitQty = Number(first.baseUnitQty);
    const fromQty = Number(first.fromQty ?? 0);
    const toQty = Number(first.toQty ?? 0);
    if (baseUnitQty <= 0 || fromQty <= 0 || toQty <= 0) return null;
    const fromUnit = formatChefUnitName(first.fromUnitId, fromQty);
    const toUnit = formatChefUnitName(first.toUnitId, toQty);
    return `${baseUnitQty} base → ${fromQty} ${fromUnit} / ${toQty} ${toUnit}`;
  };

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
    const current = extraLines[0]?.unit?.trim();
    if (current && !base.some((o) => o.value === current))
      base.push({ value: current, label: current });
    return base;
  }, [extraLines]);

  const resetForm = () => {
    setForm({
      poNumber: "",
      supplierId: "",
      orderDate: "",
      expectedDate: "",
      status: PROCUREMENT_ORDER_STATUS.DRAFT,
      receiveToDepartment: department,
      paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
      paymentDueDate: "",
      negotiatedTotalAmount: "",
      paymentNotes: "",
      negotiationNotes: "",
    });
    setExtraLines([
      {
        isNewItem: false,
        inventoryItemId: "",
        itemName: "",
        unit: "unit",
        quantity: "1",
        unitCost: "0",
      },
    ]);
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
      paymentMethod: row.paymentMethod ?? PAYMENT_METHOD.BANK_TRANSFER,
      paymentDueDate: row.paymentDueDate
        ? new Date(row.paymentDueDate).toISOString().slice(0, 10)
        : "",
      negotiatedTotalAmount:
        row.negotiatedTotalAmount != null ? String(row.negotiatedTotalAmount) : "",
      paymentNotes: row.paymentNotes ?? "",
      negotiationNotes: row.negotiationNotes ?? "",
    });
    const allLines = (row.lines ?? []).map((line: any) => ({
      isNewItem: !(line?.inventoryItemId?._id ?? line?.inventoryItemId),
      inventoryItemId: line?.inventoryItemId?._id ?? line?.inventoryItemId ?? "",
      itemName: line?.itemName ?? "",
      unit: line?.unit ?? "unit",
      quantity: String(line?.quantity ?? 1),
      unitCost: String(line?.unitCost ?? 0),
    }));
    setExtraLines(
      allLines.length
        ? allLines
        : [
            {
              isNewItem: false,
              inventoryItemId: "",
              itemName: "",
              unit: "unit",
              quantity: "1",
              unitCost: "0",
            },
          ]
    );
    setShowModal(true);
  };

  const handleSubmit = async (
    e: React.FormEvent,
    statusOverride?: string
  ) => {
    e.preventDefault();
    const statusToSend =
      statusOverride ??
      (editItem ? form.status : PROCUREMENT_ORDER_STATUS.PENDING_APPROVAL);
    if (!form.poNumber || !form.supplierId || !form.orderDate) {
      toast.error("PO number, supplier, and date are required");
      return;
    }
    try {
      const rawLines = extraLines;
      const normalizedLines = rawLines.map((line) => {
        const qty = Number(line.quantity);
        const unitCost = Number(line.unitCost);
        if (!qty || qty <= 0) {
          throw new Error("Each line quantity must be greater than zero");
        }
        if (!Number.isFinite(unitCost) || unitCost <= 0) {
          throw new Error("Each line unit cost must be greater than zero");
        }
        if (!line.isNewItem && !line.inventoryItemId) {
          throw new Error("Select an inventory item for each non-new line");
        }
        if (line.isNewItem && !line.unit?.trim()) {
          throw new Error("Unit is required for each new item line");
        }
        const selectedItem = itemOptions.find((i: any) => i.value === line.inventoryItemId);
        const selectedInventory = line.inventoryItemId
          ? inventoryItems.find((i: any) => String(i._id) === String(line.inventoryItemId))
          : null;
        const itemName = line.isNewItem
          ? line.itemName.trim()
          : selectedItem?.label?.split(" (")[0] ?? line.itemName.trim();
        const unit = line.isNewItem
          ? line.unit.trim()
          : (selectedInventory?.unit ?? selectedItem?.unit ?? line.unit ?? "").trim();
        if (!itemName || !unit) {
          throw new Error(
            line.isNewItem
              ? "Enter item name and unit for each new item line"
              : "Selected inventory item is missing name/unit"
          );
        }
        return {
          inventoryItemId: line.isNewItem ? undefined : line.inventoryItemId,
          itemName,
          quantity: qty,
          unit,
          unitCost,
          totalCost: Number((qty * unitCost).toFixed(2)),
        };
      });
      const calculatedSubtotal = Number(
        normalizedLines
          .reduce((sum, line) => sum + Number(line.totalCost ?? 0), 0)
          .toFixed(2)
      );
      const negotiatedTotalAmount = Number(form.negotiatedTotalAmount ?? 0);
      const payload = {
        poNumber: form.poNumber,
        supplierId: form.supplierId,
        orderDate: `${form.orderDate}T00:00:00.000Z`,
        expectedDate: form.expectedDate
          ? `${form.expectedDate}T00:00:00.000Z`
          : undefined,
        sourceDepartment: department,
        lines: normalizedLines,
        subtotal: calculatedSubtotal,
        negotiatedTotalAmount:
          Number.isFinite(negotiatedTotalAmount) && negotiatedTotalAmount > 0
            ? negotiatedTotalAmount
            : undefined,
        totalAmount:
          Number.isFinite(negotiatedTotalAmount) && negotiatedTotalAmount > 0
            ? negotiatedTotalAmount
            : calculatedSubtotal,
        status: statusToSend,
        paymentMethod: form.paymentMethod || undefined,
        paymentDueDate: form.paymentDueDate
          ? `${form.paymentDueDate}T00:00:00.000Z`
          : undefined,
        paymentNotes: form.paymentNotes?.trim() || undefined,
        negotiationNotes: form.negotiationNotes?.trim() || undefined,
        receiveToDepartment: isRestaurantDepartment
          ? DEPARTMENT.RESTAURANT
          : form.receiveToDepartment,
      };

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
        err?.message ?? err?.response?.data?.error?.message ?? "Something went wrong"
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

  const poCalculatedTotal = useMemo(
    () =>
      extraLines.reduce((sum, line) => {
        const q = Number(line.quantity) || 0;
        const c = Number(line.unitCost) || 0;
        return sum + q * c;
      }, 0),
    [extraLines]
  );
  const poDisplayTotal = useMemo(() => {
    const negotiated = Number(form.negotiatedTotalAmount ?? 0);
    return Number.isFinite(negotiated) && negotiated > 0
      ? negotiated
      : poCalculatedTotal;
  }, [form.negotiatedTotalAmount, poCalculatedTotal]);
  const negotiatedNum = Number(form.negotiatedTotalAmount ?? 0);

  return (
    <div
      className={cn(
        manrope.variable,
        "min-h-screen bg-[#f8f6f6] font-sans text-slate-900"
      )}
    >
      <div className="max-w-5xl mx-auto px-4 py-8 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              {pageTitle}
            </h1>
            <p className="text-slate-600 text-base max-w-xl">
              Create, track, and reconcile supplier orders with a clear audit trail.
            </p>
            {supplierIdParam ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                  Filtered by supplier
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams.toString());
                    next.delete("supplierId");
                    router.push(
                      `/inventory-procurement/purchase-orders?${next.toString()}`
                    );
                  }}
                  className="text-sm font-semibold text-[#ec5b13] hover:underline"
                >
                  Clear filter
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-[#ec5b13]/20"
          >
            <FiPlus className="h-5 w-5" aria-hidden />
            <span>Add purchase order</span>
          </button>
        </div>

        {/* Filters & Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="w-full md:w-72">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Status
            </label>
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
          <div className="text-sm font-medium text-slate-500">
            Showing{" "}
            <span className="text-slate-900 font-bold">
              {records.length} / {pagination?.total ?? records.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row">
                  <div className="w-full lg:w-48 h-32 lg:h-auto bg-slate-100 animate-pulse" />
                  <div className="flex-1 p-5 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                    </div>
                    <div className="h-8 w-24 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl overflow-hidden">
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <FiInbox className="h-12 w-12 text-slate-300" aria-hidden />
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                No purchase orders yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                Create your first purchase order to start tracking supplier
                orders and deliveries.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-6 inline-flex items-center justify-center gap-2 bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-[#ec5b13]/20"
              >
                <FiPlus className="h-5 w-5" />
                Add purchase order
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* List of Purchase Orders */}
            <div className="grid gap-4">
              {records.map((row: any) => {
                const firstLine = row.lines?.[0];
                const firstLineImage =
                  firstLine?.inventoryItemId != null
                    ? getInventoryItemImageUrl(inventoryItems, firstLine.inventoryItemId)
                    : "";
                const moreSuffix =
                  (row.lines?.length ?? 0) > 1
                    ? " +" + (row.lines.length - 1) + " more"
                    : "";
                const unitCostSuffix =
                  firstLine?.unitCost != null && firstLine?.unit
                    ? " | " + fmt(Number(firstLine.unitCost)) + " per " + firstLine.unit
                    : "";
                const itemsText = firstLine
                  ? (firstLine.itemName ?? "Item") + moreSuffix + unitCostSuffix
                  : "";
                const chefText =
                  isRestaurantDepartment &&
                  firstLine &&
                  (() => {
                    const invId = String(
                      firstLine.inventoryItemId?._id ?? firstLine.inventoryItemId ?? ""
                    );
                    return invId ? chefReadableText(invId, Number(firstLine.quantity ?? 0)) : null;
                  })();
                const paymentMeta = getPaymentDueMeta(row.paymentDueDate);
                const statusClass =
                  statusBadgeClass[row.status] ?? "bg-slate-100 text-slate-700";
                return (
                  <div
                    key={row._id}
                    className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row">
                      <div className="w-full lg:w-48 h-32 lg:h-auto bg-slate-100 relative overflow-hidden shrink-0">
                        <img
                          src={firstLineImage || PO_PLACEHOLDER_IMAGE}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div
                          className={`absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded ${statusClass}`}
                        >
                          {STATUS_LABELS[row.status] ?? row.status}
                        </div>
                      </div>
                      <div className="flex-1 p-5 flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setDetailPo(row)}
                              className="text-lg font-bold text-slate-900 hover:text-[#ec5b13] hover:underline underline-offset-2 text-left"
                            >
                              {row.poNumber}
                            </button>
                            <span className="text-sm font-medium text-slate-400">
                              •{" "}
                              {row.orderDate
                                ? new Date(row.orderDate).toLocaleDateString(
                                    "en-GB",
                                    { day: "numeric", month: "short", year: "numeric" }
                                  )
                                : "—"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-700">Supplier:</span>{" "}
                            {row.supplierId?.name ?? row.supplierId ?? "—"}
                          </p>
                          <p className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-700">Items:</span>{" "}
                            {itemsText || "—"}
                            {chefText ? ` (${chefText})` : ""}
                          </p>
                          {(firstLine?.unitCost != null || firstLine?.unit) &&
                            !itemsText.includes("per ") && (
                              <p className="text-xs text-slate-500 font-medium">
                                Unit cost:{" "}
                                {firstLine.unitCost != null
                                  ? fmt(Number(firstLine.unitCost))
                                  : "—"}
                                {firstLine.unit && firstLine.unit !== "unit"
                                  ? ` per ${firstLine.unit}`
                                  : ""}
                              </p>
                            )}
                          {paymentMeta ? (
                            <div
                              className={`inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full text-xs font-bold border ${
                                paymentMeta.daysLeft < 0
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              <FiCalendar className="h-4 w-4 shrink-0" />
                              Payment due:{" "}
                              {paymentMeta.due.toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}{" "}
                              •{" "}
                              {paymentMeta.daysLeft >= 0
                                ? `${paymentMeta.daysLeft} day(s) left`
                                : `${Math.abs(paymentMeta.daysLeft)} day(s) overdue`}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end justify-between min-w-[140px] gap-2">
                          <div className="text-right">
                            <span className="block text-xs text-slate-500 uppercase font-bold tracking-wider">
                              Total Amount
                            </span>
                            <span className="text-2xl font-black text-[#ec5b13]">
                              {fmt(Number(row.totalAmount ?? 0))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                              type="button"
                              onClick={() => setDetailPo(row)}
                              className="flex-1 md:flex-none px-6 py-2 bg-slate-100 hover:bg-[#ec5b13] hover:text-white text-slate-700 font-bold rounded-lg transition-all text-sm"
                            >
                              View details
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-[#ec5b13] hover:text-white hover:border-[#ec5b13] transition-all"
                              aria-label="Edit purchase order"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDelete(row._id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                              aria-label="Delete purchase order"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
        title=""
        size="6xl"
        className="overflow-hidden rounded-xl border border-[#e2bfb0]/40 bg-[#f7f9fb] shadow-[0px_12px_32px_rgba(25,28,30,0.08)]"
        bodyClassName="max-h-[min(88vh,920px)] overflow-y-auto p-0"
      >
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col"
        >
          <div className="sticky top-0 z-10 border-b border-[#e2bfb0]/40 bg-white px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <nav className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-[#5a4136]">
                  <span>Purchase Orders</span>
                  <MsIcon name="chevron_right" className="text-xs" />
                  <span className="text-[#191c1e]">
                    {editItem ? "Edit order" : "New Order"}
                  </span>
                </nav>
                <div className="flex flex-wrap items-center gap-3">
                  <h2
                    className={cn(
                      manrope.className,
                      "text-2xl font-extrabold tracking-tight text-[#191c1e] sm:text-3xl"
                    )}
                  >
                    {editItem ? "Edit Purchase Order" : "Add Purchase Order"}
                  </h2>
                  <span className="rounded-full bg-[#e6e8ea] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#5a4136]">
                    {STATUS_LABELS[form.status] ?? form.status}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#a04100]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-8 px-5 py-6 sm:px-6">
            <section className="rounded-xl bg-white p-6 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-[#a04100]">
                  <MsIcon name="info" className="text-xl" filled />
                </span>
                <h3
                  className={cn(manrope.className, "text-lg font-bold text-[#191c1e]")}
                >
                  General Information
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5 lg:col-span-1">
                  <label
                    htmlFor="po-modal-po-number"
                    className="text-xs font-bold uppercase tracking-wide text-[#5a4136]"
                  >
                    PO Number
                  </label>
                  <Input
                    id="po-modal-po-number"
                    value={form.poNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, poNumber: e.target.value }))
                    }
                    required
                    className="h-auto min-h-[44px] rounded-lg border-none bg-[#f2f4f6] px-4 py-3 text-sm font-medium shadow-none ring-0 focus-visible:ring-2 focus-visible:ring-[#ff6b00]/35 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-[#5a4136]">
                    Supplier
                  </label>
                  <AppReactSelect
                    value={form.supplierId}
                    onChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}
                    options={[
                      { value: "", label: "Select supplier…" },
                      ...supplierOptions,
                    ]}
                    placeholder="Select supplier…"
                    visualVariant="solar"
                  />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <label
                    htmlFor="po-modal-order-date"
                    className="text-xs font-bold uppercase tracking-wide text-[#5a4136]"
                  >
                    Order Date
                  </label>
                  <input
                    id="po-modal-order-date"
                    type="date"
                    value={form.orderDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, orderDate: e.target.value }))
                    }
                    required
                    className="w-full rounded-lg border-none bg-[#f2f4f6] px-4 py-3 text-sm font-medium text-[#191c1e] focus:ring-2 focus:ring-[#ff6b00]/35 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <label
                    htmlFor="po-modal-expected-date"
                    className="text-xs font-bold uppercase tracking-wide text-[#5a4136]"
                  >
                    Expected Date
                  </label>
                  <input
                    id="po-modal-expected-date"
                    type="date"
                    value={form.expectedDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expectedDate: e.target.value }))
                    }
                    className="w-full rounded-lg border-none bg-[#f2f4f6] px-4 py-3 text-sm font-medium text-[#191c1e] focus:ring-2 focus:ring-[#ff6b00]/35 focus:outline-none"
                  />
                </div>
                {!isRestaurantDepartment ? (
                  <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                    <label className="text-xs font-bold uppercase tracking-wide text-[#5a4136]">
                      Receive to department
                    </label>
                    <AppReactSelect
                      value={form.receiveToDepartment}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, receiveToDepartment: v }))
                      }
                      options={DEPARTMENT_OPTIONS}
                      visualVariant="solar"
                    />
                  </div>
                ) : null}
                {editItem ? (
                  <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                    <label className="text-xs font-bold uppercase tracking-wide text-[#5a4136]">
                      Status
                    </label>
                    <AppReactSelect
                      value={form.status}
                      onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                      options={STATUS_OPTIONS}
                      visualVariant="solar"
                    />
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl bg-white p-6 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] sm:p-8">
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-[#a04100]">
                    <MsIcon name="list_alt" className="text-xl" filled />
                  </span>
                  <h3
                    className={cn(manrope.className, "text-lg font-bold text-[#191c1e]")}
                  >
                    Line items
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setExtraLines((prev) => [
                      ...prev,
                      {
                        isNewItem: false,
                        inventoryItemId: "",
                        itemName: "",
                        unit: "unit",
                        quantity: "1",
                        unitCost: "0",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#a04100] transition-colors hover:bg-orange-50"
                >
                  <MsIcon name="add_circle" className="text-lg" />
                  Add item line
                </button>
              </div>

              <div className="mb-6 space-y-4">
                {extraLines.length === 0 ? (
                  <p className="text-sm text-slate-500">Add at least one item line.</p>
                ) : (
                  extraLines.map((line, idx) => (
                    <div
                      key={`extra-line-${idx}`}
                      className="relative rounded-xl border-l-4 border-[#a04100] bg-[#f2f4f6] p-5 transition-colors hover:bg-[#f7f9fb]"
                    >
                      <div className="grid grid-cols-12 items-start gap-4 lg:gap-6">
                        <div className="col-span-12 space-y-4 lg:col-span-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wide text-[#5a4136]">
                              Inventory Item
                            </label>
                            <AppReactSelect
                              value={line.inventoryItemId}
                              onChange={(v) => {
                                const selectedItem = itemOptions.find(
                                  (i: { value: string }) => i.value === v
                                );
                                const selectedInventory = inventoryItems.find(
                                  (i: { _id: string }) =>
                                    String(i._id) === String(v)
                                );
                                const itemUnit =
                                  selectedInventory?.unit ??
                                  selectedItem?.unit ??
                                  "";
                                setExtraLines((prev) =>
                                  prev.map((entry, i) =>
                                    i === idx
                                      ? {
                                          ...entry,
                                          inventoryItemId: v,
                                          itemName:
                                            selectedItem?.label?.split(
                                              " ("
                                            )[0] ?? entry.itemName,
                                          unit: itemUnit || entry.unit,
                                          unitCost:
                                            selectedInventory?.unitCost !=
                                            null
                                              ? String(selectedInventory.unitCost)
                                              : entry.unitCost,
                                        }
                                      : entry
                                  )
                                );
                              }}
                              options={[
                                { value: "", label: "Select item…" },
                                ...itemOptions,
                              ]}
                              placeholder="Select item…"
                              visualVariant="solar"
                            />
                          </div>
                          {line.isNewItem ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Input
                                label="Item name"
                                value={line.itemName}
                                onChange={(e) =>
                                  setExtraLines((prev) =>
                                    prev.map((entry, i) =>
                                      i === idx
                                        ? { ...entry, itemName: e.target.value }
                                        : entry
                                    )
                                  )
                                }
                                className="rounded-lg border-none bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#ff6b00]/35"
                              />
                              <AppReactSelect
                                label="Unit"
                                value={line.unit}
                                onChange={(v) =>
                                  setExtraLines((prev) =>
                                    prev.map((entry, i) =>
                                      i === idx
                                        ? { ...entry, unit: v || "" }
                                        : entry
                                    )
                                  )
                                }
                                options={unitOptions}
                                visualVariant="solar"
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="col-span-12 space-y-1.5 lg:col-span-3">
                          <label
                            htmlFor={`po-line-qty-${idx}`}
                            className="text-xs font-bold uppercase tracking-wide text-[#5a4136]"
                          >
                            Quantity
                          </label>
                          <div className="relative">
                            <Input
                              id={`po-line-qty-${idx}`}
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={line.quantity}
                              onChange={(e) =>
                                setExtraLines((prev) =>
                                  prev.map((entry, i) =>
                                    i === idx
                                      ? { ...entry, quantity: e.target.value }
                                      : entry
                                  )
                                )
                              }
                              className="rounded-lg border-none bg-white pr-14 shadow-sm focus-visible:ring-2 focus-visible:ring-[#ff6b00]/35"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-slate-400">
                              {(line.unit || "unit").trim() || "UNIT"}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-12 space-y-1.5 lg:col-span-4">
                          <label
                            htmlFor={`po-line-cost-${idx}`}
                            className="text-xs font-bold uppercase tracking-wide text-[#5a4136]"
                          >
                            Unit cost (GH₵)
                          </label>
                          <Input
                            id={`po-line-cost-${idx}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost}
                            onChange={(e) =>
                              setExtraLines((prev) =>
                                prev.map((entry, i) =>
                                  i === idx
                                    ? { ...entry, unitCost: e.target.value }
                                    : entry
                                )
                              )
                            }
                            className="rounded-lg border-none bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#ff6b00]/35"
                          />
                        </div>
                        <div className="col-span-12 flex justify-end pt-1 lg:col-span-1 lg:pt-7">
                          <button
                            type="button"
                            title="Remove item"
                            onClick={() =>
                              setExtraLines((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            disabled={extraLines.length <= 1}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/60 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <MsIcon name="delete" />
                          </button>
                        </div>
                      </div>
                      {(() => {
                        const qty = Number(line.quantity) || 0;
                        const cost = Number(line.unitCost) || 0;
                        const unit = (line.unit || "unit").trim();
                        const lineTotal = qty * cost;
                        if (qty <= 0 || cost <= 0) return null;
                        const invId = String(line.inventoryItemId ?? "").trim();
                        const chef =
                          isRestaurantDepartment && invId
                            ? chefReadableText(invId, qty)
                            : null;
                        const formula =
                          isRestaurantDepartment && invId
                            ? chefFormulaText(invId)
                            : null;
                        return (
                          <div className="mt-4 rounded-lg border border-[#ff6b00]/20 bg-orange-50/60 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a04100]/90">
                              In plain terms
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-800">
                              <span className="font-semibold text-[#191c1e]">
                                {qty} {unit}
                              </span>{" "}
                              for{" "}
                              <span className="font-semibold text-[#191c1e]">
                                {fmt(lineTotal)}
                              </span>{" "}
                              total →{" "}
                              <span className="font-semibold text-[#191c1e]">
                                {fmt(cost)}
                              </span>{" "}
                              per {unit}
                            </p>
                            {chef ? (
                              <p className="mt-1 text-xs text-[#0062a1]">
                                Chef units:{" "}
                                <span className="font-medium">{chef}</span>
                              </p>
                            ) : null}
                            {formula ? (
                              <p className="mt-0.5 text-[11px] text-slate-600">
                                Formula: {formula}
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-3 rounded-xl bg-blue-50/60 p-4">
                <MsIcon
                  name="help_outline"
                  className="mt-0.5 shrink-0 text-xl text-blue-500"
                />
                <p className="text-sm font-medium leading-relaxed text-blue-900">
                  Total quantity in the chosen unit (e.g. 25 kg) and either the
                  total amount you paid or the cost per unit. The app works out
                  the other.
                </p>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] sm:p-8">
              <div className="mb-8 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-[#a04100]">
                  <MsIcon name="payments" className="text-xl" filled />
                </span>
                <h3
                  className={cn(manrope.className, "text-lg font-bold text-[#191c1e]")}
                >
                  Financials
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
                <div className="space-y-6">
                  <div className="group relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white">
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#ff6b00]/20 blur-2xl transition-all group-hover:bg-[#ff6b00]/30" />
                    <p className="relative text-xs font-bold uppercase tracking-widest text-slate-400">
                      Order total ({extraLines.length} line item
                      {extraLines.length === 1 ? "" : "s"})
                    </p>
                    <h4
                      className={cn(
                        manrope.className,
                        "relative mt-1 text-3xl font-extrabold sm:text-4xl"
                      )}
                    >
                      {fmt(poDisplayTotal)}
                    </h4>
                    {Number.isFinite(negotiatedNum) && negotiatedNum > 0 ? (
                      <p className="relative mt-2 text-xs text-slate-400">
                        Calculated: {fmt(poCalculatedTotal)} | Negotiated:{" "}
                        {fmt(negotiatedNum)}
                      </p>
                    ) : null}
                    <p className="relative mt-3 text-sm font-medium text-slate-400">
                      This is the total amount for this order (what you pay or
                      paid the supplier).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wide text-[#5a4136]">
                        Payment Method
                      </label>
                      <AppReactSelect
                        value={form.paymentMethod}
                        onChange={(v) =>
                          setForm((f) => ({ ...f, paymentMethod: v }))
                        }
                        options={PAYMENT_METHOD_OPTIONS}
                        visualVariant="solar"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="po-modal-payment-due"
                        className="text-xs font-bold uppercase tracking-wide text-[#5a4136]"
                      >
                        Payment Due Date
                      </label>
                      <input
                        id="po-modal-payment-due"
                        type="date"
                        value={form.paymentDueDate}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            paymentDueDate: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border-none bg-[#f2f4f6] px-4 py-3 text-sm font-medium text-[#191c1e] focus:ring-2 focus:ring-[#ff6b00]/35 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="po-modal-negotiated"
                      className="text-xs font-bold uppercase tracking-wide text-[#5a4136]"
                    >
                      Negotiated amount to pay{" "}
                      <span className="ml-1 text-[10px] font-normal normal-case text-slate-400">
                        (Optional)
                      </span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        GH₵
                      </span>
                      <Input
                        id="po-modal-negotiated"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.negotiatedTotalAmount}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            negotiatedTotalAmount: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="rounded-lg border-none bg-[#f2f4f6] py-3 pl-12 pr-4 text-sm font-medium shadow-none ring-0 focus-visible:ring-2 focus-visible:ring-[#ff6b00]/35 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="po-modal-neg-notes"
                      className="text-xs font-bold uppercase tracking-wide text-[#5a4136]"
                    >
                      Negotiation Notes{" "}
                      <span className="ml-1 text-[10px] font-normal normal-case text-slate-400">
                        (Optional)
                      </span>
                    </label>
                    <Textarea
                      id="po-modal-neg-notes"
                      value={form.negotiationNotes}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          negotiationNotes: e.target.value,
                        }))
                      }
                      placeholder="Enter any details regarding price negotiation..."
                      rows={3}
                      className="resize-none rounded-lg border-none bg-[#f2f4f6] px-4 py-3 text-sm font-medium shadow-none ring-0 focus-visible:ring-2 focus-visible:ring-[#ff6b00]/35 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="po-modal-pay-notes"
                      className="text-xs font-bold uppercase tracking-wide text-[#5a4136]"
                    >
                      Payment Notes{" "}
                      <span className="ml-1 text-[10px] font-normal normal-case text-slate-400">
                        (Optional)
                      </span>
                    </label>
                    <Textarea
                      id="po-modal-pay-notes"
                      value={form.paymentNotes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, paymentNotes: e.target.value }))
                      }
                      placeholder="Add specific payment instructions or references..."
                      rows={3}
                      className="resize-none rounded-lg border-none bg-[#f2f4f6] px-4 py-3 text-sm font-medium shadow-none ring-0 focus-visible:ring-2 focus-visible:ring-[#ff6b00]/35 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-4 border-t border-slate-100/80 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-[#5a4136] transition-colors hover:text-[#ba1a1a]"
              >
                <MsIcon name="close" className="text-lg" />
                Cancel Order
              </button>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={createMut.isPending || updateMut.isPending}
                  onClick={(e) =>
                    void handleSubmit(e, PROCUREMENT_ORDER_STATUS.DRAFT)
                  }
                  className={cn(
                    manrope.className,
                    "rounded-lg px-6 py-3 font-bold text-[#a04100] hover:bg-[#e6e8ea]"
                  )}
                >
                  Save as Draft
                </Button>
                <Button
                  type="submit"
                  loading={createMut.isPending || updateMut.isPending}
                  className={cn(
                    manrope.className,
                    "inline-flex items-center gap-2 rounded-xl bg-[#a04100] px-8 py-4 font-bold text-white shadow-lg transition-all hover:bg-[#ff6b00] hover:shadow-[#ff6b00]/25 active:scale-[0.98]"
                  )}
                >
                  <MsIcon name="send" filled />
                  {editItem ? "Update Purchase Order" : "Save Purchase Order"}
                </Button>
              </div>
            </div>

            <p className="text-center text-[10px] font-medium italic text-slate-400 sm:text-left">
              Purchase orders are logged for procurement audit and approval
              tracking.
            </p>
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

      {/* Order details modal - exact reference design */}
      <Modal
        open={!!detailPo}
        onClose={() => setDetailPo(null)}
        title=""
        size="6xl"
        className="rounded-2xl border border-slate-200 bg-[#f8f6f6] shadow-2xl overflow-hidden p-0"
      >
        {detailPo && (
          <div className="flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-[#ec5b13]/10 rounded-lg text-[#ec5b13]">
                    <FiFileText className="text-2xl" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold leading-tight flex items-center gap-3">
                      Order Details
                      <span className="text-slate-400 font-normal">|</span>
                      <span className="text-[#ec5b13] font-black">{detailPo.poNumber}</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={
                          detailPo.status === "received"
                            ? "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            : detailPo.status === "approved" || detailPo.status === "ordered"
                            ? "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            : detailPo.status === "cancelled"
                            ? "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                            : "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                        }
                      >
                        <span
                          className={
                            "w-1.5 h-1.5 mr-1.5 rounded-full " +
                            (detailPo.status === "received"
                              ? "bg-blue-600"
                              : detailPo.status === "approved" || detailPo.status === "ordered"
                              ? "bg-green-600"
                              : detailPo.status === "cancelled"
                              ? "bg-red-600"
                              : "bg-amber-600")
                          }
                        />
                        {STATUS_LABELS[detailPo.status] ?? detailPo.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        {detailPo.updatedAt
                          ? "Updated " + new Date(detailPo.updatedAt).toLocaleDateString("en-GB")
                          : "Last updated today"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailPo(null);
                      openEdit(detailPo);
                      setShowModal(true);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiEdit2 className="text-lg" />
                    Edit order
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailPo(null)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors text-xl font-light leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
            </header>

            {/* Modal Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Summary Section */}
                  {(detailPo.lines ?? []).length > 0 && (
                    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                        <FiFileText className="text-[#ec5b13]" />
                        <h2 className="font-bold text-lg">Summary</h2>
                      </div>
                      <div className="p-6 space-y-4">
                        {(detailPo.lines ?? []).map((line: any, idx: number) => {
                          const qty = Number(line.quantity ?? 0);
                          const cost = Number(line.unitCost ?? 0);
                          const lineTotal = qty * cost;
                          const unit = (line.unit || "unit").trim();
                          const invId = String(
                            line.inventoryItemId?._id ?? line.inventoryItemId ?? ""
                          );
                          const chef =
                            isRestaurantDepartment && invId
                              ? chefReadableText(invId, qty)
                              : null;
                          if (qty <= 0) return null;
                          return (
                            <div
                              key={idx}
                              className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100"
                            >
                              <div className="w-10 h-10 rounded-full bg-[#ec5b13]/10 text-[#ec5b13] flex items-center justify-center shrink-0">
                                <FiFileText className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-base font-medium">
                                  {qty} {unit} of {line.itemName ?? "—"} for{" "}
                                  <span className="font-bold">{fmt(lineTotal)}</span> total
                                </p>
                                <p className="text-sm text-slate-500 mt-0.5">
                                  → {fmt(cost)} per {unit}
                                  {chef ? " (Chef units: " + chef + ")" : ""}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Line Items Table */}
                  <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FiFileText className="text-[#ec5b13]" />
                        <h2 className="font-bold text-lg">Line Items</h2>
                      </div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {(detailPo.lines ?? []).length} Items Total
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <th className="px-6 py-3 border-b border-slate-200">Item</th>
                            <th className="px-6 py-3 border-b border-slate-200">Quantity</th>
                            <th className="px-6 py-3 border-b border-slate-200">Unit</th>
                            <th className="px-6 py-3 border-b border-slate-200 text-right">
                              Unit Cost
                            </th>
                            <th className="px-6 py-3 border-b border-slate-200 text-right">
                              Line Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(detailPo.lines ?? []).map((line: any, idx: number) => {
                            const qty = Number(line.quantity ?? 0);
                            const cost = Number(line.unitCost ?? 0);
                            const lineTotal = qty * cost;
                            const invId = String(
                              line.inventoryItemId?._id ?? line.inventoryItemId ?? ""
                            );
                            const chef =
                              isRestaurantDepartment && invId
                                ? chefReadableText(invId, qty)
                                : null;
                            return (
                              <tr
                                key={idx}
                                className="hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="px-6 py-4 text-sm font-medium">
                                  {line.itemName ?? "—"}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  {qty.toLocaleString("en-GH", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                  <div className="flex flex-col">
                                    <span>{line.unit ?? "—"}</span>
                                    {chef ? (
                                      <span className="text-[10px] text-[#ec5b13]">
                                        {chef}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-right">
                                  {fmt(cost)}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-right">
                                  {fmt(lineTotal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                {/* Sidebar */}
                <aside className="space-y-6">
                  {/* Details Card */}
                  <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                      <FiInfo className="text-[#ec5b13]" />
                      <h2 className="font-bold text-lg">Details</h2>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">
                          Supplier
                        </label>
                        <p className="text-sm font-medium break-words">
                          {detailPo.supplierId?.name ?? detailPo.supplierId ?? "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">
                          Order Date
                        </label>
                        <div className="flex items-center gap-2">
                          <FiCalendar className="text-sm text-slate-400" />
                          <p className="text-sm font-medium">
                            {detailPo.orderDate
                              ? new Date(detailPo.orderDate).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </p>
                        </div>
                      </div>
                      {(detailPo.sourceDepartment ||
                        detailPo.receiveToDepartment) && (
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-slate-400">
                            Department
                          </label>
                          <p className="text-sm font-medium flex items-center gap-2 capitalize">
                            {detailPo.receiveToDepartment ??
                              detailPo.sourceDepartment ??
                              "—"}
                          </p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-slate-400">
                          Payment Method
                        </label>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {detailPo.paymentMethod ?? "—"}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-slate-100">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-slate-400">
                            Payment Due
                          </label>
                          {(() => {
                            const paymentMeta = getPaymentDueMeta(
                              detailPo.paymentDueDate
                            );
                            if (!paymentMeta)
                              return (
                                <p className="text-sm font-medium">—</p>
                              );
                            return (
                              <>
                                <p className="text-sm font-bold">
                                  {paymentMeta.due.toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </p>
                                <p
                                  className={
                                    "text-xs inline-flex items-center px-2 py-0.5 rounded font-semibold mt-1 " +
                                    (paymentMeta.daysLeft < 0
                                      ? "bg-red-100 text-red-700"
                                      : "bg-[#ec5b13]/10 text-[#ec5b13]")
                                  }
                                >
                                  {paymentMeta.daysLeft >= 0
                                    ? paymentMeta.daysLeft + " day(s) left"
                                    : Math.abs(paymentMeta.daysLeft) +
                                      " day(s) overdue"}
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Totals Section */}
                  <section className="bg-[#ec5b13] text-white rounded-xl shadow-lg p-6 overflow-hidden relative">
                    <FiFileText className="absolute -right-4 -bottom-4 text-9xl opacity-10 rotate-12" />
                    <div className="relative z-10">
                      <h3 className="text-sm font-bold uppercase tracking-wider opacity-80">
                        Total amount paid
                      </h3>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-2xl font-normal opacity-80">
                          GH₵
                        </span>
                        <span className="text-5xl font-black">
                          {Number(detailPo.totalAmount ?? 0).toFixed(2)}
                        </span>
                      </div>
                      {detailPo.negotiatedTotalAmount != null && (
                        <p className="mt-2 text-sm opacity-90">
                          Negotiated: {fmt(Number(detailPo.negotiatedTotalAmount))}
                        </p>
                      )}
                      <div className="mt-6 pt-6 border-t border-white/20">
                        <p className="text-xs leading-relaxed opacity-90 italic">
                          This is the total you pay or paid the supplier for
                          this order.
                        </p>
                      </div>
                    </div>
                  </section>
                </aside>
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setDetailPo(null)}
                className="px-6 py-2.5 text-sm font-bold text-white bg-[#ec5b13] rounded-xl hover:bg-[#ec5b13]/90 transition-all shadow-lg shadow-[#ec5b13]/20 flex items-center gap-2"
              >
                <FiFileText className="text-lg" />
                Done Viewing
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  );
}
