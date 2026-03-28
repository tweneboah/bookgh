"use client";

import { useState, useRef, useEffect } from "react";
import {
  useProductionBatches,
  useCreateProductionBatch,
  useRestaurantRecipes,
  useInventoryItems,
  useItemYields,
  useRestaurantUnits,
} from "@/hooks/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Modal,
  Input,
  Textarea,
  StatCard,
  AppReactSelect,
} from "@/components/ui";
import { Plus, Info, FlaskConical, Layers, TrendingUp, Lightbulb } from "lucide-react";
import toast from "react-hot-toast";

const PRODUCTION_FIELD_INFOS: Record<string, string> = {
  batchNumber: "Unique identifier for this batch (e.g. PB-001). Leave empty to auto-generate.",
  recipe: "The recipe used for this production run. Inputs and expected costs come from the recipe.",
  recipeInputs: "Chef quantities from the recipe. Check “Override” to enter what you actually used for this batch.",
  actualQty: "Actual chef quantity used in this batch. Used for cost variance and stock deduction.",
  outputInventoryItem: "Optional: link produced quantity to an inventory item for stock tracking.",
  outputItemName: "Name of the finished product (e.g. Jollof Rice). Defaults to the recipe name.",
  quantityProduced: "How many units you produced in this batch. Same unit as Output Unit.",
  outputUnit: "Unit for the quantity produced (e.g. portion, kg, unit).",
  notes: "Optional notes for this batch (e.g. shift, issues, adjustments).",
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
  const info = PRODUCTION_FIELD_INFOS[infoKey] ?? "";
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
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-[#5a189a] hover:bg-[#f5f0ff] hover:text-[#5a189a]"
            aria-label={`Info: ${label}`}
          >
            <Info className="h-3 w-3" />
          </button>
          {isOpen && (
            <div className="absolute left-0 top-full z-100 mt-1 max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 shadow-lg ring-1 ring-black/5">
              {info}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

function varianceBadge(
  variance: number,
  baseline: number
): { label: string; variant: "success" | "warning" | "danger" } {
  const pct = baseline > 0 ? Math.abs((variance / baseline) * 100) : 0;
  if (pct <= 2) return { label: "Good", variant: "success" };
  if (pct <= 5) return { label: "Warning", variant: "warning" };
  return { label: "Critical", variant: "danger" };
}

function variancePercent(variance: number, baseline: number): number {
  if (!Number.isFinite(baseline) || baseline <= 0) return 0;
  return Math.abs((variance / baseline) * 100);
}

export default function ProductionBatchesPage() {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [overrideInputs, setOverrideInputs] = useState(false);
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
  const [inputRows, setInputRows] = useState<
    Array<{
      inventoryItemId: string;
      itemName: string;
      expectedQuantity: number;
      quantityUsed: number;
      unit: string;
      unitCost: number;
      totalCost: number;
    }>
  >([]);
  const [form, setForm] = useState({
    batchNumber: "",
    recipeId: "",
    recipeName: "",
    outputInventoryItemId: "",
    outputItemName: "",
    quantityProduced: "",
    outputUnit: "unit",
    notes: "",
  });

  const { data, isLoading } = useProductionBatches({ page: String(page), limit: "20" });
  const { data: recipesData } = useRestaurantRecipes({ limit: "300" });
  const { data: inventoryData } = useInventoryItems({
    limit: "500",
    department: "restaurant",
  });
  const { data: yieldsData } = useItemYields({ limit: "500" });
  const { data: unitsData } = useRestaurantUnits({ limit: "200", active: "true" });
  const createMut = useCreateProductionBatch();

  const rows = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const recipes = recipesData?.data ?? [];
  const inventoryItems = inventoryData?.data ?? [];
  const yieldMappings = yieldsData?.data ?? [];
  const restaurantUnits = unitsData?.data ?? [];
  const selectedRecipe = recipes.find((r: any) => r._id === form.recipeId);

  const getUnitLabel = (unitValue: string) => {
    const u = restaurantUnits.find((x: any) => String(x._id) === String(unitValue));
    if (!u) return unitValue;
    return u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name;
  };

  const estimateChefUnitCost = (inventoryItemId: string, chefUnitId: string) => {
    const inv = inventoryItems.find((i: any) => String(i._id) === String(inventoryItemId));
    if (!inv) return null;
    const baseUnitCost = Number(inv.unitCost ?? 0);
    const mapping = yieldMappings.find(
      (y: any) =>
        String(y.inventoryItemId?._id ?? y.inventoryItemId) === String(inventoryItemId) &&
        String(y.toUnitId?._id ?? y.toUnitId) === String(chefUnitId)
    );
    if (!mapping) return null;
    const baseUnitQty = Number(mapping.baseUnitQty ?? 0);
    const toQty = Number(mapping.toQty ?? 0);
    if (!(baseUnitQty > 0) || !(toQty > 0)) return null;
    const costPerYieldUnit = (baseUnitCost * baseUnitQty) / toQty;
    return Math.round(costPerYieldUnit * 100) / 100;
  };

  const getBaseEquivalentQty = (
    inventoryItemId: string,
    unitValue: string,
    qty: number
  ): { qty: number; unit: string } | null => {
    if (!inventoryItemId || !unitValue || !Number.isFinite(qty) || qty < 0) return null;
    const inv = inventoryItems.find((i: any) => String(i._id) === String(inventoryItemId));
    if (!inv) return null;
    const baseUnit = String(inv.unit ?? "unit");

    // If the entered unit already matches base unit text, equivalent is the same number.
    if (String(unitValue).trim().toLowerCase() === baseUnit.trim().toLowerCase()) {
      return { qty: Number(qty.toFixed(4)), unit: baseUnit };
    }

    const mapping = yieldMappings.find(
      (y: any) =>
        String(y.inventoryItemId?._id ?? y.inventoryItemId) === String(inventoryItemId) &&
        String(y.toUnitId?._id ?? y.toUnitId) === String(unitValue)
    );
    if (!mapping) return null;

    const baseUnitQty = Number(mapping.baseUnitQty ?? 0);
    const toQty = Number(mapping.toQty ?? 0);
    if (!(baseUnitQty > 0) || !(toQty > 0)) return null;

    const baseQty = (qty * baseUnitQty) / toQty;
    return { qty: Number(baseQty.toFixed(4)), unit: baseUnit };
  };

  const yieldUnitOptions = [
    { value: "unit", label: "unit (default)" },
    ...restaurantUnits
      .filter((u: any) => u.type === "yield" || u.type === "both")
      .map((u: any) => ({
        value: u.name,
        label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
      })),
  ];

  const expectedInputCost = Number(
    inputRows
      .reduce((sum, row) => {
        const expectedQty = Number(row.expectedQuantity ?? 0);
        const unitCost = Number(row.unitCost ?? 0);
        return sum + expectedQty * unitCost;
      }, 0)
      .toFixed(2)
  );
  const actualInputCost = Number(
    inputRows.reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0).toFixed(2)
  );
  const inputCostVariance = Number((actualInputCost - expectedInputCost).toFixed(2));
  const outputQty = Number(form.quantityProduced || 0);
  const expectedUnitProductionCost =
    outputQty > 0 ? Number((expectedInputCost / outputQty).toFixed(2)) : 0;
  const actualUnitProductionCost =
    outputQty > 0 ? Number((actualInputCost / outputQty).toFixed(2)) : 0;
  const unitCostVariance = Number(
    (actualUnitProductionCost - expectedUnitProductionCost).toFixed(2)
  );
  const inputVarianceTag = varianceBadge(inputCostVariance, expectedInputCost);
  const unitVarianceTag = varianceBadge(
    unitCostVariance,
    expectedUnitProductionCost || 1
  );
  const inputVariancePct = variancePercent(inputCostVariance, expectedInputCost);
  const unitVariancePct = variancePercent(
    unitCostVariance,
    expectedUnitProductionCost || 1
  );

  const syncRowsFromRecipe = (recipe: any) => {
    const rowsFromRecipe = (recipe?.ingredients ?? []).map((row: any) => {
      const inventoryItemId = String(row.inventoryItemId?._id ?? row.inventoryItemId ?? "");
      const itemName = String(row.name ?? "");
      const chefQty = Number(row.chefQty ?? 0);
      const chefUnitId = row.chefUnitId ? String(row.chefUnitId) : "";

      // Prefer the chef-formula fields (chefUnitId/chefQty) so the batch screen stays in plain
      // chef language. If they're missing, fall back to base-unit fields (quantity/unit).
      if (chefQty > 0 && chefUnitId) {
        const unitCost = estimateChefUnitCost(inventoryItemId, chefUnitId) ?? 0;
        const totalCost = Math.round(chefQty * unitCost * 100) / 100;
        return {
          inventoryItemId,
          itemName,
          expectedQuantity: chefQty,
          quantityUsed: chefQty,
          unit: chefUnitId, // backend uses this to match the yield mapping (toUnitId)
          unitCost,
          totalCost,
        };
      }

      const expectedQty = Number(row.quantity ?? 0);
      const unit = String(row.unit ?? "unit");
      const unitCost = Number(row.unitCost ?? 0);
      const totalCost = Math.round(expectedQty * unitCost * 100) / 100;
      return {
        inventoryItemId,
        itemName,
        expectedQuantity: expectedQty,
        quantityUsed: expectedQty,
        unit,
        unitCost,
        totalCost,
      };
    });
    setInputRows(rowsFromRecipe);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipe = recipes.find((r: any) => r._id === form.recipeId);
    if (!recipe) {
      toast.error("Recipe is required");
      return;
    }
    if (!inputRows.length) {
      toast.error("Recipe has no inputs");
      return;
    }
    const payload = {
      batchNumber: form.batchNumber || `PB-${Date.now().toString().slice(-6)}`,
      recipeId: recipe._id,
      recipeName: recipe.menuItemName,
      inputs: inputRows.map((row) => ({
        inventoryItemId: row.inventoryItemId,
        itemName: row.itemName,
        quantityUsed: Number(row.quantityUsed ?? 0),
        unit: row.unit,
        unitCost: Number(row.unitCost ?? 0),
        totalCost: Number(row.totalCost ?? 0),
      })),
      output: {
        inventoryItemId: form.outputInventoryItemId || undefined,
        itemName: form.outputItemName || recipe.menuItemName,
        quantityProduced: Number(form.quantityProduced || 0),
        unit:
          (form.outputInventoryItemId
            ? inventoryItems.find((i: any) => String(i._id) === String(form.outputInventoryItemId))?.unit
            : null) ?? form.outputUnit ?? "unit",
      },
      notes: form.notes || undefined,
    };
    try {
      await createMut.mutateAsync(payload);
      toast.success("Production batch created");
      setShowModal(false);
      setOverrideInputs(false);
      setInputRows([]);
      setForm({
        batchNumber: "",
        recipeId: "",
        recipeName: "",
        outputInventoryItemId: "",
        outputItemName: "",
        quantityProduced: "",
        outputUnit: "unit",
        notes: "",
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to create batch");
    }
  };

  const columns = [
    { key: "batchNumber", header: "Batch #" },
    { key: "recipeName", header: "Recipe" },
    { key: "productionDate", header: "Date", render: (r: any) => new Date(r.productionDate).toLocaleDateString() },
    { key: "totalInputCost", header: "Total Input Cost", render: (r: any) => fmt(Number(r.totalInputCost ?? 0)) },
    { key: "unitProductionCost", header: "Unit Cost", render: (r: any) => fmt(Number(r.unitProductionCost ?? 0)) },
  ];

  const recipeOptions = recipes.map((r: any) => ({ value: r._id, label: r.menuItemName }));
  const inventoryOptions = inventoryItems.map((i: any) => ({ value: i._id, label: i.name }));

  return (
    <div className="min-h-0 bg-white font-sans">
      {/* Hero header — white with gradient accent */}
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-1 h-1 w-12 rounded-full bg-linear-to-r from-[#ff6d00] to-[#ff9e00]" aria-hidden />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Production
              </h1>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">
                Record batches, track costs and variance
              </p>
            </div>
            <Button
              onClick={() => setShowModal(true)}
              className="h-11 shrink-0 bg-linear-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-md transition hover:opacity-95 focus-visible:ring-[#ff8500]"
            >
              <Plus className="h-4 w-4" />
              New Batch
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats row — mobile-first grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={Layers}
            title="Total batches"
            value={pagination?.total ?? 0}
            description="All time"
            className="rounded-xl border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          />
          <StatCard
            icon={FlaskConical}
            title="This page"
            value={rows.length}
            description={`Page ${page}`}
            className="rounded-xl border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          />
          <StatCard
            icon={TrendingUp}
            title="Unit cost"
            value={rows.length ? fmt(Number(rows[0]?.unitProductionCost ?? 0)) : "—"}
            description={rows.length ? "Latest batch" : "No batches yet"}
            className="rounded-xl border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hidden sm:block"
          />
        </div>

        {/* Batches card */}
        <Card className="overflow-hidden rounded-xl border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardHeader className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
            <CardTitle className="text-base font-semibold text-slate-900 sm:text-lg">
              Batches
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={rows}
              getRowKey={(row) => row._id}
              loading={isLoading}
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
              emptyTitle="No production batches"
              emptyDescription="Create your first batch to start tracking production and costs."
              className="[&_table]:min-w-full [&_thead]:bg-[#faf9fc] [&_th]:text-slate-600 [&_th]:font-semibold"
            />
          </CardContent>
        </Card>
      </main>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="" size="xl" className="max-h-[94vh] overflow-hidden rounded-2xl border-0 bg-[#f7f9fb] p-0 shadow-xl">
        <form onSubmit={submit} className="max-h-[94vh] overflow-y-auto bg-[#f7f9fb] px-6 py-6 text-[#191c1e] antialiased md:px-8 md:py-8">
          <header className="mb-8">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#ff6b00]">
                  Production Workflow
                </span>
                <h1 className="text-4xl font-extrabold tracking-tight text-[#191c1e] md:text-5xl">
                  Create Production Batch
                </h1>
                <p className="max-w-2xl text-lg text-[#5a4136]">
                  Record a production run: pick a recipe, confirm or override inputs, set output
                  quantity and cost variance.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-6 py-3 font-semibold text-[#a04100] transition-all hover:bg-[#e2bfb0]/20"
                >
                  Discard Draft
                </button>
                <Button
                  type="submit"
                  loading={createMut.isPending}
                  className="rounded-xl bg-linear-to-br from-[#a04100] to-[#ff6b00] px-8 py-3 font-bold text-white shadow-[0px_12px_32px_rgba(25,28,30,0.06)] active:scale-95"
                >
                  Finalize Batch
                </Button>
              </div>
            </div>
          </header>

          <main className="space-y-8">
            <div className="space-y-8">
              <section className="rounded-xl bg-white p-8 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-2">
                    <LabelWithInfo id="prod-batch" label="Batch Number" infoKey="batchNumber" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                    <Input
                      id="prod-batch"
                      value={form.batchNumber}
                      onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))}
                      placeholder="e.g. BATCH-2023-001"
                      className="rounded-xl border-0 bg-[#f2f4f6] p-4 focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithInfo id="prod-recipe" label="Recipe Selector" infoKey="recipe" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                    <select
                      id="prod-recipe"
                      value={form.recipeId}
                      onChange={(e) => {
                        const value = e.target.value;
                        const recipe = recipes.find((r: any) => r._id === value);
                        syncRowsFromRecipe(recipe);
                        setForm((f) => ({
                          ...f,
                          recipeId: value,
                          recipeName: recipe?.menuItemName ?? "",
                          outputItemName: recipe?.menuItemName ?? f.outputItemName,
                        }));
                      }}
                      className="w-full appearance-none rounded-xl border-0 bg-[#f2f4f6] p-4 focus:ring-2 focus:ring-[#ff6b00]"
                    >
                      <option value="">Select recipe...</option>
                      {recipes.map((r: any) => (
                        <option key={r._id} value={r._id}>
                          {r.menuItemName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl bg-white p-8 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Recipe Inputs</h2>
                    <p className="mt-1 text-sm text-[#5a4136]">Override quantities for this batch</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#ff6b00]/10 px-3 py-2 text-xs text-[#a04100]">
                    <input
                      type="checkbox"
                      checked={overrideInputs}
                      onChange={(e) => setOverrideInputs(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#a04100] focus:ring-[#a04100]"
                    />
                    Override
                  </label>
                </div>
                {inputRows.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-[#f2f4f6] px-4 py-6 text-sm text-slate-500">
                    Select a recipe to preview inputs.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-y-2 text-left">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-[#5a4136]">
                          <th className="px-4 pb-4">Ingredient</th>
                          <th className="px-4 pb-4">Expected (Unit)</th>
                          <th className="px-4 pb-4">Actual Qty</th>
                          <th className="px-4 pb-4">Line Cost</th>
                          <th className="px-4 pb-4 text-right">Actual Eq.</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {inputRows.map((row, idx) => {
                          const expectedEq = getBaseEquivalentQty(
                            row.inventoryItemId,
                            row.unit,
                            Number(row.expectedQuantity ?? 0)
                          );
                          const actualEq = getBaseEquivalentQty(
                            row.inventoryItemId,
                            row.unit,
                            Number(row.quantityUsed ?? 0)
                          );
                          return (
                            <tr key={`${row.inventoryItemId}-${idx}`} className="group transition-colors hover:bg-[#f2f4f6]">
                              <td className="rounded-l-xl px-4 py-4 font-semibold">{row.itemName}</td>
                              <td className="px-4 py-4 text-[#5a4136]">
                                {row.expectedQuantity} {getUnitLabel(row.unit)}
                                {expectedEq && (
                                  <>
                                    <br />
                                    <span className="text-[10px] text-[#a04100]">
                                      Eq: {expectedEq.qty} {expectedEq.unit}
                                    </span>
                                  </>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <input
                                  id={`prod-actual-${idx}`}
                                  type="number"
                                  min={0}
                                  step="0.001"
                                  value={String(row.quantityUsed)}
                                  disabled={!overrideInputs}
                                  onChange={(e) =>
                                    setInputRows((rows) =>
                                      rows.map((item, i) => {
                                        if (i !== idx) return item;
                                        const qty = Number(e.target.value || 0);
                                        return {
                                          ...item,
                                          quantityUsed: qty,
                                          totalCost: Number((qty * Number(item.unitCost ?? 0)).toFixed(2)),
                                        };
                                      })
                                    )
                                  }
                                  className="w-20 rounded-lg border-0 bg-[#f2f4f6] p-2 text-center focus:ring-1 focus:ring-[#ff6b00]"
                                />
                              </td>
                              <td className="px-4 py-4 font-medium">{fmt(row.totalCost)}</td>
                              <td className="rounded-r-xl px-4 py-4 text-right font-bold">
                                {actualEq ? `${actualEq.qty} ${actualEq.unit}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 gap-8 rounded-xl bg-white p-8 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
                <div className="col-span-full mb-1">
                  <h2 className="text-xl font-bold">Output Configuration</h2>
                </div>
                <div className="space-y-2">
                  <LabelWithInfo id="prod-output-inv" label="Output Inventory Item (Optional)" infoKey="outputInventoryItem" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <select
                    id="prod-output-inv"
                    value={form.outputInventoryItemId}
                    onChange={(e) => {
                      const value = e.target.value;
                      const item = inventoryItems.find((i: any) => i._id === value);
                      setForm((f) => ({
                        ...f,
                        outputInventoryItemId: value,
                        outputItemName: item?.name ?? f.outputItemName,
                        outputUnit: item?.unit ?? f.outputUnit,
                      }));
                    }}
                    className="w-full rounded-xl border-0 bg-[#f2f4f6] p-4 focus:ring-2 focus:ring-[#ff6b00]"
                  >
                    <option value="">Link to Existing Inventory...</option>
                    {inventoryItems.map((i: any) => (
                      <option key={i._id} value={i._id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <LabelWithInfo id="prod-output-name" label="Output Name" infoKey="outputItemName" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input
                    id="prod-output-name"
                    value={form.outputItemName}
                    onChange={(e) => setForm((f) => ({ ...f, outputItemName: e.target.value }))}
                    required
                    className="rounded-xl border-0 bg-[#f2f4f6] p-4 focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                  />
                </div>
                <div className="space-y-2">
                  <LabelWithInfo id="prod-qty" label="Quantity Produced" infoKey="quantityProduced" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input
                    id="prod-qty"
                    type="number"
                    min={0.001}
                    step="0.001"
                    value={form.quantityProduced}
                    onChange={(e) => setForm((f) => ({ ...f, quantityProduced: e.target.value }))}
                    required
                    className="rounded-xl border-0 bg-[#f2f4f6] p-4 focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                  />
                </div>
                <div className="space-y-2">
                  <LabelWithInfo id="prod-unit" label="Output Unit" infoKey="outputUnit" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  {form.outputInventoryItemId ? (
                    <input
                      readOnly
                      value={
                        form.outputUnit ||
                        inventoryItems.find(
                          (i: any) => String(i._id) === String(form.outputInventoryItemId)
                        )?.unit ||
                        "unit"
                      }
                      className="w-full rounded-xl border-0 bg-[#f2f4f680] p-4 text-[#5a4136]"
                    />
                  ) : (
                    <select
                      id="prod-unit"
                      value={form.outputUnit}
                      onChange={(e) => setForm((f) => ({ ...f, outputUnit: e.target.value }))}
                      className="w-full rounded-xl border-0 bg-[#f2f4f6] p-4 focus:ring-2 focus:ring-[#ff6b00]"
                    >
                      {yieldUnitOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="col-span-full space-y-2">
                  <LabelWithInfo id="prod-notes" label="Production Notes" infoKey="notes" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Textarea
                    id="prod-notes"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Add observations about texture, flavor, or equipment performance..."
                    className="rounded-xl border-0 bg-[#f2f4f6] p-4 focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                  />
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <div className="rounded-xl border-t-4 border-[#ff6b00] bg-white p-8 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
                <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
                  <TrendingUp className="h-4 w-4 text-[#a04100]" />
                  Economics Summary
                </h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#eceef0] pb-4">
                    <span className="font-medium text-[#5a4136]">Expected Input Cost</span>
                    <span className="text-lg font-bold">{fmt(expectedInputCost)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#eceef0] pb-4">
                    <span className="font-medium text-[#5a4136]">Actual Input Cost</span>
                    <span className="text-lg font-bold">{fmt(actualInputCost)}</span>
                  </div>
                  <div className="space-y-1 rounded-xl bg-[#ffdad6]/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-[#93000a]">
                        Input Cost Variance
                      </span>
                      <TrendingUp className="h-4 w-4 text-[#ba1a1a]" />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <span className="text-2xl font-black text-[#ba1a1a]">
                        {fmt(inputCostVariance)}
                      </span>
                      <span className="rounded-full bg-[#ba1a1a] px-2 py-1 text-[10px] font-bold text-white">
                        {inputVarianceTag.label.toUpperCase()} ({inputVariancePct.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 rounded-xl bg-[#059eff]/10 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-[#003357]">
                        Unit Cost Variance
                      </span>
                      <Badge variant={unitVarianceTag.variant}>{unitVarianceTag.label}</Badge>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <span className="text-2xl font-black text-[#0062a1]">
                        {fmt(unitCostVariance)}
                      </span>
                      <span className="rounded-full bg-[#0062a1] px-2 py-1 text-[10px] font-bold text-white">
                        {unitVarianceTag.label.toUpperCase()} ({unitVariancePct.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6">
                  <div className="group relative aspect-video overflow-hidden rounded-xl">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAo8ebw9STjahro_-_NuD7VuObxsC3OfhuFEeqW-SaBv7F7M3jCS6x_3LU669JSwRsqGv6B8cYf5usg_E0YH8_Mb-rgR-5QM6LUGgVR-EgMlf8OaW0SL3B0U-NUfzcCfvcwGxpf2dKB0dVf1zMHqBe7u18WOs84mxgw3rQr1gTrQTZPHl9wJUPh0U9idxnxThfv4lQOs6Zdsg_ZI3PnKEKw2exRB7sJRJI-qB4JddL5s1K0s032p1ifLlA9010PFGvoEf-FlFsZApa0"
                      alt="Kitchen Context"
                      className="h-full w-full object-cover brightness-75 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/60 to-transparent p-4">
                      <p className="text-xs italic text-white">
                        Standardized production ensures predictable margins.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-[#f2f4f6] p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ff6b00] text-white">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Chef Tip</h4>
                  <p className="text-xs text-[#5a4136]">
                    Over-usage of chicken breast noticed in this batch. Consider recalibrating
                    serve portions.
                  </p>
                </div>
              </div>
            </aside>
          </main>
        </form>
      </Modal>
    </div>
  );
}
