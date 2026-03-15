"use client";

import { useState, useRef, useEffect } from "react";
import {
  useProductionBatches,
  useCreateProductionBatch,
  useRestaurantRecipes,
  useInventoryItems,
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
import { Plus, Info, FlaskConical, Layers, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

const PRODUCTION_FIELD_INFOS: Record<string, string> = {
  batchNumber: "Unique identifier for this batch (e.g. PB-001). Leave empty to auto-generate.",
  recipe: "The recipe used for this production run. Inputs and expected costs come from the recipe.",
  recipeInputs: "Quantities from the recipe. Check “Override” to adjust actual quantities used for this batch.",
  actualQty: "Actual quantity of this ingredient used in this batch. Used for cost variance and stock deduction.",
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
            <div className="absolute left-0 top-full z-[100] mt-1 max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 shadow-lg ring-1 ring-black/5">
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
  const createMut = useCreateProductionBatch();

  const rows = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const recipes = recipesData?.data ?? [];
  const inventoryItems = inventoryData?.data ?? [];
  const selectedRecipe = recipes.find((r: any) => r._id === form.recipeId);
  const expectedInputCost = Number(
    (selectedRecipe?.ingredients ?? []).reduce(
      (sum: number, row: any) => sum + Number(row.totalCost ?? 0),
      0
    )
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
    const rowsFromRecipe = (recipe?.ingredients ?? []).map((row: any) => ({
      inventoryItemId: String(row.inventoryItemId?._id ?? row.inventoryItemId ?? ""),
      itemName: String(row.name ?? ""),
      expectedQuantity: Number(row.quantity ?? 0),
      quantityUsed: Number(row.quantity ?? 0),
      unit: String(row.unit ?? "unit"),
      unitCost: Number(row.unitCost ?? 0),
      totalCost: Number(row.totalCost ?? 0),
    }));
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
              <div className="mb-1 h-1 w-12 rounded-full bg-gradient-to-r from-[#ff6d00] to-[#ff9e00]" aria-hidden />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Production
              </h1>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">
                Record batches, track costs and variance
              </p>
            </div>
            <Button
              onClick={() => setShowModal(true)}
              className="h-11 shrink-0 bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-md transition hover:opacity-95 focus-visible:ring-[#ff8500]"
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Production Batch" size="lg" className="max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-xl">
        <form onSubmit={submit} className="overflow-hidden">
          {/* Hero strip — brand gradient */}
          <div className="relative -mx-6 -mt-4 mb-6 overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#fff8f2] via-white to-[#f5f0ff] px-5 py-4">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#ff9e00]/20 blur-2xl" aria-hidden />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7b2cbf]/30 to-transparent" aria-hidden />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <FlaskConical className="h-5 w-5 text-[#7b2cbf]" />
              </div>
              <p className="text-sm text-slate-600">
                Record a production run: pick a recipe, confirm or override inputs, set output quantity and cost variance.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Batch & recipe */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Batch &amp; recipe</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <LabelWithInfo id="prod-batch" label="Batch Number" infoKey="batchNumber" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input
                    id="prod-batch"
                    value={form.batchNumber}
                    onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))}
                    placeholder="Auto-generated if empty"
                    className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                  />
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="prod-recipe" label="Recipe" infoKey="recipe" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <AppReactSelect
                    value={form.recipeId}
                    options={recipeOptions}
                    onChange={(value) => {
                      const recipe = recipes.find((r: any) => r._id === value);
                      syncRowsFromRecipe(recipe);
                      setForm((f) => ({
                        ...f,
                        recipeId: value,
                        recipeName: recipe?.menuItemName ?? "",
                        outputItemName: recipe?.menuItemName ?? f.outputItemName,
                      }));
                    }}
                    placeholder="Select recipe..."
                    isClearable={false}
                  />
                </div>
              </div>
            </div>

            {/* Recipe inputs */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="relative flex items-center gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipe inputs</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenInfoKey(openInfoKey === "recipeInputs" ? null : "recipeInputs");
                    }}
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-[#5a189a] hover:bg-[#f5f0ff] hover:text-[#5a189a]"
                    aria-label="Info: Recipe inputs"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                  {openInfoKey === "recipeInputs" && (
                    <div ref={infoPopoverRef} className="absolute left-0 top-full z-[100] mt-1 max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 shadow-lg ring-1 ring-black/5">
                      {PRODUCTION_FIELD_INFOS.recipeInputs}
                    </div>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={overrideInputs}
                    onChange={(e) => setOverrideInputs(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]"
                  />
                  Override quantities for this batch
                </label>
              </div>
              {inputRows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-white/80 px-3 py-4 text-xs text-slate-500">
                  Select a recipe to preview inputs.
                </p>
              ) : (
                <div className="space-y-2">
                  {inputRows.map((row, idx) => (
                    <div
                      key={`${row.inventoryItemId}-${idx}`}
                      className="grid grid-cols-12 gap-2 rounded-lg border border-slate-100 bg-white p-2 text-xs shadow-sm"
                    >
                      <div className="col-span-4">
                        <p className="font-medium text-slate-700">{row.itemName}</p>
                        <p className="text-slate-500">Expected {row.expectedQuantity} {row.unit}</p>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <LabelWithInfo id={`prod-actual-${idx}`} label="Actual Qty" infoKey="actualQty" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                        <Input
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
                          className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input label="Unit" value={row.unit} disabled onChange={() => {}} className="rounded-lg" />
                      </div>
                      <div className="col-span-3 rounded-lg bg-slate-50 px-2 py-2 text-right">
                        <p className="text-slate-500">Line Cost</p>
                        <p className="font-semibold text-slate-800">{fmt(row.totalCost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Output */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Output</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <LabelWithInfo id="prod-output-inv" label="Output Inventory Item (optional)" infoKey="outputInventoryItem" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <AppReactSelect
                    value={form.outputInventoryItemId}
                    options={inventoryOptions}
                    onChange={(value) => {
                      const item = inventoryItems.find((i: any) => i._id === value);
                      setForm((f) => ({
                        ...f,
                        outputInventoryItemId: value,
                        outputItemName: item?.name ?? f.outputItemName,
                        outputUnit: item?.unit ?? f.outputUnit,
                      }));
                    }}
                    placeholder="Select inventory item..."
                    isClearable
                  />
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="prod-output-name" label="Output Name" infoKey="outputItemName" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input id="prod-output-name" value={form.outputItemName} onChange={(e) => setForm((f) => ({ ...f, outputItemName: e.target.value }))} required className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <LabelWithInfo id="prod-qty" label="Quantity Produced" infoKey="quantityProduced" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input
                    id="prod-qty"
                    type="number"
                    min={0.001}
                    step="0.001"
                    value={form.quantityProduced}
                    onChange={(e) => setForm((f) => ({ ...f, quantityProduced: e.target.value }))}
                    required
                    className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                  />
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="prod-unit" label="Output Unit (from item)" infoKey="outputUnit" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  {form.outputInventoryItemId ? (
                    <div
                      className="flex h-10 w-full items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700"
                      title="Unit from output item (same unit everywhere)"
                    >
                      {form.outputUnit || inventoryItems.find((i: any) => String(i._id) === String(form.outputInventoryItemId))?.unit || "—"}
                    </div>
                  ) : (
                    <div className="flex h-10 w-full items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-400">
                      Select output item
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <LabelWithInfo id="prod-notes" label="Notes" infoKey="notes" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
              <Textarea id="prod-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]" />
            </div>

            {/* Variance summary */}
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-[#e9e0f5] bg-gradient-to-br from-[#faf8ff] to-white p-4 text-xs sm:grid-cols-2">
              <p className="text-slate-700">
                Expected Input Cost: <span className="font-semibold">{fmt(expectedInputCost)}</span>
              </p>
              <p className="text-slate-700">
                Actual Input Cost: <span className="font-semibold">{fmt(actualInputCost)}</span>
              </p>
              <p className="flex flex-wrap items-center gap-2 text-slate-700">
                Input Cost Variance: <span className="font-semibold">{fmt(inputCostVariance)}</span>
                <Badge variant={inputVarianceTag.variant} title={`Variance: ${inputVariancePct.toFixed(2)}%`}>
                  {inputVarianceTag.label}
                </Badge>
                <span className="text-slate-500">({inputVariancePct.toFixed(2)}%)</span>
              </p>
              <p className="flex flex-wrap items-center gap-2 text-slate-700">
                Unit Cost Variance: <span className="font-semibold">{fmt(unitCostVariance)}</span>
                <Badge variant={unitVarianceTag.variant} title={`Variance: ${unitVariancePct.toFixed(2)}%`}>
                  {unitVarianceTag.label}
                </Badge>
                <span className="text-slate-500">({unitVariancePct.toFixed(2)}%)</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-lg border-slate-200">
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createMut.isPending}
                className="rounded-lg bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-md hover:opacity-95 focus-visible:ring-[#ff8500]"
              >
                Create Batch
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
