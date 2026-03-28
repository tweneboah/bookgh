"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
} from "react-icons/fi";
import toast from "react-hot-toast";

const POS_INV_FIELD_INFOS: Record<string, string> = {
  name: "Display name for this product (e.g. Rice, Vegetable Oil).",
  category: "Type of product for filtering and reports (e.g. Staples, Dairy).",
  unit: "How you track stock: kg, litre, pcs, unit, etc. All stock numbers use this base unit.",
  unitConversions: "Optional: other units that convert to base unit. Format: unit=factor (e.g. g=0.001 if base is kg). One per line or comma-separated.",
  unitCost: "Cost you pay per one unit of this product (GHS). Used for costing and reports.",
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
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmtQty = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

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
  const department = searchParams.get("department") ?? "inventoryProcurement";
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [openInfoKey, setOpenInfoKey] = useState<string | null>(null);
  const infoPopoverRef = useRef<HTMLDivElement | null>(null);

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
    purchaseUnitId: string;
    yieldUnitId: string;
    yieldPerPurchaseUnit: string;
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
    purchaseUnitId: "",
    yieldUnitId: "",
    yieldPerPurchaseUnit: "",
    images: [],
    totalAmountEntered: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
    department,
  };
  if (categoryFilter) params.category = categoryFilter;

  const { data, isLoading } = useInventoryItems(params);
  const { data: allData } = useInventoryItems({ limit: "500", department });
  const { data: fullItem } = useInventoryItem(editItem?._id, { department });
  const { data: suppliersData } = useSuppliers(
    department === "restaurant" ? { department: "restaurant", limit: "200" } : { limit: "0" }
  );
  const { data: restaurantUnitsData } = useRestaurantUnits(
    department === "restaurant" ? { limit: "200", active: "true" } : { limit: "0" }
  );
  const { data: yieldsRaw } = useItemYields(
    department === "restaurant" ? { limit: "1000" } : { limit: "0" }
  );
  const yieldMappings: any[] = useMemo(
    () => (Array.isArray(yieldsRaw) ? yieldsRaw : (yieldsRaw as any)?.data ?? []),
    [yieldsRaw]
  );
  const createMut = useCreateInventoryItem();
  const updateMut = useUpdateInventoryItem();
  const deleteMut = useDeleteInventoryItem();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const allItems = allData?.data ?? [];
  const suppliers = suppliersData?.data ?? [];
  const restaurantUnits = restaurantUnitsData?.data ?? [];
  const purchaseUnitOptions = useMemo(
    () => [
      { value: "", label: "None" },
      ...restaurantUnits
        .filter((u: any) => u.type === "purchase" || u.type === "both")
        .map((u: any) => ({ value: u._id, label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name })),
    ],
    [restaurantUnits]
  );
  const yieldUnitOptions = useMemo(
    () => [
      { value: "", label: "None" },
      ...restaurantUnits
        .filter((u: any) => u.type === "yield" || u.type === "both")
        .map((u: any) => ({ value: u._id, label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name })),
    ],
    [restaurantUnits]
  );
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
    if (department !== "restaurant") return null;
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
      purchaseUnitId: normalizeId(item.purchaseUnitId) || prev.purchaseUnitId || "",
      yieldUnitId: normalizeId(item.yieldUnitId) || prev.yieldUnitId || "",
      yieldPerPurchaseUnit: item.yieldPerPurchaseUnit != null ? String(item.yieldPerPurchaseUnit) : prev.yieldPerPurchaseUnit ?? "",
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
      purchaseUnitId: "",
      yieldUnitId: "",
      yieldPerPurchaseUnit: "",
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
      purchaseUnitId: normalizeId(item.purchaseUnitId),
      yieldUnitId: normalizeId(item.yieldUnitId),
      yieldPerPurchaseUnit: item.yieldPerPurchaseUnit != null ? String(item.yieldPerPurchaseUnit) : "",
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
      purchaseUnitId: normalizeId(form.purchaseUnitId) || undefined,
      yieldUnitId: normalizeId(form.yieldUnitId) || undefined,
      yieldPerPurchaseUnit: form.yieldPerPurchaseUnit ? parseFloat(form.yieldPerPurchaseUnit) : undefined,
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
    const cur = row.currentStock ?? 0;
    const min = row.minimumStock ?? 0;
    return min > 0 && cur <= min;
  };

  const lowStockCount = useMemo(
    () => items.filter((row: any) => isLowStock(row)).length,
    [items]
  );

  const totalInventoryValue = useMemo(() => {
    return items.reduce((sum: number, row: any) => {
      const qty = Number(row.currentStock ?? 0);
      const cost = Number(row.unitCost ?? 0);
      if (!Number.isFinite(qty) || !Number.isFinite(cost)) return sum;
      return sum + qty * cost;
    }, 0);
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row: any) =>
      String(row?.name ?? "").toLowerCase().includes(q)
    );
  }, [items, searchFilter]);

  const tableColumns = [
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
              <span className="flex h-9 items-center text-xs font-medium text-slate-400">+{imgs.length - 2}</span>
            )}
          </div>
        );
      },
    },
    { key: "name", header: "Name", sortable: true },
    { key: "category", header: "Category" },
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

  const title = department === "restaurant" ? "Restaurant Inventory" : "POS Inventory";
  const isEmpty = !isLoading && items.length === 0;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) || 1 : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;

  return (
    <div className="bg-[#f8f6f6] min-h-screen text-slate-900">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
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
          </div>
          <div className="flex items-center gap-3">
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
              <span className="font-bold">GH₵</span>
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
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Image
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Name
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Category
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                        Unit
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                        Stock
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                        Min
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                        Reorder
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                        Unit Cost
                      </th>
                      {department === "restaurant" ? (
                        <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Chef Unit / Yield
                        </th>
                      ) : null}
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Supplier
                      </th>
                      <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredItems.map((row: any) => {
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
                          <td className="px-4 py-4">
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
                          <td className="px-4 py-4 font-semibold">
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
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {row.category ?? "—"}
                          </td>
                          <td className="px-4 py-4 text-sm text-center">
                            {row.unit ?? "—"}
                          </td>
                          <td className={low ? "px-4 py-4 text-sm text-right font-bold text-[#ec5b13]" : "px-4 py-4 text-sm text-right font-medium"}>
                            {fmtQty(Number(row.currentStock ?? 0))}
                          </td>
                          <td className="px-4 py-4 text-sm text-right">
                            {fmtQty(Number(row.minimumStock ?? 0))}
                          </td>
                          <td className="px-4 py-4 text-sm text-right">
                            {fmtQty(Number(row.reorderLevel ?? 0))}
                          </td>
                          <td className="px-4 py-4 text-sm text-right">
                            {row.unitCost != null ? fmt(Number(row.unitCost ?? 0)) : "—"}
                          </td>
                          {department === "restaurant" ? (
                            <td className="px-4 py-4 text-sm italic text-slate-500">
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
                          <td className="px-4 py-4 text-sm">
                            {getSupplierDisplay(row) !== "—" ? (
                              <span className={low ? "font-medium" : ""}>
                                {getSupplierDisplay(row)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
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
                  Showing {filteredItems.length} of {pagination?.total ?? filteredItems.length} items
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
                  {department === "restaurant"
                    ? "Restaurant stock — name, unit, cost and stock levels"
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
                <span className="text-[#ec5b13] font-bold">GH₵</span>
                <h2 className="text-lg font-bold">Cost &amp; Stock Levels</h2>
              </div>
              <div className="bg-[#ec5b13]/5 border border-[#ec5b13]/20 p-4 rounded-xl">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-bold text-[#ec5b13]">What you’re recording:</span>{" "}
                  Current stock in the chosen unit (e.g. 25 kg) and either the total
                  amount you paid for that stock or the cost per unit. The app works
                  out the other: 25 kg for GH₵500 total → GH₵20 per kg.
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
                    label="Unit Cost (per unit)"
                    infoKey="unitCost"
                    openKey={openInfoKey}
                    onToggle={setOpenInfoKey}
                    containerRef={infoPopoverRef}
                  />
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      GH₵
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
                      GH₵
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
                  {department === "restaurant" && supplierOptions.length > 0 ? (
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
                const money = new Intl.NumberFormat("en-GH", {
                  style: "currency",
                  currency: "GHS",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(total);
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

          {department === "restaurant" && restaurantUnits.length > 0 && (
            <div className="space-y-3 rounded-xl border border-[#5a189a]/15 bg-[#faf5ff]/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5a189a]">
                Chef Units & Yield (optional)
              </p>
              <p className="text-xs text-slate-500">
                Link this item to purchase & yield units defined in Units & Yields. e.g. purchased as &quot;small bag&quot;, yields &quot;20 plates&quot;.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Purchase Unit</label>
                  <AppReactSelect
                    value={form.purchaseUnitId}
                    onChange={(v) => setForm((f) => ({ ...f, purchaseUnitId: v ?? "" }))}
                    options={purchaseUnitOptions}
                    placeholder="e.g. small bag"
                    isClearable
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Yield Unit</label>
                  <AppReactSelect
                    value={form.yieldUnitId}
                    onChange={(v) => setForm((f) => ({ ...f, yieldUnitId: v ?? "" }))}
                    options={yieldUnitOptions}
                    placeholder="e.g. plate"
                    isClearable
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Yield per Purchase Unit</label>
                  <Input
                    value={form.yieldPerPurchaseUnit}
                    onChange={(e) => setForm((f) => ({ ...f, yieldPerPurchaseUnit: e.target.value }))}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 20"
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                </div>
              </div>
              {form.purchaseUnitId && form.yieldUnitId && form.yieldPerPurchaseUnit && (
                <div className="rounded-lg bg-[#5a189a]/5 border border-[#5a189a]/10 p-3 text-center">
                  <p className="text-sm text-[#5a189a] font-semibold">
                    1 {purchaseUnitOptions.find((o) => o.value === form.purchaseUnitId)?.label ?? "purchase unit"} ={" "}
                    <span className="text-[#ff6d00]">{form.yieldPerPurchaseUnit}</span>{" "}
                    {yieldUnitOptions.find((o) => o.value === form.yieldUnitId)?.label ?? "yield units"}
                  </p>
                </div>
              )}
            </div>
          )}

            {/* Section 3: Chef Units & Yield */}
            {department === "restaurant" && restaurantUnits.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <FiPackage className="text-[#ec5b13]" />
                  <h2 className="text-lg font-bold">Chef Units &amp; Yield (Optional)</h2>
                </div>
                <p className="text-sm text-slate-600">
                  Link this item to purchase &amp; yield units defined in{" "}
                  <span className="text-[#ec5b13] cursor-pointer hover:underline">
                    Units &amp; Yields
                  </span>
                  . e.g. purchased as &quot;small bag&quot;, yields &quot;20 plates&quot;.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold">Purchase Unit</label>
                    <AppReactSelect
                      value={form.purchaseUnitId}
                      onChange={(v) => setForm((f) => ({ ...f, purchaseUnitId: v ?? "" }))}
                      options={purchaseUnitOptions}
                      placeholder="None"
                      isClearable
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold">Yield Unit</label>
                    <AppReactSelect
                      value={form.yieldUnitId}
                      onChange={(v) => setForm((f) => ({ ...f, yieldUnitId: v ?? "" }))}
                      options={yieldUnitOptions}
                      placeholder="None"
                      isClearable
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold">Yield per Purchase Unit</label>
                    <Input
                      value={form.yieldPerPurchaseUnit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, yieldPerPurchaseUnit: e.target.value }))
                      }
                      type="number"
                      min="0"
                      step="any"
                      placeholder="1.0"
                      className="rounded-xl border-slate-300 bg-white h-12 px-4 focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]/20"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Section 4: Item Images */}
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
