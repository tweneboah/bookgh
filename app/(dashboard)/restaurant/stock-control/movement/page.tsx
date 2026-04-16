"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { AppReactSelect, Textarea } from "@/components/ui";
import {
  ENTRY_MOVEMENT_OPTIONS,
  useRestaurantStockControl,
} from "@/components/restaurant/stock-control/use-stock-control";

const M3 = {
  surface: "#f7f9fb",
  onSurface: "#191c1e",
  onSurfaceVariant: "#5a4136",
  surfaceContainerLow: "#f2f4f6",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerHigh: "#e6e8ea",
  surfaceVariant: "#e0e3e5",
  primary: "#a04100",
  primaryContainer: "#ff6b00",
  primaryFixed: "#ffdbcc",
  outlineVariant: "#e2bfb0",
  secondaryContainer: "#cfe2f9",
  onSecondaryContainer: "#526478",
  tertiary: "#0062a1",
  error: "#ba1a1a",
} as const;

const KITCHEN_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCtuETmsETHUgB8j9qAdtPbIJY-9jaNhbEdApvCgILN99FGOS5GkVWOnJ0W6OxLlmLOoIFbw6s1G-u5U9Ptq_HDfsUgB86Wstka4C93DV5vRsIru9TH4sBCmvzdOreoGxpqnHNU5ME2PqbMdmFD4kQ2lVxQRXo_UDNuOiD8octiOxoaYZrmwkRhyT5TG8kyWOXoQnOvR-44R_jLPxLjAEZEuClefasclYGIGihUrGMgxZaWE2jrzWWK_G97pGkbad29CrK7Fhxvz9Nx";

const MOVEMENT_CHIPS: { value: string; icon: string; hover: string }[] = [
  { value: "restock", icon: "add_circle", hover: "hover:border-[#a04100]/60 hover:text-[#a04100]" },
  { value: "wastage", icon: "delete_sweep", hover: "hover:border-[#ba1a1a] hover:text-[#ba1a1a]" },
  { value: "adjustment", icon: "edit_note", hover: "hover:border-[#0062a1] hover:text-[#0062a1]" },
  { value: "reversal", icon: "replay", hover: "hover:border-[#8e7164] hover:text-[#5a4136]" },
];

export default function RestaurantStockMovementPage() {
  const sc = useRestaurantStockControl();
  const inventoryOptions = sc.inventoryOptions;
  const inventoryMap = sc.inventoryMap;

  const movementYieldLines = useMemo(() => {
    if (!sc.movementPreview || !sc.movementForm.inventoryItemId) {
      return { quantity: null as string | null, current: null as string | null, resulting: null as string | null };
    }
    const item = inventoryMap[sc.movementForm.inventoryItemId] as { _id?: string } | undefined;
    if (!item) {
      return { quantity: null as string | null, current: null as string | null, resulting: null as string | null };
    }
    const p = sc.movementPreview;
    return {
      quantity: sc.formatYieldEquivLine(item, p.quantity),
      current: sc.formatYieldEquivLine(item, p.currentStock),
      resulting: sc.formatYieldEquivLine(item, p.resultingStock),
    };
  }, [sc.movementPreview, sc.movementForm.inventoryItemId, inventoryMap, sc.formatYieldEquivLine]);

  const entryOptions = ENTRY_MOVEMENT_OPTIONS;

  return (
    <main className="min-h-screen pt-16 pb-12 px-8" style={{ backgroundColor: M3.surface, color: M3.onSurface }}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-12">
          <div className="mb-8 font-headline text-2xl font-black text-orange-600">Amos Royal Executive</div>
          <h1 className="mb-2 font-headline text-4xl font-extrabold tracking-tight text-[#191c1e]">
            Record Stock Movement
          </h1>
          <p className="text-lg text-[#5a4136]">
            Log restock, wastage, or adjustments for Amos Royal Restaurant inventory.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <section className="md:col-span-7">
            <div
              className="rounded-xl p-8 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]"
              style={{ backgroundColor: M3.surfaceContainerLowest }}
            >
              <form onSubmit={sc.submitMovement} className="space-y-8">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#5a4136]">Ingredient</label>
                  <AppReactSelect
                    visualVariant="m3"
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

                <div>
                  <label className="mb-4 block text-sm font-semibold text-[#5a4136]">Movement Type</label>
                  <div className="flex flex-wrap gap-3">
                    {MOVEMENT_CHIPS.filter((c) => entryOptions.some((o) => o.value === c.value)).map((chip) => {
                      const selected = sc.movementForm.movementType === chip.value;
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => sc.setMovementForm((prev) => ({ ...prev, movementType: chip.value }))}
                          className={
                            selected
                              ? "flex items-center gap-2 rounded-full border border-[#a04100] bg-[#ffdbcc]/20 px-5 py-2 font-bold text-[#a04100] transition-all hover:bg-[#ffdbcc]/40"
                              : `flex items-center gap-2 rounded-full border border-[#e2bfb0] px-5 py-2 text-[#5a4136] transition-all ${chip.hover}`
                          }
                        >
                          <span
                            className={`material-symbols-outlined text-lg leading-none ${selected ? "fill-1" : ""}`}
                            aria-hidden
                          >
                            {chip.icon}
                          </span>
                          {entryOptions.find((o) => o.value === chip.value)?.label ?? chip.value}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5a4136]">Quantity</label>
                    <input
                      type="number"
                      min={0.001}
                      step={0.001}
                      placeholder="0.000"
                      value={sc.movementForm.quantity}
                      onChange={(e) => sc.setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      className="w-full rounded-lg border-none bg-[#f2f4f6] px-4 py-3 text-[#191c1e] transition-all placeholder:text-[#5a4136]/50 focus:ring-2 focus:ring-[#a04100] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#5a4136]">Unit</label>
                    <div className="flex w-full items-center rounded-lg border-none bg-[#e6e8ea]/50 px-4 py-3 font-medium text-[#5a4136]">
                      {sc.movementForm.inventoryItemId
                        ? sc.movementForm.unit || inventoryMap[sc.movementForm.inventoryItemId]?.unit || "—"
                        : "—"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#5a4136]">Reason (Optional)</label>
                  <Textarea
                    rows={3}
                    value={sc.movementForm.reason}
                    onChange={(e) => sc.setMovementForm((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Provide a detailed note about this movement..."
                    className="resize-none rounded-lg border-none bg-[#f2f4f6] px-4 py-3 text-[#191c1e] focus:ring-2 focus:ring-[#a04100] focus:outline-none"
                  />
                </div>

                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <input
                      id="confirm-movement"
                      name="confirm-movement"
                      type="checkbox"
                      checked={sc.movementConfirmed}
                      onChange={(e) => sc.setMovementConfirmed(e.target.checked)}
                      className="h-5 w-5 cursor-pointer rounded border-[#e2bfb0] text-[#a04100] focus:ring-[#a04100]"
                    />
                  </div>
                  <label htmlFor="confirm-movement" className="cursor-pointer select-none text-sm font-medium text-[#5a4136]">
                    I confirm this movement and want to update stock
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={
                      sc.createMovementMut.isPending || (!!sc.movementPreview && !sc.movementConfirmed)
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#a04100] to-[#ff6b00] py-4 text-lg font-bold text-white shadow-[0px_8px_24px_rgba(255,107,0,0.25)] transition-all hover:scale-[1.01] active:scale-95 disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {sc.createMovementMut.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    ) : null}
                    Confirm &amp; Save Movement
                  </button>
                </div>
              </form>
            </div>
          </section>

          <aside className="space-y-6 md:col-span-5">
            <div
              className="sticky top-12 rounded-xl border border-[#e2bfb0]/10 p-8"
              style={{ backgroundColor: M3.surfaceContainerLow }}
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-[#a04100]" aria-hidden>
                  analytics
                </span>
                <h3 className="font-headline text-xl font-bold">Summary Preview</h3>
              </div>

              {sc.movementPreview ? (
                <div className="space-y-6">
                  <div
                    className="rounded-lg border border-[#e0e3e5]/30 p-5"
                    style={{ backgroundColor: M3.surfaceContainerLowest }}
                  >
                    <span className="mb-1 block text-xs font-bold tracking-widest text-[#5a4136] uppercase">
                      Selected Ingredient
                    </span>
                    <p className="font-headline text-xl font-extrabold text-[#191c1e]">{sc.movementPreview.itemName}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#e0e3e5]/40 py-2">
                      <span className="text-sm text-[#5a4136]">Movement Type</span>
                      <span className="rounded-full bg-[#cfe2f9] px-3 py-1 text-xs font-bold text-[#526478] uppercase">
                        {sc.movementPreview.movementType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-[#e0e3e5]/40 py-2">
                      <span className="text-sm text-[#5a4136]">
                        {sc.movementPreview.isDeduction ? "Quantity removed" : "Quantity added"}
                      </span>
                      <div className="text-right">
                        <span
                          className={`text-sm font-bold ${sc.movementPreview.isDeduction ? "text-[#ba1a1a]" : "text-[#a04100]"}`}
                        >
                          {sc.movementPreview.isDeduction ? "−" : "+"}{" "}
                          {sc.movementPreview.quantity.toFixed(3)} {sc.movementPreview.unit}
                        </span>
                        {movementYieldLines.quantity ? (
                          <p className="text-[10px] font-medium text-[#5a4136]/70">{movementYieldLines.quantity}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 rounded-lg p-4" style={{ backgroundColor: M3.surfaceContainerLowest }}>
                      <span className="mb-1 block text-xs font-bold tracking-widest text-[#5a4136] uppercase">
                        Stock Change
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#5a4136]">Current</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold">
                            {sc.movementPreview.currentStock.toFixed(3)} {sc.movementPreview.unit}
                          </span>
                          {movementYieldLines.current ? (
                            <p className="text-[10px] font-medium text-[#5a4136]/70">{movementYieldLines.current}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#e0e3e5]/20 pt-2">
                        <span className="text-sm font-bold text-[#191c1e]">New Total</span>
                        <div className="text-right">
                          <span
                            className={`text-sm font-black ${sc.movementPreview.isDeduction ? "text-[#ba1a1a]" : "text-[#191c1e]"}`}
                          >
                            {sc.movementPreview.resultingStock.toFixed(3)} {sc.movementPreview.unit}
                          </span>
                          {movementYieldLines.resulting ? (
                            <p className="text-[10px] font-bold text-[#5a4136]/70">{movementYieldLines.resulting}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border-l-4 border-[#a04100] bg-[#a04100]/5 p-4">
                    <p className="text-xs leading-relaxed text-[#5a4136]">
                      <span className="font-bold text-[#a04100]">Pro Tip:</span> Based on current demand, review the new
                      stock level before confirming—especially for high-turnover items.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 text-center">
                  <div
                    className="rounded-lg border border-dashed border-[#e2bfb0] p-8"
                    style={{ backgroundColor: M3.surfaceContainerLowest }}
                  >
                    <span className="material-symbols-outlined mb-3 text-4xl text-[#5a4136]/40" aria-hidden>
                      analytics
                    </span>
                    <p className="text-sm font-medium text-[#5a4136]">Summary Preview</p>
                    <p className="mt-2 text-sm text-[#5a4136]/80">
                      Select ingredient, movement type, and quantity to see projected stock.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="group relative h-48 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Luxury kitchen preparation"
                src={KITCHEN_IMG}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 to-transparent p-6">
                <span className="mb-1 text-xs font-black tracking-widest text-orange-400 uppercase">Inventory Pulse</span>
                <h4 className="font-headline leading-tight font-bold text-white">
                  Stable supply chain: Staple dry goods availability is up 15%.
                </h4>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="pointer-events-none fixed right-8 bottom-8 translate-y-4 opacity-0">
        <div
          className="flex items-center gap-3 rounded-lg border-l-4 border-[#0062a1] p-4 shadow-2xl"
          style={{ backgroundColor: M3.surfaceContainerLowest }}
        >
          <span className="material-symbols-outlined fill-1 text-[#0062a1]" aria-hidden>
            check_circle
          </span>
          <div>
            <p className="text-sm font-bold">Movement Recorded</p>
            <p className="text-xs text-[#5a4136]">Inventory levels updated successfully.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
