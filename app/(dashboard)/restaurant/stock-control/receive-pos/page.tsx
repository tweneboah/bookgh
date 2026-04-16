"use client";

import { AppReactSelect, Button, Input, Textarea } from "@/components/ui";
import { DEPARTMENT, PROCUREMENT_ORDER_STATUS } from "@/constants";
import { useRestaurantStockControl } from "@/components/restaurant/stock-control/use-stock-control";

function PoStatusBadge({ status }: { status: string }) {
  const s = String(status ?? "").toLowerCase();
  if (s === PROCUREMENT_ORDER_STATUS.ORDERED) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#cfe2f9] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#526478]">
        {status}
      </span>
    );
  }
  if (
    s === PROCUREMENT_ORDER_STATUS.APPROVED ||
    s === PROCUREMENT_ORDER_STATUS.PARTIALLY_RECEIVED
  ) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#059eff] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#003357]">
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#eceef0] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#5a4136]">
      {status}
    </span>
  );
}

export default function RestaurantReceivePurchaseOrdersPage() {
  const sc = useRestaurantStockControl();

  const fmtGhs = (n: number) =>
    new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(Number(n ?? 0));

  return (
    <div className="relative min-h-screen selection:bg-[#ff6b00] selection:text-[#572000]">
      <main className="relative z-1 mx-auto max-w-7xl px-6 py-12 md:py-16">
        <header className="mb-12">
          <h1 className="font-headline mb-3 text-4xl font-extrabold tracking-tight text-[#191c1e]">
            Receive Purchase Orders To Restaurant
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[#5a4136]">
            Receive approved POs into restaurant inventory. Use{" "}
            <span className="font-semibold text-[#a04100]">Receive Full</span> in each row, or open a PO to
            receive partially.
          </p>
        </header>

        <div className="overflow-hidden rounded-xl bg-white shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-6 gap-4 border-b border-[#e2bfb0]/10 bg-[#f2f4f6] px-8 py-5">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#5a4136]">PO Number</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#5a4136]">Supplier</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#5a4136]">Lines</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#5a4136]">Total</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#5a4136]">Status</div>
                <div className="text-right text-[11px] font-bold uppercase tracking-widest text-[#5a4136]">
                  Action
                </div>
              </div>

              {sc.poLoading ? (
                <div className="px-8 py-16 text-center text-sm font-medium text-[#5a4136]">
                  Loading purchase orders…
                </div>
              ) : sc.receivablePurchaseOrders.length === 0 ? (
                <div className="px-8 py-16 text-center text-sm font-medium text-[#5a4136]">
                  No purchase orders to receive.
                </div>
              ) : (
                sc.receivablePurchaseOrders.map((po: any) => {
                  const id = String(po._id);
                  const open = sc.selectedPoId === id;
                  const lines = Array.isArray(po.lines) ? po.lines.length : 0;

                  return (
                    <div key={id} className="relative border-b border-[#e2bfb0]/10 last:border-b-0">
                      <div className="grid grid-cols-6 items-center gap-4 px-8 py-6 transition-colors hover:bg-[#f7f9fb]">
                        <div>
                          <button
                            type="button"
                            onClick={() => sc.setSelectedPoId(id)}
                            className="font-headline text-left text-base font-bold text-[#191c1e] underline-offset-2 hover:underline"
                          >
                            {po.poNumber}
                          </button>
                        </div>
                        <div className="font-medium text-[#5a4136]">{po.supplierId?.name ?? "—"}</div>
                        <div className="text-[#5a4136]">{lines}</div>
                        <div className="font-semibold text-[#191c1e]">{fmtGhs(po.totalAmount ?? 0)}</div>
                        <div>
                          <PoStatusBadge status={po.status} />
                        </div>
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            className="rounded-lg px-4 py-2 text-sm font-bold text-[#5a4136] transition-all hover:bg-[#e6e8ea]"
                            onClick={() => sc.setSelectedPoId(open ? null : id)}
                          >
                            {open ? "Hide" : "View details"}
                          </button>
                          <Button
                            type="button"
                            className="rounded-lg border-0 bg-[#ff6b00] px-5 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110 active:scale-95"
                            onClick={() => sc.receivePurchaseOrder(po, "full")}
                            loading={sc.receivingPoId === id && sc.receivePurchaseOrderMut.isPending}
                          >
                            Receive Full
                          </Button>
                        </div>
                      </div>

                      {open && sc.selectedPo && String(sc.selectedPo._id) === id ? (
                        <div className="mx-4 mb-4 overflow-hidden rounded-xl bg-[#f2f4f6] transition-opacity duration-300">
                          <div className="flex items-center justify-between border-b border-[#e2bfb0]/10 bg-[#eceef0] px-8 py-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="material-symbols-outlined shrink-0 text-[#a04100]">inventory_2</span>
                              <span className="font-headline truncate text-base font-bold text-[#191c1e]">
                                PO {sc.selectedPo.poNumber} • {sc.selectedPo.supplierId?.name ?? "—"} •{" "}
                                {sc.selectedPo.status}
                              </span>
                            </div>
                          </div>

                          <div className="p-8">
                            <h2 className="font-headline mb-8 text-2xl font-bold text-[#191c1e]">
                              Receive into restaurant inventory
                            </h2>

                            <div className="mb-10 space-y-4">
                              {(sc.selectedPo.lines ?? []).map((line: any, idx: number) => {
                                const totalQty = Number(line.quantity ?? 0);
                                const alreadyReceived = Number(line.receivedQuantity ?? 0);
                                const remaining = Math.max(0, totalQty - alreadyReceived);
                                const key = sc.poLineKey(String(sc.selectedPo._id), idx);
                                const linkedInventoryId = String(line.inventoryItemId?._id ?? line.inventoryItemId ?? "").trim();
                                const selectedInventoryItemId = String(sc.lineInventoryMap[key] ?? linkedInventoryId ?? "").trim();
                                const item = selectedInventoryItemId
                                  ? (sc.inventoryMap as any)?.[selectedInventoryItemId]
                                  : undefined;
                                const unit = item?.unit ?? line.unit ?? "unit";
                                const yieldEquiv = item ? sc.formatYieldEquivLine(item, remaining) : null;

                                return (
                                  <div
                                    key={`form-${String(sc.selectedPo._id)}-${idx}`}
                                    className="flex flex-wrap items-center gap-6 rounded-xl border border-transparent bg-white p-5 transition-all hover:border-[#a04100]/20 md:flex-nowrap"
                                  >
                                    <div className="min-w-[200px] flex-1">
                                      <div className="font-bold text-[#191c1e]">{line.itemName}</div>
                                      <div className="text-sm text-[#5a4136]">
                                        Remaining:{" "}
                                        <span className="font-semibold text-[#191c1e]">
                                          {remaining.toFixed(3)} {unit}
                                        </span>
                                        {yieldEquiv ? (
                                          <p className="mt-1 text-[11px] font-medium text-[#5a4136]/70">
                                            {yieldEquiv}
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="w-full md:w-48">
                                      <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-[#5a4136]">
                                        Receive qty
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        step={0.001}
                                        max={remaining}
                                        value={sc.partialReceive[key] ?? ""}
                                        onChange={(e) =>
                                          sc.setPartialReceive((prev) => ({ ...prev, [key]: e.target.value }))
                                        }
                                        placeholder="0.00"
                                        className="w-full rounded-lg border-none bg-[#f2f4f6] px-3 py-2 text-sm text-[#191c1e] placeholder:text-[#5a4136]/50 focus:ring-2 focus:ring-[#ff6b00] focus:outline-none"
                                      />
                                    </div>
                                    <div className="w-full md:w-56">
                                      <label className="mb-1 ml-1 block text-[10px] font-bold uppercase tracking-widest text-[#5a4136]">
                                        Map to inventory
                                      </label>
                                      <AppReactSelect
                                        value={sc.lineInventoryMap[key] ?? linkedInventoryId}
                                        onChange={(value) =>
                                          sc.setLineInventoryMap((prev) => ({ ...prev, [key]: value }))
                                        }
                                        options={[{ value: "", label: "Auto-create if missing" }, ...sc.inventoryOptions]}
                                        placeholder="Select…"
                                        visualVariant="m3"
                                      />
                                    </div>
                                    <div className="md:pt-5">
                                      <button
                                        type="button"
                                        className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold text-[#a04100] transition-colors hover:bg-[#ff6b00]/10"
                                        onClick={() =>
                                          sc.setPartialReceive((prev) => ({ ...prev, [key]: String(remaining) }))
                                        }
                                      >
                                        Use Remaining
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mb-10 grid grid-cols-1 gap-8 border-t border-[#e2bfb0]/20 pt-8 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-bold text-[#191c1e]">
                                  Delivery note number
                                </label>
                                <Input
                                  value={sc.deliveryNoteNumber}
                                  onChange={(e) => sc.setDeliveryNoteNumber(e.target.value)}
                                  placeholder="e.g. DN-58302"
                                  className="rounded-xl border border-[#e2bfb0]/30 bg-white px-4 py-3 focus-visible:ring-[#ff6b00]"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-bold text-[#191c1e]">Receipt note</label>
                                <Textarea
                                  value={sc.receiptNote}
                                  onChange={(e) => sc.setReceiptNote(e.target.value)}
                                  placeholder="Add any specific observations about the delivery…"
                                  rows={3}
                                  className="rounded-xl border border-[#e2bfb0]/30 bg-white px-4 py-3 focus-visible:ring-[#ff6b00]"
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-4 rounded-xl bg-[#eceef0] p-6">
                              <button
                                type="button"
                                className="px-6 py-3 font-bold text-[#5a4136] transition-colors hover:text-[#191c1e]"
                                onClick={() => sc.setSelectedPoId(null)}
                              >
                                Close details
                              </button>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl border-2 border-[#a04100] bg-transparent px-6 py-3 font-bold text-[#a04100] hover:bg-[#ff6b00]/5"
                                onClick={() => sc.receivePurchaseOrder(sc.selectedPo, "partial")}
                                loading={
                                  sc.receivingPoId === String(sc.selectedPo._id) &&
                                  sc.receivePurchaseOrderMut.isPending
                                }
                              >
                                Receive Partial To Restaurant
                              </Button>
                              <Button
                                type="button"
                                className="rounded-xl border-0 bg-[#a04100] px-8 py-3 font-bold text-white shadow-lg shadow-[#a04100]/20 hover:brightness-110 active:scale-95"
                                onClick={() => sc.receivePurchaseOrder(sc.selectedPo, "full")}
                                loading={
                                  sc.receivingPoId === String(sc.selectedPo._id) &&
                                  sc.receivePurchaseOrderMut.isPending
                                }
                              >
                                Receive Full
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <footer className="mt-12 border-t border-[#e2bfb0]/10 py-8">
          <div className="flex items-center gap-2 text-sm font-medium text-[#5a4136]/70">
            <span className="material-symbols-outlined text-base">filter_list</span>
            Showing POs with status {PROCUREMENT_ORDER_STATUS.APPROVED}, {PROCUREMENT_ORDER_STATUS.ORDERED},{" "}
            {PROCUREMENT_ORDER_STATUS.PARTIALLY_RECEIVED} and receiving to {DEPARTMENT.RESTAURANT}.
          </div>
        </footer>
      </main>

      <div className="pointer-events-none fixed top-0 right-0 z-0 h-1/2 w-1/2 bg-linear-to-br from-[#ff6b00]/5 to-transparent opacity-50 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 left-0 z-0 h-1/3 w-1/3 bg-linear-to-tr from-[#059eff]/5 to-transparent opacity-50 blur-3xl" />
    </div>
  );
}
