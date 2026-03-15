"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useInventoryItems,
  useUpdateInventoryItem,
} from "@/hooks/api";
import { AppReactSelect, Badge, Button, Card, CardContent, DataTable, Input, Modal } from "@/components/ui";
import toast from "react-hot-toast";
import { FiInfo, FiEdit2, FiTrash2, FiPackage, FiPlus, FiCopy } from "react-icons/fi";

const FIELD_INFOS: Record<string, string> = {
  name: "Display name for this product in the bar (e.g. Vodka 750ml).",
  sku: "Your internal stock-keeping code for this item (e.g. BAR-VOD-750).",
  category: "Type of product: Liquor, Spirits, Beer, Wine, Mixer, Beverage, etc. Choose from the dropdown.",
  unit: "How you track stock: ml (by volume), bottle (by bottle), or unit (by piece). All stock numbers use this unit.",
  currentStock: "How much you have right now, in the base unit you selected. Set to 0 if you haven't received stock yet.",
  minimumStock: "Don't let stock go below this. Used for alerts (e.g. reorder when at or below this level).",
  reorderLevel: "When stock reaches this level, trigger a reorder. Enter in the same unit as Current Stock.",
  unitCost: "Cost you pay the supplier per one unit of this product (per bottle, per ml, or per unit).",
  volumeMl: "Size of one bottle in ml. Read from the bottle label (e.g. 750). Used for reports and for recipes in ml when base unit is bottle.",
  unitsPerBottle: "How many servings you get from one bottle. Usually Volume (ml) ÷ ml per serve (e.g. 750 ÷ 50 = 15).",
  mlPerUnit: "Millilitres in one serving (e.g. 50 ml per shot). Your standard pour size. Volume ÷ ml per unit = units per bottle.",
  strictControl: "Yes = block sales when stock is insufficient. No = allow overselling (not recommended for liquor).",
  trackByBottle: "Yes = show or use 'bottles' in reports. Stock is still stored in your chosen base unit.",
  supplier: "Name of the supplier you typically buy this product from (for reference).",
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
  const info = FIELD_INFOS[infoKey] ?? "";
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
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition-colors hover:border-[#5a189a] hover:bg-[#5a189a]/5 hover:text-[#5a189a]"
            aria-label={`Info: ${label}`}
          >
            <FiInfo className="h-3 w-3" />
          </button>
          {isOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg">
              {info}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Bar unit options: ml, litres, bottle, can, keg, case, pack. No generic "unit". */
const UNIT_OPTIONS = [
  { value: "ml", label: "ml" },
  { value: "L", label: "L (litres)" },
  { value: "litre", label: "litre" },
  { value: "bottle", label: "bottle" },
  { value: "can", label: "can" },
  { value: "keg", label: "keg" },
  { value: "case", label: "case" },
  { value: "pack", label: "pack" },
] as const;

/** Comprehensive bar inventory categories for dropdown. */
const BAR_CATEGORIES = [
  { value: "liquor", label: "Liquor" },
  { value: "spirits", label: "Spirits" },
  { value: "beer", label: "Beer" },
  { value: "wine", label: "Wine" },
  { value: "cider", label: "Cider" },
  { value: "liqueur", label: "Liqueur" },
  { value: "champagne", label: "Champagne" },
  { value: "mixer", label: "Mixer" },
  { value: "soft drink", label: "Soft drink" },
  { value: "juice", label: "Juice" },
  { value: "syrup", label: "Syrup" },
  { value: "beverage", label: "Beverage" },
  { value: "garnish", label: "Garnish" },
  { value: "bar supply", label: "Bar supply" },
  { value: "bar", label: "Bar (general)" },
  { value: "other", label: "Other" },
] as const;

type TemplateAccent = "orange" | "purple" | "sky" | "emerald" | "amber";
const TEMPLATE_ACCENTS: Record<string, TemplateAccent> = {
  "vodka-750": "orange",
  "gin-750": "purple",
  "tonic-water": "sky",
  "sugar-syrup": "emerald",
  "vodka-750-bottle": "amber",
};
const templateAccentStyles: Record<
  TemplateAccent,
  { iconBg: string; iconColor: string; border: string; bg: string; hoverShadow: string }
> = {
  orange: {
    iconBg: "bg-[#ff8500]/15",
    iconColor: "text-[#c2410c]",
    border: "border-l-4 border-l-[#ff8500]",
    bg: "bg-[#ff8500]/5",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(255,133,0,0.2)]",
  },
  purple: {
    iconBg: "bg-[#5a189a]/15",
    iconColor: "text-[#5a189a]",
    border: "border-l-4 border-l-[#5a189a]",
    bg: "bg-[#5a189a]/5",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(90,24,154,0.18)]",
  },
  sky: {
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-600",
    border: "border-l-4 border-l-sky-500",
    bg: "bg-sky-50/50",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(14,165,233,0.18)]",
  },
  emerald: {
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600",
    border: "border-l-4 border-l-emerald-500",
    bg: "bg-emerald-50/50",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(16,185,129,0.18)]",
  },
  amber: {
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600",
    border: "border-l-4 border-l-amber-500",
    bg: "bg-amber-50/50",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(245,158,11,0.18)]",
  },
};

function getStockLabel(unit: string) {
  const u = (unit || "").toLowerCase();
  if (u === "bottle") return "bottles";
  if (u === "ml") return "ml";
  if (u === "l" || u === "litre") return "L";
  if (u === "can") return "cans";
  if (u === "keg") return "kegs";
  if (u === "case") return "cases";
  if (u === "pack") return "packs";
  return unit || "—";
}

function getUnitCostLabel(unit: string) {
  const u = (unit || "").toLowerCase();
  if (u === "bottle") return "Unit cost (per bottle)";
  if (u === "ml") return "Unit cost (per ml)";
  if (u === "l" || u === "litre") return "Unit cost (per L)";
  if (u === "can") return "Unit cost (per can)";
  if (u === "keg") return "Unit cost (per keg)";
  if (u === "case") return "Unit cost (per case)";
  if (u === "pack") return "Unit cost (per pack)";
  return "Unit cost (per unit)";
}

const INVENTORY_TEMPLATES = [
  {
    key: "vodka-750",
    label: "Vodka 750ml",
    values: {
      name: "Vodka 750ml",
      category: "liquor",
      unit: "ml",
      currentStock: 9000,
      minimumStock: 2250,
      reorderLevel: 4500,
      unitCost: 0.11,
      sku: "BAR-VOD-750",
      volumeMl: 750,
      unitsPerBottle: 15,
      isControlled: true,
      trackByBottle: true,
      mlPerUnit: 50,
      supplier: "Main Beverage Supplier",
    },
  },
  {
    key: "gin-750",
    label: "Gin 750ml",
    values: {
      name: "Gin 750ml",
      category: "liquor",
      unit: "ml",
      currentStock: 7500,
      minimumStock: 1875,
      reorderLevel: 3750,
      unitCost: 0.1,
      sku: "BAR-GIN-750",
      volumeMl: 750,
      unitsPerBottle: 15,
      isControlled: true,
      trackByBottle: true,
      mlPerUnit: 50,
      supplier: "Main Beverage Supplier",
    },
  },
  {
    key: "tonic-water",
    label: "Tonic Water (Mixer)",
    values: {
      name: "Tonic Water",
      category: "mixer",
      unit: "unit",
      currentStock: 48,
      minimumStock: 12,
      reorderLevel: 24,
      unitCost: 4.5,
      sku: "BAR-TON-330",
      volumeMl: 330,
      unitsPerBottle: 1,
      isControlled: false,
      trackByBottle: false,
      mlPerUnit: 330,
      supplier: "Soft Drinks Distributor",
    },
  },
  {
    key: "sugar-syrup",
    label: "Sugar Syrup",
    values: {
      name: "Sugar Syrup",
      category: "beverage",
      unit: "ml",
      currentStock: 5000,
      minimumStock: 1000,
      reorderLevel: 2000,
      unitCost: 0.03,
      sku: "BAR-SYR-001",
      volumeMl: 0,
      unitsPerBottle: 1,
      isControlled: false,
      trackByBottle: false,
      mlPerUnit: 1,
      supplier: "Kitchen Production Unit",
    },
  },
  {
    key: "vodka-750-bottle",
    label: "Vodka 750ml (track by bottle)",
    values: {
      name: "Vodka 750ml",
      category: "liquor",
      unit: "bottle",
      currentStock: 12,
      minimumStock: 3,
      reorderLevel: 6,
      unitCost: 85,
      sku: "BAR-VOD-750",
      volumeMl: 750,
      unitsPerBottle: 15,
      isControlled: true,
      trackByBottle: true,
      mlPerUnit: 50,
      supplier: "Main Beverage Supplier",
    },
  },
] as const;

export default function BarInventoryItemsPage() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  const [form, setForm] = useState({
    name: "",
    category: "liquor",
    unit: "ml",
    currentStock: 0,
    minimumStock: 0,
    reorderLevel: 0,
    unitCost: 0,
    totalAmountEntered: "" as string,
    sku: "",
    volumeMl: 0,
    unitsPerBottle: 1,
    isControlled: true,
    trackByBottle: true,
    mlPerUnit: 1,
    supplier: "",
  });

  const { data, isLoading } = useInventoryItems({
    page: String(page),
    limit: "20",
    department: "bar",
  });
  const createMut = useCreateInventoryItem();
  const updateMut = useUpdateInventoryItem();
  const deleteMut = useDeleteInventoryItem();

  const barCategoryValues = useMemo(
    () => new Set(BAR_CATEGORIES.map((c) => c.value.toLowerCase())),
    []
  );
  const inventoryRows = useMemo(
    () =>
      (data?.data ?? []).filter((item: any) => {
        const cat = String(item.category ?? "").toLowerCase().trim();
        return cat && (barCategoryValues.has(cat) || ["liquor", "bar", "beverage", "mixer", "spirits", "wine", "beer"].includes(cat));
      }),
    [data, barCategoryValues]
  );
  const pagination = data?.meta?.pagination;

  const categoryOptions = useMemo(() => {
    const fromData = Array.from(
      new Set((inventoryRows as any[]).map((r: any) => String(r.category ?? "").trim()).filter(Boolean))
    )
      .filter((c) => !BAR_CATEGORIES.some((x) => x.value.toLowerCase() === c.toLowerCase()))
      .map((c) => ({ value: c, label: c }));
    const base = BAR_CATEGORIES.map((c) => ({ value: c.value, label: c.label }));
    const current = (form.category ?? "").trim();
    if (current && !base.some((o) => o.value.toLowerCase() === current.toLowerCase()))
      fromData.push({ value: current, label: current });
    return [...base, ...fromData];
  }, [inventoryRows, form.category]);

  const defaultForm = {
    name: "",
    category: "liquor",
    unit: "ml",
    currentStock: 0,
    minimumStock: 0,
    reorderLevel: 0,
    unitCost: 0,
    totalAmountEntered: "" as string,
    sku: "",
    volumeMl: 0,
    unitsPerBottle: 1,
    isControlled: true,
    trackByBottle: true,
    mlPerUnit: 1,
    supplier: "",
  };

  const resetForm = useCallback(() => {
    setForm(defaultForm);
    setEditItem(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      name: row.name ?? "",
      category: row.category ?? "liquor",
      unit: row.unit ?? "ml",
      currentStock: Number(row.currentStock ?? 0),
      minimumStock: Number(row.minimumStock ?? 0),
      reorderLevel: Number(row.reorderLevel ?? 0),
      unitCost: Number(row.unitCost ?? 0),
      totalAmountEntered: "",
      sku: row.sku ?? "",
      volumeMl: Number(row.volumeMl ?? 0),
      unitsPerBottle: Number(row.unitsPerBottle ?? 1),
      isControlled: row.isControlled !== false,
      trackByBottle: row.trackByBottle === true,
      mlPerUnit: Number(row.mlPerUnit ?? 1),
      supplier: row.supplier ?? "",
    });
    setShowCreate(true);
  };

  const applyTemplate = (templateKey: string) => {
    const template = INVENTORY_TEMPLATES.find((item) => item.key === templateKey);
    if (!template) return;
    setForm(template.values);
    toast.success(`${template.label} template applied`);
  };

  const handleUnitChange = useCallback((newUnit: string) => {
    setForm((f) => {
      const prevUnit = f.unit;
      const vol = Number(f.volumeMl) || 0;
      if (vol <= 0) return { ...f, unit: newUnit };

      const cur = Number(f.currentStock) || 0;
      const min = Number(f.minimumStock) || 0;
      const reorder = Number(f.reorderLevel) || 0;
      const cost = Number(f.unitCost) || 0;

      if (prevUnit === "ml" && newUnit === "bottle") {
        return {
          ...f,
          unit: newUnit,
          currentStock: vol ? Math.round((cur / vol) * 100) / 100 : cur,
          minimumStock: vol ? Math.round((min / vol) * 100) / 100 : min,
          reorderLevel: vol ? Math.round((reorder / vol) * 100) / 100 : reorder,
          unitCost: vol ? Math.round(cost * vol * 100) / 100 : cost,
        };
      }
      if (prevUnit === "bottle" && newUnit === "ml") {
        return {
          ...f,
          unit: newUnit,
          currentStock: Math.round(cur * vol * 100) / 100,
          minimumStock: Math.round(min * vol * 100) / 100,
          reorderLevel: Math.round(reorder * vol * 100) / 100,
          unitCost: vol ? Math.round((cost / vol) * 100) / 100 : cost,
        };
      }
      return { ...f, unit: newUnit };
    });
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.unit?.trim()) {
      toast.error("Unit is required (use the same unit for this item everywhere)");
      return;
    }
    const currentStockNum = Number(form.currentStock) || 0;
    const totalAmountNum = form.totalAmountEntered ? parseFloat(form.totalAmountEntered) : 0;
    const computedUnitCost =
      totalAmountNum > 0 && currentStockNum > 0
        ? Math.round((totalAmountNum / currentStockNum) * 100) / 100
        : null;
    const unitCostNum =
      computedUnitCost != null ? computedUnitCost : Number(form.unitCost) || 0;

    const payload: Record<string, unknown> = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      currentStock: currentStockNum,
      minimumStock: Number(form.minimumStock),
      reorderLevel: Number(form.reorderLevel),
      unitCost: unitCostNum,
      sku: form.sku || undefined,
      supplier: form.supplier || undefined,
      volumeMl: Number(form.volumeMl || 0) || undefined,
      unitsPerBottle: Number(form.unitsPerBottle || 0) || undefined,
      mlPerUnit: Number(form.mlPerUnit || 0) || undefined,
      isControlled: form.isControlled,
      trackByBottle: form.trackByBottle,
    };
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, department: "bar", ...payload } as any);
        toast.success("Inventory item updated");
      } else {
        await createMut.mutateAsync({ department: "bar", ...payload } as any);
        toast.success("Inventory item created");
      }
      setShowCreate(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? (editItem ? "Failed to update inventory item" : "Failed to create inventory item"));
    }
  };

  const toggleControlled = async (row: any) => {
    try {
      await updateMut.mutateAsync({
        id: row._id,
        department: "bar",
        isControlled: !row.isControlled,
      });
      toast.success("Control status updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to update item");
    }
  };

  const removeItem = async () => {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync({ id: deleteId, department: "bar" });
      toast.success("Inventory item deleted");
      setDeleteId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to delete item");
    }
  };

  const columns = [
    { key: "name", header: "Item", render: (row: any) => row.name },
    { key: "sku", header: "SKU", render: (row: any) => row.sku || "-" },
    { key: "category", header: "Category", render: (row: any) => row.category },
    { key: "stock", header: "Stock", render: (row: any) => `${Number(row.currentStock ?? 0).toFixed(2)} ${row.unit}` },
    { key: "reorder", header: "Reorder Level", render: (row: any) => Number(row.reorderLevel ?? 0).toFixed(2) },
    {
      key: "controlled",
      header: "Control",
      render: (row: any) =>
        row.isControlled ? <Badge variant="warning">Strict</Badge> : <Badge variant="default">Normal</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (row: any) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => openEdit(row)}
            className="text-slate-400 hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
            aria-label="Edit"
          >
            <FiEdit2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row._id)}
            className="text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete"
          >
            <FiTrash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalItems = inventoryRows.length;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Hero header */}
      <header className="relative border-b border-slate-100 bg-white">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-[#ff6d00] via-[#ff8500] to-[#5a189a] opacity-90" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#ff8500] to-[#ff9e00] text-white shadow-[0_8px_28px_rgba(255,133,0,0.28)] ring-2 ring-[#ff8500]/20">
                <FiPackage className="h-7 w-7" aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  BAR Inventory Items
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Create and manage bottle/measure inventory records used by BAR recipes.
                </p>
              </div>
            </div>
            <Button
              onClick={openCreate}
              className="h-12 shrink-0 rounded-xl px-6 text-base font-semibold text-white shadow-[0_4px_16px_rgba(255,109,0,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(255,109,0,0.4)]"
              style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
            >
              <FiPlus className="h-5 w-5 sm:mr-2" aria-hidden />
              Add Inventory Item
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5">
              <FiPackage className="h-4 w-4 text-slate-500" aria-hidden />
              <span className="text-sm font-medium text-slate-600">Items</span>
              <span className="text-lg font-bold text-slate-900">{totalItems}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Quick templates — colorful premium cards */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-linear-to-r from-[#5a189a]/5 to-[#9d4edd]/5 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5a189a]/15 text-[#5a189a]">
              <FiCopy className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Quick templates</h2>
              <p className="text-xs text-slate-500">Click a card to prefill the create form.</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {INVENTORY_TEMPLATES.map((template) => {
              const accent = TEMPLATE_ACCENTS[template.key] ?? "purple";
              const style = templateAccentStyles[accent];
              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => {
                    applyTemplate(template.key);
                    setShowCreate(true);
                  }}
                  className={`flex shrink-0 flex-col items-start rounded-2xl border border-slate-100 p-5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all hover:scale-[1.02] hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5a189a]/25 focus:ring-offset-2 min-w-[180px] ${style.border} ${style.bg} ${style.hoverShadow}`}
                >
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${style.iconBg} ${style.iconColor}`}>
                    <FiPackage className="h-6 w-6" aria-hidden />
                  </div>
                  <span className="block text-sm font-bold text-slate-900">{template.label}</span>
                  <span className={`mt-1 block text-xs font-semibold ${style.iconColor}`}>Prefill form</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5a189a]/10 text-[#5a189a]">
                <FiPackage className="h-4 w-4" aria-hidden />
              </div>
              <h2 className="text-base font-semibold text-slate-900">All inventory items</h2>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Manage stock, reorder levels, and unit costs.</p>
          </div>
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={inventoryRows}
              loading={isLoading}
              getRowKey={(row) => row._id}
              pagination={
                pagination
                  ? {
                      page: pagination.page,
                      limit: pagination.limit,
                      total: pagination.total,
                      onPageChange: setPage,
                    }
                  : undefined
              }
              emptyTitle="No BAR inventory items"
              emptyDescription="Create your first inventory item to start stock control."
            />
          </div>
        </div>
      </div>

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); resetForm(); }}
        title={editItem ? "Edit Inventory Item" : "Add Inventory Item"}
        size="xl"
        className="max-w-3xl rounded-2xl border-slate-100 shadow-[0_24px_48px_rgba(0,0,0,0.12)]"
      >
        <form onSubmit={saveItem} className="flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="flex-1 space-y-6 overflow-y-auto px-1">
            {!editItem && (
              <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-[#5a189a]/5 to-[#9d4edd]/5 p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5a189a]/15 text-[#5a189a]">
                    <FiCopy className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Quick templates</h3>
                    <p className="text-xs text-slate-500">Prefill the form, then adjust for your branch.</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {INVENTORY_TEMPLATES.map((template) => (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => applyTemplate(template.key)}
                      className="rounded-xl border border-[#5a189a]/25 bg-white px-4 py-2.5 text-sm font-medium text-[#5a189a] shadow-sm transition-all hover:bg-[#5a189a]/10 hover:shadow-md"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff8500]/15 text-[#c2410c]">
                  <FiPackage className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Item details</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <LabelWithInfo id="bar-inv-name" label="Name" infoKey="name" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input id="bar-inv-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="bar-inv-sku" label="SKU" infoKey="sku" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input id="bar-inv-sku" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="bar-inv-category" label="Category" infoKey="category" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <AppReactSelect
                    id="bar-inv-category"
                    value={form.category}
                    onChange={(v) => setForm((f) => ({ ...f, category: v ?? "" }))}
                    options={categoryOptions}
                    placeholder="Select category"
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <LabelWithInfo id="bar-inv-unit" label="Unit (required)" infoKey="unit" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <AppReactSelect
                    value={form.unit}
                    onChange={(value) => handleUnitChange(value ?? "ml")}
                    options={
                      form.unit && !UNIT_OPTIONS.some((o) => o.value === form.unit)
                        ? [{ value: form.unit, label: form.unit }, ...UNIT_OPTIONS]
                        : [...UNIT_OPTIONS]
                    }
                    placeholder="Select unit (e.g. ml, L, bottle)"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5a189a]/15 text-[#5a189a]">
                  <FiPackage className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Stock & cost</h3>
              </div>
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                <p className="text-sm font-medium text-slate-700">What you’re recording</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Enter how much you have (current stock) in the chosen unit and either the <strong>total amount</strong> you paid or the <strong>cost per unit</strong>. The app works out the other (e.g. 25 bottles for GH₵500 total → GH₵20 per bottle).
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <LabelWithInfo id="bar-inv-current" label={`Current (${getStockLabel(form.unit)})`} infoKey="currentStock" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input
                    id="bar-inv-current"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.currentStock}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      setForm((f) => {
                        const next = { ...f, currentStock: v };
                        const totalVal = parseFloat(f.totalAmountEntered) || 0;
                        if (totalVal > 0 && v > 0)
                          next.unitCost = Math.round((totalVal / v) * 100) / 100;
                        return next;
                      });
                    }}
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="bar-inv-cost" label={getUnitCostLabel(form.unit)} infoKey="unitCost" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input
                    id="bar-inv-cost"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.unitCost}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unitCost: Number(e.target.value) || 0, totalAmountEntered: "" }))
                    }
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="bar-inv-min" label={`Minimum (${getStockLabel(form.unit)})`} infoKey="minimumStock" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input id="bar-inv-min" type="number" min={0} step="0.01" value={form.minimumStock} onChange={(e) => setForm((f) => ({ ...f, minimumStock: Number(e.target.value) }))} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="bar-inv-reorder" label={`Reorder (${getStockLabel(form.unit)})`} infoKey="reorderLevel" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input id="bar-inv-reorder" type="number" min={0} step="0.01" value={form.reorderLevel} onChange={(e) => setForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <label htmlFor="bar-inv-total-amount" className="text-sm font-medium text-slate-700">
                  Total amount (optional)
                </label>
                <p className="text-xs text-slate-500">
                  If you know the total you paid (e.g. GH₵500 for 25 bottles), enter it here and we’ll fill cost per unit for you.
                </p>
                <Input
                  id="bar-inv-total-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 500"
                  value={form.totalAmountEntered}
                  onChange={(e) => {
                    const totalStr = e.target.value;
                    setForm((f) => {
                      const next = { ...f, totalAmountEntered: totalStr };
                      const totalVal = parseFloat(totalStr) || 0;
                      const qty = Number(f.currentStock) || 0;
                      if (totalVal > 0 && qty > 0)
                        next.unitCost = Math.round((totalVal / qty) * 100) / 100;
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
                const unit = getStockLabel(form.unit);
                const hasSummary = qty > 0 && (cost > 0 || total > 0);
                return (
                  <>
                    <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-slate-50/80 px-4 py-3">
                      <p className="text-sm font-medium text-slate-600">Stock value (Current × Unit cost)</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{fmt(total)}</p>
                    </div>
                    {hasSummary && (
                      <div className="mt-3 rounded-xl border border-[#5a189a]/30 bg-[#5a189a]/5 px-4 py-3">
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
                              {" "}per {form.unit}
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {(form.unit === "bottle" || form.unit === "ml") && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FiPackage className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Bottle & serve</h3>
                    <p className="text-xs text-slate-500">Volume and serving size for reports and recipes.</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <LabelWithInfo id="bar-inv-volume" label="Volume (ml)" infoKey="volumeMl" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                    <Input id="bar-inv-volume" type="number" min={0} step="0.01" value={form.volumeMl} onChange={(e) => setForm((f) => ({ ...f, volumeMl: Number(e.target.value) }))} placeholder="e.g. 750" className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                  </div>
                  <div className="space-y-1.5">
                    <LabelWithInfo id="bar-inv-units-bottle" label="Units / bottle" infoKey="unitsPerBottle" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                    <Input id="bar-inv-units-bottle" type="number" min={0} step="0.01" value={form.unitsPerBottle} onChange={(e) => setForm((f) => ({ ...f, unitsPerBottle: Number(e.target.value) }))} placeholder="e.g. 15" className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                  </div>
                  <div className="space-y-1.5">
                    <LabelWithInfo id="bar-inv-ml-unit" label="ml / serve" infoKey="mlPerUnit" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                    <Input id="bar-inv-ml-unit" type="number" min={0} step="0.01" value={form.mlPerUnit} onChange={(e) => setForm((f) => ({ ...f, mlPerUnit: Number(e.target.value) }))} placeholder="e.g. 50" className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                  </div>
                </div>
              </div>
            )}

            {form.unit === "unit" && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FiPackage className="h-4 w-4" aria-hidden />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Bottle & serve (unit)</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <LabelWithInfo id="bar-inv-volume-u" label="Volume (ml)" infoKey="volumeMl" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                    <Input id="bar-inv-volume-u" type="number" min={0} step="0.01" value={form.volumeMl} onChange={(e) => setForm((f) => ({ ...f, volumeMl: Number(e.target.value) }))} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                  </div>
                  <div className="space-y-1.5">
                    <LabelWithInfo id="bar-inv-units-bottle-u" label="Units / bottle" infoKey="unitsPerBottle" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                    <Input id="bar-inv-units-bottle-u" type="number" min={0} step="0.01" value={form.unitsPerBottle} onChange={(e) => setForm((f) => ({ ...f, unitsPerBottle: Number(e.target.value) }))} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                  </div>
                  <div className="space-y-1.5">
                    <LabelWithInfo id="bar-inv-ml-unit-u" label="ml / unit" infoKey="mlPerUnit" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                    <Input id="bar-inv-ml-unit-u" type="number" min={0} step="0.01" value={form.mlPerUnit} onChange={(e) => setForm((f) => ({ ...f, mlPerUnit: Number(e.target.value) }))} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FiInfo className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Options & supplier</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <LabelWithInfo id="bar-inv-strict" label="Strict control" infoKey="strictControl" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <AppReactSelect value={form.isControlled ? "yes" : "no"} onChange={(value) => setForm((f) => ({ ...f, isControlled: value === "yes" }))} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="bar-inv-track" label="Track by bottle" infoKey="trackByBottle" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <AppReactSelect value={form.trackByBottle ? "yes" : "no"} onChange={(value) => setForm((f) => ({ ...f, trackByBottle: value === "yes" }))} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <LabelWithInfo id="bar-inv-supplier" label="Supplier" infoKey="supplier" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input id="bar-inv-supplier" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-xl border-slate-200 font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </Button>
            <Button type="submit" loading={createMut.isPending || updateMut.isPending} className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,109,0,0.4)]" style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}>
              {editItem ? "Update Item" : "Save Item"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Inventory Item" className="rounded-2xl border-slate-100 shadow-[0_24px_48px_rgba(0,0,0,0.12)]">
        <p className="text-sm text-slate-600">Are you sure you want to delete this inventory item? This cannot be undone.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </Button>
          <Button variant="destructive" onClick={removeItem} loading={deleteMut.isPending} className="rounded-xl">
            <FiTrash2 className="h-4 w-4 sm:mr-2" aria-hidden />
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
