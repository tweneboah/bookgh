"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import {
  useInventoryItems,
  useInventoryItem,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useSuppliers,
  useRestaurantUnits,
  useItemYields,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  EmptyState,
} from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { StockImagePicker } from "@/components/ui/stock-image-picker";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiInfo,
  FiPackage,
  FiImage,
  FiLayers,
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiPrinter,
  FiExternalLink,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { convertBaseQtyToChefYieldQty } from "@/lib/unit-conversion";
import { formatDisplayQuantity } from "@/lib/format-display-qty";

const POS_INV_FIELD_INFOS: Record<string, string> = {
  name: "Display name for this product (e.g. Rice, Vegetable Oil).",
  category: "Type of product for filtering and reports (e.g. Staples, Dairy).",
  unit: "How you track stock: kg, litre, pcs, unit, etc. All stock numbers use this base unit.",
  unitConversions: "Optional: other units that convert to base unit. Format: unit=factor (e.g. g=0.001 if base is kg). One per line or comma-separated.",
  unitCost:
    "Cost per inventory base unit (e.g. per kg). Line value uses this × current stock. When yields exist, we also show cost per chef unit (e.g. per plate).",
  currentStock: "How much you have right now, in the base unit. Set to 0 if not yet received.",
  minimumStock: "Don't let stock go below this. Used for low-stock alerts.",
  reorderLevel: "When stock reaches this level, trigger a reorder. Same unit as Current Stock.",
  supplier: "Name of the supplier you typically buy this from (for reference).",
};

/** Comprehensive inventory categories for Add/Edit – covers restaurant, bar, and general stock */
const INVENTORY_CATEGORIES = [
  "Bakery & Pastry",
  "Beverages (Alcoholic)",
  "Beverages (Non-Alcoholic)",
  "Canned & Preserved",
  "Cleaning & Sanitation",
  "Condiments & Sauces",
  "Dairy & Eggs",
  "Dry Goods & Pulses",
  "Frozen",
  "Fruits",
  "Grains & Rice",
  "Meat & Poultry",
  "Oils & Fats",
  "Paper & Disposables",
  "Seafood",
  "Spices & Seasonings",
  "Staples",
  "Vegetables",
  "Other",
] as const;

/** Units available for selection in Add/Edit. Covers weight, volume, count, and common restaurant/bar units. */
const UNIT_OPTIONS = [
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

/**
 * Auto-fill Unit Conversions when user picks a base unit.
 * Must have an entry for every UNIT_OPTIONS.value (lookup uses value.toLowerCase()).
 * Format: unit=factor (factor = base units per 1 of that unit). Empty = no conversions (count/pack units).
 */
const DEFAULT_UNIT_CONVERSIONS: Record<string, string> = {
  // Weight
  kg: "g=0.001, mg=0.000001",
  g: "kg=1000, mg=0.001",
  // Volume
  litre: "ml=0.001, L=1",
  liters: "ml=0.001, L=1",
  l: "ml=0.001, litre=1",
  L: "ml=0.001, litre=1",
  ml: "litre=1000, L=1000",
  // Count / pack (no conversion)
  pcs: "",
  unit: "",
  units: "",
  bottle: "",
  bottles: "",
  can: "",
  cans: "",
  box: "",
  boxes: "",
  pack: "",
  packs: "",
  bunch: "",
  bunches: "",
  bag: "",
  bags: "",
  jar: "",
  jars: "",
  tin: "",
  tins: "",
  carton: "",
  cartons: "",
  dozen: "",
  slice: "",
  slices: "",
  portion: "",
  portions: "",
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
  const info = POS_INV_FIELD_INFOS[infoKey] ?? "";
  const isOpen = openKey === infoKey;

  return (
    <div ref={isOpen ? containerRef : undefined} className="relative flex items-center gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
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
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition-colors hover:border-[#5a189a] hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
            aria-label={`Info: ${label}`}
          >
            <FiInfo className="h-3 w-3" />
          </button>
          {isOpen && (
            <div className="absolute left-0 top-full z-100 mt-1 max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg">
              {info}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const fmt = (n: number) =>
  `₵${new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`;

const fmtQty = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/** Restaurant: total base units everywhere (main store + kitchen + front). Movement / transfers use main store (`currentStock`) only. */
function effectiveBaseQty(row: any, department: string): number {
  if (
    (department === "restaurant" || department === "bar") &&
    row.totalOnHandBase != null &&
    Number.isFinite(Number(row.totalOnHandBase))
  ) {
    return Number(row.totalOnHandBase);
  }
  return Number(row.currentStock ?? 0);
}

/** Base stock with inventory unit, e.g. "40 kg" or "40.5 kg" (restaurant: one decimal; procurement: two). */
function formatStockWithBaseUnit(row: any, department: string): string {
  const base = effectiveBaseQty(row, department);
  const qty =
    (department === "restaurant" || department === "bar") ? formatDisplayQuantity(base, 1) : fmtQty(base);
  const u = String(row.unit ?? "").trim();
  return u ? `${qty} ${u}` : qty;
}

/** Resolve supplier for display: string field, or populated object with .name, or supplierId?.name */
function getSupplierDisplay(row: any): string {
  if (!row) return "—";
  const s = row.supplier;
  if (typeof s === "string" && s.trim()) return s.trim();
  if (s && typeof s === "object" && typeof s.name === "string") return s.name;
  const sid = row.supplierId;
  if (sid && typeof sid === "object" && typeof sid.name === "string") return sid.name;
  return "—";
}

function normalizeId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value._id === "string") return value._id;
  if (typeof value === "object" && value._id != null) return String(value._id);
  return String(value);
}

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const rawDept = searchParams.get("department");
  const department = (rawDept ? rawDept.toLowerCase() : "inventoryProcurement") as string;
  const isChefDept = department === "restaurant" || department === "bar";

  if (typeof window !== "undefined") {
    // Debug: track how inventory department is resolved and which layout is used
    // eslint-disable-next-line no-console
    console.log("[POS-INVENTORY] department param:", rawDept, "resolved:", department, "isChefDept:", isChefDept);
  }
  const fmtQtyDept = (n: number) =>
    isChefDept ? formatDisplayQuantity(n, 1) : fmtQty(n);
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [openInfoKey, setOpenInfoKey] = useState<string | null>(null);
  const infoPopoverRef = useRef<HTMLDivElement | null>(null);
  const [supplierFilter, setSupplierFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [hideZeroStock, setHideZeroStock] = useState(false);
  const [asOfTime, setAsOfTime] = useState(() => new Date());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!openInfoKey) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (infoPopoverRef.current && !infoPopoverRef.current.contains(e.target as Node)) {
        setOpenInfoKey(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openInfoKey]);

  const [form, setForm] = useState<{
    name: string;
    category: string;
    categoryOther: string;
    unit: string;
    unitConversionsText: string;
    currentStock: string;
    minimumStock: string;
    reorderLevel: string;
    unitCost: string;
    supplier: string;
    images: UploadedImage[];
    totalAmountEntered: string;
  }>({
    name: "",
    category: "",
    categoryOther: "",
    unit: "",
    unitConversionsText: "",
    currentStock: "",
    minimumStock: "",
    reorderLevel: "",
    unitCost: "",
    supplier: "",
    images: [],
    totalAmountEntered: "",
  });

  const RESTAURANT_PAGE_SIZE = 20;

  const listParams = useMemo(() => {
    const p: Record<string, string> = { department };
    if (categoryFilter) p.category = categoryFilter;
    if (isChefDept) {
      p.page = "1";
      p.limit = "500";
    } else {
      p.page = String(page);
      p.limit = "20";
    }
    return p;
  }, [department, categoryFilter, page]);

  const { data, isLoading } = useInventoryItems(listParams);
  const { data: allData } = useInventoryItems({ limit: "500", department });
  const { data: fullItem } = useInventoryItem(editItem?._id, { department });
  const { data: suppliersData } = useSuppliers(
    isChefDept ? { department, limit: "200" } : { limit: "0" }
  );
  const { data: restaurantUnitsData } = useRestaurantUnits(
    isChefDept ? { limit: "200", active: "true", department } : { limit: "0" }
  );
  const { data: yieldsRaw } = useItemYields(
    isChefDept ? { limit: "1000", department } : { limit: "0" }
  );
  const yieldMappings: any[] = useMemo(
    () => (Array.isArray(yieldsRaw) ? yieldsRaw : (yieldsRaw as any)?.data ?? []),
    [yieldsRaw]
  );
  const createMut = useCreateInventoryItem();
  const updateMut = useUpdateInventoryItem();
  const deleteMut = useDeleteInventoryItem();

  const items = data?.data ?? [];

  /** Item has ItemYield row(s) or legacy purchase/yield/yieldPer on the document */
  const restaurantRowHasYieldMapping = (row: any) => {
    const itemId = String(row._id);
    if (
      yieldMappings.some(
        (y: any) => String(y.inventoryItemId?._id ?? y.inventoryItemId) === itemId
      )
    ) {
      return true;
    }
    const pid = normalizeId(row.purchaseUnitId);
    const yid = normalizeId(row.yieldUnitId);
    const ypp = Number(row.yieldPerPurchaseUnit ?? 0);
    return Boolean(pid && yid && Number.isFinite(ypp) && ypp > 0);
  };

  const pagination = data?.meta?.pagination;
  const allItems = allData?.data ?? [];
  const suppliers = suppliersData?.data ?? [];
  const restaurantUnits = restaurantUnitsData?.data ?? [];
  const supplierOptions = useMemo(
    () =>
      suppliers.map((s: any) => ({
        value: s.name ?? String(s._id),
        label: s.name ?? String(s._id),
      })),
    [suppliers]
  );

  const resolveUnitName = (unitRef: any, unitId?: string) => {
    if (unitRef && typeof unitRef === "object" && (unitRef.name || unitRef.abbreviation)) {
      return unitRef.abbreviation || unitRef.name;
    }
    const id = unitId ?? (typeof unitRef === "string" ? unitRef : String(unitRef ?? ""));
    if (!id) return "?";
    const found = restaurantUnits.find((u: any) => String(u._id) === id);
    return found?.abbreviation || found?.name || "?";
  };

  const getYieldInfo = (row: any) => {
    if (!isChefDept) return null;
    const itemId = String(row._id);
    const yields = yieldMappings.filter(
      (y: any) => String(y.inventoryItemId?._id ?? y.inventoryItemId) === itemId
    );
    if (yields.length > 0) {
      const baseUnitCost = Number(row.unitCost || 0);
      return yields.map((y: any) => {
        const fromName = resolveUnitName(y.fromUnitId);
        const toName = resolveUnitName(y.toUnitId);
        const fromQty = Number(y.fromQty || 1);
        const toQty = Number(y.toQty || 1);
        const mappingBaseUnitQty = Number(y.baseUnitQty || 0);
        const costPerYield =
          mappingBaseUnitQty > 0 && toQty > 0
            ? (baseUnitCost * mappingBaseUnitQty) / toQty
            : null;
        return { fromQty, fromName, toQty, toName, costPerYield, baseUnitQty: mappingBaseUnitQty };
      });
    }
    const purchaseName = resolveUnitName(row.purchaseUnitId);
    const yieldName = resolveUnitName(row.yieldUnitId);
    const yieldPer = Number(row.yieldPerPurchaseUnit || 0);
    if (purchaseName !== "?" && yieldName !== "?" && yieldPer > 0) {
      const baseUnitCost = Number(row.unitCost || 0);
      const costPerYield = yieldPer > 0 ? baseUnitCost / yieldPer : 0;
      return [{ fromQty: 1, fromName: purchaseName, toQty: yieldPer, toName: yieldName, costPerYield }];
    }
    return null;
  };

  /** Cost per chef/yield unit (e.g. ₵5.00/plate) from the first yield mapping; null if unknown. */
  const getFirstYieldUnitCostPlain = (row: any): string | null => {
    if (!isChefDept) return null;
    const yields = getYieldInfo(row);
    if (!yields?.length) return null;
    const y = yields[0];
    let per: number | null = null;
    if (y.costPerYield != null && Number(y.costPerYield) > 0) {
      per = Number(y.costPerYield);
    } else {
      const uc = Number(row.unitCost ?? 0);
      const baseUnit = String(row.unit ?? "").trim().toLowerCase();
      const fromN = String(y.fromName ?? "").toLowerCase();
      if (y.toQty > 0 && baseUnit && fromN === baseUnit) {
        per = (uc * y.fromQty) / y.toQty;
      }
    }
    if (per == null || !Number.isFinite(per)) return null;
    return `${fmt(Math.round(per * 100) / 100)}/${y.toName}`;
  };

  /** `fromUnit` name for yield math — must match server-side convertChefQtyToBaseQty (uses RestaurantUnit `name`). */
  const yieldFromUnitNameForConversion = (y: any) => {
    if (typeof y.fromUnitId === "object" && y.fromUnitId?.name) return String(y.fromUnitId.name);
    const id = typeof y.fromUnitId === "object" ? y.fromUnitId?._id : y.fromUnitId;
    const found = restaurantUnits.find((u: any) => String(u._id) === String(id ?? ""));
    if (found?.name) return String(found.name);
    return resolveUnitName(y.fromUnitId);
  };

  /** Chef/yield equivalents for any base quantity at this row (same mappings as total on hand). */
  const getChefEquivalentsForBaseQuantity = (
    row: any,
    baseQuantity: number
  ): { label: string; qty: number }[] => {
    if (!isChefDept) return [];
    const itemId = String(row._id);
    const base = Number(baseQuantity);
    if (!Number.isFinite(base)) return [];
    const yields = yieldMappings.filter(
      (y: any) => String(y.inventoryItemId?._id ?? y.inventoryItemId) === itemId
    );
    const out: { label: string; qty: number }[] = [];
    for (const y of yields) {
      const toLabel = resolveUnitName(y.toUnitId);
      const chefQty = convertBaseQtyToChefYieldQty({
        baseQuantity: base,
        item: row,
        yieldRow: {
          fromQty: Number(y.fromQty || 1),
          toQty: Number(y.toQty || 1),
          baseUnitQty: y.baseUnitQty != null ? Number(y.baseUnitQty) : undefined,
          fromUnitName: yieldFromUnitNameForConversion(y),
        },
      });
      if (chefQty != null && Number.isFinite(chefQty) && chefQty >= 0) {
        out.push({ label: toLabel, qty: chefQty });
      }
    }
    return out;
  };

  /** Live chef/yield equivalents for current total base stock (updates when orders deduct stock). */
  const getChefEquivalentsForStock = (row: any): { label: string; qty: number }[] =>
    getChefEquivalentsForBaseQuantity(row, effectiveBaseQty(row, department));

  /** One location line: `4.1 kg (≈ 98.2 Plates)` when yields exist, else `4.1 kg`. */
  const formatLocationStockWithYield = (row: any, qty: number): string => {
    const baseU = String(row.unit ?? "").trim();
    const qtyStr = baseU ? `${fmtQtyDept(qty)} ${baseU}` : fmtQtyDept(qty);
    const eqs = getChefEquivalentsForBaseQuantity(row, qty);
    if (eqs.length === 0) return qtyStr;
    const inner = eqs
      .map((e) => `≈ ${formatDisplayQuantity(e.qty, 1)} ${e.label}`)
      .join(" · ");
    return `${qtyStr} (${inner})`;
  };

  /** First chef/yield equivalent for reporting columns (e.g. "100 serves"). */
  const getPrimaryYieldLabel = (row: any): string => {
    const eqs = getChefEquivalentsForStock(row);
    if (!eqs.length) return "—";
    const e = eqs[0];
    return `${formatDisplayQuantity(e.qty, 1)} ${e.label}`;
  };

  // When edit modal is open, sync form from full item fetch (ensures supplier and all fields are correct)
  useEffect(() => {
    if (!showModal || !editItem || !fullItem) return;
    const item = fullItem as any;
    const supplierValue =
      typeof item?.supplier === "string" && item.supplier.trim()
        ? item.supplier.trim()
        : getSupplierDisplay(item) !== "—"
          ? getSupplierDisplay(item)
          : "";
    const images = Array.isArray(item.images)
      ? (item.images as { url: string; caption?: string }[]).map((img) => ({
          url: img.url,
          caption: img.caption,
        }))
      : [];
    setForm((prev) => ({
      ...prev,
      name: item.name ?? prev.name,
      category: item.category ?? prev.category,
      categoryOther: "",
      unit: item.unit ?? prev.unit,
      unitConversionsText: Array.isArray(item.unitConversions)
        ? item.unitConversions.map((row: any) => `${row.unit}=${row.factor}`).join(", ")
        : prev.unitConversionsText,
      currentStock: item.currentStock != null ? String(item.currentStock) : prev.currentStock,
      minimumStock: item.minimumStock != null ? String(item.minimumStock) : prev.minimumStock,
      reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : prev.reorderLevel,
      unitCost: item.unitCost != null ? String(item.unitCost) : prev.unitCost,
      supplier: supplierValue,
      images,
      totalAmountEntered: "",
    }));
  }, [showModal, editItem?._id, fullItem]);

  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    allItems.forEach((item: any) => {
      if (item.category) cats.add(item.category);
    });
    return [
      { value: "", label: "All Categories" },
      ...Array.from(cats).sort().map((c) => ({ value: c, label: c })),
    ];
  }, [allItems]);

  /** Categories for Add/Edit form: comprehensive list + any existing in data (for edit), sorted */
  const formCategoryOptions = useMemo(() => {
    const set = new Set<string>(INVENTORY_CATEGORIES);
    allItems.forEach((item: any) => {
      if (item.category?.trim()) set.add(item.category.trim());
    });
    return Array.from(set).sort().map((c) => ({ value: c, label: c }));
  }, [allItems]);

  /** Units for Add/Edit form: standard list + any existing in data (for edit), same order as UNIT_OPTIONS then extras sorted */
  const formUnitOptions = useMemo(() => {
    const known = new Set(UNIT_OPTIONS.map((u) => u.value));
    const extra: string[] = [];
    allItems.forEach((item: any) => {
      if (item.unit?.trim() && !known.has(item.unit.trim())) {
        known.add(item.unit.trim());
        extra.push(item.unit.trim());
      }
    });
    const base = UNIT_OPTIONS.map((u) => ({ value: u.value, label: u.label }));
    const extraOpts = extra.sort().map((u) => ({ value: u, label: u }));
    return [...base, ...extraOpts];
  }, [allItems]);

  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      categoryOther: "",
      unit: "",
      unitConversionsText: "",
      currentStock: "",
      minimumStock: "",
      reorderLevel: "",
      unitCost: "",
      supplier: "",
      images: [],
      totalAmountEntered: "",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const images = Array.isArray(item.images)
      ? (item.images as { url: string; caption?: string }[]).map((img) => ({
          url: img.url,
          caption: img.caption,
        }))
      : [];
    // Prefer item.supplier string, then getSupplierDisplay (handles populated supplierId/supplier object)
    const supplierValue =
      typeof item?.supplier === "string" && item.supplier.trim()
        ? item.supplier.trim()
        : getSupplierDisplay(item) !== "—"
          ? getSupplierDisplay(item)
          : "";
    setForm({
      name: item.name ?? "",
      category: item.category ?? "",
      categoryOther: "",
      unit: item.unit ?? "",
      unitConversionsText: Array.isArray(item.unitConversions)
        ? item.unitConversions
            .map((row: any) => `${row.unit}=${row.factor}`)
            .join(", ")
        : "",
      currentStock: item.currentStock != null ? String(item.currentStock) : "",
      minimumStock: item.minimumStock != null ? String(item.minimumStock) : "",
      reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : "",
      unitCost: item.unitCost != null ? String(item.unitCost) : "",
      supplier: supplierValue,
      images,
      totalAmountEntered: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const categoryValue =
      form.category === "Other"
        ? (form.categoryOther?.trim() || "Other")
        : form.category.trim();
    if (!form.name.trim() || !categoryValue) {
      toast.error("Name and category are required");
      return;
    }
    if (!form.unit?.trim()) {
      toast.error("Unit is required (use the same unit for this item everywhere)");
      return;
    }

    const payload = {
      category: categoryValue,
      unitConversions: form.unitConversionsText
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [unitRaw, factorRaw] = entry.split("=");
          return {
            unit: String(unitRaw ?? "").trim(),
            factor: Number(String(factorRaw ?? "").trim()),
          };
        })
        .filter((entry) => entry.unit && Number.isFinite(entry.factor) && entry.factor > 0),
      name: form.name.trim(),
      unit: form.unit.trim(),
      images: form.images.length
        ? form.images.map((img) => ({ url: img.url, caption: img.caption || undefined }))
        : undefined,
      currentStock: form.currentStock ? parseFloat(form.currentStock) : 0,
      minimumStock: form.minimumStock ? parseFloat(form.minimumStock) : 0,
      reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : 0,
      unitCost: form.unitCost ? parseFloat(form.unitCost) : 0,
      supplier: form.supplier.trim() || undefined,
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, department, ...payload });
        toast.success("Inventory item updated");
      } else {
        await createMut.mutateAsync({ ...payload, department });
        toast.success("Inventory item created");
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
      await deleteMut.mutateAsync({ id: showDelete, department });
      toast.success("Inventory item deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const isLowStock = (row: any) => {
    const cur = effectiveBaseQty(row, department);
    const min = row.minimumStock ?? 0;
    return min > 0 && cur <= min;
  };

  const lineStockValue = (row: any) => {
    const qty = effectiveBaseQty(row, department);
    const cost = Number(row.unitCost ?? 0);
    if (!Number.isFinite(qty) || !Number.isFinite(cost)) return 0;
    return Number((qty * cost).toFixed(2));
  };

  const filteredItems = useMemo(() => {
    let out = items;
    const q = searchFilter.trim().toLowerCase();
    if (q) {
      out = out.filter((row: any) => String(row?.name ?? "").toLowerCase().includes(q));
    }
    if (supplierFilter.trim()) {
      const s = supplierFilter.trim().toLowerCase();
      out = out.filter((row: any) => getSupplierDisplay(row).toLowerCase().includes(s));
    }
    if (lowStockOnly) {
      out = out.filter((row: any) => {
        const cur = effectiveBaseQty(row, department);
        const min = row.minimumStock ?? 0;
        return min > 0 && cur <= min;
      });
    }
    if (hideZeroStock) {
      out = out.filter((row: any) => effectiveBaseQty(row, department) > 0);
    }
    return out;
  }, [items, searchFilter, supplierFilter, lowStockOnly, hideZeroStock, department]);

  const restaurantUnmappedYieldCount = useMemo(() => {
    if (!isChefDept) return 0;
    return filteredItems.filter((row: any) => !restaurantRowHasYieldMapping(row)).length;
  }, [isChefDept, filteredItems, yieldMappings]);

  const lowStockCount = useMemo(
    () => filteredItems.filter((row: any) => isLowStock(row)).length,
    [filteredItems, department]
  );

  const totalInventoryValue = useMemo(() => {
    return filteredItems.reduce((sum: number, row: any) => {
      const qty = effectiveBaseQty(row, department);
      const cost = Number(row.unitCost ?? 0);
      if (!Number.isFinite(qty) || !Number.isFinite(cost)) return sum;
      return sum + qty * cost;
    }, 0);
  }, [filteredItems, department]);

  /** Table rows: client-side page for restaurant; server page for other departments. */
  const displayItems = useMemo(() => {
    if (!isChefDept) return filteredItems;
    const start = (page - 1) * RESTAURANT_PAGE_SIZE;
    return filteredItems.slice(start, start + RESTAURANT_PAGE_SIZE);
  }, [department, filteredItems, page]);

  const listPagination = useMemo(() => {
    if (isChefDept) {
      const total = filteredItems.length;
      const limit = RESTAURANT_PAGE_SIZE;
      const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
      return {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    }
    return pagination;
  }, [department, filteredItems.length, page, pagination]);

  useEffect(() => {
    if (!isLoading && data) setAsOfTime(new Date());
  }, [isLoading, data]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, searchFilter, supplierFilter, lowStockOnly, hideZeroStock, department]);

  const csvEscape = (v: string) => {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const fetchAllInventoryForExport = async (): Promise<any[]> => {
    const all: any[] = [];
    let p = 1;
    const limit = 500;
    while (true) {
      const qs = new URLSearchParams({
        department,
        page: String(p),
        limit: String(limit),
      });
      if (categoryFilter) qs.set("category", categoryFilter);
      const res = await apiClient.get(`/pos/inventory?${qs.toString()}`);
      const payload = res.data;
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const meta = payload?.meta?.pagination;
      all.push(...rows);
      if (!meta?.hasNext || rows.length === 0) break;
      p += 1;
      if (p > 400) break;
    }
    return all;
  };

  const buildExportRows = (rows: any[]) => {
    let out = rows;
    const q = searchFilter.trim().toLowerCase();
    if (q) {
      out = out.filter((row: any) => String(row?.name ?? "").toLowerCase().includes(q));
    }
    if (supplierFilter.trim()) {
      const s = supplierFilter.trim().toLowerCase();
      out = out.filter((row: any) => getSupplierDisplay(row).toLowerCase().includes(s));
    }
    if (lowStockOnly) {
      out = out.filter((row: any) => {
        const cur = effectiveBaseQty(row, department);
        const min = row.minimumStock ?? 0;
        return min > 0 && cur <= min;
      });
    }
    if (hideZeroStock) {
      out = out.filter((row: any) => effectiveBaseQty(row, department) > 0);
    }
    return out;
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const total = pagination?.total ?? items.length;
      const needFetchAll = items.length < total || !isChefDept;
      const sourceRows = needFetchAll ? await fetchAllInventoryForExport() : items;
      const finalRows = buildExportRows(sourceRows);

      const header: string[] = [
        "Name",
        ...(isChefDept ? ["Total on hand (base)"] : ["Unit", "Current Stock"]),
        ...(isChefDept ? ["Stock (chef plain)"] : []),
        "Min",
        "Reorder",
        "Unit Cost (base)",
        ...(isChefDept ? ["Unit cost (chef)"] : []),
        "Line Value (₵)",
        ...(isChefDept ? ["Yield mapping", "Primary yield"] : []),
        "Supplier",
      ];

      const lines = [header.join(",")];
      for (const row of finalRows) {
        const stock = Number(row.currentStock ?? 0);
        const lv = lineStockValue(row);
        const chefPlain =
          isChefDept
            ? getChefEquivalentsForStock(row)
                .map((e) => `${formatDisplayQuantity(e.qty, 1)} ${e.label}`)
                .join(" · ") || ""
            : "";
        const ymap =
          isChefDept
            ? (() => {
                const yields = getYieldInfo(row);
                if (!yields?.length) return "";
                const y = yields[0];
                return `${formatDisplayQuantity(Number(y.fromQty), 1)} ${y.fromName} → ${formatDisplayQuantity(Number(y.toQty), 1)} ${y.toName}`;
              })()
            : "";
        const primary = isChefDept ? getPrimaryYieldLabel(row) : "";
        const cells: string[] = [csvEscape(String(row.name ?? ""))];
        if (isChefDept) {
          cells.push(csvEscape(formatStockWithBaseUnit(row, department)));
        } else {
          cells.push(csvEscape(String(row.unit ?? "")), csvEscape(fmtQty(stock)));
        }
        if (isChefDept) cells.push(csvEscape(chefPlain));
        cells.push(
          csvEscape(fmtQtyDept(Number(row.minimumStock ?? 0))),
          csvEscape(fmtQtyDept(Number(row.reorderLevel ?? 0))),
          csvEscape(row.unitCost != null ? String(row.unitCost) : "")
        );
        if (isChefDept) {
          cells.push(csvEscape(getFirstYieldUnitCostPlain(row) ?? ""));
        }
        cells.push(csvEscape(fmt(lv)));
        if (isChefDept) {
          cells.push(csvEscape(ymap), csvEscape(primary === "—" ? "" : primary));
        }
        cells.push(csvEscape(getSupplierDisplay(row)));
        lines.push(cells.join(","));
      }

      const blob = new Blob(["\uFEFF" + lines.join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-${department}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${finalRows.length} rows`);
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handlePrintReport = () => {
    const rows = filteredItems;
    const title =
      isChefDept ? `${department === 'bar' ? 'Bar' : 'Restaurant'} inventory report` : "POS inventory report";
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Allow pop-ups to print");
      return;
    }
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 1.25rem; margin: 0 0 8px; }
        .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
        .kpi { display: flex; gap: 24px; margin-bottom: 20px; font-size: 14px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; }
        .num { text-align: right; }
        @media print { body { padding: 12px; } }
      </style></head><body>`);
    w.document.write(`<h1>${title}</h1>`);
    w.document.write(
      `<div class="meta">As of ${asOfTime.toLocaleString()} · Category: ${categoryFilter || "All"} · Search: ${searchFilter || "—"}</div>`
    );
    w.document.write(
      `<div class="kpi"><span><strong>Items</strong> ${rows.length}</span><span><strong>Low stock</strong> ${lowStockCount}</span><span><strong>Total value</strong> ${fmt(totalInventoryValue)}</span></div>`
    );
    w.document.write("<table><thead><tr>");
    const ths =
      isChefDept
        ? ["Name", "Stock", "Primary yield", "Line value", "Supplier"]
        : ["Name", "Unit", "Stock", "Supplier"];
    ths.forEach((h) => w.document.write(`<th>${h}</th>`));
    w.document.write("</tr></thead><tbody>");
    for (const row of rows.slice(0, 500)) {
      w.document.write("<tr>");
      w.document.write(`<td>${String(row.name ?? "").replace(/</g, "&lt;")}</td>`);
      if (isChefDept) {
        w.document.write(
          `<td class="num">${String(formatStockWithBaseUnit(row, department)).replace(/</g, "&lt;")}</td>`
        );
        w.document.write(`<td>${getPrimaryYieldLabel(row).replace(/</g, "&lt;")}</td>`);
        w.document.write(`<td class="num">${fmt(lineStockValue(row))}</td>`);
      } else {
        w.document.write(`<td>${String(row.unit ?? "").replace(/</g, "&lt;")}</td>`);
        w.document.write(`<td class="num">${fmtQty(Number(row.currentStock ?? 0))}</td>`);
      }
      w.document.write(`<td>${getSupplierDisplay(row).replace(/</g, "&lt;")}</td>`);
      w.document.write("</tr>");
    }
    w.document.write("</tbody></table>");
    if (rows.length > 500) {
      w.document.write(
        `<p style="font-size:12px;color:#666">Showing first 500 of ${rows.length} rows. Use CSV export for the full list.</p>`
      );
    }
    w.document.write("</body></html>");
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  const supplierNamesFromItems = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((row: any) => {
      const d = getSupplierDisplay(row);
      if (d && d !== "—") set.add(d);
    });
    return Array.from(set).sort();
  }, [allItems]);

  const tableColumns = isChefDept
    ? [
        {
          key: "images",
          header: "",
          render: (row: any) => {
            const imgs = Array.isArray(row.images) ? row.images : [];
            if (imgs.length === 0)
              return (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                  <FiImage className="h-4 w-4" />
                </span>
              );
            return (
              <div className="flex gap-1">
                {imgs.slice(0, 2).map((img: { url: string; caption?: string }, i: number) => (
                  <a
                    key={i}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ring-1 ring-slate-100 transition hover:ring-[#5a189a]/30"
                  >
                    <img src={img.url} alt={img.caption || `Image ${i + 1}`} className="h-full w-full object-cover" />
                  </a>
                ))}
                {imgs.length > 2 && (
                  <span className="flex h-9 items-center text-xs font-medium text-slate-400">
                    +{imgs.length - 2}
                  </span>
                )}
              </div>
            );
          },
        },
        { key: "name", header: "Name", sortable: true },
        {
          key: "totalOnHand",
          header: "Total on hand",
          render: (row: any) => (
            <div className="text-sm text-slate-700">
              {formatStockWithBaseUnit(row, department)}
            </div>
          ),
        },
        {
          key: "minimumStock",
          header: "Min",
          render: (row: any) => fmtQtyDept(Number(row.minimumStock ?? 0)),
        },
        {
          key: "reorderLevel",
          header: "Reorder",
          render: (row: any) => fmtQtyDept(Number(row.reorderLevel ?? 0)),
        },
        {
          key: "unitCostCombined",
          header: "Unit cost (base + chef)",
          render: (row: any) => {
            const base = row.unitCost != null ? fmt(row.unitCost) : null;
            const chef = getFirstYieldUnitCostPlain(row);
            const baseUnit = String(row.unit ?? "").trim();
            return (
              <div className="flex flex-col text-xs text-slate-700">
                <span>
                  {base ?? "—"}
                  {base && baseUnit && (
                    <span className="ml-1 text-[11px] text-slate-500">
                      per {baseUnit} (base)
                    </span>
                  )}
                </span>
                {chef && (
                  <span className="text-slate-500">
                    {chef} <span className="ml-0.5 text-[11px] text-slate-500">(chef)</span>
                  </span>
                )}
              </div>
            );
          },
        },
        {
          key: "lineValue",
          header: "Line value",
          render: (row: any) => fmt(lineStockValue(row)),
        },
        {
          key: "primaryYield",
          header: "Primary yield",
          render: (row: any) => getPrimaryYieldLabel(row),
        },
        {
          key: "yieldMapping",
          header: "Chef Unit / Yield",
          render: (row: any) => {
            const info = getYieldInfo(row);
            if (!info || !info.length) {
              const href =
                department === "bar"
                  ? "/bar/units?tab=yields"
                  : "/restaurant/units?tab=yields";
              return (
                <Link
                  href={href}
                  className="text-xs font-semibold text-[#ff6d00] hover:underline"
                >
                  Add mapping
                </Link>
              );
            }
            const y = info[0];
            const label = `${formatDisplayQuantity(Number(y.fromQty), 1)} ${y.fromName} → ${formatDisplayQuantity(
              Number(y.toQty),
              1
            )} ${y.toName}`;
            return <span className="text-xs text-slate-700">{label}</span>;
          },
        },
        {
          key: "supplier",
          header: "Supplier",
          render: (row: any) => {
            const name = getSupplierDisplay(row);
            return name !== "—" ? <span className="text-slate-600">{name}</span> : "—";
          },
        },
        {
          key: "actions",
          header: "",
          render: (row: any) => (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEdit(row)}
                aria-label="Edit"
                className="text-slate-500 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
              >
                <FiEdit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDelete(row._id)}
                aria-label="Delete"
                className="text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <FiTrash2 className="h-4 w-4" />
              </Button>
            </div>
          ),
        },
      ]
    : [
        {
          key: "images",
          header: "",
          render: (row: any) => {
            const imgs = Array.isArray(row.images) ? row.images : [];
            if (imgs.length === 0)
              return (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                  <FiImage className="h-4 w-4" />
                </span>
              );
            return (
              <div className="flex gap-1">
                {imgs.slice(0, 2).map((img: { url: string; caption?: string }, i: number) => (
                  <a
                    key={i}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ring-1 ring-slate-100 transition hover:ring-[#5a189a]/30"
                  >
                    <img src={img.url} alt={img.caption || `Image ${i + 1}`} className="h-full w-full object-cover" />
                  </a>
                ))}
                {imgs.length > 2 && (
                  <span className="flex h-9 items-center text-xs font-medium text-slate-400">
                    +{imgs.length - 2}
                  </span>
                )}
              </div>
            );
          },
        },
        { key: "name", header: "Name", sortable: true },
        { key: "unit", header: "Unit", render: (row: any) => row.unit ?? "—" },
        {
          key: "currentStock",
          header: "Current Stock",
          render: (row: any) => (
            <span className={isLowStock(row) ? "font-semibold text-[#c2410c]" : "text-slate-700"}>
              {fmtQty(Number(row.currentStock ?? 0))}
            </span>
          ),
        },
        {
          key: "minimumStock",
          header: "Min",
          render: (row: any) => fmtQty(Number(row.minimumStock ?? 0)),
        },
        {
          key: "reorderLevel",
          header: "Reorder",
          render: (row: any) => fmtQty(Number(row.reorderLevel ?? 0)),
        },
        {
          key: "unitCost",
          header: "Unit Cost",
          render: (row: any) => (row.unitCost != null ? fmt(row.unitCost) : "—"),
        },
        {
          key: "supplier",
          header: "Supplier",
          render: (row: any) => {
            const name = getSupplierDisplay(row);
            return name !== "—" ? <span className="text-slate-600">{name}</span> : "—";
          },
        },
        {
          key: "actions",
          header: "",
          render: (row: any) => (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEdit(row)}
                aria-label="Edit"
                className="text-slate-500 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
              >
                <FiEdit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDelete(row._id)}
                aria-label="Delete"
                className="text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <FiTrash2 className="h-4 w-4" />
              </Button>
            </div>
          ),
        },
      ];

  if (typeof window !== "undefined") {
    // Debug: inspect table columns actually passed to DataTable
    // eslint-disable-next-line no-console
    console.log(
      "[POS-INVENTORY] tableColumns for",
      department,
      tableColumns.map((c) => c.header)
    );
  }

  const title = isChefDept ? (department === "bar" ? "Bar Inventory" : "Restaurant Inventory") : "POS Inventory";
  const isEmpty = !isLoading && items.length === 0;
  const noFilterMatches = !isLoading && items.length > 0 && filteredItems.length === 0;
  const hasNext = listPagination ? listPagination.hasNext : false;
  const hasPrev = listPagination ? listPagination.hasPrev : false;

  return (
    <div className="min-h-screen w-full min-w-0 bg-[#f8f6f6] text-slate-900">
      <div className="w-full max-w-full min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <FiPackage className="text-[#ec5b13] text-3xl" aria-hidden />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
            </div>
            <p className="text-slate-600 text-sm">
              Manage stock, units, costs and reorder levels for your items.
            </p>
            {isChefDept ? (
              <p className="text-xs text-slate-600 max-w-2xl">
                Stock column shows <span className="font-medium">total on hand</span> (main + kitchen/prep +
                front house). Hover for the split. <span className="font-medium">Served orders</span>{" "}
                deduct only from <span className="font-medium">front house</span>; use Movement flow
                to stage stock (main → kitchen/prep → front house) before service.
              </p>
            ) : null}
            <p className="text-xs text-slate-500">
              Snapshot as of {asOfTime.toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isChefDept ? (
              <>
                <Link
                  href={`/${department}/stock-control/ledger`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FiExternalLink className="h-4 w-4" />
                  Movement ledger
                </Link>
                <Link
                  href={`/reports/${department}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FiExternalLink className="h-4 w-4" />
                  Reports
                </Link>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={exporting || isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <FiDownload className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
            <button
              type="button"
              onClick={handlePrintReport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <FiPrinter className="h-4 w-4" />
              Print report
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm"
            >
              <FiPlus className="h-5 w-5" aria-hidden />
              <span>Add Item</span>
            </button>
          </div>
        </header>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-[#ec5b13]/10 p-3 rounded-lg text-[#ec5b13]">
              <FiLayers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Items
              </p>
              <p className="text-2xl font-bold">{pagination?.total ?? 0}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-orange-200 shadow-sm flex items-center gap-4 border-l-4 border-l-[#ec5b13]">
            <div className="bg-[#ec5b13]/10 p-3 rounded-lg text-[#ec5b13]">
              <FiAlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Low Stock
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{lowStockCount}</p>
                {lowStockCount > 0 ? (
                  <span className="text-xs px-2 py-0.5 bg-[#ec5b13]/10 text-[#ec5b13] rounded-full font-semibold">
                    Action Required
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-slate-100 p-3 rounded-lg text-slate-600">
              <span className="font-bold">₵</span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Inventory Value
              </p>
              <p className="text-2xl font-bold">{fmt(totalInventoryValue)}</p>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">
              Category
            </label>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 appearance-none focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] outline-none"
              >
                {categoryOptions.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="absolute right-2 top-2 pointer-events-none text-slate-400">
                ▾
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">
              Search
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">⌕</span>
              <input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-3 focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] outline-none"
                placeholder="Search inventory items..."
                type="text"
              />
            </div>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">
              Supplier
            </label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:ring-2 focus:ring-[#ec5b13]/30 focus:border-[#ec5b13] outline-none"
            >
              <option value="">All suppliers</option>
              {supplierNamesFromItems.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#ec5b13] focus:ring-[#ec5b13]"
            />
            Low stock only
          </label>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={hideZeroStock}
              onChange={(e) => setHideZeroStock(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#ec5b13] focus:ring-[#ec5b13]"
            />
            Hide zero stock
          </label>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : isEmpty ? (
            <div className="p-6">
              <EmptyState
                icon={FiPackage as any}
                title="No inventory items"
                description="Add your first inventory item to get started."
                action={{ label: "Add Item", onClick: openCreate }}
                actionClassName="bg-[#ec5b13] hover:bg-[#ec5b13]/90"
              />
            </div>
          ) : noFilterMatches ? (
            <div className="p-8 text-center text-slate-600">
              <p className="font-medium text-slate-800">No items match your filters</p>
              <p className="mt-1 text-sm">Try clearing search, supplier, or stock filters.</p>
            </div>
          ) : (
            <>
              {isChefDept && restaurantUnmappedYieldCount > 0 ? (
                <div className="border-b border-amber-100 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:px-6">
                  <strong>{restaurantUnmappedYieldCount}</strong>{" "}
                  {restaurantUnmappedYieldCount === 1 ? "item has" : "items have"} no{" "}
                  <span className="font-semibold">yield mapping</span>. Add one under{" "}
                  <Link
                    href={department === "bar" ? "/bar/units" : "/restaurant/units?tab=yields"}
                    className="font-semibold text-[#c2410c] underline underline-offset-2 hover:text-amber-900"
                  >
                    {department === "bar" ? "Bar → Units & Yields" : "Restaurant → Units → Yield mappings"}
                  </Link>{" "}
                  so chef units and transfers convert correctly.
                </div>
              ) : null}
              <div className="w-full min-w-0 overflow-x-auto">
                <table className="w-full min-w-0 table-auto text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Image
                      </th>
                      <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Name
                      </th>
                      {isChefDept ? (
                        <th
                          className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right"
                          title="Sum of main store + kitchen + front house. Transfers from Main Store use only the main-store portion (see breakdown below)."
                        >
                          Total on hand
                        </th>
                      ) : (
                        <>
                          <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                            Unit
                          </th>
                          <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                            Stock
                          </th>
                        </>
                      )}
                      <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                        Min
                      </th>
                      <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                        Reorder
                      </th>
                      <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                        {isChefDept ? (
                          <span title="Base unit cost (e.g. per kg) and chef/yield cost when configured">
                            Unit cost (base + chef)
                          </span>
                        ) : (
                          "Unit Cost"
                        )}
                      </th>
                      {isChefDept ? (
                        <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                          Line value
                        </th>
                      ) : null}
                      {isChefDept ? (
                        <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Primary yield
                        </th>
                      ) : null}
                      {isChefDept ? (
                        <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Chef Unit / Yield
                        </th>
                      ) : null}
                      <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Supplier
                      </th>
                      <th className="px-2 py-2.5 sm:px-3 sm:py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayItems.map((row: any) => {
                      const low = isLowStock(row);
                      const imgs = Array.isArray(row.images) ? row.images : [];
                      const firstImg = imgs[0] as { url?: string; caption?: string } | undefined;
                      return (
                        <tr
                          key={row._id}
                          className={
                            low
                              ? "bg-[#ec5b13]/5 hover:bg-[#ec5b13]/10 transition-colors"
                              : "hover:bg-slate-50/50 transition-colors"
                          }
                        >
                          <td className="px-2 py-2.5 sm:px-3 sm:py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-11 w-11 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                {firstImg?.url ? (
                                  <img
                                    src={firstImg.url}
                                    alt={firstImg.caption || row.name || "Inventory image"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                                    <FiImage className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              {imgs.length > 1 ? (
                                <span className="text-xs font-semibold text-slate-500">
                                  +{imgs.length - 1}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-2 py-2.5 sm:px-3 sm:py-3 font-semibold">
                            <div className="flex flex-col gap-1">
                              <span className={low ? "font-bold flex items-center gap-2" : ""}>
                                {row.name ?? "—"}
                                {low ? (
                                  <span
                                    className="text-[#ec5b13] text-[16px]"
                                    title="Low Stock"
                                  >
                                    !
                                  </span>
                                ) : null}
                              </span>
                              {isChefDept && !restaurantRowHasYieldMapping(row) ? (
                                <div className="max-w-[280px] text-xs font-normal text-slate-600">
                                  <span className="inline-block rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">
                                    No yield mapping
                                  </span>{" "}
                                  <Link
                                    href={department === "bar" ? "/bar/units" : "/restaurant/units?tab=yields"}
                                    className="font-medium text-[#ec5b13] underline hover:text-[#c2410c]"
                                  >
                                    Add mapping
                                  </Link>
                                </div>
                              ) : null}
                            </div>
                          </td>
                          {isChefDept ? (
                            <td
                              className={
                                low
                                  ? "px-2 py-2.5 sm:px-3 sm:py-3 text-sm text-right font-bold text-[#ec5b13]"
                                  : "px-2 py-2.5 sm:px-3 sm:py-3 text-sm text-right font-medium text-slate-800"
                              }
                              title={
                                row.stockByLocation
                                  ? `Total matches the large figure. Main store = what Movement Flow calls “Available at Main Store”.`
                                  : undefined
                              }
                            >
                              <div className="inline-block text-right">
                                <div>{formatStockWithBaseUnit(row, department)}</div>
                                {row.stockByLocation ? (
                                  <div className="mt-1 max-w-[min(100%,28rem)] text-[11px] font-normal leading-snug text-slate-500">
                                    Main store{" "}
                                    {formatLocationStockWithYield(
                                      row,
                                      Number(row.stockByLocation.mainStore ?? 0)
                                    )}{" "}
                                    · Kitchen{" "}
                                    {formatLocationStockWithYield(
                                      row,
                                      Number(row.stockByLocation.kitchen ?? 0)
                                    )}{" "}
                                    · Front{" "}
                                    {formatLocationStockWithYield(
                                      row,
                                      Number(row.stockByLocation.frontHouse ?? 0)
                                    )}
                                  </div>
                                ) : null}
                                {(() => {
                                  const eqs = getChefEquivalentsForStock(row);
                                  if (eqs.length === 0) return null;
                                  const chefStr = eqs
                                    .map((e) => `${formatDisplayQuantity(e.qty, 1)} ${e.label}`)
                                    .join(" · ");
                                  return (
                                    <div
                                      className="mt-1 max-w-prose text-xs font-normal leading-snug text-slate-500"
                                      title="Plain English stock from Units & Yields (updates with sales)"
                                    >
                                      ≈ {chefStr}
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
                        ) : (
                          <>
                            <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-sm text-center">
                              {row.unit ?? "—"}
                            </td>
                            <td
                              className={
                                low
                                  ? "px-2 py-2.5 sm:px-3 sm:py-3 text-sm text-right font-bold text-[#ec5b13]"
                                  : "px-2 py-2.5 sm:px-3 sm:py-3 text-sm text-right font-medium"
                              }
                            >
                              <span className={low ? undefined : "text-slate-700"}>
                                {fmtQty(Number(row.currentStock ?? 0))}
                              </span>
                            </td>
                          </>
                        )}
                          <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-sm text-right">
                            {fmtQtyDept(Number(row.minimumStock ?? 0))}
                          </td>
                          <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-sm text-right">
                            {fmtQtyDept(Number(row.reorderLevel ?? 0))}
                          </td>
                          <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-sm text-right">
                            {row.unitCost != null ? (
                              isChefDept ? (
                                <div className="inline-block text-right">
                                  <div className="font-medium text-slate-900">
                                    {fmt(Number(row.unitCost ?? 0))}
                                  </div>
                                  <div className="text-[11px] font-normal text-slate-500">
                                    per {String(row.unit ?? "unit").trim() || "unit"} (base)
                                  </div>
                                  {(() => {
                                    const chefCost = getFirstYieldUnitCostPlain(row);
                                    if (!chefCost) return null;
                                    return (
                                      <div
                                        className="mt-0.5 text-[11px] font-medium text-[#5a189a]"
                                        title="From Units & Yields: cost per chef/yield unit"
                                      >
                                        {chefCost} (chef)
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (
                                fmt(Number(row.unitCost ?? 0))
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                          {isChefDept ? (
                            <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-sm text-right font-medium text-slate-800">
                              {fmt(lineStockValue(row))}
                            </td>
                          ) : null}
                          {isChefDept ? (
                            <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-sm text-slate-700">
                              {getPrimaryYieldLabel(row)}
                            </td>
                          ) : null}
                          {isChefDept ? (
                            <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-sm italic text-slate-500">
                              {(() => {
                                const yields = getYieldInfo(row);
                                if (!yields || yields.length === 0) return "—";
                                const y = yields[0];
                                const costPer = y.costPerYield != null ? fmt(Math.round(y.costPerYield * 100) / 100) : null;
                                return `${y.fromQty} ${y.fromName} → ${y.toQty} ${y.toName}${
                                  costPer ? ` (${costPer}/${y.toName})` : ""
                                }`;
                              })()}
                            </td>
                          ) : null}
                          <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-sm">
                            {getSupplierDisplay(row) !== "—" ? (
                              <span className={low ? "font-medium" : ""}>
                                {getSupplierDisplay(row)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-2 py-2.5 sm:px-3 sm:py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="p-1.5 text-slate-400 hover:text-[#ec5b13] transition-colors"
                                aria-label="Edit"
                              >
                                <FiEdit2 className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDelete(row._id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                aria-label="Delete"
                              >
                                <FiTrash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination / Footer */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Showing {displayItems.length} on this page · {filteredItems.length} match filters
                  {isChefDept && pagination?.total != null
                    ? ` · ${pagination.total} in category (max 500 loaded)`
                    : null}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!hasPrev || isLoading}
                    className="p-1 border border-slate-200 rounded bg-white text-slate-400 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-xs font-bold px-2 py-1 bg-[#ec5b13] text-white rounded">
                    {page}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNext || isLoading}
                    className="p-1 border border-slate-200 rounded bg-white text-slate-400 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <FiChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal — white theme, purple focus, orange CTA */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title=""
        size="6xl"
        className="max-h-[90vh] overflow-hidden bg-[#f8f6f6] p-0 rounded-2xl border border-slate-200"
      >
        <div className="max-w-[960px] mx-auto min-h-[80vh] flex flex-col">
          {/* Header Section */}
          <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sticky top-0 bg-[#f8f6f6] z-10">
            <div className="flex items-center gap-3">
              <div className="bg-[#ec5b13]/10 p-2 rounded-lg text-[#ec5b13]">
                <FiPackage className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">
                  {editItem ? "Edit Inventory Item" : "Add Inventory Item"}
                </h1>
                <p className="text-slate-500 text-sm">
                  {isChefDept
                    ? `${department === "bar" ? "Bar" : "Restaurant"} stock — name, unit, cost and stock levels`
                    : "POS inventory — name, unit, cost and stock levels"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              aria-label="Close"
            >
              <span className="text-slate-600 text-xl leading-none">×</span>
            </button>
          </header>

          <form
            id="pos-inv-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-10 pb-32"
          >
            {/* Section 1: Basic Info */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <FiInfo className="text-[#ec5b13]" />
                <h2 className="text-lg font-bold">Basic Info</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <LabelWithInfo
                    id="pos-inv-name"
                    label="Name"
                    infoKey="name"
                    openKey={openInfoKey}
                    onToggle={setOpenInfoKey}
                    containerRef={infoPopoverRef}
                  />
                  <Input
                    id="pos-inv-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="Enter item name"
                    className="rounded-xl border-slate-300 bg-white h-12 px-4 text-base focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/20"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <LabelWithInfo
                    id="pos-inv-category"
                    label="Category"
                    infoKey="category"
                    openKey={openInfoKey}
                    onToggle={setOpenInfoKey}
                    containerRef={infoPopoverRef}
                  />
                  <AppReactSelect
                    id="pos-inv-category"
                    value={form.category}
                    onChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        category: v ?? "",
                        categoryOther: v === "Other" ? f.categoryOther : "",
                      }))
                    }
                    options={formCategoryOptions}
                    placeholder="Select category"
                  />
                  {form.category === "Other" && (
                    <Input
                      id="pos-inv-category-other"
                      value={form.categoryOther}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, categoryOther: e.target.value }))
                      }
                      placeholder="Specify category"
                      className="rounded-xl border-slate-300 bg-white h-12 px-4 text-base focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/20"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <LabelWithInfo
                    id="pos-inv-unit"
                    label="Unit"
                    infoKey="unit"
                    openKey={openInfoKey}
                    onToggle={setOpenInfoKey}
                    containerRef={infoPopoverRef}
                  />
                  <AppReactSelect
                    id="pos-inv-unit"
                    value={form.unit}
                    onChange={(v) => setForm((f) => ({ ...f, unit: v ?? "" }))}
                    options={formUnitOptions}
                    placeholder="Select unit"
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Cost & stock levels */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="text-[#ec5b13] font-bold">₵</span>
                <h2 className="text-lg font-bold">Cost &amp; Stock Levels</h2>
              </div>
              <div className="bg-[#ec5b13]/5 border border-[#ec5b13]/20 p-4 rounded-xl">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-bold text-[#ec5b13]">What you’re recording:</span>{" "}
                  Current stock in the chosen unit (e.g. 25 kg) and either the total
                  amount you paid for that stock or the cost per unit. The app works
                  out the other: 25 kg for ₵500 total → ₵20 per kg.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <LabelWithInfo
                    id="pos-inv-current"
                    label="How much you have (Current Stock)"
                    infoKey="currentStock"
                    openKey={openInfoKey}
                    onToggle={setOpenInfoKey}
                    containerRef={infoPopoverRef}
                  />
                  <Input
                    id="pos-inv-current"
                    type="number"
                    min={0}
                    value={form.currentStock}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => {
                        const next = { ...f, currentStock: v };
                        const totalVal = Number(f.totalAmountEntered) || 0;
                        const qty = Number(v) || 0;
                        if (totalVal > 0 && qty > 0)
                          next.unitCost = String(
                            Math.round((totalVal / qty) * 100) / 100
                          );
                        return next;
                      });
                    }}
                    placeholder="0.00"
                    className="rounded-xl border-slate-300 bg-white h-12 px-4 focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/20"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <LabelWithInfo
                    id="pos-inv-cost"
                    label={
                      isChefDept
                        ? "Unit cost (per base unit, e.g. kg)"
                        : "Unit Cost (per unit)"
                    }
                    infoKey="unitCost"
                    openKey={openInfoKey}
                    onToggle={setOpenInfoKey}
                    containerRef={infoPopoverRef}
                  />
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      ₵
                    </span>
                    <Input
                      id="pos-inv-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.unitCost}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          unitCost: e.target.value,
                          totalAmountEntered: "",
                        }))
                      }
                      placeholder="0.00"
                      className="w-full rounded-xl border-slate-300 bg-white h-12 pl-12 pr-4 focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/20"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="pos-inv-total-amount"
                    className="text-sm font-semibold"
                  >
                    Total Amount (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      ₵
                    </span>
                    <Input
                      id="pos-inv-total-amount"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={form.totalAmountEntered}
                      onChange={(e) => {
                        const totalStr = e.target.value;
                        setForm((f) => {
                          const next = { ...f, totalAmountEntered: totalStr };
                          const totalVal = Number(totalStr) || 0;
                          const qty = Number(f.currentStock) || 0;
                          if (totalVal > 0 && qty > 0)
                            next.unitCost = String(
                              Math.round((totalVal / qty) * 100) / 100
                            );
                          return next;
                        });
                      }}
                      className="w-full rounded-xl border-slate-300 bg-white h-12 pl-12 pr-4 focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/20"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <LabelWithInfo
                    id="pos-inv-min"
                    label="Minimum Stock"
                    infoKey="minimumStock"
                    openKey={openInfoKey}
                    onToggle={setOpenInfoKey}
                    containerRef={infoPopoverRef}
                  />
                  <Input
                    id="pos-inv-min"
                    type="number"
                    min={0}
                    value={form.minimumStock}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minimumStock: e.target.value }))
                    }
                    placeholder="0"
                    className="rounded-xl border-slate-300 bg-white h-12 px-4 focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/20"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <LabelWithInfo
                    id="pos-inv-reorder"
                    label="Reorder Level"
                    infoKey="reorderLevel"
                    openKey={openInfoKey}
                    onToggle={setOpenInfoKey}
                    containerRef={infoPopoverRef}
                  />
                  <Input
                    id="pos-inv-reorder"
                    type="number"
                    min={0}
                    value={form.reorderLevel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reorderLevel: e.target.value }))
                    }
                    placeholder="0"
                    className="rounded-xl border-slate-300 bg-white h-12 px-4 focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/20"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <LabelWithInfo
                    id="pos-inv-supplier"
                    label="Supplier (Optional)"
                    infoKey="supplier"
                    openKey={openInfoKey}
                    onToggle={setOpenInfoKey}
                    containerRef={infoPopoverRef}
                  />
                  {isChefDept && supplierOptions.length > 0 ? (
                    <AppReactSelect
                      id="pos-inv-supplier"
                      value={form.supplier}
                      onChange={(v) => setForm((f) => ({ ...f, supplier: v ?? "" }))}
                      options={[
                        { value: "", label: "Select Supplier" },
                        ...supplierOptions,
                      ]}
                      placeholder="Select Supplier"
                      isClearable
                    />
                  ) : (
                    <Input
                      id="pos-inv-supplier"
                      value={form.supplier}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, supplier: e.target.value }))
                      }
                      placeholder="Select Supplier"
                      className="rounded-xl border-slate-300 bg-white h-12 px-4 focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/20"
                    />
                  )}
                </div>
              </div>

              {(() => {
                const qty = Number(form.currentStock) || 0;
                const cost = Number(form.unitCost) || 0;
                const total = qty * cost;
                const money = fmt(total);
                return (
                  <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                    <p className="text-lg font-bold text-slate-900">
                      Stock value (Current stock × Unit cost):{" "}
                      <span className="text-[#ec5b13]">{money}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Total value of current stock at the unit cost above.
                    </p>
                  </div>
                );
              })()}
            </section>

            {/* Section 3: Item Images */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <FiImage className="text-[#ec5b13]" />
                  <h2 className="text-lg font-bold">Item Images</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStockPicker(true)}
                  className="flex items-center gap-2 text-sm font-bold text-[#ec5b13] hover:bg-[#ec5b13]/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FiImage className="text-sm" />
                  Pick from stock photos
                </button>
              </div>
              <p className="text-sm text-slate-600">
                Upload your own photos, or pick free sample images.
              </p>
              <ImageUpload
                label=""
                value={form.images}
                onChange={(images) => setForm((f) => ({ ...f, images }))}
                folder={`pos-inventory/${department}`}
                maxFiles={10}
                showCaptions
              />
            </section>
          </form>

          {/* Sticky Footer */}
          <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="max-w-[960px] mx-auto flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="pos-inv-form"
                disabled={createMut.isPending || updateMut.isPending}
                className="bg-[#ec5b13] hover:bg-[#ec5b13]/90 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#ec5b13]/20 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                Save Item
              </button>
            </div>
          </footer>
        </div>
      </Modal>

      <StockImagePicker
        open={showStockPicker}
        onClose={() => setShowStockPicker(false)}
        initialQuery={form.name}
        onPick={(img) =>
          setForm((f) => ({
            ...f,
            images: [...(f.images ?? []), { url: img.url, caption: img.caption }],
          }))
        }
      />

      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Inventory Item">
        <p className="text-slate-600">
          Are you sure you want to delete this inventory item? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDelete(null)} className="border-slate-200">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} loading={deleteMut.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
