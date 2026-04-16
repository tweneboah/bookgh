"use client";

import { useState, useMemo } from "react";
import {
  useRestaurantRecipes,
  useCreateRestaurantRecipe,
  useUpdateRestaurantRecipe,
  useDeleteRestaurantRecipe,
  useMenuItems,
  useInventoryItems,
  useRestaurantUnits,
  useItemYields,
  useLocationStock,
} from "@/hooks/api";
import { Button, Modal, Input, Textarea, AppReactSelect } from "@/components/ui";
import { IoAdd, IoPencil, IoTrash, IoBookOutline, IoSearch } from "react-icons/io5";
import toast from "react-hot-toast";
import { convertBaseQtyToChefYieldQty, buildYieldMap, convertChefQtyToBaseQty } from "@/lib/unit-conversion";
import { formatDisplayQuantity } from "@/lib/format-display-qty";

type IngredientRow = {
  inventoryItemId: string;
  name: string;
  quantity: string;
  unit: string;
  unitCost: string;
  chefUnitId: string;
  chefQty: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export default function RestaurantRecipesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    menuItemId: "",
    menuItemName: "",
    sellingPrice: "",
    overheadCost: "",
    productionTimeMinutes: "",
    preparationInstructions: "",
    ingredients: [{ inventoryItemId: "", name: "", quantity: "", unit: "unit", unitCost: "", chefUnitId: "", chefQty: "" }] as IngredientRow[],
  });

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (search.trim()) params.q = search.trim();

  const { data, isLoading } = useRestaurantRecipes(params);
  const { data: menuData } = useMenuItems({
    limit: "500",
    department: "restaurant",
  });
  const { data: inventoryData } = useInventoryItems({
    limit: "500",
    department: "restaurant",
  });
  const { data: unitsRaw } = useRestaurantUnits({ limit: "200", active: "true" });
  const chefUnits: any[] = Array.isArray(unitsRaw) ? unitsRaw : (unitsRaw as any)?.data ?? [];
  const chefUnitOptions = chefUnits
    .filter((u: any) => u.isActive !== false)
    .map((u: any) => ({
      value: u._id,
      label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
    }));

  const { data: yieldsRaw } = useItemYields({ limit: "1000" });
  const yieldMappings: any[] = Array.isArray(yieldsRaw) ? yieldsRaw : (yieldsRaw as any)?.data ?? [];

  const { data: locationData } = useLocationStock({ department: "restaurant" });
  const kitchenStock = (locationData?.data as { kitchen?: unknown[] } | undefined)?.kitchen ?? [];
  const kitchenQtyByItemId = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of kitchenStock) {
      const r = row as { inventoryItemId?: string; quantity?: number };
      const id = String(r.inventoryItemId ?? "");
      if (!id) continue;
      m.set(id, Number(r.quantity ?? 0));
    }
    return m;
  }, [kitchenStock]);

  const yieldMapForKitchen = useMemo(() => buildYieldMap(yieldMappings), [yieldMappings]);

  const getChefUnitLabel = (chefUnitId: string) => {
    if (!chefUnitId) return "";
    const unit = chefUnits.find((u: any) => String(u._id) === String(chefUnitId));
    return String(unit?.abbreviation ?? unit?.name ?? "").trim();
  };

  const getYieldFromUnitName = (yieldRow: any) => {
    if (typeof yieldRow?.fromUnitId === "object" && yieldRow?.fromUnitId?.name) {
      return String(yieldRow.fromUnitId.name);
    }
    const fromId = String(yieldRow?.fromUnitId?._id ?? yieldRow?.fromUnitId ?? "");
    if (!fromId) return "";
    const found = chefUnits.find((u: any) => String(u._id) === fromId);
    return String(found?.name ?? found?.abbreviation ?? "");
  };

  const getYieldToUnitLabel = (yieldRow: any) => {
    const to = yieldRow?.toUnitId;
    if (typeof to === "object") {
      const label = String(to?.abbreviation ?? to?.name ?? "").trim();
      if (label) return label;
      const toObjId = String(to?._id ?? "");
      if (toObjId) return getChefUnitLabel(toObjId);
    }
    return getChefUnitLabel(String(to ?? ""));
  };

  const getChefEquivalentsForBaseQty = (inv: any, baseQty: number): { label: string; qty: number }[] => {
    const itemId = String(inv?._id ?? "");
    if (!itemId || !Number.isFinite(baseQty)) return [];
    const rows = yieldMappings.filter(
      (y: any) => String(y.inventoryItemId?._id ?? y.inventoryItemId) === itemId
    );
    const out: { label: string; qty: number }[] = [];
    for (const y of rows) {
      const qty = convertBaseQtyToChefYieldQty({
        baseQuantity: Number(baseQty),
        item: inv,
        yieldRow: {
          fromQty: Number(y?.fromQty || 1),
          toQty: Number(y?.toQty || 1),
          baseUnitQty: Number(y?.baseUnitQty ?? 0) > 0 ? Number(y?.baseUnitQty) : undefined,
          fromUnitName: getYieldFromUnitName(y),
        },
      });
      const label = getYieldToUnitLabel(y);
      if (qty != null && Number.isFinite(qty) && qty >= 0 && label) {
        out.push({ label, qty });
      }
    }
    return out;
  };

  const estimateChefCost = (inventoryItemId: string, chefUnitId: string, chefQty: number) => {
    if (!inventoryItemId || !chefUnitId || !chefQty) return null;
    const inv = inventoryItems.find((i: any) => String(i._id) === inventoryItemId);
    if (!inv) return null;
    const baseUnitCost = Number(inv.unitCost || 0);
    const mapping = yieldMappings.find(
      (y: any) =>
        String(y.inventoryItemId?._id ?? y.inventoryItemId) === inventoryItemId &&
        String(y.toUnitId?._id ?? y.toUnitId) === chefUnitId
    );
    if (mapping) {
      const toQty = Number(mapping.toQty || 1);
      const mappingBaseUnitQty = Number(mapping.baseUnitQty || 0);
      if (mappingBaseUnitQty > 0) {
        const costPerYieldUnit = (baseUnitCost * mappingBaseUnitQty) / toQty;
        return Math.round(chefQty * costPerYieldUnit * 100) / 100;
      }
      return null;
    }
    return null;
  };

  const createMut = useCreateRestaurantRecipe();
  const updateMut = useUpdateRestaurantRecipe();
  const deleteMut = useDeleteRestaurantRecipe();

  const rows = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const menuItems = menuData?.data ?? [];
  const inventoryItems = inventoryData?.data ?? [];

  const menuOptions = [
    { value: "", label: "Select menu item..." },
    ...menuItems.map((m: any) => ({ value: m._id, label: m.name })),
  ];

  const inventoryOptions = [
    { value: "", label: "Select ingredient..." },
    ...inventoryItems.map((i: any) => ({ value: i._id, label: i.name })),
  ];

  const marginOverview = useMemo(() => {
    const validRows = form.ingredients.filter(
      (i) => i.inventoryItemId && i.chefUnitId && i.chefQty && Number(i.chefQty) > 0
    );
    let ingredientCost = 0;
    for (const row of validRows) {
      const est = estimateChefCost(row.inventoryItemId, row.chefUnitId, Number(row.chefQty));
      ingredientCost += est ?? 0;
    }
    const overhead = Number(form.overheadCost || 0);
    const costPerPortion = Math.round((ingredientCost + overhead) * 100) / 100;
    const sellingPrice = Number(form.sellingPrice || 0);
    const grossProfit = Math.round((sellingPrice - costPerPortion) * 100) / 100;
    const grossMarginPercent =
      sellingPrice > 0 ? Math.round((grossProfit / sellingPrice) * 1000) / 10 : 0;
    return {
      ingredientCost,
      costPerPortion,
      sellingPrice,
      grossProfit,
      grossMarginPercent,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ingredients, form.overheadCost, form.sellingPrice, inventoryItems, yieldMappings]);

  const reset = () => {
    setForm({
      menuItemId: "",
      menuItemName: "",
      sellingPrice: "",
      overheadCost: "",
      productionTimeMinutes: "",
      preparationInstructions: "",
      ingredients: [{ inventoryItemId: "", name: "", quantity: "", unit: "unit", unitCost: "", chefUnitId: "", chefQty: "" }],
    });
    setEditItem(null);
  };

  const openCreate = () => {
    reset();
    setShowModal(true);
  };

  const openEdit = (row: any) => {
    setEditItem(row);
    setForm({
      menuItemId: row.menuItemId?._id ?? row.menuItemId ?? "",
      menuItemName: row.menuItemName ?? "",
      sellingPrice: row.sellingPrice != null ? String(row.sellingPrice) : "",
      overheadCost: row.overheadCost != null ? String(row.overheadCost) : "",
      productionTimeMinutes:
        row.productionTimeMinutes != null ? String(row.productionTimeMinutes) : "",
      preparationInstructions: row.preparationInstructions ?? "",
      ingredients:
        Array.isArray(row.ingredients) && row.ingredients.length > 0
          ? row.ingredients.map((i: any) => ({
              inventoryItemId: i.inventoryItemId?._id ?? i.inventoryItemId ?? "",
              name: i.name ?? "",
              quantity: i.quantity != null ? String(i.quantity) : "",
              unit: i.unit ?? "unit",
              unitCost: i.unitCost != null ? String(i.unitCost) : "",
              chefUnitId: i.chefUnitId?._id ?? i.chefUnitId ?? "",
              chefQty: i.chefQty != null ? String(i.chefQty) : "",
            }))
          : [{ inventoryItemId: "", name: "", quantity: "", unit: "unit", unitCost: "", chefUnitId: "", chefQty: "" }],
    });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.menuItemId || !form.menuItemName) {
      toast.error("Menu item is required");
      return;
    }
    const validIngredientRows = form.ingredients.filter(
      (i) => i.inventoryItemId && i.chefUnitId && i.chefQty && Number(i.chefQty) > 0
    );
    if (validIngredientRows.length === 0) {
      toast.error("Add at least one ingredient with a chef unit and quantity");
      return;
    }
    const ingredientIds = validIngredientRows.map((i) => i.inventoryItemId);
    const duplicateId = ingredientIds.find(
      (id, idx) => ingredientIds.indexOf(id) !== idx
    );
    if (duplicateId) {
      const name = inventoryItems.find((i: any) => String(i._id) === String(duplicateId))?.name ?? "Ingredient";
      toast.error(`Duplicate ingredient: "${name}" appears more than once. Remove or combine.`);
      return;
    }
    const sellingPrice = Number(form.sellingPrice || 0);
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      toast.error("Selling price must be zero or greater");
      return;
    }
    const overheadCost = Number(form.overheadCost || 0);
    if (form.overheadCost !== "" && (!Number.isFinite(overheadCost) || overheadCost < 0)) {
      toast.error("Overhead cost must be zero or greater");
      return;
    }
    if (!editItem) {
      for (const row of validIngredientRows) {
        const inv = inventoryItems.find((item: any) => String(item._id) === String(row.inventoryItemId));
        if (!inv) continue;
        const chefQty = Number(row.chefQty || 0);
        const needed = convertChefQtyToBaseQty({
          inventoryItemId: row.inventoryItemId,
          chefQty,
          chefUnitIdOrName: row.chefUnitId,
          item: inv,
          yieldMap: yieldMapForKitchen,
        });
        if (needed == null) {
          toast.error(
            `No yield mapping from chef unit to base unit for ${inv.name}. Configure yields or pick another unit.`
          );
          return;
        }
        const avail = kitchenQtyByItemId.get(String(row.inventoryItemId)) ?? 0;
        if (needed > avail + 0.0001) {
          toast.error(
            `Insufficient kitchen stock for ${inv.name}: need ${formatDisplayQuantity(needed, 4)} ${inv.unit} at the kitchen; have ${formatDisplayQuantity(avail, 4)}. Use Movement Flow to move stock to the kitchen first.`
          );
          return;
        }
      }
    }
    const productionMins = form.productionTimeMinutes === "" ? null : Number(form.productionTimeMinutes);
    if (productionMins !== null && (!Number.isFinite(productionMins) || productionMins < 0)) {
      toast.error("Production time must be zero or greater");
      return;
    }
    const ingredients = validIngredientRows
      .map((i) => {
        const chefQty = Number(i.chefQty || 0);
        const inventory = inventoryItems.find(
          (item: any) => String(item._id) === String(i.inventoryItemId)
        );
        const unitCost = Number((inventory?.unitCost ?? i.unitCost) || 0);
        return {
          inventoryItemId: i.inventoryItemId,
          name: inventory?.name || i.name || "Ingredient",
          quantity: 0,
          unit: inventory?.unit ?? i.unit ?? "unit",
          chefUnitId: i.chefUnitId,
          chefQty,
          unitCost,
          totalCost: 0,
        };
      });
    const payload = {
      menuItemId: form.menuItemId,
      menuItemName: form.menuItemName,
      ingredients,
      sellingPrice: Number(form.sellingPrice || 0),
      overheadCost: Number(form.overheadCost || 0),
      productionTimeMinutes: form.productionTimeMinutes
        ? Number(form.productionTimeMinutes)
        : undefined,
      preparationInstructions: form.preparationInstructions || undefined,
    };
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Recipe updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Recipe created");
      }
      setShowModal(false);
      reset();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to save recipe");
    }
  };

  const removeRecipe = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Recipe deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to delete recipe");
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) || 1 : 1;
  const hasNext = pagination && page < totalPages;
  const hasPrev = page > 1;

  const totalRecipes = pagination?.total ?? 0;

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Gradient accent bar */}
      <div
        className="h-1 w-full shrink-0 rounded-b-sm bg-linear-to-r from-[#ff6d00] via-[#ff9100] to-[#5a189a]"
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header with subtle gradient */}
        <header className="relative mb-8 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white px-5 py-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:px-6 sm:py-7">
          <div className="absolute right-0 top-0 h-32 w-48 bg-linear-to-br from-[#ff9e00]/5 to-[#9d4edd]/5 rounded-bl-full" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1f2937] sm:text-3xl" style={{ fontWeight: 700 }}>
                Recipe Engine
              </h1>
              <p className="mt-1.5 text-sm text-[#6b7280]" style={{ fontWeight: 400 }}>
                Manage recipes, costs, and margins for your menu items.
              </p>
              {!isLoading && totalRecipes > 0 && (
                <p className="mt-2 text-xs font-medium text-[#5a189a]">
                  {totalRecipes} recipe{totalRecipes !== 1 ? "s" : ""} total
                </p>
              )}
            </div>
            <Button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-[#ff7900] hover:to-[#ff9100] hover:shadow-lg focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#ff8500] focus-visible:ring-offset-2"
            >
              <IoAdd className="h-5 w-5" aria-hidden />
              Add Recipe
            </Button>
          </div>
        </header>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <IoSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9ca3af]" aria-hidden />
            <input
              type="search"
              placeholder="Search recipes by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-white pl-10 pr-4 text-sm text-[#1f2937] placeholder:text-[#9ca3af] transition focus:border-[#5a189a] focus:outline-none focus:ring-2 focus:ring-[#5a189a]/20"
            />
          </div>
        </div>

        {/* Recipe cards grid */}
        <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#5a189a]" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-5 p-8 text-center">
              <div className="rounded-2xl bg-linear-to-br from-[#f5f3ff] to-[#ede9fe] p-5 shadow-inner">
                <IoBookOutline className="h-14 w-14 text-[#5a189a]" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1f2937]" style={{ fontWeight: 600 }}>No recipes yet</h2>
                <p className="mt-1.5 text-sm text-[#6b7280] max-w-sm">
                  Add your first recipe to link menu items to ingredients and track margins.
                </p>
              </div>
              <Button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-[#ff7900] hover:to-[#ff9100] hover:shadow-lg"
              >
                <IoAdd className="h-4 w-4" aria-hidden />
                Add Recipe
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 p-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:p-6">
                {rows.map((row: any) => {
                  const margin = Number(row.grossMarginPercent ?? 0);
                  const marginVariant =
                    margin >= 60 ? "excellent" : margin >= 40 ? "good" : margin >= 20 ? "fair" : "low";
                  return (
                    <div
                      key={row._id}
                      className="flex flex-col rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all duration-200 hover:border-[#7b2cbf]/30 hover:shadow-[0_8px_24px_rgba(90,24,154,0.08)]"
                    >
                      <h3 className="font-semibold text-[#1f2937]" style={{ fontWeight: 600 }}>
                        {row.menuItemName ?? "—"}
                      </h3>
                      <dl className="mt-3 flex-1 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-[#6b7280]" style={{ fontWeight: 400 }}>Cost / portion</dt>
                          <dd className="font-medium text-[#1f2937]" style={{ fontWeight: 500 }}>{fmt(Number(row.costPerPortion ?? 0))}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[#6b7280]" style={{ fontWeight: 400 }}>Selling price</dt>
                          <dd className="font-medium text-[#1f2937]" style={{ fontWeight: 500 }}>{fmt(Number(row.sellingPrice ?? 0))}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-[#6b7280]" style={{ fontWeight: 400 }}>Gross margin</dt>
                          <dd>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                marginVariant === "excellent"
                                  ? "bg-[#f5f3ff] text-[#5a189a]"
                                  : marginVariant === "good"
                                  ? "bg-[#fff7ed] text-[#ea580c]"
                                  : marginVariant === "fair"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {margin.toFixed(1)}%
                            </span>
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-4 flex gap-2 border-t border-[#f3f4f6] pt-4">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#5a189a] transition hover:bg-[#f5f3ff] hover:border-[#7b2cbf] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#5a189a]/30"
                        >
                          <IoPencil className="h-4 w-4" aria-hidden />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDelete(row._id)}
                          className="inline-flex items-center justify-center rounded-lg border border-[#fecaca] bg-white p-2 text-[#dc2626] transition hover:bg-red-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-red-500/30"
                          aria-label="Delete recipe"
                        >
                          <IoTrash className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination && pagination.total > pagination.limit && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e5e7eb] px-4 py-4 sm:px-6">
                  <p className="text-sm text-[#6b7280]">
                    Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev || isLoading}
                      className="inline-flex h-9 items-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#5a189a]/30"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-[#6b7280]">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNext || isLoading}
                      className="inline-flex h-9 items-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#5a189a]/30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Recipe Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? "Edit Recipe" : "Add Recipe"}
        size="lg"
      >
        <form onSubmit={save} className="space-y-5">
          <AppReactSelect
            label="Menu Item"
            value={form.menuItemId}
            options={menuOptions}
            onChange={(value) => {
              const menu = menuItems.find((m: any) => m._id === value);
              setForm((f) => ({
                ...f,
                menuItemId: value,
                menuItemName: menu?.name ?? "",
                sellingPrice: menu?.price != null ? String(menu.price) : f.sellingPrice,
              }));
            }}
            placeholder="Select menu item..."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Selling Price"
              type="number"
              min="0"
              step="0.01"
              value={form.sellingPrice}
              onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
            />
            <Input
              label="Overhead Cost"
              type="number"
              min="0"
              step="0.01"
              value={form.overheadCost}
              onChange={(e) => setForm((f) => ({ ...f, overheadCost: e.target.value }))}
            />
            <Input
              label="Production Time (mins)"
              type="number"
              min="0"
              value={form.productionTimeMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, productionTimeMinutes: e.target.value }))
              }
            />
          </div>

          {/* Profit margin overview */}
          <div className="rounded-xl border border-[#5a189a]/25 bg-[#faf5ff]/50 p-4">
            <p className="mb-3 text-sm font-semibold text-[#374151]">Profit margin overview</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <span className="text-[#6b7280]">Cost per portion</span>
                <p className="font-medium text-[#1f2937]">{fmt(marginOverview.costPerPortion)}</p>
              </div>
              <div>
                <span className="text-[#6b7280]">Selling price</span>
                <p className="font-medium text-[#1f2937]">{fmt(marginOverview.sellingPrice)}</p>
              </div>
              <div>
                <span className="text-[#6b7280]">Gross profit</span>
                <p className={`font-semibold ${marginOverview.grossProfit >= 0 ? "text-[#059669]" : "text-[#dc2626]"}`}>
                  {fmt(marginOverview.grossProfit)}
                </p>
              </div>
              <div>
                <span className="text-[#6b7280]">Gross margin</span>
                <p className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                      marginOverview.grossMarginPercent >= 60
                        ? "bg-emerald-100 text-emerald-800"
                        : marginOverview.grossMarginPercent >= 40
                          ? "bg-green-100 text-green-800"
                          : marginOverview.grossMarginPercent >= 20
                            ? "bg-amber-100 text-amber-800"
                            : marginOverview.sellingPrice > 0
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {marginOverview.grossMarginPercent.toFixed(1)}%
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-[#374151]">Ingredients</span>
              <p className="text-xs text-[#6b7280]">
                Recipe prep deducts from <strong className="text-[#374151]">kitchen</strong> stock (same as Movement Flow). POS main-store stock is shown for reference only.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    ingredients: [
                      ...f.ingredients,
                      { inventoryItemId: "", name: "", quantity: "", unit: "unit", unitCost: "", chefUnitId: "", chefQty: "" },
                    ],
                  }))
                }
                className="rounded-lg border-[#5a189a] text-[#5a189a] hover:bg-[#f5f3ff]"
              >
                Add Ingredient
              </Button>
            </div>
            <div className="space-y-3">
              {form.ingredients.map((ingredient, idx) => {
                const inv = ingredient.inventoryItemId
                  ? inventoryItems.find((i: any) => String(i._id) === ingredient.inventoryItemId)
                  : null;
                const chefQtyNum = Number(ingredient.chefQty || 0);
                const lineCost = ingredient.inventoryItemId && ingredient.chefUnitId && chefQtyNum > 0
                  ? estimateChefCost(ingredient.inventoryItemId, ingredient.chefUnitId, chefQtyNum)
                  : null;

                const itemYields = ingredient.inventoryItemId
                  ? yieldMappings.filter(
                      (y: any) => String(y.inventoryItemId?._id ?? y.inventoryItemId) === ingredient.inventoryItemId
                    )
                  : [];
                const relevantUnitIds = new Set(
                  itemYields.map((y: any) => String(y.toUnitId?._id ?? y.toUnitId))
                );
                const filteredChefUnitOptions = relevantUnitIds.size > 0
                  ? chefUnitOptions.filter((o) => relevantUnitIds.has(o.value))
                  : chefUnitOptions;

                const kitchenBaseQty = inv
                  ? kitchenQtyByItemId.get(String(ingredient.inventoryItemId)) ?? 0
                  : 0;
                const kitchenChefEquivalents = inv
                  ? getChefEquivalentsForBaseQty(inv, kitchenBaseQty)
                  : [];

                const mainStoreChefEquivalents = inv
                  ? getChefEquivalentsForBaseQty(inv, Number(inv.currentStock ?? 0))
                  : [];
                const chefUnitList = Array.from(
                  new Set(mainStoreChefEquivalents.map((e) => e.label).filter(Boolean))
                ).join(" · ");
                const mainStoreStockWithYield = inv
                  ? mainStoreChefEquivalents.length > 0
                    ? `${formatDisplayQuantity(Number(inv.currentStock ?? 0), 1)} ${inv.unit} (${mainStoreChefEquivalents
                        .map((e) => `≈ ${formatDisplayQuantity(e.qty, 1)} ${e.label}`)
                        .join(" · ")})`
                    : `${formatDisplayQuantity(Number(inv.currentStock ?? 0), 1)} ${inv.unit} (no chef/yield units)`
                  : "—";

                const neededBase =
                  inv && ingredient.chefUnitId && chefQtyNum > 0
                    ? convertChefQtyToBaseQty({
                        inventoryItemId: ingredient.inventoryItemId,
                        chefQty: chefQtyNum,
                        chefUnitIdOrName: ingredient.chefUnitId,
                        item: inv,
                        yieldMap: yieldMapForKitchen,
                      })
                    : null;
                const kitchenShort =
                  neededBase != null && neededBase > kitchenBaseQty + 0.0001;

                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#e5e7eb] bg-white p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="min-w-0 flex-1 sm:min-w-[180px]">
                        <AppReactSelect
                          label={idx === 0 ? "Ingredient" : undefined}
                          value={ingredient.inventoryItemId}
                          options={inventoryOptions}
                          onChange={(value) => {
                            const selected = inventoryItems.find((i: any) => i._id === value);
                            setForm((f) => {
                              const copy = [...f.ingredients];
                              copy[idx] = {
                                ...copy[idx],
                                inventoryItemId: value,
                                name: selected?.name ?? "",
                                unit: selected?.unit ?? "unit",
                                unitCost: selected?.unitCost != null ? String(selected.unitCost) : copy[idx].unitCost,
                                chefUnitId: "",
                                chefQty: "",
                              };
                              return { ...f, ingredients: copy };
                            });
                          }}
                          placeholder="Select ingredient..."
                        />
                      </div>
                      <div className="min-w-[150px]">
                        <AppReactSelect
                          label={idx === 0 ? "Chef Unit" : undefined}
                          options={filteredChefUnitOptions}
                          value={ingredient.chefUnitId}
                          onChange={(value) => {
                            setForm((f) => {
                              const copy = [...f.ingredients];
                              copy[idx] = { ...copy[idx], chefUnitId: value ?? "" };
                              return { ...f, ingredients: copy };
                            });
                          }}
                          placeholder="Unit..."
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          label={idx === 0 ? "Qty" : undefined}
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 2"
                          value={ingredient.chefQty}
                          onChange={(e) => {
                            setForm((f) => {
                              const copy = [...f.ingredients];
                              copy[idx] = { ...copy[idx], chefQty: e.target.value };
                              return { ...f, ingredients: copy };
                            });
                          }}
                        />
                      </div>
                      <div className="min-w-[120px] rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-xs text-[#6b7280]">
                        {lineCost != null ? (
                          <>Est. cost: <span className="font-semibold text-[#1f2937]">{fmt(lineCost)}</span></>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            ingredients: f.ingredients.filter((_, i) => i !== idx),
                          }))
                        }
                        className="border-[#fecaca] text-[#dc2626] hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>

                    {inv && (
                      <div
                        className={`mt-2 rounded-xl border px-3 py-2.5 sm:px-4 ${
                          kitchenShort && !editItem
                            ? "border-red-200 bg-red-50/90"
                            : kitchenBaseQty <= 0
                              ? "border-amber-200 bg-amber-50/80"
                              : "border-[#7b2cbf]/25 bg-[#faf5ff]/90"
                        }`}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#5a189a]">
                          Available in kitchen
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-[#111827]">
                          {formatDisplayQuantity(kitchenBaseQty, 2)}{" "}
                          <span className="text-sm font-medium text-[#6b7280]">{inv.unit ?? "unit"}</span>
                        </p>
                        {kitchenChefEquivalents.length > 0 && (
                          <p className="mt-1 text-xs text-[#6b7280]">
                            ≈{" "}
                            {kitchenChefEquivalents
                              .map((e) => `${formatDisplayQuantity(e.qty, 2)} ${e.label}`)
                              .join(" · ")}
                          </p>
                        )}
                        {kitchenBaseQty <= 0 && (
                          <p className="mt-1.5 text-xs text-amber-900">
                            Nothing in kitchen for this item yet. Move stock from main store on Movement Flow.
                          </p>
                        )}
                      </div>
                    )}

                    {inv && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-dashed border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-xs text-[#6b7280]">
                        <span>
                          Base unit: <strong className="text-[#374151]">{inv.unit ?? "—"}</strong>
                          {chefUnitList ? ` (${chefUnitList})` : " (no chef/yield units)"}
                        </span>
                        <span className="hidden sm:inline text-[#d1d5db]">|</span>
                        <span>
                          Cost per {inv.unit ?? "unit"}
                          {chefUnitList ? ` (${chefUnitList})` : " (no chef/yield units)"}:{" "}
                          <strong className="text-[#374151]">{fmt(Number(inv.unitCost ?? 0))}</strong>
                        </span>
                        <span className="hidden sm:inline text-[#d1d5db]">|</span>
                        <span>
                          Main store (POS):{" "}
                          <strong className={Number(inv.currentStock ?? 0) <= Number(inv.minimumStock ?? 0) ? "text-[#dc2626]" : "text-[#6b7280]"}>
                            {mainStoreStockWithYield}
                          </strong>
                        </span>
                      </div>
                    )}
                    {inv && kitchenShort && (
                      <p className="mt-2 text-xs text-[#b45309]">
                        {editItem
                          ? "If this line needs more than the kitchen row shows, the server returns previous recipe usage first—save may still succeed."
                          : "This line needs more base quantity than is in the kitchen. Transfer stock on Movement Flow or reduce quantities."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Textarea
            label="Preparation Instructions"
            value={form.preparationInstructions}
            onChange={(e) =>
              setForm((f) => ({ ...f, preparationInstructions: e.target.value }))
            }
            rows={3}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              className="rounded-xl border-[#e5e7eb]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] text-white hover:from-[#ff7900] hover:to-[#ff9100]"
            >
              {editItem ? "Update Recipe" : "Create Recipe"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation Modal */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Recipe">
        <p className="text-[#6b7280]">
          Are you sure you want to delete this recipe? This action cannot be undone.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDelete(null)}
            className="rounded-xl border-[#e5e7eb]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={removeRecipe}
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
