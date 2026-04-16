"use client";

import { Badge, Button } from "@/components/ui";
import { FiEye, FiPackage } from "react-icons/fi";
import { useRestaurantStockControl } from "@/components/restaurant/stock-control/use-stock-control";

export default function RestaurantReceiptsPage() {
  const sc = useRestaurantStockControl();

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      <div className="relative border-b border-slate-100 bg-white">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#5a189a] to-[#9d4edd] text-white shadow-lg shadow-[#5a189a]/20">
              <FiPackage className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Recent PO Receipts (Restaurant)
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Latest goods received into restaurant stock. View details on a row to see full receipt info.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="p-6 space-y-6">
            {sc.selectedReceiptGroup ? (
              <div className="rounded-xl border-2 border-[#5a189a]/30 bg-slate-50/50 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-base font-semibold text-slate-900">
                    Receipt details: {sc.selectedReceiptGroup.receiptNumber}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-slate-600"
                    onClick={() => sc.setSelectedReceiptNumber(null)}
                  >
                    Close
                  </Button>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500 font-medium">Received at</dt>
                    <dd className="text-slate-900 mt-0.5">
                      {new Date(sc.selectedReceiptGroup.date).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">PO number</dt>
                    <dd className="text-slate-900 mt-0.5 font-mono">
                      {sc.selectedReceiptGroup.poNumber || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Receipt # (GRN)</dt>
                    <dd className="text-slate-900 mt-0.5 font-mono">
                      {sc.selectedReceiptGroup.receiptNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Delivery note</dt>
                    <dd className="text-slate-900 mt-0.5">
                      {sc.selectedReceiptGroup.deliveryNote || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Receipt type</dt>
                    <dd className="text-slate-900 mt-0.5">
                      <Badge variant="default" className="rounded-md">
                        {sc.selectedReceiptGroup.receiptType}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Line items</dt>
                    <dd className="text-slate-900 mt-0.5">
                      {sc.selectedReceiptGroup.lines.length} ingredient(s)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Total units</dt>
                    <dd className="text-slate-900 mt-0.5">
                      {Number(sc.selectedReceiptGroup.totalUnits).toFixed(3)}{" "}
                      <span className="text-xs font-normal text-slate-500">(inventory units; yield per line)</span>
                    </dd>
                  </div>
                </dl>

                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Ingredient
                        </th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <span className="block">Qty received</span>
                          <span className="block text-[10px] font-normal normal-case text-slate-400">
                            (+ yield equiv.)
                          </span>
                        </th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Unit
                        </th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <span className="block">Stock (before → after)</span>
                          <span className="block text-[10px] font-normal normal-case text-slate-400">
                            (+ yield equiv.)
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sc.selectedReceiptGroup.lines.map((line, idx) => {
                        const item = line.inventoryItemId
                          ? sc.inventoryMap[line.inventoryItemId]
                          : undefined;
                        const qtyYield = item ? sc.formatYieldEquivLine(item, line.quantity) : null;
                        const prevYield = item ? sc.formatYieldEquivLine(item, line.previousStock) : null;
                        const resultYield = item ? sc.formatYieldEquivLine(item, line.resultingStock) : null;
                        const stockYieldLine =
                          prevYield || resultYield
                            ? `${prevYield ?? "—"} → ${resultYield ?? "—"}`
                            : null;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="px-4 py-2.5 font-medium text-slate-800">{line.itemName}</td>
                            <td className="px-4 py-2.5 text-slate-700">
                              <div>{Number(line.quantity).toFixed(3)}</div>
                              {qtyYield ? (
                                <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-500">
                                  {qtyYield}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              <div>
                                {line.unit}
                                {qtyYield ? (
                                  <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-500">
                                    {qtyYield}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              <div>
                                {Number(line.previousStock).toFixed(3)} →{" "}
                                {Number(line.resultingStock).toFixed(3)}
                              </div>
                              {stockYieldLine ? (
                                <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-500">
                                  {stockYieldLine}
                                </p>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Receipt #</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">PO #</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Delivery note</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Items</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <span className="block">Total units</span>
                      <span className="block text-[10px] font-normal normal-case text-slate-400">(inventory)</span>
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sc.receiptHistoryGrouped.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        No recent PO receipts.
                      </td>
                    </tr>
                  ) : (
                    sc.receiptHistoryGrouped.map((group) => (
                      <tr
                        key={group.receiptNumber}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          sc.selectedReceiptNumber === group.receiptNumber ? "bg-[#5a189a]/5" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {new Date(group.date).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">
                          {group.receiptNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{group.poNumber || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate" title={group.deliveryNote}>
                          {group.deliveryNote || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default" className="rounded-md text-xs">
                            {group.receiptType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{group.lines.length}</td>
                        <td className="px-4 py-3 text-slate-700">{Number(group.totalUnits).toFixed(3)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg border-slate-200 text-[#5a189a] hover:bg-[#5a189a]/10 hover:border-[#5a189a]/40"
                            onClick={() =>
                              sc.setSelectedReceiptNumber(
                                sc.selectedReceiptNumber === group.receiptNumber ? null : group.receiptNumber
                              )
                            }
                          >
                            <FiEye className="h-4 w-4 mr-1" />
                            {sc.selectedReceiptNumber === group.receiptNumber ? "Hide" : "View details"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

