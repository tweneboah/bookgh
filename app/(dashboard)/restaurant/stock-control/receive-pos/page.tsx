"use client";

import { AppReactSelect, Badge, Button, Input, Textarea } from "@/components/ui";
import { FiArrowRight, FiEye, FiPackage } from "react-icons/fi";
import { DEPARTMENT, PROCUREMENT_ORDER_STATUS } from "@/constants";
import { useRestaurantStockControl } from "@/components/restaurant/stock-control/use-stock-control";

export default function RestaurantReceivePurchaseOrdersPage() {
  const sc = useRestaurantStockControl();

  const fmtGhs = (n: number) =>
    new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(Number(n ?? 0));

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
                Receive Purchase Orders To Restaurant
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Receive approved POs into restaurant inventory. Use Receive Full in each row, or open a PO to receive partially.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="p-6 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      PO Number
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Lines
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap min-w-[200px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!sc.poLoading && sc.receivablePurchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        No purchase orders to receive.
                      </td>
                    </tr>
                  ) : (
                    sc.receivablePurchaseOrders.map((po: any) => (
                      <tr key={po._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => sc.setSelectedPoId(String(po._id))}
                            className="font-semibold text-[#5a189a] hover:underline underline-offset-2"
                          >
                            {po.poNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{po.supplierId?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-700">{Array.isArray(po.lines) ? po.lines.length : 0}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{fmtGhs(po.totalAmount ?? 0)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="info">{po.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap min-w-[200px]">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
                              onClick={() =>
                                sc.setSelectedPoId(sc.selectedPoId === String(po._id) ? null : String(po._id))
                              }
                            >
                              <FiEye className="h-4 w-4 mr-1" />
                              {sc.selectedPoId === String(po._id) ? "Hide" : "View details"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-lg font-semibold text-white border-0 shadow-sm bg-linear-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00]"
                              onClick={() => sc.receivePurchaseOrder(po, "full")}
                              loading={sc.receivingPoId === String(po._id) || sc.receivePurchaseOrderMut.isPending}
                            >
                              Receive Full
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {sc.selectedPo ? (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">PO {sc.selectedPo.poNumber}</h3>
                      <p className="text-sm text-slate-600 mt-0.5">{sc.selectedPo.supplierId?.name ?? "—"}</p>
                    </div>
                    <Badge variant="info" className="shrink-0">
                      {sc.selectedPo.status}
                    </Badge>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-5">
                  <h4 className="text-sm font-semibold text-slate-800">Receive into restaurant inventory</h4>

                  {(sc.selectedPo.lines ?? []).map((line: any, idx: number) => {
                    const totalQty = Number(line.quantity ?? 0);
                    const alreadyReceived = Number(line.receivedQuantity ?? 0);
                    const remaining = Math.max(0, totalQty - alreadyReceived);
                    const key = sc.poLineKey(String(sc.selectedPo._id), idx);
                    const linkedInventoryId = String(line.inventoryItemId?._id ?? line.inventoryItemId ?? "").trim();
                    return (
                      <div
                        key={`form-${String(sc.selectedPo._id)}-${idx}`}
                        className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50/30 p-3 sm:grid-cols-2 lg:grid-cols-4"
                      >
                        <div className="sm:col-span-2">
                          <p className="font-medium text-slate-800">{line.itemName}</p>
                          <p className="text-xs text-slate-500">
                            Remaining: {remaining.toFixed(3)} {line.unit}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Receive qty</label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min={0}
                              step={0.001}
                              max={remaining}
                              value={sc.partialReceive[key] ?? ""}
                              onChange={(e) => sc.setPartialReceive((prev) => ({ ...prev, [key]: e.target.value }))}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              onClick={() => sc.setPartialReceive((prev) => ({ ...prev, [key]: String(remaining) }))}
                            >
                              Use Remaining
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Map to inventory</label>
                          <AppReactSelect
                            value={sc.lineInventoryMap[key] ?? linkedInventoryId}
                            onChange={(value) => sc.setLineInventoryMap((prev) => ({ ...prev, [key]: value }))}
                            options={[{ value: "", label: "Auto-create if missing" }, ...sc.inventoryOptions]}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Delivery note number</label>
                      <Input
                        value={sc.deliveryNoteNumber}
                        onChange={(e) => sc.setDeliveryNoteNumber(e.target.value)}
                        placeholder="Supplier delivery note #"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Receipt note</label>
                      <Textarea
                        value={sc.receiptNote}
                        onChange={(e) => sc.setReceiptNote(e.target.value)}
                        placeholder="Optional note for this receipt"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                    <Button
                      type="button"
                      className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-linear-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00]"
                      onClick={() => sc.receivePurchaseOrder(sc.selectedPo, "partial")}
                      loading={sc.receivingPoId === String(sc.selectedPo._id) || sc.receivePurchaseOrderMut.isPending}
                    >
                      <FiArrowRight className="h-4 w-4 mr-2" />
                      Receive Partial To Restaurant
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl font-semibold text-white border-0 bg-linear-to-r from-[#ff6d00] to-[#ff8500]"
                      onClick={() => sc.receivePurchaseOrder(sc.selectedPo, "full")}
                      loading={sc.receivingPoId === String(sc.selectedPo._id) || sc.receivePurchaseOrderMut.isPending}
                    >
                      Receive Full
                    </Button>
                    <Button type="button" variant="ghost" className="text-slate-600" onClick={() => sc.setSelectedPoId(null)}>
                      Close details
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                Click a PO number or View details to see full PO and receive options.
              </p>
            )}
          </div>
        </div>

        {/* Small helper note about statuses */}
        <div className="text-xs text-slate-500">
          Showing POs with status{" "}
          <span className="font-semibold text-slate-700">
            {PROCUREMENT_ORDER_STATUS.APPROVED}, {PROCUREMENT_ORDER_STATUS.ORDERED},{" "}
            {PROCUREMENT_ORDER_STATUS.PARTIALLY_RECEIVED}
          </span>{" "}
          and receiving to <span className="font-semibold">{DEPARTMENT.RESTAURANT}</span>.
        </div>
      </div>
    </div>
  );
}

