"use client";

import { useState } from "react";
import { AppDatePicker, AppReactSelect, Button, DataTable, Modal } from "@/components/ui";
import { FiDownload, FiEye, FiFilter, FiPackage } from "react-icons/fi";
import {
  MOVEMENT_TYPE_OPTIONS,
  useRestaurantStockControl,
} from "@/components/restaurant/stock-control/use-stock-control";

export default function RestaurantMovementLedgerPage() {
  const sc = useRestaurantStockControl();
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  const columns = [
    {
      key: "createdAt",
      header: "Date",
      render: (row: any) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "inventoryItemId",
      header: "Ingredient",
      render: (row: any) => sc.inventoryMap[String(row.inventoryItemId)]?.name ?? String(row.inventoryItemId),
    },
    { key: "movementType", header: "Type" },
    {
      key: "quantity",
      header: "Qty",
      render: (row: any) => {
        const qty = Number(row.quantity ?? 0);
        const base = `${qty.toFixed(3)} ${row.unit ?? ""}`;
        const chef = sc.chefReadableText(String(row.inventoryItemId), qty);
        return chef ? (
          <div className="flex flex-col">
            <span>{base}</span>
            <span className="text-xs text-[#5a189a]">{chef}</span>
          </div>
        ) : (
          base
        );
      },
    },
    {
      key: "stock",
      header: "Stock (Before -> After)",
      render: (row: any) => {
        const prev = Number(row.previousStock ?? 0);
        const next = Number(row.resultingStock ?? 0);
        const chef = sc.chefReadableText(String(row.inventoryItemId), next);
        return (
          <div className="flex flex-col">
            <span>{`${prev.toFixed(3)} -> ${next.toFixed(3)}`}</span>
            {chef ? <span className="text-xs text-[#ff6d00]">After: {chef}</span> : null}
          </div>
        );
      },
    },
    { key: "reason", header: "Reason", render: (row: any) => row.reason ?? "-" },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-lg border-slate-200 text-[#5a189a]"
          onClick={() => setSelectedRow(row)}
        >
          <FiEye className="h-4 w-4 mr-1" />
          View details
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      <div className="relative border-b border-slate-100 bg-white">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#5a189a] to-[#9d4edd] text-white shadow-lg shadow-[#5a189a]/20">
                <FiPackage className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Movement Ledger
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  View and export ingredient movement history.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={sc.exportLedgerCsv} className="rounded-xl border-slate-200">
              <FiDownload className="h-4 w-4" />
              Export Ledger CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-3">
            <FiFilter className="h-4 w-4 text-[#5a189a]" />
            <span className="text-sm font-semibold">Filters</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AppDatePicker
              label="Start Date"
              selected={sc.startDate}
              onChange={(date) => {
                sc.setStartDate(date);
                sc.setPage(1);
              }}
            />
            <AppDatePicker
              label="End Date"
              selected={sc.endDate}
              onChange={(date) => {
                sc.setEndDate(date);
                sc.setPage(1);
              }}
            />
            <AppReactSelect
              label="Movement Type"
              value={sc.movementTypeFilter}
              onChange={(value) => {
                sc.setMovementTypeFilter(value);
                sc.setPage(1);
              }}
              options={MOVEMENT_TYPE_OPTIONS}
            />
            <AppReactSelect
              label="Ingredient"
              value={sc.inventoryFilter}
              onChange={(value) => {
                sc.setInventoryFilter(value);
                sc.setPage(1);
              }}
              options={[{ value: "", label: "All ingredients" }, ...sc.inventoryOptions]}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <DataTable
            columns={columns}
            data={sc.movementRows}
            loading={sc.movementLoading}
            getRowKey={(row: any) => row._id}
            pagination={
              sc.movementPagination
                ? {
                    page: sc.movementPagination.page,
                    limit: sc.movementPagination.limit,
                    total: sc.movementPagination.total,
                    onPageChange: sc.setPage,
                  }
                : undefined
            }
            emptyTitle="No movement records"
            emptyDescription="Record stock movements to build your ingredient ledger."
          />
        </div>
      </div>

      <Modal
        open={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title="Movement details"
        size="md"
      >
        {selectedRow && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-500">Date</dt>
                <dd className="mt-0.5 text-slate-900">
                  {new Date(selectedRow.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Ingredient</dt>
                <dd className="mt-0.5 text-slate-900">
                  {sc.inventoryMap[String(selectedRow.inventoryItemId)]?.name ?? String(selectedRow.inventoryItemId)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Movement type</dt>
                <dd className="mt-0.5 text-slate-900 capitalize">{selectedRow.movementType ?? "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Quantity</dt>
                <dd className="mt-0.5 text-slate-900">
                  {Number(selectedRow.quantity ?? 0).toFixed(3)} {selectedRow.unit ?? ""}
                  {sc.chefReadableText(String(selectedRow.inventoryItemId), Number(selectedRow.quantity ?? 0)) && (
                    <span className="ml-2 block text-xs text-[#5a189a]">
                      {sc.chefReadableText(String(selectedRow.inventoryItemId), Number(selectedRow.quantity ?? 0))}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Stock before</dt>
                <dd className="mt-0.5 text-slate-900">
                  {Number(selectedRow.previousStock ?? 0).toFixed(3)} {selectedRow.unit ?? ""}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Stock after</dt>
                <dd className="mt-0.5 text-slate-900">
                  {Number(selectedRow.resultingStock ?? 0).toFixed(3)} {selectedRow.unit ?? ""}
                  {sc.chefReadableText(String(selectedRow.inventoryItemId), Number(selectedRow.resultingStock ?? 0)) && (
                    <span className="ml-2 block text-xs text-[#5a189a]">
                      {sc.chefReadableText(String(selectedRow.inventoryItemId), Number(selectedRow.resultingStock ?? 0))}
                    </span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-medium text-slate-500">Reason</dt>
                <dd className="mt-0.5 text-slate-900">{selectedRow.reason ?? "-"}</dd>
              </div>
              {selectedRow.metadata && Object.keys(selectedRow.metadata).length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="font-medium text-slate-500">Metadata</dt>
                  <dd className="mt-0.5 text-slate-900">
                    <pre className="rounded-lg bg-slate-50 p-2 text-xs overflow-x-auto">
                      {JSON.stringify(selectedRow.metadata, null, 2)}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}

