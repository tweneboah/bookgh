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
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  EmptyState,
} from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiInfo,
  FiPackage,
  FiImage,
  FiLayers,
  FiAlertTriangle,
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

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const department = searchParams.get("department") ?? "inventoryProcurement";
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
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
  const createMut = useCreateInventoryItem();
  const updateMut = useUpdateInventoryItem();
  const deleteMut = useDeleteInventoryItem();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const allItems = allData?.data ?? [];
  const suppliers = suppliersData?.data ?? [];
  const supplierOptions = useMemo(
    () =>
      suppliers.map((s: any) => ({
        value: s.name ?? String(s._id),
        label: s.name ?? String(s._id),
      })),
    [suppliers]
  );

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
    const cur = row.currentStock ?? 0;
    const min = row.minimumStock ?? 0;
    return min > 0 && cur <= min;
  };

  const lowStockCount = useMemo(
    () => items.filter((row: any) => isLowStock(row)).length,
    [items]
  );

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
    <div
      className="min-h-screen bg-white font-sans text-slate-800"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Eye-catching header with gradient accent */}
      <header className="relative overflow-hidden border-b border-slate-100 bg-white">
        <div
          className="absolute left-0 top-0 h-full w-1.5 min-w-0 rounded-r-full bg-linear-to-b from-[#ff6d00] via-[#ff9100] to-[#5a189a] sm:w-2"
          aria-hidden
        />
        <div className="absolute right-0 top-0 h-40 w-64 rounded-bl-[100px] bg-linear-to-br from-[#ff9100]/10 to-[#5a189a]/5" aria-hidden />
        <div className="relative px-4 py-6 sm:px-6 sm:py-8 md:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 pl-3 sm:pl-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[#5a189a]/15 to-[#9d4edd]/10 text-[#5a189a] ring-1 ring-[#5a189a]/20">
                  <FiPackage className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Inventory
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h1>
              <p className="max-w-lg text-sm text-slate-600">
                Manage stock, units, costs and reorder levels for your items.
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="shrink-0 bg-linear-to-r from-[#ff6d00] to-[#ff9100] font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:opacity-95 hover:shadow-xl hover:shadow-orange-500/25 focus-visible:ring-2 focus-visible:ring-[#ff8500]/50"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              <FiPlus className="h-5 w-5" aria-hidden />
              Add Item
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        {/* Eye-catching stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:gap-6">
          <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(90,24,154,0.08)] sm:p-5">
            <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-linear-to-br from-[#5a189a]/10 to-transparent" aria-hidden />
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#5a189a]/15 to-[#7b2cbf]/10 text-[#5a189a] ring-1 ring-[#5a189a]/20">
                <FiLayers className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total items</p>
                <p className="text-xl font-bold text-slate-900 sm:text-2xl">{pagination?.total ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(255,133,0,0.12)] sm:p-5">
            <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-linear-to-br from-[#ff8500]/15 to-transparent" aria-hidden />
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#ff8500]/20 to-[#ff9e00]/10 text-[#c2410c] ring-1 ring-[#ff8500]/20">
                <FiAlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low stock</p>
                <p className="text-xl font-bold text-[#c2410c] sm:text-2xl">{lowStockCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table (desktop) + Cards (mobile) container */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">Items</h2>
            <div className="w-full sm:w-52">
              <AppReactSelect
                label="Category"
                value={categoryFilter}
                onChange={(v) => {
                  setCategoryFilter(v);
                  setPage(1);
                }}
                options={categoryOptions}
                placeholder="All categories"
                isClearable
              />
            </div>
          </div>

          {isLoading ? (
            <>
              <div className="hidden p-4 lg:block">
                <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
              </div>
              <div className="grid gap-4 p-4 lg:hidden sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" aria-hidden />
                ))}
              </div>
            </>
          ) : isEmpty ? (
            <div className="p-6 sm:p-8">
              <EmptyState
                icon={FiPackage as any}
                title="No inventory items"
                description="Add your first inventory item to get started."
                action={{ label: "Add Item", onClick: openCreate }}
                actionClassName="bg-linear-to-r from-[#ff6d00] to-[#ff9100] hover:opacity-95 focus-visible:ring-[#ff8500]/50"
              />
            </div>
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden overflow-x-auto lg:block">
                <div className="min-w-[800px]">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"> </th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Unit</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Stock</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Min</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Reorder</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Unit Cost</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier</th>
                        <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"> </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((row: any) => (
                        <tr
                          key={row._id}
                          className="transition-colors hover:bg-[#5a189a]/5"
                        >
                          <td className="whitespace-nowrap px-4 py-3">
                            {tableColumns[0].render?.(row)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                            {row.name ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="inline-flex rounded-lg bg-[#5a189a]/10 px-2 py-0.5 text-xs font-medium text-[#5a189a]">
                              {row.category ?? "—"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                            {row.unit ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {(tableColumns[4] as any).render(row)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                            {fmtQty(Number(row.minimumStock ?? 0))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                            {fmtQty(Number(row.reorderLevel ?? 0))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-700">
                            {row.unitCost != null ? fmt(row.unitCost) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                            {getSupplierDisplay(row)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            {(tableColumns[tableColumns.length - 1] as any).render(row)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-4 p-4 lg:hidden">
                {items.map((row: any) => {
                  const imgs = Array.isArray(row.images) ? row.images : [];
                  const lowStock = isLowStock(row);
                  return (
                    <div
                      key={row._id}
                      className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/80 transition-all hover:shadow-md hover:ring-[#5a189a]/20"
                    >
                      <div className="flex gap-4 p-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                          {imgs.length > 0 ? (
                            <img
                              src={imgs[0].url}
                              alt={imgs[0].caption || row.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FiImage className="h-6 w-6 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-semibold text-slate-900">
                            {row.name ?? "—"}
                          </h3>
                          <span className="mt-1 inline-block rounded-lg bg-[#5a189a]/10 px-2 py-0.5 text-xs font-medium text-[#5a189a]">
                            {row.category ?? "—"}
                          </span>
                          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                            <span className="text-slate-500">{row.unit ?? "—"}</span>
                            <span className={lowStock ? "font-semibold text-[#c2410c]" : "text-slate-700"}>
                              Stock: {fmtQty(Number(row.currentStock ?? 0))}
                            </span>
                            {row.unitCost != null && (
                              <span className="font-medium text-slate-700">{fmt(row.unitCost)}</span>
                            )}
                            {getSupplierDisplay(row) !== "—" && (
                              <span className="text-slate-500">Supplier: {getSupplierDisplay(row)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t border-slate-50 bg-slate-50/50 px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(row)}
                          className="flex-1 border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10 hover:border-[#5a189a]/50"
                        >
                          <FiEdit2 className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDelete(row._id)}
                          className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <FiTrash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
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
                      className="border-slate-200 text-slate-700 hover:bg-white hover:border-[#5a189a]/30 hover:text-[#5a189a]"
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
                      className="border-slate-200 text-slate-700 hover:bg-white hover:border-[#5a189a]/30 hover:text-[#5a189a]"
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

      {/* Add/Edit Modal — white theme, purple focus, orange CTA */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editItem ? "Edit Inventory Item" : "Add Inventory Item"}
        size="lg"
        className="max-h-[90vh] overflow-y-auto bg-white"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5a189a]/10 text-[#5a189a]">
              <FiPackage className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              {department === "restaurant" ? "Restaurant stock" : "POS inventory"} — name, unit, cost and stock levels
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Basic info</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <LabelWithInfo id="pos-inv-name" label="Name" infoKey="name" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                <Input id="pos-inv-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Rice" className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
              </div>
              <div className="space-y-1.5">
                <LabelWithInfo id="pos-inv-category" label="Category" infoKey="category" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                <AppReactSelect
                  id="pos-inv-category"
                  value={form.category}
                  onChange={(v) => setForm((f) => ({ ...f, category: v ?? "", categoryOther: v === "Other" ? f.categoryOther : "" }))}
                  options={formCategoryOptions}
                  placeholder="Select category"
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
                {form.category === "Other" && (
                  <Input
                    id="pos-inv-category-other"
                    value={form.categoryOther}
                    onChange={(e) => setForm((f) => ({ ...f, categoryOther: e.target.value }))}
                    placeholder="Specify category"
                    className="mt-2 rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unit</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <LabelWithInfo id="pos-inv-unit" label="Unit (required)" infoKey="unit" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                <AppReactSelect
                  id="pos-inv-unit"
                  value={form.unit}
                  onChange={(v) => setForm((f) => ({ ...f, unit: v ?? "" }))}
                  options={formUnitOptions}
                  placeholder="Select unit (e.g. kg, litre, pcs)"
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cost &amp; stock levels</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
              <p className="text-sm font-medium text-slate-700">What you’re recording</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Current stock in the chosen unit (e.g. <strong>25 kg</strong>) and either the <strong>total amount</strong> you paid for that stock or the <strong>cost per unit</strong>. The app works out the other: 25 kg for GH₵500 total → GH₵20 per kg.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <LabelWithInfo id="pos-inv-current" label="How much you have (current stock)" infoKey="currentStock" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
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
                        next.unitCost = String(Math.round((totalVal / qty) * 100) / 100);
                      return next;
                    });
                  }}
                  placeholder="0"
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
              </div>
              <div className="space-y-1.5">
                <LabelWithInfo id="pos-inv-cost" label="Unit cost (per unit)" infoKey="unitCost" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                <Input
                  id="pos-inv-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value, totalAmountEntered: "" }))}
                  placeholder="0.00"
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
              </div>
              <div className="space-y-1.5">
                <LabelWithInfo id="pos-inv-min" label="Minimum Stock" infoKey="minimumStock" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                <Input id="pos-inv-min" type="number" min={0} value={form.minimumStock} onChange={(e) => setForm((f) => ({ ...f, minimumStock: e.target.value }))} placeholder="0" className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
              </div>
              <div className="space-y-1.5">
                <LabelWithInfo id="pos-inv-reorder" label="Reorder Level" infoKey="reorderLevel" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                <Input id="pos-inv-reorder" type="number" min={0} value={form.reorderLevel} onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))} placeholder="0" className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pos-inv-total-amount" className="text-sm font-medium text-slate-700">
                Total amount (optional)
              </label>
              <p className="text-xs text-slate-500">
                If you know the total you paid (e.g. GH₵500 for 25 kg), enter it here and we’ll fill unit cost for you.
              </p>
              <Input
                id="pos-inv-total-amount"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 500"
                value={form.totalAmountEntered}
                onChange={(e) => {
                  const totalStr = e.target.value;
                  setForm((f) => {
                    const next = { ...f, totalAmountEntered: totalStr };
                    const totalVal = Number(totalStr) || 0;
                    const qty = Number(f.currentStock) || 0;
                    if (totalVal > 0 && qty > 0)
                      next.unitCost = String(Math.round((totalVal / qty) * 100) / 100);
                    return next;
                  });
                }}
                className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
              />
            </div>
            {(() => {
              const qty = Number(form.currentStock) || 0;
              const cost = Number(form.unitCost) || 0;
              const total = qty * cost;
              const unit = (form.unit || "unit").trim();
              const hasSummary = qty > 0 && (cost > 0 || total > 0);
              const fmt = (n: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);
              return (
                <>
                  <div className="rounded-xl border border-[#e5e7eb] bg-slate-50/80 px-4 py-3">
                    <p className="text-sm font-medium text-slate-600">Stock value (Current stock × Unit cost)</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{fmt(total)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Total value of current stock at the unit cost above.</p>
                  </div>
                  {hasSummary && (
                    <div className="rounded-xl border border-[#5a189a]/30 bg-[#5a189a]/5 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#5a189a]/80">In plain terms</p>
                      <p className="mt-1.5 text-sm font-medium text-slate-800">
                        <span className="font-semibold text-slate-900">{qty} {unit}</span>
                        {" "}for{" "}
                        <span className="font-semibold text-slate-900">{fmt(total)}</span>
                        {" "}total
                        {cost > 0 && (
                          <>
                            {" "}→{" "}
                            <span className="font-semibold text-slate-900">{fmt(cost)}</span>
                            {" "}per {unit}
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="space-y-1.5">
            <LabelWithInfo id="pos-inv-supplier" label="Supplier" infoKey="supplier" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
            {department === "restaurant" && supplierOptions.length > 0 ? (
              <AppReactSelect
                id="pos-inv-supplier"
                value={form.supplier}
                onChange={(v) => setForm((f) => ({ ...f, supplier: v ?? "" }))}
                options={[{ value: "", label: "Select supplier (optional)" }, ...supplierOptions]}
                placeholder="Select supplier (optional)"
                isClearable
                className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
              />
            ) : (
              <Input id="pos-inv-supplier" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} placeholder="Optional — or add suppliers under Restaurant → Suppliers" className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Item images</p>
            <ImageUpload
              label=""
              value={form.images}
              onChange={(images) => setForm((f) => ({ ...f, images }))}
              folder={`pos-inventory/${department}`}
              maxFiles={10}
              showCaptions
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="border-slate-200 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="bg-linear-to-r from-[#ff6d00] to-[#ff9100] font-semibold text-white shadow-md shadow-orange-500/25 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ff8500]/50"
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

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
