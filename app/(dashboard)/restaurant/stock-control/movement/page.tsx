"use client";

import { useMemo, useRef } from "react";
import { AppReactSelect, Button, Input } from "@/components/ui";
import { FiArrowRight, FiEye, FiPackage } from "react-icons/fi";
import {
  ENTRY_MOVEMENT_OPTIONS,
  useRestaurantStockControl,
} from "@/components/restaurant/stock-control/use-stock-control";

export default function RestaurantStockMovementPage() {
  const sc = useRestaurantStockControl();
  const infoPopoverRef = useRef<HTMLDivElement | null>(null);

  const inventoryOptions = sc.inventoryOptions;
  const inventoryMap = sc.inventoryMap;

  const equivalents = useMemo(() => {
    if (!sc.movementPreview) return [];
    return sc.buildChefReadableEquivalents(
      sc.movementForm.inventoryItemId,
      sc.movementPreview.resultingStock
    );
  }, [sc, sc.movementPreview, sc.movementForm.inventoryItemId]);

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      <div className="relative border-b border-slate-100 bg-white">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/25">
              <FiPackage className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Record Stock Movement
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Log restock, wastage, or adjustments.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <form onSubmit={sc.submitMovement} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Ingredient</label>
              <AppReactSelect
                value={sc.movementForm.inventoryItemId}
                onChange={(value) => {
                  const item = inventoryMap[value];
                  sc.setMovementForm((prev) => ({
                    ...prev,
                    inventoryItemId: value,
                    unit: item?.unit ?? prev.unit,
                  }));
                }}
                options={inventoryOptions}
                placeholder="Select ingredient"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Movement Type</label>
                <AppReactSelect
                  value={sc.movementForm.movementType}
                  onChange={(value) => sc.setMovementForm((prev) => ({ ...prev, movementType: value }))}
                  options={ENTRY_MOVEMENT_OPTIONS}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Quantity</label>
                <Input
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={sc.movementForm.quantity}
                  onChange={(e) => sc.setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Unit (from ingredient)</label>
                {sc.movementForm.inventoryItemId ? (
                  <div className="flex h-10 w-full items-center rounded-lg border border-[#e5e7eb] bg-slate-50 px-3 text-sm text-slate-700">
                    {sc.movementForm.unit || inventoryMap[sc.movementForm.inventoryItemId]?.unit || "—"}
                  </div>
                ) : (
                  <div className="flex h-10 w-full items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-400">
                    Select ingredient
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Reason</label>
                <Input
                  value={sc.movementForm.reason}
                  onChange={(e) => sc.setMovementForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. kitchen wastage"
                />
              </div>
            </div>

            {sc.movementPreview ? (
              <div
                ref={infoPopoverRef}
                className="rounded-xl border-2 border-[#5a189a]/20 bg-linear-to-br from-[#5a189a]/5 via-white to-[#9d4edd]/5 p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5a189a]/15">
                    <FiEye className="h-4 w-4 text-[#5a189a]" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wide text-[#5a189a]">
                    Preview
                  </span>
                </div>

                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                    <dt className="text-slate-500">Ingredient</dt>
                    <dd className="font-medium text-slate-800">{sc.movementPreview.itemName}</dd>
                  </div>
                  <div className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                    <dt className="text-slate-500">Type</dt>
                    <dd className="font-medium capitalize text-slate-800">{sc.movementPreview.movementType}</dd>
                  </div>
                  <div className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                    <dt className="text-slate-500">Quantity</dt>
                    <dd className="font-medium text-slate-800">
                      {sc.movementPreview.quantity.toFixed(3)} {sc.movementPreview.unit}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                    <dt className="text-slate-500">Stock</dt>
                    <dd className="flex items-center gap-1.5 font-medium text-slate-800">
                      <span>{sc.movementPreview.currentStock.toFixed(3)}</span>
                      <FiArrowRight className="h-4 w-4 text-[#5a189a]" />
                      <span className={sc.movementPreview.isDeduction ? "text-red-600" : "text-emerald-600"}>
                        {sc.movementPreview.resultingStock.toFixed(3)} {sc.movementPreview.unit}
                      </span>
                    </dd>
                  </div>
                </dl>

                {equivalents.length ? (
                  <div className="mt-3 rounded-lg border border-[#5a189a]/15 bg-[#faf5ff]/50 p-3">
                    <p className="mb-1.5 text-xs font-semibold text-[#5a189a]">
                      Chef-readable stock left
                    </p>
                    <div className="space-y-1">
                      {equivalents.slice(0, 2).map((eq) => (
                        <p key={eq.id} className="text-xs text-slate-600">
                          <span className="font-semibold text-[#ff6d00]">
                            {eq.purchaseQtyLeft.toFixed(2)} {eq.purchaseUnitName} left
                          </span>
                          {" • "}
                          <span className="font-semibold text-[#5a189a]">
                            {eq.chefQtyLeft.toFixed(1)} {eq.chefUnitName} possible
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}

                <label className="mt-4 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sc.movementConfirmed}
                    onChange={(e) => sc.setMovementConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/20"
                  />
                  <span className="text-sm text-slate-700">
                    I confirm this movement and want to update stock
                  </span>
                </label>

                <div className="mt-3">
                  <Button
                    type="submit"
                    className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-linear-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00]"
                    loading={sc.createMovementMut.isPending}
                    disabled={!sc.movementConfirmed}
                  >
                    Confirm & Save Movement
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Select ingredient, movement type and quantity to see preview.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

