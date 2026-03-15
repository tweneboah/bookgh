"use client";

import { useState } from "react";
import { useAdjustInventoryBySku, useScanInventoryBySku } from "@/hooks/api";
import { Button, Input } from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import toast from "react-hot-toast";
import { FiSearch, FiPackage, FiEdit2 } from "react-icons/fi";

export default function RestaurantInventoryScanPage() {
  const [skuInput, setSkuInput] = useState("");
  const [lookupSku, setLookupSku] = useState("");
  const [mode, setMode] = useState<"add" | "set">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const { data, isFetching } = useScanInventoryBySku(lookupSku);
  const item = data?.data;
  const adjustMut = useAdjustInventoryBySku();

  const lookup = () => {
    if (!skuInput.trim()) {
      toast.error("Enter barcode/SKU");
      return;
    }
    setLookupSku(skuInput.trim());
  };

  const apply = async () => {
    if (!lookupSku) {
      toast.error("Scan or lookup an item first");
      return;
    }
    const qty = Number(quantity || 0);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Enter valid quantity");
      return;
    }
    try {
      await adjustMut.mutateAsync({
        sku: lookupSku,
        quantity: qty,
        mode,
        reason: reason || undefined,
      });
      toast.success("Stock updated");
      setQuantity("");
      setReason("");
      setLookupSku(lookupSku);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to adjust stock");
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-1 h-1 w-16 rounded-full bg-gradient-to-r from-[#5a189a] to-[#9d4edd]" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Barcode Inventory Scan
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Scan or enter barcode/SKU to lookup and adjust stock.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Barcode / SKU"
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                placeholder="Scan or type SKU"
                onKeyDown={(e) => e.key === "Enter" && lookup()}
              />
            </div>
            <Button
              onClick={lookup}
              loading={isFetching}
              className="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] text-white"
            >
              <FiSearch className="h-4 w-4" />
              Lookup
            </Button>
          </div>
        </div>

        {item && (
          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a189a]/10 to-[#9d4edd]/10">
                <FiPackage className="h-7 w-7 text-[#5a189a]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{item.name}</p>
                <p className="text-sm text-slate-500">
                  SKU: {item.sku ?? "-"} • Stock:{" "}
                  <span className="font-medium text-slate-700">
                    {item.currentStock} {item.unit}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <AppReactSelect
                label="Mode"
                value={mode}
                onChange={(v) => setMode(v as "add" | "set")}
                options={[
                  { value: "add", label: "Add Quantity" },
                  { value: "set", label: "Set Exact Stock" },
                ]}
              />
              <Input
                label={mode === "add" ? "Quantity to Add" : "New Stock Quantity"}
                type="number"
                min="0"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <Input
                label="Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Physical stock count"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={apply}
                loading={adjustMut.isPending}
                className="bg-gradient-to-r from-[#5a189a] to-[#9d4edd] text-white"
              >
                <FiEdit2 className="h-4 w-4" />
                Apply Adjustment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
