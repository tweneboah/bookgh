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
import {
  Button,
  Modal,
  Input,
  Badge,
  AppReactSelect,
  DataTable,
} from "@/components/ui";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiFilter,
  FiBox,
  FiArrowRight,
} from "react-icons/fi";
import { Tags } from "lucide-react";
import toast from "react-hot-toast";

const UNIT_TYPE_OPTIONS = [
  { value: "purchase", label: "Purchase (store)" },
  { value: "yield", label: "Yield (kitchen)" },
  { value: "both", label: "Both" },
];

const TYPE_BADGE: Record<string, "info" | "success" | "warning"> = {
  purchase: "info",
  yield: "success",
  both: "warning",
};

export default function RestaurantUnitsPage() {
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

  const unitParams: Record<string, string> = { limit: "200" };
  if (typeFilter) unitParams.type = typeFilter;

  const { data: unitsData, isLoading: unitsLoading } =
    useRestaurantUnits(unitParams);
  const createUnit = useCreateRestaurantUnit();
  const updateUnit = useUpdateRestaurantUnit();
  const removeUnit = useDeleteRestaurantUnit();

  const yieldParams: Record<string, string> = { limit: "200" };
  if (itemFilter) yieldParams.inventoryItemId = itemFilter;

  const { data: yieldsData, isLoading: yieldsLoading } =
    useItemYields(yieldParams);
  const createYield = useCreateItemYield();
  const updateYieldMut = useUpdateItemYield();
  const removeYield = useDeleteItemYield();

  const { data: inventoryData } = useInventoryItems({
    limit: "500",
    department: "restaurant",
  });

  const units = unitsData?.data ?? [];
  const yields = yieldsData?.data ?? [];
  const inventoryItems = inventoryData?.data ?? [];

  const purchaseUnits = units.filter(
    (u: any) => u.type === "purchase" || u.type === "both"
  );
  const yieldUnits = units.filter(
    (u: any) => u.type === "yield" || u.type === "both"
  );

  const inventoryOptions = [
    { value: "", label: "All items" },
    ...inventoryItems.map((i: any) => ({ value: i._id, label: i.name })),
  ];
  const unitOptions = units.map((u: any) => ({
    value: u._id,
    label: u.abbreviation ? `${u.name} (${u.abbreviation})` : u.name,
  }));
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
        typeof item.inventoryItemId === "object"
          ? item.inventoryItemId._id
          : item.inventoryItemId ?? "",
      fromUnitId:
        typeof item.fromUnitId === "object"
          ? item.fromUnitId._id
          : item.fromUnitId ?? "",
      fromQty: String(item.fromQty ?? 1),
      baseUnitQty: item.baseUnitQty != null ? String(item.baseUnitQty) : "",
      toUnitId:
        typeof item.toUnitId === "object"
          ? item.toUnitId._id
          : item.toUnitId ?? "",
      toQty: String(item.toQty ?? ""),
      notes: item.notes ?? "",
    });
    setShowYieldModal(true);
  };

  const handleSubmitUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name.trim()) {
      toast.error("Unit name is required");
      return;
    }
    try {
      if (editUnit) {
        await updateUnit.mutateAsync({ id: editUnit._id, ...unitForm });
        toast.success("Unit updated");
      } else {
        await createUnit.mutateAsync(unitForm);
        toast.success("Unit created");
      }
      setShowUnitModal(false);
      resetUnitForm();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const handleSubmitYield = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBaseUnitQty = parseFloat(yieldForm.baseUnitQty);
    const payload: Record<string, any> = {
      inventoryItemId: yieldForm.inventoryItemId,
      fromUnitId: yieldForm.fromUnitId,
      fromQty: parseFloat(yieldForm.fromQty) || 1,
      toUnitId: yieldForm.toUnitId,
      toQty: parseFloat(yieldForm.toQty) || 0,
      notes: yieldForm.notes.trim() || undefined,
    };
    payload.baseUnitQty = parsedBaseUnitQty;
    if (
      !payload.inventoryItemId ||
      !payload.fromUnitId ||
      !payload.toUnitId ||
      !Number.isFinite(payload.baseUnitQty) ||
      payload.baseUnitQty <= 0 ||
      payload.toQty <= 0
    ) {
      toast.error("Fill all required fields");
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
      setShowYieldModal(false);
      resetYieldForm();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const handleDeleteUnit = async () => {
    if (!deleteUnit) return;
    try {
      await removeUnit.mutateAsync(deleteUnit);
      toast.success("Unit deleted");
      setDeleteUnit(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const handleDeleteYield = async () => {
    if (!deleteYield) return;
    try {
      await removeYield.mutateAsync(deleteYield);
      toast.success("Yield mapping deleted");
      setDeleteYield(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const unitColumns = [
    {
      key: "name",
      header: "Unit Name",
      render: (row: any) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      key: "abbreviation",
      header: "Abbreviation",
      render: (row: any) => row.abbreviation || "—",
    },
    {
      key: "type",
      header: "Type",
      render: (row: any) => (
        <Badge variant={TYPE_BADGE[row.type] ?? "default"}>
          {UNIT_TYPE_OPTIONS.find((o) => o.value === row.type)?.label ??
            row.type}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (row: any) => (
        <Badge variant={row.isActive !== false ? "success" : "default"}>
          {row.isActive !== false ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditUnit(row)}
            aria-label="Edit"
            className="rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <FiEdit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteUnit(row._id)}
            aria-label="Delete"
            className="text-red-600 hover:bg-red-50 rounded-lg"
          >
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
      render: (row: any) => (
        <span className="font-medium text-slate-900">
          {typeof row.inventoryItemId === "object"
            ? row.inventoryItemId?.name
            : "—"}
        </span>
      ),
    },
    {
      key: "mapping",
      header: "Yield Mapping",
      render: (row: any) => {
        const fromName =
          typeof row.fromUnitId === "object"
            ? row.fromUnitId?.name
            : "—";
        const toName =
          typeof row.toUnitId === "object" ? row.toUnitId?.name : "—";
        const invItem = inventoryItems.find(
          (i: any) =>
            i._id ===
            (typeof row.inventoryItemId === "object"
              ? row.inventoryItemId?._id
              : row.inventoryItemId)
        );
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-[#5a189a]">
                {row.fromQty} {fromName}
              </span>
              {row.baseUnitQty != null && (
                <span className="text-xs text-slate-400">
                  ({row.baseUnitQty} {invItem?.unit ?? "base"})
                </span>
              )}
              <FiArrowRight className="h-4 w-4 text-slate-400" />
              <span className="font-semibold text-[#ff6d00]">
                {row.toQty} {toName}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "notes",
      header: "Notes",
      render: (row: any) => row.notes || "—",
    },
    {
      key: "actions",
      header: "",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditYield(row)}
            aria-label="Edit"
            className="rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <FiEdit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteYield(row._id)}
            aria-label="Delete"
            className="text-red-600 hover:bg-red-50 rounded-lg"
          >
            <FiTrash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      {/* Hero */}
      <div className="relative bg-white border-b border-slate-100">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[min(80vw,420px)] h-[min(80vw,420px)] bg-linear-to-br from-[#ff9100]/10 to-[#ff6d00]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#5a189a]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/25">
                  <Tags className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Units & Yields
                  </h1>
                  <p className="text-sm font-medium text-[#5a189a] mt-0.5">
                    Restaurant Department
                  </p>
                </div>
              </div>
              <p className="text-slate-500 text-sm sm:text-base max-w-xl">
                Define purchase & kitchen units dynamically, then map how many
                yield units each purchase unit produces.
              </p>
            </div>
            <div className="shrink-0">
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
                className="h-12 px-6 rounded-xl font-semibold text-white border-0 shadow-lg shadow-[#ff6d00]/25 bg-linear-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-offset-2 focus:ring-[#ff6d00] transition-all hover:-translate-y-0.5"
              >
                <FiPlus className="h-5 w-5 mr-2" aria-hidden />
                {activeTab === "units" ? "Add Unit" : "Add Yield Mapping"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Units
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {units.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff6d00]/10 text-[#ff6d00]">
                <FiArrowRight className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Yield Mappings
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {yields.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <FiBox className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Inventory Items
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {inventoryItems.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          {(
            [
              { id: "units", label: "Units" },
              { id: "yields", label: "Yield Mappings" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={
                "px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px " +
                (activeTab === tab.id
                  ? "border-[#ff6d00] text-[#ff6d00]"
                  : "border-transparent text-slate-500 hover:text-slate-700")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table card */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          {activeTab === "units" && (
            <>
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                      <FiFilter className="h-4 w-4 text-[#5a189a]" />
                    </div>
                    <span>Filter by type</span>
                  </div>
                  <div className="min-w-[200px]">
                    <AppReactSelect
                      value={typeFilter}
                      onChange={(v) => setTypeFilter(v)}
                      options={[
                        { value: "", label: "All Types" },
                        ...UNIT_TYPE_OPTIONS,
                      ]}
                      placeholder="Type"
                      isClearable
                    />
                  </div>
                </div>
              </div>
              <div className="p-0 sm:p-2 min-h-[300px]">
                <DataTable
                  columns={unitColumns}
                  data={units}
                  getRowKey={(row) => row._id}
                  loading={unitsLoading}
                  emptyTitle="No units yet"
                  emptyDescription='Add your first unit (e.g. "small bag", "plate", "ladle") to get started.'
                />
              </div>
            </>
          )}

          {activeTab === "yields" && (
            <>
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                      <FiFilter className="h-4 w-4 text-[#5a189a]" />
                    </div>
                    <span>Filter by item</span>
                  </div>
                  <div className="min-w-[250px]">
                    <AppReactSelect
                      value={itemFilter}
                      onChange={(v) => setItemFilter(v)}
                      options={inventoryOptions}
                      placeholder="Inventory item"
                      isClearable
                    />
                  </div>
                </div>
              </div>
              <div className="p-0 sm:p-2 min-h-[300px]">
                <DataTable
                  columns={yieldColumns}
                  data={yields}
                  getRowKey={(row) => row._id}
                  loading={yieldsLoading}
                  emptyTitle="No yield mappings yet"
                  emptyDescription='Map how many servings each purchase unit produces (e.g. "1 small bag rice → 20 plates").'
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Unit modal ─── */}
      <Modal
        open={showUnitModal}
        onClose={() => {
          setShowUnitModal(false);
          resetUnitForm();
        }}
        title={editUnit ? "Edit Unit" : "Add Unit"}
        size="lg"
      >
        <form onSubmit={handleSubmitUnit} className="space-y-5">
          <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3">
            Define a unit your restaurant uses. For example: <strong>small bag</strong>, <strong>plate</strong>, <strong>scoop</strong>, <strong>ladle</strong>, <strong>cup</strong>, <strong>piece</strong>.
          </p>
          <Input
            label="Unit Name"
            value={unitForm.name}
            onChange={(e) =>
              setUnitForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder='e.g. "small bag", "plate", "scoop"'
            required
            className="rounded-xl border-slate-200 focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
          />
          <Input
            label="Abbreviation (optional)"
            value={unitForm.abbreviation}
            onChange={(e) =>
              setUnitForm((f) => ({ ...f, abbreviation: e.target.value }))
            }
            placeholder='e.g. "bag", "plt", "scp"'
            className="rounded-xl border-slate-200 focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
          />
          <AppReactSelect
            label="Unit Type"
            value={unitForm.type}
            onChange={(v) => setUnitForm((f) => ({ ...f, type: v }))}
            options={UNIT_TYPE_OPTIONS}
            placeholder="Select type..."
          />
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowUnitModal(false);
                resetUnitForm();
              }}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createUnit.isPending || updateUnit.isPending}
              className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-linear-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
            >
              {editUnit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Yield mapping modal ─── */}
      <Modal
        open={showYieldModal}
        onClose={() => {
          setShowYieldModal(false);
          resetYieldForm();
        }}
        title={editYield ? "Edit Yield Mapping" : "Add Yield Mapping"}
        size="lg"
      >
        <form onSubmit={handleSubmitYield} className="space-y-5">
          <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3">
            Define how many <strong>yield units</strong> one <strong>purchase unit</strong> produces. For example: <em>1 small bag of rice → 20 plates</em>.
          </p>
          <AppReactSelect
            label="Inventory Item"
            value={yieldForm.inventoryItemId}
            onChange={(v) =>
              setYieldForm((f) => ({ ...f, inventoryItemId: v }))
            }
            options={[
              { value: "", label: "Select item..." },
              ...inventoryItems.map((i: any) => ({
                value: i._id,
                label: i.name,
              })),
            ]}
            placeholder="Select inventory item..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From Quantity"
              type="number"
              min="0.01"
              step="any"
              value={yieldForm.fromQty}
              onChange={(e) =>
                setYieldForm((f) => ({ ...f, fromQty: e.target.value }))
              }
              placeholder="1"
              className="rounded-xl border-slate-200"
            />
            <AppReactSelect
              label="Purchase Unit (from)"
              value={yieldForm.fromUnitId}
              onChange={(v) =>
                setYieldForm((f) => ({ ...f, fromUnitId: v }))
              }
              options={[
                { value: "", label: "Select unit..." },
                ...purchaseUnitOptions,
              ]}
              placeholder="e.g. small bag"
            />
          </div>

          {(() => {
            const selItem = inventoryItems.find(
              (i: any) => i._id === yieldForm.inventoryItemId
            );
            const baseUnit = selItem?.unit ?? "base unit";
            const fromLabel = purchaseUnitOptions.find(
              (o) => o.value === yieldForm.fromUnitId
            )?.label ?? "purchase unit";
            return (
              <Input
                label={`Base unit equivalent — how many ${baseUnit} in ${yieldForm.fromQty || 1} ${fromLabel}?`}
                type="number"
                min="0.01"
                step="any"
                value={yieldForm.baseUnitQty}
                onChange={(e) =>
                  setYieldForm((f) => ({ ...f, baseUnitQty: e.target.value }))
                }
                placeholder={`e.g. 25 (meaning ${yieldForm.fromQty || 1} ${fromLabel} = 25 ${baseUnit})`}
                required
                className="rounded-xl border-slate-200"
              />
            );
          })()}

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <span>produces</span>
              <FiArrowRight className="h-4 w-4" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="To Quantity (yield)"
              type="number"
              min="0.01"
              step="any"
              value={yieldForm.toQty}
              onChange={(e) =>
                setYieldForm((f) => ({ ...f, toQty: e.target.value }))
              }
              placeholder="e.g. 20"
              required
              className="rounded-xl border-slate-200"
            />
            <AppReactSelect
              label="Yield Unit (to)"
              value={yieldForm.toUnitId}
              onChange={(v) =>
                setYieldForm((f) => ({ ...f, toUnitId: v }))
              }
              options={[
                { value: "", label: "Select unit..." },
                ...yieldUnitOptions,
              ]}
              placeholder="e.g. plate"
            />
          </div>

          {yieldForm.fromQty &&
            yieldForm.toQty &&
            parseFloat(yieldForm.toQty) > 0 && (
              <div className="rounded-xl bg-[#5a189a]/5 border border-[#5a189a]/10 p-4 text-center space-y-1">
                <p className="text-sm text-[#5a189a] font-semibold">
                  {yieldForm.fromQty}{" "}
                  {purchaseUnitOptions.find(
                    (o) => o.value === yieldForm.fromUnitId
                  )?.label ?? "purchase unit"}
                  {yieldForm.baseUnitQty && (
                    <span className="text-slate-500 font-normal">
                      {" "}({yieldForm.baseUnitQty}{" "}
                      {inventoryItems.find(
                        (i: any) => i._id === yieldForm.inventoryItemId
                      )?.unit ?? "base units"})
                    </span>
                  )}
                  {" → "}
                  <span className="text-[#ff6d00]">{yieldForm.toQty}</span>{" "}
                  {yieldUnitOptions.find(
                    (o) => o.value === yieldForm.toUnitId
                  )?.label ?? "yield units"}
                </p>
                {yieldForm.baseUnitQty && parseFloat(yieldForm.baseUnitQty) > 0 && (
                  <p className="text-xs text-slate-500">
                    1 yield unit = {(parseFloat(yieldForm.baseUnitQty) / parseFloat(yieldForm.toQty)).toFixed(4)}{" "}
                    {inventoryItems.find(
                      (i: any) => i._id === yieldForm.inventoryItemId
                    )?.unit ?? "base units"}
                  </p>
                )}
              </div>
            )}

          <Input
            label="Notes (optional)"
            value={yieldForm.notes}
            onChange={(e) =>
              setYieldForm((f) => ({ ...f, notes: e.target.value }))
            }
            placeholder="Any extra details..."
            className="rounded-xl border-slate-200"
          />

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowYieldModal(false);
                resetYieldForm();
              }}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createYield.isPending || updateYieldMut.isPending}
              className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-linear-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
            >
              {editYield ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete unit confirm ─── */}
      <Modal
        open={!!deleteUnit}
        onClose={() => setDeleteUnit(null)}
        title="Delete Unit"
      >
        <p className="text-slate-600 text-sm">
          Are you sure you want to delete this unit? Units used in yield
          mappings cannot be deleted.
        </p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setDeleteUnit(null)}
            className="rounded-xl border-slate-200"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteUnit}
            loading={removeUnit.isPending}
            className="rounded-xl"
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* ─── Delete yield confirm ─── */}
      <Modal
        open={!!deleteYield}
        onClose={() => setDeleteYield(null)}
        title="Delete Yield Mapping"
      >
        <p className="text-slate-600 text-sm">
          Are you sure you want to delete this yield mapping?
        </p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setDeleteYield(null)}
            className="rounded-xl border-slate-200"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteYield}
            loading={removeYield.isPending}
            className="rounded-xl"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
