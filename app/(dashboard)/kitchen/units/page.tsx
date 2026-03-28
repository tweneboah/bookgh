"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Tags, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { AppReactSelect } from "@/components/ui/react-select";
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
import { useAppSelector } from "@/store/hooks";

export default function UnitsPage() {
  const { user } = useAppSelector((s) => s.auth);
  const restaurantId = (user as any)?.restaurantId ?? null;

  const [tab, setTab] = useState<"units" | "yields">("units");

  /* ─── Units state ─────────────────────────────────── */
  const [unitModal, setUnitModal] = useState(false);
  const [editUnit, setEditUnit] = useState<any>(null);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: "",
    type: "both" as "purchase" | "yield" | "both",
    abbreviation: "",
  });

  /* ─── Yield state ─────────────────────────────────── */
  const [yieldModal, setYieldModal] = useState(false);
  const [editYield, setEditYield] = useState<any>(null);
  const [deleteYieldId, setDeleteYieldId] = useState<string | null>(null);
  const [yieldForm, setYieldForm] = useState({
    inventoryItemId: "",
    fromUnitId: "",
    fromQty: "1",
    toUnitId: "",
    toQty: "",
    notes: "",
  });

  /* ─── Data hooks ──────────────────────────────────── */
  const unitParams: Record<string, string> = { limit: "200" };
  if (restaurantId) unitParams.restaurantId = restaurantId;
  const { data: unitsRaw, isLoading: unitsLoading } = useRestaurantUnits(unitParams);
  const createUnit = useCreateRestaurantUnit();
  const updateUnit = useUpdateRestaurantUnit();
  const deleteUnit = useDeleteRestaurantUnit();

  const yieldParams: Record<string, string> = { limit: "200" };
  if (restaurantId) yieldParams.restaurantId = restaurantId;
  const { data: yieldsRaw, isLoading: yieldsLoading } = useItemYields(yieldParams);
  const createYield = useCreateItemYield();
  const updateYieldMut = useUpdateItemYield();
  const deleteYield = useDeleteItemYield();

  const { data: inventoryRaw } = useInventoryItems({
    limit: "500",
    department: "restaurant",
  });

  const units: any[] = Array.isArray(unitsRaw) ? unitsRaw : (unitsRaw as any)?.data ?? [];
  const yields: any[] = Array.isArray(yieldsRaw) ? yieldsRaw : (yieldsRaw as any)?.data ?? [];
  const inventoryItems: any[] = inventoryRaw?.data ?? [];

  const unitOptions = units.filter((u: any) => u.isActive !== false).map((u: any) => ({
    value: u._id,
    label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
  }));

  const inventoryOptions = inventoryItems.map((i: any) => ({
    value: i._id,
    label: `${i.name} (${i.unit})`,
  }));

  /* ─── Unit CRUD ───────────────────────────────────── */
  const resetUnit = () => {
    setUnitForm({ name: "", type: "both", abbreviation: "" });
    setEditUnit(null);
  };

  const openCreateUnit = () => {
    resetUnit();
    setUnitModal(true);
  };

  const openEditUnit = (u: any) => {
    setEditUnit(u);
    setUnitForm({
      name: u.name ?? "",
      type: u.type ?? "both",
      abbreviation: u.abbreviation ?? "",
    });
    setUnitModal(true);
  };

  const saveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name.trim()) {
      toast.error("Unit name is required");
      return;
    }
    try {
      if (editUnit) {
        await updateUnit.mutateAsync({
          id: editUnit._id,
          ...unitForm,
          ...(restaurantId && { restaurantId }),
        });
        toast.success("Unit updated");
      } else {
        await createUnit.mutateAsync({ ...unitForm, ...(restaurantId && { restaurantId }) });
        toast.success("Unit created");
      }
      setUnitModal(false);
      resetUnit();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save unit");
    }
  };

  const confirmDeleteUnit = async () => {
    if (!deleteUnitId) return;
    try {
      await deleteUnit.mutateAsync(deleteUnitId);
      toast.success("Unit deleted");
      setDeleteUnitId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Cannot delete unit");
    }
  };

  const toggleActive = async (u: any) => {
    try {
      await updateUnit.mutateAsync({
        id: u._id,
        isActive: !u.isActive,
        ...(restaurantId && { restaurantId }),
      });
      toast.success(u.isActive ? "Unit deactivated" : "Unit activated");
    } catch {
      toast.error("Failed to update unit");
    }
  };

  /* ─── Yield CRUD ──────────────────────────────────── */
  const resetYield = () => {
    setYieldForm({
      inventoryItemId: "",
      fromUnitId: "",
      fromQty: "1",
      toUnitId: "",
      toQty: "",
      notes: "",
    });
    setEditYield(null);
  };

  const openCreateYield = () => {
    resetYield();
    setYieldModal(true);
  };

  const openEditYield = (y: any) => {
    setEditYield(y);
    setYieldForm({
      inventoryItemId:
        typeof y.inventoryItemId === "object" ? y.inventoryItemId._id : y.inventoryItemId ?? "",
      fromUnitId: typeof y.fromUnitId === "object" ? y.fromUnitId._id : y.fromUnitId ?? "",
      fromQty: y.fromQty != null ? String(y.fromQty) : "1",
      toUnitId: typeof y.toUnitId === "object" ? y.toUnitId._id : y.toUnitId ?? "",
      toQty: y.toQty != null ? String(y.toQty) : "",
      notes: y.notes ?? "",
    });
    setYieldModal(true);
  };

  const saveYield = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yieldForm.inventoryItemId || !yieldForm.fromUnitId || !yieldForm.toUnitId) {
      toast.error("Item, from-unit and to-unit are all required");
      return;
    }
    const payload = {
      ...(restaurantId && { restaurantId }),
      inventoryItemId: yieldForm.inventoryItemId,
      fromUnitId: yieldForm.fromUnitId,
      fromQty: Number(yieldForm.fromQty) || 1,
      toUnitId: yieldForm.toUnitId,
      toQty: Number(yieldForm.toQty) || 0,
      notes: yieldForm.notes || undefined,
    };
    if (!payload.toQty || payload.toQty <= 0) {
      toast.error("To-quantity must be greater than zero");
      return;
    }
    try {
      if (editYield) {
        await updateYieldMut.mutateAsync({ id: editYield._id, ...payload });
        toast.success("Yield mapping updated");
      } else {
        await createYield.mutateAsync(payload);
        toast.success("Yield mapping created");
      }
      setYieldModal(false);
      resetYield();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save yield mapping");
    }
  };

  const confirmDeleteYield = async () => {
    if (!deleteYieldId) return;
    try {
      await deleteYield.mutateAsync(deleteYieldId);
      toast.success("Yield mapping deleted");
      setDeleteYieldId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Cannot delete yield mapping");
    }
  };

  /* ─── Helpers ──────────────────────────────────── */
  const getUnitName = (ref: any) =>
    typeof ref === "object" ? ref?.name ?? "—" : units.find((u: any) => u._id === ref)?.name ?? "—";
  const getItemName = (ref: any) =>
    typeof ref === "object"
      ? ref?.name ?? "—"
      : inventoryItems.find((i: any) => i._id === ref)?.name ?? "—";

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="h-1 bg-linear-to-r from-orange-400 via-purple-500 to-indigo-500" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Units & Yields</h1>
              <p className="text-sm text-slate-500">
                Define chef-friendly units and map purchase → yield conversions
              </p>
            </div>
          </div>
          <Button
            onClick={tab === "units" ? openCreateUnit : openCreateYield}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {tab === "units" ? "New Unit" : "New Mapping"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["units", "yields"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "units" ? `Units (${units.length})` : `Yield Mappings (${yields.length})`}
            </button>
          ))}
        </div>

        {/* ─── Units Tab ─────────────────────────────── */}
        {tab === "units" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {unitsLoading ? (
              <div className="p-10 text-center text-slate-400">Loading units…</div>
            ) : units.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                No units yet. Click &quot;New Unit&quot; to define one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Abbr.</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {units.map((u: any) => (
                      <tr key={u._id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-800">{u.name}</td>
                        <td className="px-6 py-3">
                          <Badge variant={u.type === "purchase" ? "default" : u.type === "yield" ? "success" : "outline"}>
                            {u.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-slate-500">{u.abbreviation || "—"}</td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => toggleActive(u)}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.isActive !== false
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {u.isActive !== false ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditUnit(u)}
                              className="text-slate-400 hover:text-indigo-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteUnitId(u._id)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Yield Mappings Tab ─────────────────────── */}
        {tab === "yields" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {yieldsLoading ? (
              <div className="p-10 text-center text-slate-400">Loading yield mappings…</div>
            ) : yields.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                No yield mappings yet. Click &quot;New Mapping&quot; to define one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Inventory Item</th>
                      <th className="px-6 py-3">From</th>
                      <th className="px-6 py-3" />
                      <th className="px-6 py-3">To</th>
                      <th className="px-6 py-3">Notes</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yields.map((y: any) => (
                      <tr key={y._id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-800">
                          {getItemName(y.inventoryItemId)}
                        </td>
                        <td className="px-6 py-3 text-slate-700">
                          {y.fromQty} {getUnitName(y.fromUnitId)}
                        </td>
                        <td className="px-2 py-3 text-slate-300">
                          <ArrowRight className="h-4 w-4" />
                        </td>
                        <td className="px-6 py-3 text-indigo-700 font-semibold">
                          {y.toQty} {getUnitName(y.toUnitId)}
                        </td>
                        <td className="px-6 py-3 text-slate-500 truncate max-w-[200px]">
                          {y.notes || "—"}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditYield(y)}
                              className="text-slate-400 hover:text-indigo-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteYieldId(y._id)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Unit Modal ────────────────────────────── */}
      <Modal
        open={unitModal}
        onClose={() => {
          setUnitModal(false);
          resetUnit();
        }}
        title={editUnit ? "Edit Unit" : "New Unit"}
      >
        <form onSubmit={saveUnit} className="space-y-5">
          <div>
            <label htmlFor="unitName" className="mb-1 block text-sm font-medium text-slate-700">
              Unit Name
            </label>
            <Input
              id="unitName"
              value={unitForm.name}
              onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. plate, scoop, ladle, small bag"
            />
          </div>
          <div>
            <label htmlFor="unitType" className="mb-1 block text-sm font-medium text-slate-700">
              Type
            </label>
            <Select
              id="unitType"
              value={unitForm.type}
              onChange={(e) =>
                setUnitForm((f) => ({
                  ...f,
                  type: e.target.value as "purchase" | "yield" | "both",
                }))
              }
              options={[
                { value: "both", label: "Both (purchase & yield)" },
                { value: "purchase", label: "Purchase only" },
                { value: "yield", label: "Yield only" },
              ]}
            />
          </div>
          <div>
            <label htmlFor="unitAbbr" className="mb-1 block text-sm font-medium text-slate-700">
              Abbreviation
            </label>
            <Input
              id="unitAbbr"
              value={unitForm.abbreviation}
              onChange={(e) => setUnitForm((f) => ({ ...f, abbreviation: e.target.value }))}
              placeholder="e.g. plt, scp, ldl"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUnitModal(false);
                resetUnit();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={createUnit.isPending || updateUnit.isPending}
            >
              {editUnit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Yield Modal ────────────────────────────── */}
      <Modal
        open={yieldModal}
        onClose={() => {
          setYieldModal(false);
          resetYield();
        }}
        title={editYield ? "Edit Yield Mapping" : "New Yield Mapping"}
      >
        <form onSubmit={saveYield} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Inventory Item
            </label>
            <AppReactSelect
              options={inventoryOptions}
              value={yieldForm.inventoryItemId}
              onChange={(val) => setYieldForm((f) => ({ ...f, inventoryItemId: val }))}
              placeholder="Select item…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                From Unit (purchase)
              </label>
              <AppReactSelect
                options={unitOptions}
                value={yieldForm.fromUnitId}
                onChange={(val) => setYieldForm((f) => ({ ...f, fromUnitId: val }))}
                placeholder="Select unit…"
              />
            </div>
            <div>
              <label htmlFor="fromQty" className="mb-1 block text-sm font-medium text-slate-700">
                From Qty
              </label>
              <Input
                id="fromQty"
                type="number"
                step="any"
                min="0.0001"
                value={yieldForm.fromQty}
                onChange={(e) => setYieldForm((f) => ({ ...f, fromQty: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-center text-slate-400">
            <ArrowRight className="h-5 w-5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                To Unit (yield)
              </label>
              <AppReactSelect
                options={unitOptions}
                value={yieldForm.toUnitId}
                onChange={(val) => setYieldForm((f) => ({ ...f, toUnitId: val }))}
                placeholder="Select unit…"
              />
            </div>
            <div>
              <label htmlFor="toQty" className="mb-1 block text-sm font-medium text-slate-700">
                To Qty
              </label>
              <Input
                id="toQty"
                type="number"
                step="any"
                min="0.0001"
                value={yieldForm.toQty}
                onChange={(e) => setYieldForm((f) => ({ ...f, toQty: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label htmlFor="yieldNotes" className="mb-1 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <Input
              id="yieldNotes"
              value={yieldForm.notes}
              onChange={(e) => setYieldForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setYieldModal(false);
                resetYield();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={createYield.isPending || updateYieldMut.isPending}
            >
              {editYield ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirmations ───────────────────── */}
      <Modal
        open={!!deleteUnitId}
        onClose={() => setDeleteUnitId(null)}
        title="Delete Unit"
      >
        <p className="mb-4 text-sm text-slate-600">
          Are you sure you want to delete this unit? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteUnitId(null)}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteUnit}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={deleteUnit.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!deleteYieldId}
        onClose={() => setDeleteYieldId(null)}
        title="Delete Yield Mapping"
      >
        <p className="mb-4 text-sm text-slate-600">
          Are you sure you want to delete this yield mapping? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteYieldId(null)}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteYield}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={deleteYield.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
