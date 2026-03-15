"use client";

import { useMemo, useState } from "react";
import {
  useCreateMenuItem,
  useDeleteMenuItem,
  useInventoryItems,
  useMenuItems,
  useUpdateMenuItem,
} from "@/hooks/api";
import { Badge, Button, DataTable, Input, Modal } from "@/components/ui";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiDroplet,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiCopy,
  FiPackage,
} from "react-icons/fi";

interface CocktailTemplate {
  key: string;
  label: string;
  category: string;
  price: number;
  preparationTime: number;
  description: string;
}

const COCKTAIL_TEMPLATES: CocktailTemplate[] = [
  { key: "mojito", label: "Classic Mojito", category: "cocktail", price: 45, preparationTime: 5, description: "Refreshing white rum cocktail with mint, lime, syrup, and soda." },
  { key: "long-island", label: "Long Island Iced Tea", category: "cocktail", price: 60, preparationTime: 6, description: "Strong multi-spirit mix with citrus and cola finish." },
  { key: "gin-tonic", label: "Gin & Tonic", category: "cocktail", price: 40, preparationTime: 3, description: "Classic highball made with dry gin and tonic water." },
  { key: "whiskey-sour", label: "Whiskey Sour", category: "cocktail", price: 50, preparationTime: 4, description: "Balanced whiskey cocktail with lemon and syrup." },
];

type TemplateAccent = "emerald" | "amber" | "sky" | "orange" | "purple";
const TEMPLATE_ACCENTS: Record<string, TemplateAccent> = {
  mojito: "emerald",
  "long-island": "amber",
  "gin-tonic": "sky",
  "whiskey-sour": "orange",
};
const accentStyles: Record<
  TemplateAccent,
  { iconBg: string; iconColor: string; border: string; bg: string; hoverShadow: string }
> = {
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
  sky: {
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-600",
    border: "border-l-4 border-l-sky-500",
    bg: "bg-sky-50/50",
    hoverShadow: "hover:shadow-[0_12px_28px_rgba(14,165,233,0.18)]",
  },
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
};

export default function BarMenuItemsPage() {
  const [page, setPage] = useState(1);
  const [openCreate, setOpenCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "cocktail",
    price: 0,
    description: "",
    preparationTime: 5,
  });

  const { data, isLoading } = useMenuItems({
    page: String(page),
    limit: "20",
    department: "bar",
  });
  const { data: inventoryData } = useInventoryItems({
    limit: "500",
    department: "bar",
  });
  const createMut = useCreateMenuItem();
  const updateMut = useUpdateMenuItem();
  const deleteMut = useDeleteMenuItem();

  const allItems = data?.data ?? [];
  const menuItems = allItems.filter((item: any) => item.isBarItem);
  const pagination = data?.meta?.pagination;
  const inventoryList = inventoryData?.data ?? [];
  const inventoryMap = useMemo(
    () => Object.fromEntries(inventoryList.map((item: any) => [String(item._id), item])),
    [inventoryList]
  );

  const resetForm = () =>
    setForm({
      name: "",
      category: "cocktail",
      price: 0,
      description: "",
      preparationTime: 5,
    });

  const applyTemplate = (templateKey: string) => {
    const template = COCKTAIL_TEMPLATES.find((item) => item.key === templateKey);
    if (!template) return;
    setForm({
      name: template.label,
      category: template.category,
      price: template.price,
      description: template.description,
      preparationTime: template.preparationTime,
    });
    toast.success(`${template.label} template applied. Add ingredients in BAR Recipe Engine.`);
  };

  const createMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({
        department: "bar",
        name: form.name,
        category: form.category,
        price: Number(form.price),
        description: form.description || undefined,
        preparationTime: Number(form.preparationTime || 0) || undefined,
        isBarItem: true,
      });
      toast.success("BAR menu item created");
      setOpenCreate(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to create menu item");
    }
  };

  const updateAvailability = async (row: any, isAvailable: boolean) => {
    try {
      await updateMut.mutateAsync({ id: row._id, department: "bar", isAvailable });
      toast.success("Availability updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to update item");
    }
  };

  const removeItem = async () => {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync({ id: deleteId, department: "bar" });
      toast.success("Menu item deleted");
      setDeleteId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to delete item");
    }
  };

  const selectedEdit = useMemo(
    () => menuItems.find((item: any) => item._id === editId) ?? null,
    [menuItems, editId]
  );

  const columns = [
    {
      key: "name",
      header: "Item",
      render: (row: any) => (
        <button
          type="button"
          onClick={() => setEditId(row._id)}
          className="text-left font-medium text-slate-900 underline-offset-2 hover:underline"
        >
          {row.name}
        </button>
      ),
    },
    { key: "category", header: "Category", render: (row: any) => row.category },
    { key: "price", header: "Price", render: (row: any) => `GHS ${Number(row.price ?? 0).toFixed(2)}` },
    {
      key: "recipe",
      header: "Recipe",
      render: (row: any) =>
        row.recipe?.length ? `${row.recipe.length} ingredient(s)` : "No ingredients",
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) =>
        row.isAvailable ? (
          <Badge variant="success" className="inline-flex items-center gap-1">
            <FiCheckCircle className="h-3.5 w-3.5" aria-hidden />
            Available
          </Badge>
        ) : (
          <Badge variant="danger" className="inline-flex items-center gap-1">
            <FiXCircle className="h-3.5 w-3.5" aria-hidden />
            Unavailable
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (row: any) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setDeleteId(row._id)}
          className="text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Delete menu item"
        >
          <FiTrash2 className="h-4 w-4" aria-hidden />
        </Button>
      ),
    },
  ];

  const totalCount = menuItems.length;
  const availableCount = menuItems.filter((m: any) => m.isAvailable).length;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Hero: title + stats + CTA */}
      <header className="relative border-b border-slate-100 bg-white">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-[#ff6d00] via-[#ff8500] to-[#5a189a] opacity-90" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-[#ff8500] to-[#ff9e00] text-white shadow-[0_8px_28px_rgba(255,133,0,0.28)] ring-2 ring-[#ff8500]/20">
                  <FiDroplet className="h-7 w-7" aria-hidden />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Bar Menu Items
                  </h1>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    Manage drinks, prices, and ingredient recipes for consistent service.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setOpenCreate(true)}
                className="h-12 shrink-0 rounded-xl px-6 text-base font-semibold text-white shadow-[0_4px_16px_rgba(255,109,0,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(255,109,0,0.4)]"
                style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
              >
                <FiPlus className="h-5 w-5 sm:mr-2" aria-hidden />
                Add Menu Item
              </Button>
            </div>
            {/* Stats inline */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5">
                <FiDroplet className="h-4 w-4 text-slate-500" aria-hidden />
                <span className="text-sm font-medium text-slate-600">Total</span>
                <span className="text-lg font-bold text-slate-900">{totalCount}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-emerald-50/80 px-4 py-2.5">
                <FiCheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />
                <span className="text-sm font-medium text-slate-600">Available</span>
                <span className="text-lg font-bold text-emerald-600">{availableCount}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#5a189a]/20 bg-[#5a189a]/5 px-4 py-2.5">
                <FiCopy className="h-4 w-4 text-[#5a189a]" aria-hidden />
                <span className="text-sm font-medium text-slate-600">Templates</span>
                <span className="text-lg font-bold text-[#5a189a]">{COCKTAIL_TEMPLATES.length}</span>
              </div>
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
            {COCKTAIL_TEMPLATES.map((template) => {
              const accent = TEMPLATE_ACCENTS[template.key] ?? "purple";
              const style = accentStyles[accent];
              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => applyTemplate(template.key)}
                  className={`flex shrink-0 flex-col items-start rounded-2xl border border-slate-100 p-5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all hover:scale-[1.02] hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5a189a]/25 focus:ring-offset-2 min-w-[180px] ${style.border} ${style.bg} ${style.hoverShadow}`}
                >
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${style.iconBg} ${style.iconColor}`}>
                    <FiCopy className="h-6 w-6" aria-hidden />
                  </div>
                  <span className="block text-sm font-bold text-slate-900">{template.label}</span>
                  <span className={`mt-1 block text-xs font-semibold ${style.iconColor}`}>
                    GHS {template.price} · {template.preparationTime} min
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Table card — full width */}
        <section>
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff8500]/10 text-[#c2410c]">
                  <FiDroplet className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">All menu items</h2>
                  <p className="text-sm text-slate-500">Manage recipes and availability.</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <DataTable
                columns={columns}
                data={menuItems}
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
                emptyTitle="No BAR menu items"
                emptyDescription="Create drink items and map inventory recipes to get started."
                className="[&_table]:min-w-full"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Create modal — premium layout */}
      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Create BAR Menu Item"
        size="xl"
        className="max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl border-slate-100 shadow-[0_24px_48px_rgba(0,0,0,0.12)]"
      >
        <form onSubmit={createMenu} className="flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="flex-1 space-y-6 overflow-y-auto px-1">
            {/* Templates section */}
            <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-[#5a189a]/5 to-[#9d4edd]/5 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5a189a]/15 text-[#5a189a]">
                  <FiCopy className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Quick templates</h3>
                  <p className="text-xs text-slate-500">Prefill the form, then adjust and save.</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {COCKTAIL_TEMPLATES.map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => applyTemplate(template.key)}
                    className="rounded-xl border border-[#5a189a]/25 bg-white px-4 py-2.5 text-sm font-medium text-[#5a189a] shadow-sm transition-all hover:border-[#5a189a]/50 hover:bg-[#5a189a]/10 hover:shadow-md"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Details section */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff8500]/15 text-[#c2410c]">
                  <FiDroplet className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Item details</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
                <Input
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
                <Input
                  type="number"
                  label="Price (GHS)"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  required
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
                <Input
                  type="number"
                  label="Preparation time (min)"
                  min={0}
                  value={form.preparationTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, preparationTime: Number(e.target.value || 0) }))
                  }
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
              </div>
            </div>

            <p className="rounded-xl border border-[#5a189a]/20 bg-[#5a189a]/5 px-4 py-3 text-sm text-slate-600">
              Add ingredients for this item in <strong>BAR Recipe Engine</strong> (Recipes) after saving.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenCreate(false)}
              className="rounded-xl border-slate-200 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending}
              className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,109,0,0.4)]"
              style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
            >
              Save menu item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Menu Recipe Details — premium redesign */}
      <Modal
        open={!!editId}
        onClose={() => setEditId(null)}
        title="Menu Recipe Details"
        size="lg"
        className="max-w-md rounded-2xl border-slate-100 shadow-[0_24px_56px_rgba(0,0,0,0.15)]"
      >
        <div className="space-y-6" style={{ fontFamily: "Inter, sans-serif" }}>
          {/* Item name + recipe label */}
          <div className="rounded-xl border border-slate-100 bg-linear-to-r from-[#5a189a]/5 to-[#9d4edd]/5 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm text-[#5a189a]">
                <FiPackage className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5a189a]">Recipe</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">{selectedEdit?.name ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Ingredients list */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Ingredients</h3>
            {(selectedEdit?.recipe ?? []).length > 0 ? (
              <ul className="space-y-2">
                {(selectedEdit?.recipe ?? []).map((recipe: { inventoryItemId?: string; quantity?: number; unit?: string }, idx: number) => {
                  const inv = recipe.inventoryItemId ? inventoryMap[String(recipe.inventoryItemId)] : null;
                  const name = inv?.name ?? (recipe.inventoryItemId ? "Unknown ingredient" : "—");
                  const qty = Number(recipe.quantity ?? 0);
                  const unit = recipe.unit ?? "ml";
                  return (
                    <li
                      key={idx}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5a189a]/10 text-sm font-bold text-[#5a189a]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{name}</p>
                        <p className="text-sm text-slate-500">
                          {qty} {unit}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
                No recipe configured.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Menu Item">
        <p className="text-sm text-[#6b7280]">Are you sure you want to delete this BAR menu item? This cannot be undone.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleteId(null)} className="border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]">
            Cancel
          </Button>
          <Button variant="destructive" onClick={removeItem} loading={deleteMut.isPending}>
            <FiTrash2 className="h-4 w-4" aria-hidden />
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
