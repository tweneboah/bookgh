"use client";

import Link from "next/link";
import {
  FiArrowRight,
  FiCheckCircle,
  FiDownload,
  FiPackage,
  FiTrendingUp,
} from "react-icons/fi";
import { useMemo } from "react";
import { useRestaurantStockControl } from "@/components/restaurant/stock-control/use-stock-control";

export default function RestaurantStockControlPage() {
  const sc = useRestaurantStockControl();

  const totalItems = sc.inventoryItems.length;

  const lowStockAlerts = useMemo(
    () =>
      sc.inventoryItems.filter((item: any) => {
        const current = Number(item.currentStock ?? 0);
        const min = Number(item.minimumStock ?? 0);
        const reorder = Number(item.reorderLevel ?? 0);
        if (min <= 0 && reorder <= 0) return false;
        return current <= (min || reorder);
      }).length,
    [sc.inventoryItems]
  );

  const pendingPos = sc.receivablePurchaseOrders.length;

  const monthlyWastageValue = useMemo(() => {
    if (!sc.movementRows.length) return 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return sc.movementRows.reduce((sum: number, row: any) => {
      if (row.movementType !== "wastage") return sum;
      const createdAt = row.createdAt ? new Date(row.createdAt) : null;
      if (!createdAt || createdAt < monthStart) return sum;
      const item = sc.inventoryMap[String(row.inventoryItemId)];
      const unitCost = Number(item?.unitCost ?? 0);
      const qty = Number(row.quantity ?? 0);
      return sum + qty * unitCost;
    }, 0);
  }, [sc.movementRows, sc.inventoryMap]);

  const formatCedi = (value: number) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      maximumFractionDigits: 2,
    }).format(value || 0);

  const receiptPreview = sc.receiptHistoryGrouped.slice(0, 3);

  const supplierByPoNumber = useMemo(() => {
    const m = new Map<string, string>();
    for (const po of sc.purchaseOrders as any[]) {
      if (po?.poNumber) {
        m.set(String(po.poNumber), po.supplierId?.name ?? "—");
      }
    }
    return m;
  }, [sc.purchaseOrders]);

  const movementPreview = useMemo(
    () =>
      [...(sc.movementRows as any[])]
        .filter((row) => row?.createdAt)
        .sort(
          (a, b) =>
            new Date(b.createdAt as string).getTime() -
            new Date(a.createdAt as string).getTime()
        )
        .slice(0, 3),
    [sc.movementRows]
  );

  return (
    <div className="min-h-screen bg-[#f8f6f6] font-sans text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Restaurant Stock Control
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-slate-600">
            Track ingredients, log wastage and movements, run physical counts, and receive purchase orders.
          </p>
        </header>

        {/* Main Actions */}
        <section className="mb-10">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ec5b13]/10 text-[#ec5b13]">
              <FiTrendingUp className="h-4 w-4" />
            </span>
            Main Actions
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Link
              href="/restaurant/stock-control/movement"
              className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-[#ec5b13] hover:shadow-md"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-[#ec5b13]/10 text-[#ec5b13] transition-colors group-hover:bg-[#ec5b13] group-hover:text-white">
                <FiArrowRight className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-lg font-bold">Record Stock Movement</h3>
              <p className="mb-4 text-sm text-slate-600">
                Log restock, wastage, or adjustments to maintain accurate levels.
              </p>
              <div className="flex items-center text-sm font-semibold text-[#ec5b13]">
                Start Log
                <FiArrowRight className="ml-1 h-4 w-4" />
              </div>
            </Link>

            <Link
              href="/restaurant/stock-control/physical-count"
              className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-[#ec5b13] hover:shadow-md"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-[#ec5b13]/10 text-[#ec5b13] transition-colors group-hover:bg-[#ec5b13] group-hover:text-white">
                <FiCheckCircle className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-lg font-bold">Physical Stock Count</h3>
              <p className="mb-4 text-sm text-slate-600">
                Record physical counts and reconcile variance with system data.
              </p>
              <div className="flex items-center text-sm font-semibold text-[#ec5b13]">
                Begin Audit
                <FiArrowRight className="ml-1 h-4 w-4" />
              </div>
            </Link>

            <Link
              href="/restaurant/stock-control/receive-pos"
              className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-[#ec5b13] hover:shadow-md"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-[#ec5b13]/10 text-[#ec5b13] transition-colors group-hover:bg-[#ec5b13] group-hover:text-white">
                <FiPackage className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-lg font-bold">Receive Purchase Orders</h3>
              <p className="mb-4 text-sm text-slate-600">
                Receive approved POs directly into your restaurant inventory.
              </p>
              <div className="flex items-center text-sm font-semibold text-[#ec5b13]">
                Process PO
                <FiArrowRight className="ml-1 h-4 w-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* Middle grid: Receipts + Ledger teaser */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent PO Receipts</h2>
              <Link
                href="/restaurant/stock-control/receipts"
                className="text-xs font-semibold text-[#ec5b13] hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Receipt #
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptPreview.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-6 text-center text-sm text-slate-500"
                        >
                          No recent receipts yet.
                        </td>
                      </tr>
                    ) : (
                      receiptPreview.map((g: any) => {
                        const supplier =
                          supplierByPoNumber.get(String(g.poNumber)) ?? "—";
                        const statusLabel =
                          g.receiptType === "Partial" ? "Partial" : "Received";
                        const statusClasses =
                          g.receiptType === "Partial"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800";
                        return (
                          <tr key={g.receiptNumber} className="hover:bg-slate-50/60">
                            <td className="px-6 py-3 font-medium">
                              {g.receiptNumber}
                            </td>
                            <td className="px-6 py-3 text-slate-600">
                              {supplier}
                            </td>
                            <td className="px-6 py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses}`}
                              >
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Movement Ledger</h2>
              <Link
                href="/restaurant/stock-control/ledger"
                className="inline-flex items-center gap-2 rounded-lg bg-[#ec5b13]/10 px-3 py-1.5 text-xs font-semibold text-[#ec5b13] hover:bg-[#ec5b13]/20"
              >
                <FiDownload className="h-3.5 w-3.5" />
                Export CSV
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="space-y-3 p-4">
                {movementPreview.length === 0 ? (
                  <p className="py-3 text-center text-sm text-slate-500">
                    No movement records yet.
                  </p>
                ) : (
                  movementPreview.map((row: any, idx: number) => {
                    const ingredient =
                      sc.inventoryMap[String(row.inventoryItemId)]?.name ??
                      String(row.inventoryItemId);
                    const qty = Number(row.quantity ?? 0);
                    const type = String(row.movementType ?? "");
                    const createdAt = row.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : "";
                    const isWastage = type === "wastage";
                    const isRestock = type === "restock";
                    const iconBg = isWastage
                      ? "bg-red-100 text-red-600"
                      : isRestock
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-blue-100 text-blue-600";
                    const icon =
                      idx === 0 ? (
                        <FiArrowRight className="h-4 w-4" />
                      ) : isRestock ? (
                        <FiCheckCircle className="h-4 w-4" />
                      ) : (
                        <FiPackage className="h-4 w-4" />
                      );
                    return (
                      <div
                        key={row._id ?? `${ingredient}-${idx}`}
                        className={`flex items-center justify-between gap-3 ${
                          idx < movementPreview.length - 1
                            ? "border-b border-slate-100 pb-3"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${iconBg}`}>{icon}</div>
                          <div>
                            <p className="font-medium text-slate-900">{ingredient}</p>
                            <p className="text-xs text-slate-500">
                              {type.charAt(0).toUpperCase() + type.slice(1)} •{" "}
                              {qty.toFixed(3)} {row.unit ?? "unit"}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-medium text-slate-500">
                          {createdAt}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Bottom stats */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-[#ec5b13] p-6 text-white shadow-lg shadow-[#ec5b13]/20">
            <p className="text-xs font-medium opacity-80">Total Items</p>
            <p className="mt-1 text-3xl font-black">{totalItems}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-medium text-slate-500">Low Stock Alerts</p>
            <p className="mt-1 text-3xl font-bold text-red-500">{lowStockAlerts}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-medium text-slate-500">Pending POs</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{pendingPos}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-medium text-slate-500">Monthly Wastage</p>
            <p className="mt-1 text-3xl font-bold text-[#ec5b13]">
              {formatCedi(monthlyWastageValue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
