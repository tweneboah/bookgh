"use client";

import { Loader2 } from "lucide-react";
import { AppDatePicker, AppReactSelect } from "@/components/ui";
import { useRestaurantStockControl } from "@/components/restaurant/stock-control/use-stock-control";

const shadowAmbient = "shadow-[0px_12px_32px_rgba(25,28,30,0.06)]";

export default function RestaurantPhysicalStockCountPage() {
  const sc = useRestaurantStockControl();

  return (
    <main className="relative z-0 mx-auto min-h-screen max-w-7xl px-6 py-12 lg:px-12">
      <form onSubmit={sc.submitStockCount}>
        <header className="mb-12">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff6b00] text-[#572000] shadow-lg shadow-[#ff6b00]/20">
              <span className="material-symbols-outlined fill-1 text-2xl" aria-hidden>
                inventory
              </span>
            </div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-[#191c1e]">
              Physical Stock Count
            </h1>
          </div>
          <p className="font-medium text-[#5a4136]">Record physical counts and reconcile variance</p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left */}
          <div className="space-y-8 lg:col-span-7">
            <section className={`rounded-3xl bg-white p-8 ${shadowAmbient}`}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-headline text-sm font-semibold tracking-wider text-[#5a4136] uppercase">
                    Count Date
                  </label>
                  <div className="relative">
                    <span
                      className="material-symbols-outlined pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#5a4136]"
                      aria-hidden
                    >
                      calendar_today
                    </span>
                    <AppDatePicker
                      selected={sc.countDate}
                      onChange={(date) => sc.setCountDate(date)}
                      dateFormat="MMM d, yyyy"
                      inputClassName="w-full rounded-2xl border-none bg-[#f2f4f6] py-3 pr-4 pl-12 font-medium text-[#191c1e] shadow-none outline-none focus:ring-2 focus:ring-[#ff6b00] focus:outline-none"
                      className="w-full [&_.react-datepicker-wrapper]:w-full [&_.react-datepicker__input-container]:w-full"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-headline text-sm font-semibold tracking-wider text-[#5a4136] uppercase">
                    Count Notes
                  </label>
                  <input
                    type="text"
                    value={sc.countNotes}
                    onChange={(e) => sc.setCountNotes(e.target.value)}
                    placeholder="Add optional notes..."
                    className="w-full rounded-2xl border-none bg-[#f2f4f6] px-4 py-3 font-medium text-[#191c1e] placeholder:text-[#5a4136]/50 focus:ring-2 focus:ring-[#ff6b00] focus:outline-none"
                  />
                </div>
              </div>
            </section>

            <section className={`rounded-3xl bg-white p-8 ${shadowAmbient}`}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-headline text-xl font-bold text-[#191c1e]">Stock Entry</h2>
                <button
                  type="button"
                  onClick={sc.exportLastStockCountCsv}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-[#a04100] transition-colors hover:bg-[#ff6b00]/10"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden>
                    download
                  </span>
                  Export Count CSV
                </button>
              </div>

              <div className="space-y-4">
                {sc.countLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 items-end gap-4 rounded-2xl border border-transparent bg-[#f2f4f6] p-5 transition-all hover:border-[#e2bfb0]/30 md:grid-cols-12"
                    >
                      <div className="space-y-2 md:col-span-4">
                        <label className="text-xs font-bold text-[#5a4136] uppercase">Ingredient</label>
                        <AppReactSelect
                          visualVariant="m3"
                          value={line.inventoryItemId}
                          onChange={(value) =>
                            sc.setCountLines((rows) =>
                              rows.map((row, i) => (i === idx ? { ...row, inventoryItemId: value } : row))
                            )
                          }
                          options={sc.inventoryOptions}
                          placeholder="Select ingredient"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-3">
                        <label className="text-xs font-bold text-[#5a4136] uppercase">Physical Stock</label>
                        <input
                          type="number"
                          min={0}
                          step={0.001}
                          value={line.physicalStock}
                          onChange={(e) =>
                            sc.setCountLines((rows) =>
                              rows.map((row, i) => (i === idx ? { ...row, physicalStock: e.target.value } : row))
                            )
                          }
                          className="w-full rounded-xl border-none bg-white px-4 py-3 font-bold text-[#191c1e] shadow-sm focus:ring-2 focus:ring-[#ff6b00] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-4">
                        <label className="text-xs font-bold text-[#5a4136] uppercase">Line Note</label>
                        <input
                          type="text"
                          value={line.note}
                          onChange={(e) =>
                            sc.setCountLines((rows) =>
                              rows.map((row, i) => (i === idx ? { ...row, note: e.target.value } : row))
                            )
                          }
                          placeholder="Optional note..."
                          className="w-full rounded-xl border-none bg-white px-4 py-3 text-sm text-[#191c1e] shadow-sm focus:ring-2 focus:ring-[#ff6b00] focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end md:col-span-1">
                        <button
                          type="button"
                          title="Remove Line"
                          disabled={sc.countLines.length <= 1}
                          onClick={() => sc.setCountLines((rows) => rows.filter((_, i) => i !== idx))}
                          className="rounded-xl p-3 text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/40 disabled:pointer-events-none disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined" aria-hidden>
                            delete_outline
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  sc.setCountLines((rows) => [...rows, { inventoryItemId: "", physicalStock: "", note: "" }])
                }
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#e2bfb0] py-4 font-bold text-[#a04100] transition-all hover:border-[#ff6b00] hover:bg-[#ff6b00]/5"
              >
                <span className="material-symbols-outlined transition-transform group-hover:scale-110" aria-hidden>
                  add_circle
                </span>
                Add Line
              </button>
            </section>
          </div>

          {/* Right */}
          <div className="space-y-8 lg:col-span-5">
            <section
              className={`flex h-full flex-col rounded-3xl border border-[#ff6b00]/10 bg-white p-8 ${shadowAmbient}`}
            >
              <header className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined fill-1 text-[#a04100]" aria-hidden>
                    analytics
                  </span>
                  <h2 className="font-headline text-xl font-bold text-[#191c1e]">Reconciliation Review</h2>
                </div>
                <p className="text-sm leading-relaxed text-[#5a4136]">
                  Review: System (previous) vs Physical (counted) — confirm before saving
                </p>
              </header>

              <div className="mb-8 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-full bg-[#059eff]/10 px-4 py-2 text-sm font-bold text-[#0062a1]">
                  <span className="h-2 w-2 rounded-full bg-[#0062a1]" />
                  {sc.varianceSummary.gain} over
                </div>
                <div className="flex items-center gap-2 rounded-full bg-[#e6e8ea] px-4 py-2 text-sm font-bold text-[#5a4136]">
                  <span className="h-2 w-2 rounded-full bg-[#5a4136]/40" />
                  {sc.varianceSummary.loss} short
                </div>
                <div className="flex items-center gap-2 rounded-full bg-[#e6e8ea] px-4 py-2 text-sm font-bold text-[#5a4136]">
                  <span className="h-2 w-2 rounded-full bg-[#5a4136]/40" />
                  {sc.varianceSummary.match} match
                </div>
              </div>

              <div className="min-h-0 grow overflow-hidden">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-widest text-[#5a4136] uppercase">Breakdown</h3>
                  <button
                    type="button"
                    aria-pressed={sc.countSortByVariance}
                    onClick={() => sc.setCountSortByVariance((v) => !v)}
                    className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                      sc.countSortByVariance ? "text-[#a04100]" : "text-[#a04100]/80"
                    }`}
                  >
                    <span>Sort by largest difference</span>
                    <span className="material-symbols-outlined text-sm" aria-hidden>
                      unfold_more
                    </span>
                  </button>
                </div>

                <div className="space-y-4">
                  {sc.stockCountPreviewSorted.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#e2bfb0]/60 bg-[#f2f4f6]/50 p-8 text-center text-sm text-[#5a4136]">
                      Add ingredient lines with physical quantities to see variance breakdown.
                    </div>
                  ) : (
                    sc.stockCountPreviewSorted.map((row) => {
                      const diffPositive = row.variance > 0;
                      const diffNegative = row.variance < 0;
                      const diffColor = diffPositive
                        ? "text-[#0062a1]"
                        : diffNegative
                          ? "text-[#ba1a1a]"
                          : "text-[#5a4136]";
                      const diffPrefix = diffPositive ? "+" : "";
                      return (
                        <div
                          key={row.inventoryItemId}
                          className="space-y-4 rounded-2xl bg-[#f2f4f6]/50 p-6"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-headline text-lg font-bold text-[#191c1e]">{row.itemName}</div>
                              <div className="text-xs font-medium text-[#5a4136]">Unit: {row.unit}</div>
                            </div>
                            <div className="text-right">
                              {row.variance === 0 ? (
                                <div className="font-headline text-lg font-bold text-[#5a4136]">—</div>
                              ) : (
                                <>
                                  <div className={`font-headline text-lg font-bold ${diffColor}`}>
                                    {diffPrefix}
                                    {row.variance.toFixed(3)}
                                  </div>
                                  {row.varianceYieldEquiv ? (
                                    <div className={`text-[10px] font-bold tracking-tighter uppercase ${diffColor}`}>
                                      {row.varianceYieldEquiv}
                                    </div>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 border-t border-[#e2bfb0]/20 pt-4">
                            <div>
                              <div className="mb-1 text-[10px] font-bold text-[#5a4136] uppercase">System</div>
                              <div className="text-sm font-bold">{row.systemStock.toFixed(3)}</div>
                              {row.systemYieldEquiv ? (
                                <div className="mt-0.5 text-xs font-normal text-[#5a4136]">{row.systemYieldEquiv}</div>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <div className="mb-1 text-[10px] font-bold text-[#5a4136] uppercase">Physical</div>
                              <div className="text-sm font-bold">{row.physicalStock.toFixed(3)}</div>
                              {row.physicalYieldEquiv ? (
                                <div className="mt-0.5 text-xs font-normal text-[#5a4136]">{row.physicalYieldEquiv}</div>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#5a4136] italic">
                            <span className="material-symbols-outlined text-xs" aria-hidden>
                              notes
                            </span>
                            <span>{row.note?.trim() ? row.note : "No note provided for this line."}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-6 border-t border-[#e2bfb0]/30 pt-8">
                <label className="group flex cursor-pointer items-start gap-4">
                  <div className="relative mt-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={sc.countConfirmed}
                      onChange={(e) => sc.setCountConfirmed(e.target.checked)}
                      className="h-6 w-6 cursor-pointer rounded-lg border-2 border-[#e2bfb0] accent-[#ff6b00] focus:ring-[#ff6b00]"
                    />
                  </div>
                  <span className="text-sm leading-relaxed font-medium text-[#5a4136] transition-colors group-hover:text-[#191c1e]">
                    I have reviewed the differences and confirm updating stock to the physical counts.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={sc.createStockCountMut.isPending || !sc.countConfirmed}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-[#a04100] to-[#ff6b00] px-8 py-5 font-headline font-extrabold text-white shadow-lg shadow-[#ff6b00]/30 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100"
                >
                  {sc.createStockCountMut.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                  ) : (
                    <span className="material-symbols-outlined fill-1" aria-hidden>
                      task_alt
                    </span>
                  )}
                  Confirm &amp; Save Stock Count
                </button>
              </div>
            </section>
          </div>
        </div>
      </form>

      <div
        aria-hidden
        className="pointer-events-none fixed top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-[#ff6b00]/5 opacity-50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-[#059eff]/5 opacity-50 blur-3xl"
      />
    </main>
  );
}
