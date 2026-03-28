"use client";

import { AppDatePicker, AppReactSelect, Button, Input, Textarea } from "@/components/ui";
import { FiDownload, FiPackage } from "react-icons/fi";
import { useRestaurantStockControl } from "@/components/restaurant/stock-control/use-stock-control";

export default function RestaurantPhysicalStockCountPage() {
  const sc = useRestaurantStockControl();

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
                Physical Stock Count
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Record physical counts and reconcile variance.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <form onSubmit={sc.submitStockCount} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Count Date</label>
              <AppDatePicker selected={sc.countDate} onChange={(date) => sc.setCountDate(date)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Count Notes</label>
              <Textarea
                value={sc.countNotes}
                onChange={(e) => sc.setCountNotes(e.target.value)}
                placeholder="Optional notes for this stock count"
              />
            </div>

            <div className="space-y-2">
              {sc.countLines.map((line, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/30 p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Ingredient</label>
                      <AppReactSelect
                        value={line.inventoryItemId}
                        onChange={(value) =>
                          sc.setCountLines((rows) =>
                            rows.map((row, i) => (i === idx ? { ...row, inventoryItemId: value } : row))
                          )
                        }
                        options={sc.inventoryOptions}
                        placeholder="Select..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Physical Stock</label>
                      <Input
                        type="number"
                        min={0}
                        step={0.001}
                        value={line.physicalStock}
                        onChange={(e) =>
                          sc.setCountLines((rows) =>
                            rows.map((row, i) => (i === idx ? { ...row, physicalStock: e.target.value } : row))
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Line Note</label>
                    <Input
                      value={line.note}
                      onChange={(e) =>
                        sc.setCountLines((rows) =>
                          rows.map((row, i) => (i === idx ? { ...row, note: e.target.value } : row))
                        )
                      }
                      placeholder="Optional variance note"
                    />
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => sc.setCountLines((rows) => rows.filter((_, i) => i !== idx))}
                      disabled={sc.countLines.length <= 1}
                    >
                      Remove Line
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  sc.setCountLines((rows) => [...rows, { inventoryItemId: "", physicalStock: "", note: "" }])
                }
              >
                Add Line
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={sc.exportLastStockCountCsv}
                className="rounded-xl border-slate-200"
              >
                <FiDownload className="h-4 w-4" />
                Export Count CSV
              </Button>
            </div>

            {sc.stockCountPreview.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    Review: System (previous) vs Physical (counted) — confirm before saving
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={sc.countSortByVariance}
                      onChange={(e) => sc.setCountSortByVariance(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                    Sort by largest difference
                  </label>
                </div>

                <div className="mb-3 flex flex-wrap gap-3 text-xs">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                    {sc.varianceSummary.gain} over
                  </span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">
                    {sc.varianceSummary.loss} short
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                    {sc.varianceSummary.match} match
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="pb-2 pr-3 font-medium">Ingredient</th>
                        <th className="pb-2 pr-3 font-medium">Unit</th>
                        <th className="pb-2 pr-3 font-medium">System</th>
                        <th className="pb-2 pr-3 font-medium">Physical</th>
                        <th className="pb-2 pr-3 font-medium">Difference</th>
                        <th className="pb-2 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sc.stockCountPreviewSorted.map((row) => (
                        <tr key={row.inventoryItemId}>
                          <td className="py-2 pr-3 font-medium text-slate-800">{row.itemName}</td>
                          <td className="py-2 pr-3 text-slate-600">{row.unit}</td>
                          <td className="py-2 pr-3">{row.systemStock.toFixed(3)}</td>
                          <td className="py-2 pr-3">{row.physicalStock.toFixed(3)}</td>
                          <td className="py-2 pr-3">
                            {row.variance === 0 ? (
                              <span className="text-slate-500">—</span>
                            ) : row.variance > 0 ? (
                              <span className="text-emerald-600 font-medium">+{row.variance.toFixed(3)}</span>
                            ) : (
                              <span className="text-red-600 font-medium">{row.variance.toFixed(3)}</span>
                            )}
                          </td>
                          <td className="py-2 text-slate-500">{row.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <label className="mt-4 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sc.countConfirmed}
                    onChange={(e) => sc.setCountConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/20"
                  />
                  <span className="text-sm text-slate-700">
                    I have reviewed the differences and confirm updating stock to the physical counts
                  </span>
                </label>

                <div className="mt-3">
                  <Button
                    type="submit"
                    className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-linear-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00]"
                    loading={sc.createStockCountMut.isPending}
                    disabled={!sc.countConfirmed}
                  >
                    Confirm & Save Stock Count
                  </Button>
                </div>
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

