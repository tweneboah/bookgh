"use client";

import { useMemo, useState } from "react";
import { useInventoryProcurementReports } from "@/hooks/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Package, AlertTriangle, TrendingDown, Truck } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export default function InventoryProcurementReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  );

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.startDate = new Date(startDate).toISOString();
    if (endDate) p.endDate = new Date(endDate + "T23:59:59").toISOString();
    return p;
  }, [startDate, endDate]);

  const { data, isLoading } = useInventoryProcurementReports(params);
  const report = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventory & Procurement Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Stock valuation, consumption, low stock, and supplier performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          <span className="text-slate-400">to</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Stock Value" value={fmt(report?.stockValuation?.stockValue ?? 0)} icon={Package} />
            <StatCard title="Total Items" value={String(report?.stockValuation?.totalItems ?? 0)} icon={Truck} />
            <StatCard title="Low Stock Alerts" value={String(report?.lowStockAlerts?.count ?? 0)} icon={AlertTriangle} />
            <StatCard title="Suppliers" value={String(report?.supplierPerformance?.supplierCount ?? 0)} icon={TrendingDown} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(report?.lowStockAlerts?.items ?? []).length ? (
                    report.lowStockAlerts.items.map((item: any) => (
                      <div key={item._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.category ?? "-"}</p>
                        </div>
                        <div className="text-sm text-red-600">
                          {item.currentStock} / {item.reorderLevel}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No low stock alerts.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Consumption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(report?.consumptionReport ?? []).length ? (
                    report.consumptionReport.map((row: any) => (
                      <div key={row.inventoryItemId} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                        <p className="font-medium text-slate-900">{row.itemName ?? "Unknown Item"}</p>
                        <p className="text-sm text-slate-600">{row.quantity} {row.unit}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No consumption data for this period.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-3 font-medium">Supplier</th>
                      <th className="pb-3 font-medium text-right">Orders</th>
                      <th className="pb-3 font-medium text-right">Total Spend</th>
                      <th className="pb-3 font-medium text-right">Fulfillment Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(report?.supplierPerformance?.topSuppliers ?? []).length ? (
                      report.supplierPerformance.topSuppliers.map((row: any) => (
                        <tr key={row.supplierId}>
                          <td className="py-3">{row.supplierName ?? "Unknown Supplier"}</td>
                          <td className="py-3 text-right">{row.orders ?? 0}</td>
                          <td className="py-3 text-right">{fmt(row.totalSpend ?? 0)}</td>
                          <td className="py-3 text-right">{row.fulfillmentRate ?? 0}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-8 text-center text-slate-400" colSpan={4}>
                          No supplier data for this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
