"use client";

import { useState } from "react";
import {
  useRestaurantUnits,
  useCreateRestaurantUnit,
  useUpdateRestaurantUnit,
  useDeleteRestaurantUnit,
  useItemYields,
  useCreateItemYield,
  useUpdateItemYield,
  useDeleteItemYield,
  useInventoryItems,
} from "@/hooks/api";
import { Button, Modal, Input, Badge, AppReactSelect, DataTable } from "@/components/ui";
import { FiPlus, FiEdit2, FiTrash2, FiArrowRight } from "react-icons/fi";
import { Wine } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const UNIT_TYPE_OPTIONS = [
  { value: "purchase", label: "Purchase (store)" },
  { value: "yield", label: "Yield (service)" },
  { value: "both", label: "Both" },
];

const TYPE_BADGE: Record<string, "info" | "success" | "warning"> = {
  purchase: "info",
  yield: "success",
  both: "warning",
};

export default function BarUnitsPage() {
  const [activeTab, setActiveTab] = useState<"units" | "yields">("units");
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [editUnit, setEditUnit] = useState<any>(null);
  const [editYield, setEditYield] = useState<any>(null);
  const [deleteUnit, setDeleteUnit] = useState<string | null>(null);
  const [deleteYield, setDeleteYield] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [itemFilter, setItemFilter] = useState("");

  const [unitForm, setUnitForm] = useState({
    name: "",
    type: "both" as string,
    abbreviation: "",
  });
  const [yieldForm, setYieldForm] = useState({
    inventoryItemId: "",
    fromUnitId: "",
    fromQty: "1",
    baseUnitQty: "",
    toUnitId: "",
    toQty: "",
    notes: "",
  });

  const { data: unitsData, isLoading: unitsLoading } = useRestaurantUnits({
    limit: "200",
    department: "bar",
    ...(typeFilter ? { type: typeFilter } : {}),
  });
  const { data: yieldsData, isLoading: yieldsLoading } = useItemYields({
    limit: "200",
    department: "bar",
    ...(itemFilter ? { inventoryItemId: itemFilter } : {}),
  });
  const { data: inventoryData } = useInventoryItems({
    limit: "500",
    department: "bar",
  });

  const createUnit = useCreateRestaurantUnit();
  const updateUnit = useUpdateRestaurantUnit();
  const removeUnit = useDeleteRestaurantUnit();
  const createYield = useCreateItemYield();
  const updateYieldMut = useUpdateItemYield();
  const removeYield = useDeleteItemYield();

  const units = unitsData?.data ?? [];
  const yields = yieldsData?.data ?? [];
  const inventoryItems = inventoryData?.data ?? [];

  const purchaseUnits = units.filter((u: any) => u.type === "purchase" || u.type === "both");
  const yieldUnits = units.filter((u: any) => u.type === "yield" || u.type === "both");
  const purchaseUnitOptions = purchaseUnits.map((u: any) => ({
    value: u._id,
    label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
  }));
  const yieldUnitOptions = yieldUnits.map((u: any) => ({
    value: u._id,
    label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
  }));

  const resetUnitForm = () => {
    setUnitForm({ name: "", type: "both", abbreviation: "" });
    setEditUnit(null);
  };
  const resetYieldForm = () => {
    setYieldForm({
      inventoryItemId: "",
      fromUnitId: "",
      fromQty: "1",
      baseUnitQty: "",
      toUnitId: "",
      toQty: "",
      notes: "",
    });
    setEditYield(null);
  };

  const openEditUnit = (item: any) => {
    setEditUnit(item);
    setUnitForm({
      name: item.name ?? "",
      type: item.type ?? "both",
      abbreviation: item.abbreviation ?? "",
    });
    setShowUnitModal(true);
  };

  const openEditYield = (item: any) => {
    setEditYield(item);
    setYieldForm({
      inventoryItemId:
        typeof item.inventoryItemId === "object" ? item.inventoryItemId._id : item.inventoryItemId ?? "",
      fromUnitId: typeof item.fromUnitId === "object" ? item.fromUnitId._id : item.fromUnitId ?? "",
      fromQty: String(item.fromQty ?? 1),
      baseUnitQty: item.baseUnitQty != null ? String(item.baseUnitQty) : "",
      toUnitId: typeof item.toUnitId === "object" ? item.toUnitId._id : item.toUnitId ?? "",
      toQty: String(item.toQty ?? ""),
      notes: item.notes ?? "",
    });
    setShowYieldModal(true);
  };

  const handleSubmitUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name.trim()) return toast.error("Unit name is required");
    try {
      if (editUnit) {
        await updateUnit.mutateAsync({ id: editUnit._id, department: "bar", ...unitForm });
        toast.success("Unit updated");
      } else {
        await createUnit.mutateAsync({ ...unitForm, department: "bar" });
        toast.success("Unit created");
      }
      setShowUnitModal(false);
      resetUnitForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleSubmitYield = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, any> = {
      inventoryItemId: yieldForm.inventoryItemId,
      fromUnitId: yieldForm.fromUnitId,
      fromQty: parseFloat(yieldForm.fromQty) || 1,
      baseUnitQty: parseFloat(yieldForm.baseUnitQty),
      toUnitId: yieldForm.toUnitId,
      toQty: parseFloat(yieldForm.toQty) || 0,
      notes: yieldForm.notes.trim() || undefined,
    };
    if (
      !payload.inventoryItemId ||
      !payload.fromUnitId ||
      !payload.toUnitId ||
      !Number.isFinite(payload.baseUnitQty) ||
      payload.baseUnitQty <= 0 ||
      payload.toQty <= 0
    ) {
      return toast.error("Fill all required fields");
    }
    try {
      if (editYield) {
        await updateYieldMut.mutateAsync({ id: editYield._id, department: "bar", ...payload });
        toast.success("Yield mapping updated");
      } else {
        await createYield.mutateAsync({ ...payload, department: "bar" });
        toast.success("Yield mapping created");
      }
      setShowYieldModal(false);
      resetYieldForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const unitColumns = [
    { key: "name", header: "Unit Name", render: (row: any) => <span className="font-medium text-slate-900">{row.name}</span> },
    { key: "abbr", header: "Abbreviation", render: (row: any) => row.abbreviation || "—" },
    {
      key: "type",
      header: "Type",
      render: (row: any) => (
        <Badge variant={TYPE_BADGE[row.type] ?? "default"}>
          {UNIT_TYPE_OPTIONS.find((o) => o.value === row.type)?.label ?? row.type}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditUnit(row)}><FiEdit2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteUnit(row._id)}>
            <FiTrash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const yieldColumns = [
    {
      key: "item",
      header: "Inventory Item",
      render: (row: any) => <span className="font-medium text-slate-900">{typeof row.inventoryItemId === "object" ? row.inventoryItemId?.name : "—"}</span>,
    },
    {
      key: "mapping",
      header: "Yield Mapping",
      render: (row: any) => {
        const fromName = typeof row.fromUnitId === "object" ? row.fromUnitId?.name : "—";
        const toName = typeof row.toUnitId === "object" ? row.toUnitId?.name : "—";
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-[#5a189a]">{row.fromQty} {fromName}</span>
            <FiArrowRight className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-[#ff6d00]">{row.toQty} {toName}</span>
          </div>
        );
      },
    },
    { key: "notes", header: "Notes", render: (row: any) => row.notes || "—" },
    {
      key: "actions",
      header: "",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditYield(row)}><FiEdit2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteYield(row._id)}>
            <FiTrash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleDeleteUnit = async () => {
    if (!deleteUnit) return;
    try {
      await removeUnit.mutateAsync({ id: deleteUnit, department: "bar" });
      toast.success("Unit deleted");
      setDeleteUnit(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };
  const handleDeleteYield = async () => {
    if (!deleteYield) return;
    try {
      await removeYield.mutateAsync({ id: deleteYield, department: "bar" });
      toast.success("Yield mapping deleted");
      setDeleteYield(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      <div className="relative bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#ff6d00] to-[#ff9e00] text-white">
              <Wine className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Bar Units & Yields</h1>
              <p className="text-sm text-slate-500">Dedicated yield-unit setup for BAR inventory items.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200">
          {([{ id: "units", label: "Units" }, { id: "yields", label: "Yield Mappings" }] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={"px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px " + (activeTab === tab.id ? "border-[#ff6d00] text-[#ff6d00]" : "border-transparent text-slate-500")}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto">
            <Button
              onClick={() => {
                if (activeTab === "units") {
                  resetUnitForm();
                  setShowUnitModal(true);
                } else {
                  resetYieldForm();
                  setShowYieldModal(true);
                }
              }}
              className="h-10 px-4 rounded-xl font-semibold text-white bg-linear-to-r from-[#ff6d00] to-[#ff8500]"
            >
              <FiPlus className="h-4 w-4 mr-2" />
              {activeTab === "units" ? "Add Unit" : "Add Yield Mapping"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          {activeTab === "units" ? (
            <>
              <div className="p-4 border-b border-slate-100">
                <div className="max-w-[260px]">
                  <AppReactSelect value={typeFilter} onChange={(v) => setTypeFilter(v)} options={[{ value: "", label: "All Types" }, ...UNIT_TYPE_OPTIONS]} />
                </div>
              </div>
              <div className="p-0 sm:p-2 min-h-[320px]">
                <DataTable columns={unitColumns} data={units} getRowKey={(row) => row._id} loading={unitsLoading} emptyTitle="No units yet" emptyDescription="Create purchase/yield units for bar mappings." />
              </div>
            </>
          ) : (
            <>
              <div className="px-4 pt-4 pb-2 text-sm text-slate-600 border-b border-slate-100 bg-[#fffbf5]">
                Create items first in{" "}
                <Link href="/bar/inventory-items" className="font-medium text-[#ff6d00] hover:underline">
                  Bar inventory items
                </Link>
                , then map yields here.
              </div>
              <div className="p-4 border-b border-slate-100">
                <div className="max-w-[300px]">
                  <AppReactSelect
                    value={itemFilter}
                    onChange={(v) => setItemFilter(v)}
                    options={[{ value: "", label: "All items" }, ...inventoryItems.map((i: any) => ({ value: i._id, label: i.name }))]}
                  />
                </div>
              </div>
              <div className="p-0 sm:p-2 min-h-[320px]">
                <DataTable columns={yieldColumns} data={yields} getRowKey={(row) => row._id} loading={yieldsLoading} emptyTitle="No yield mappings yet" emptyDescription="Map conversions like 1 bottle -> 15 shots." />
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={showUnitModal} onClose={() => { setShowUnitModal(false); resetUnitForm(); }} title={editUnit ? "Edit Unit" : "Add Unit"} size="lg">
        <form onSubmit={handleSubmitUnit} className="space-y-4">
          <Input label="Unit Name" value={unitForm.name} onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="Abbreviation" value={unitForm.abbreviation} onChange={(e) => setUnitForm((f) => ({ ...f, abbreviation: e.target.value }))} />
          <AppReactSelect label="Unit Type" value={unitForm.type} onChange={(v) => setUnitForm((f) => ({ ...f, type: v }))} options={UNIT_TYPE_OPTIONS} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setShowUnitModal(false); resetUnitForm(); }}>Cancel</Button>
            <Button type="submit" loading={createUnit.isPending || updateUnit.isPending}>{editUnit ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showYieldModal} onClose={() => { setShowYieldModal(false); resetYieldForm(); }} title={editYield ? "Edit Yield Mapping" : "Add Yield Mapping"} size="lg">
        <form onSubmit={handleSubmitYield} className="space-y-4">
          <AppReactSelect
            label="Inventory Item"
            value={yieldForm.inventoryItemId}
            onChange={(v) => setYieldForm((f) => ({ ...f, inventoryItemId: v }))}
            options={[{ value: "", label: "Select item..." }, ...inventoryItems.map((i: any) => ({ value: i._id, label: i.name }))]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="From Qty" type="number" min="0.01" step="any" value={yieldForm.fromQty} onChange={(e) => setYieldForm((f) => ({ ...f, fromQty: e.target.value }))} />
            <AppReactSelect label="Purchase Unit" value={yieldForm.fromUnitId} onChange={(v) => setYieldForm((f) => ({ ...f, fromUnitId: v }))} options={[{ value: "", label: "Select..." }, ...purchaseUnitOptions]} />
          </div>
          <Input label="Base unit qty" type="number" min="0.01" step="any" value={yieldForm.baseUnitQty} onChange={(e) => setYieldForm((f) => ({ ...f, baseUnitQty: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="To Qty" type="number" min="0.01" step="any" value={yieldForm.toQty} onChange={(e) => setYieldForm((f) => ({ ...f, toQty: e.target.value }))} />
            <AppReactSelect label="Yield Unit" value={yieldForm.toUnitId} onChange={(v) => setYieldForm((f) => ({ ...f, toUnitId: v }))} options={[{ value: "", label: "Select..." }, ...yieldUnitOptions]} />
          </div>
          <Input label="Notes" value={yieldForm.notes} onChange={(e) => setYieldForm((f) => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setShowYieldModal(false); resetYieldForm(); }}>Cancel</Button>
            <Button type="submit" loading={createYield.isPending || updateYieldMut.isPending}>{editYield ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteUnit} onClose={() => setDeleteUnit(null)} title="Delete Unit">
        <p className="text-sm text-slate-600">Are you sure you want to delete this unit?</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteUnit(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDeleteUnit} loading={removeUnit.isPending}>Delete</Button>
        </div>
      </Modal>

      <Modal open={!!deleteYield} onClose={() => setDeleteYield(null)} title="Delete Yield Mapping">
        <p className="text-sm text-slate-600">Are you sure you want to delete this yield mapping?</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteYield(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDeleteYield} loading={removeYield.isPending}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
