"use client";

import { useMemo, useState } from "react";
import {
  useBarInventoryMovements,
  useCreateBarInventoryMovement,
  useInventoryItems,
} from "@/hooks/api";
import {
  AppReactSelect,
  Badge,
  Button,
  DataTable,
  Input,
  Modal,
} from "@/components/ui";
import Link from "next/link";
import toast from "react-hot-toast";
import { FiPackage, FiTrendingUp, FiPlus } from "react-icons/fi";

const lowStock = (row: any) =>
  Number(row.currentStock ?? 0) <= Number(row.reorderLevel ?? 0);

const MOVEMENT_TEMPLATES = [
  {
    key: "restock-bottle",
    label: "Restock Bottles",
    movementType: "restock",
    quantity: 6,
    unit: "bottle" as const,
    reason: "Weekly supplier restock",
    allowNegativeStock: false,
  },
  {
    key: "wastage-spillage",
    label: "Wastage/Spillage",
    movementType: "wastage",
    quantity: 1,
    unit: "unit" as const,
    reason: "Bottle breakage during service",
    allowNegativeStock: false,
  },
  {
    key: "manual-adjustment",
    label: "Manual Adjustment",
    movementType: "adjustment",
    quantity: 1,
    unit: "unit" as const,
    reason: "Physical count reconciliation",
    allowNegativeStock: false,
  },
  {
    key: "closing-balance",
    label: "Closing Balance",
    movementType: "closing",
    quantity: 1,
    unit: "unit" as const,
    reason: "End-of-shift closing snapshot",
    allowNegativeStock: false,
  },
] as const;

export default function BarInventoryPage() {
  const { data: inventoryData, isLoading } = useInventoryItems({
    limit: "200",
    department: "bar",
  });
  const { data: movementData } = useBarInventoryMovements({ limit: "20" });
  const createMovement = useCreateBarInventoryMovement();
  const [openAdjust, setOpenAdjust] = useState(false);
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [movementType, setMovementType] = useState("adjustment");
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState<"ml" | "unit" | "bottle">("unit");
  const [reason, setReason] = useState("");
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const inventoryRows = inventoryData?.data ?? [];
  const inventoryOptions = useMemo(
    () =>
      inventoryRows.map((item: any) => ({
        value: String(item._id),
        label: `${item.name} (${item.currentStock} ${item.unit})`,
      })),
    [inventoryRows]
  );

  const inventoryColumns = [
    { key: "name", header: "Item", render: (row: any) => row.name },
    { key: "category", header: "Category", render: (row: any) => row.category },
    {
      key: "currentStock",
      header: "Current Stock",
      render: (row: any) => `${Number(row.currentStock ?? 0).toFixed(2)} ${row.unit}`,
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) =>
        lowStock(row) ? <Badge variant="danger">Low Stock</Badge> : <Badge variant="success">Healthy</Badge>,
    },
  ];

  const movementColumns = [
    {
      key: "createdAt",
      header: "Date",
      render: (row: any) => new Date(row.createdAt).toLocaleString(),
    },
    { key: "movementType", header: "Type", render: (row: any) => row.movementType },
    {
      key: "quantity",
      header: "Qty",
      render: (row: any) => `${row.quantity} ${row.unit}`,
    },
    {
      key: "resultingStock",
      header: "Resulting Stock",
      render: (row: any) => row.resultingStock,
    },
  ];

  const applyMovementTemplate = (templateKey: string) => {
    const template = MOVEMENT_TEMPLATES.find((item) => item.key === templateKey);
    if (!template) return;

    setMovementType(template.movementType);
    setQuantity(template.quantity);
    setUnit(template.unit);
    setReason(template.reason);
    setAllowNegativeStock(template.allowNegativeStock);
    setFormError(null);
    toast.success(`${template.label} template applied`);
  };

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!inventoryItemId) {
      setFormError("Please select an inventory item.");
      return;
    }
    if (!movementType) {
      setFormError("Please select a movement type.");
      return;
    }
    if (!Number.isFinite(quantity) || Number(quantity) <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }

    try {
      await createMovement.mutateAsync({
        inventoryItemId,
        movementType,
        quantity: Number(quantity),
        unit,
        reason,
        allowNegativeStock,
      });
      toast.success("Inventory movement recorded");
      setOpenAdjust(false);
      setInventoryItemId("");
      setQuantity(0);
      setUnit("unit");
      setReason("");
      setAllowNegativeStock(false);
      setFormError(null);
    } catch (err: any) {
      const responseError = err?.response?.data?.error;
      const validationDetails = responseError?.details as
        | Record<string, string[]>
        | undefined;
      const firstValidationMessage = validationDetails
        ? Object.values(validationDetails).flat().find(Boolean)
        : null;
      const message =
        firstValidationMessage ??
        responseError?.message ??
        "Failed to record movement";
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/98 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">BAR Inventory</h1>
              <p className="mt-1 text-sm text-slate-500">Bottle-level and unit-level stock controls with movement audit.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
                <Link href="/bar/inventory-items">Manage Inventory Items</Link>
              </Button>
              <Button
                onClick={() => setOpenAdjust(true)}
                className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,109,0,0.4)]"
                style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
              >
                <FiPlus className="h-4 w-4 sm:mr-2" aria-hidden />
                Add Stock Movement
              </Button>
            </div>
          </div>
        </div>
        <div className="h-0.5 w-full bg-linear-to-r from-[#ff8500]/40 via-[#5a189a]/40 to-[#ff8500]/40" />
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-100 border-l-4 border-l-[#5a189a] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <FiPackage className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Current Inventory</h2>
                <p className="text-xs text-slate-500">Stock levels and status by item.</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto min-w-0">
            <DataTable
              columns={inventoryColumns}
              data={inventoryRows}
              loading={isLoading}
              getRowKey={(row) => row._id}
              emptyTitle="No inventory records"
              emptyDescription="Create inventory items first from BAR inventory items."
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 border-l-4 border-l-[#ff8500] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff8500]/10 text-[#c2410c]">
                <FiTrendingUp className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Recent Stock Movements</h2>
                <p className="text-xs text-slate-500">Manual and automatic deductions appear here.</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto min-w-0">
            <DataTable
              columns={movementColumns}
              data={movementData?.data ?? []}
              getRowKey={(row) => row._id}
              emptyTitle="No movements yet"
              emptyDescription="Record a stock movement to see entries here."
            />
          </div>
        </div>
      </main>

      <Modal open={openAdjust} onClose={() => setOpenAdjust(false)} title="Record Stock Movement" className="max-w-lg rounded-2xl border-slate-100 shadow-[0_24px_48px_rgba(0,0,0,0.12)]">
        <form onSubmit={submitAdjustment} className="space-y-5" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-[#5a189a]/5 to-[#9d4edd]/5 p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Quick templates</p>
            <p className="mt-1 text-xs text-slate-600">Pick a template, then choose the item and save.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MOVEMENT_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => applyMovementTemplate(template.key)}
                  className="rounded-xl border border-[#5a189a]/25 bg-white px-4 py-2.5 text-sm font-medium text-[#5a189a] shadow-sm transition-all hover:bg-[#5a189a]/10"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Inventory item</label>
            <AppReactSelect value={inventoryItemId} onChange={setInventoryItemId} options={inventoryOptions} placeholder="Select item" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Movement type</label>
              <AppReactSelect
                value={movementType}
                onChange={setMovementType}
                options={[
                  { value: "restock", label: "Restock" },
                  { value: "adjustment", label: "Adjustment" },
                  { value: "wastage", label: "Wastage" },
                  { value: "closing", label: "Closing" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Quantity</label>
              <Input type="number" value={quantity} min={0.01} step="0.01" onChange={(e) => setQuantity(Number(e.target.value))} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Unit</label>
              <AppReactSelect
                value={unit}
                onChange={(value) => setUnit(value as "ml" | "unit" | "bottle")}
                options={[{ value: "ml", label: "ml" }, { value: "unit", label: "unit" }, { value: "bottle", label: "bottle" }]}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Reason</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
            <input type="checkbox" checked={allowNegativeStock} onChange={(e) => setAllowNegativeStock(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/20" />
            <span className="text-sm font-medium text-slate-700">Allow negative stock override (manager approval)</span>
          </label>
          {formError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p> : null}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpenAdjust(false)} className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button>
            <Button type="submit" loading={createMovement.isPending} disabled={!inventoryItemId || Number(quantity) <= 0} className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)]" style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}>Save Movement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
