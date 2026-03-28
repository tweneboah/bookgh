"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useStationTransfers,
  useCreateStationTransfer,
  useUpdateStationTransfer,
  useDeleteStationTransfer,
  useLocationStock,
  useMovementLedger,
  useKitchenUsage,
  useCreateKitchenUsage,
  useInventoryItems,
  useItemYields,
} from "@/hooks/api";
import { buildYieldMap, convertChefQtyToBaseQty } from "@/lib/unit-conversion";
import {
  AppDatePicker,
  AppReactSelect,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  Textarea,
} from "@/components/ui";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Package,
  ChefHat,
  Store,
  UtensilsCrossed,
  Plus,
  Trash2,
  Edit2,
  History,
  Layers,
} from "lucide-react";
import { STOCK_LOCATION, STATION_TRANSFER_STATUS } from "@/constants";

const LOCATION_LABELS: Record<string, string> = {
  [STOCK_LOCATION.MAIN_STORE]: "Main Store",
  [STOCK_LOCATION.KITCHEN]: "Kitchen",
  [STOCK_LOCATION.FRONT_HOUSE]: "Front House",
};

const LOCATION_OPTIONS = [
  { value: STOCK_LOCATION.MAIN_STORE, label: LOCATION_LABELS[STOCK_LOCATION.MAIN_STORE] },
  { value: STOCK_LOCATION.KITCHEN, label: LOCATION_LABELS[STOCK_LOCATION.KITCHEN] },
  { value: STOCK_LOCATION.FRONT_HOUSE, label: LOCATION_LABELS[STOCK_LOCATION.FRONT_HOUSE] },
];

const STATUS_LABELS: Record<string, string> = {
  [STATION_TRANSFER_STATUS.PENDING]: "Pending",
  [STATION_TRANSFER_STATUS.IN_PROGRESS]: "In progress",
  [STATION_TRANSFER_STATUS.COMPLETED]: "Completed",
  [STATION_TRANSFER_STATUS.CANCELLED]: "Cancelled",
};

const DEPARTMENT = "restaurant";

/** When chefUnitId is set, quantity is in chef units (e.g. bags); otherwise in base unit (kg, L). */
type TransferLine = {
  inventoryItemId: string;
  itemName: string;
  quantity: string;
  unit: string;
  chefUnitId?: string;
};
type KitchenUsageLine = {
  inventoryItemId: string;
  itemName: string;
  issuedQty: string;
  usedQty: string;
  leftoverQty: string;
  unit: string;
  chefUnitId?: string;
};

function toIdString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && v && "_id" in v) return String((v as any)._id);
  if (typeof v === "object" && v && "$oid" in v) return String((v as any).$oid);
  return String(v);
}

export default function MovementFlowPage() {
  const searchParams = useSearchParams();
  const showDebug = searchParams.get("debug") === "1";
  if (typeof window !== "undefined") {
    console.log("[movement-flow] render");
  }
  const [activeTab, setActiveTab] = useState<"transfer" | "kitchen" | "transfers" | "ledger" | "stock">("transfer");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showKitchenModal, setShowKitchenModal] = useState(false);
  const [editTransfer, setEditTransfer] = useState<any>(null);
  const [deleteTransferId, setDeleteTransferId] = useState<string | null>(null);
  const [transferForm, setTransferForm] = useState({
    fromLocation: STOCK_LOCATION.MAIN_STORE,
    toLocation: STOCK_LOCATION.KITCHEN,
    transferDate: new Date().toISOString().slice(0, 19).replace("T", "T"),
    lines: [
      {
        inventoryItemId: "",
        itemName: "",
        quantity: "1",
        unit: "kg",
        chefUnitId: "",
      },
    ] as TransferLine[],
    notes: "",
  });
  const [kitchenForm, setKitchenForm] = useState({
    usageDate: new Date().toISOString().slice(0, 19).replace("T", "T"),
    lines: [
      {
        inventoryItemId: "",
        itemName: "",
        issuedQty: "0",
        usedQty: "0",
        leftoverQty: "0",
        unit: "kg",
        chefUnitId: "",
      },
    ] as KitchenUsageLine[],
    notes: "",
  });
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerStart, setLedgerStart] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [ledgerEnd, setLedgerEnd] = useState<Date | null>(new Date());

  const params = useMemo(
    () => ({ page: "1", limit: "50", department: DEPARTMENT }),
    []
  );
  const ledgerParams = useMemo(
    () => ({
      page: String(ledgerPage),
      limit: "20",
      department: DEPARTMENT,
      ...(ledgerStart ? { startDate: ledgerStart.toISOString() } : {}),
      ...(ledgerEnd ? { endDate: ledgerEnd.toISOString() } : {}),
    }),
    [ledgerPage, ledgerStart, ledgerEnd]
  );

  const { data: transfersData, isLoading: transfersLoading } = useStationTransfers(params);
  const { data: locationData } = useLocationStock({ department: DEPARTMENT });
  const { data: ledgerData, isLoading: ledgerLoading } = useMovementLedger(ledgerParams);
  const { data: kitchenData } = useKitchenUsage(params);
  const { data: itemsData } = useInventoryItems({ limit: "500", department: DEPARTMENT });
  const { data: yieldsData } = useItemYields({ limit: "1000" });

  const createTransferMut = useCreateStationTransfer();
  const updateTransferMut = useUpdateStationTransfer();
  const deleteTransferMut = useDeleteStationTransfer();
  const createKitchenMut = useCreateKitchenUsage();

  const transfers = transfersData?.data ?? [];
  const ledgerRows = ledgerData?.data ?? [];
  const ledgerPagination = ledgerData?.meta?.pagination;
  const kitchenUsages = kitchenData?.data ?? [];
  const inventoryItems = (itemsData?.data ?? []) as any[];
  const yieldMappings = Array.isArray(yieldsData) ? yieldsData : (yieldsData as any)?.data ?? [];

  const itemOptions = useMemo(
    () =>
      inventoryItems.map((i: any) => ({
        value: i._id,
        label: `${i.name} (${i.unit})`,
        unit: i.unit,
      })),
    [inventoryItems]
  );

  const yieldMap = useMemo(() => buildYieldMap(yieldMappings), [yieldMappings]);

  const yieldByItem = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const y of yieldMappings) {
      const itemId = toIdString((y as any).inventoryItemId);
      if (!itemId) continue;
      if (!m.has(itemId)) m.set(itemId, []);
      m.get(itemId)!.push(y);
    }
    return m;
  }, [yieldMappings]);

  const formatChefUnitName = (unitObj: any, qty: number) => {
    const raw = String(unitObj?.name ?? unitObj?.abbreviation ?? "unit").trim();
    if (!raw) return "unit";
    if (qty === 1) return raw;
    if (raw.endsWith("s")) return raw;
    return `${raw}s`;
  };

  const getChefUnitOptionsForItem = (inventoryItemId: string) => {
    const item = inventoryItems.find((i: any) => String(i._id) === inventoryItemId);
    const baseUnit = item?.unit ?? "unit";
    const options: { value: string; label: string }[] = [
      { value: "base", label: `${baseUnit} (base)` },
    ];
    const yields = yieldByItem.get(inventoryItemId) ?? [];
    for (const y of yields) {
      const toUnit = (y as any).toUnitId;
      const id = typeof toUnit === "object" ? toUnit?._id : toUnit;
      const name = typeof toUnit === "object" ? toUnit?.name ?? "" : "";
      if (id && name) options.push({ value: String(id), label: name });
    }
    return options;
  };

  const formatQtyWithChef = (inventoryItemId: string, baseQty: number, baseUnit: string) => {
    if (baseQty <= 0) return `0 ${baseUnit}`;
    const id = toIdString(inventoryItemId);
    const yields = yieldByItem.get(id) ?? [];
    if (!yields.length) return `${baseQty} ${baseUnit}`;
    const y = yields[0];
    const fromQty = Number((y as any).fromQty ?? 0);
    const toQty = Number((y as any).toQty ?? 0);
    const baseUnitQty = Number((y as any).baseUnitQty ?? 0);
    if (fromQty <= 0 || toQty <= 0 || baseUnitQty <= 0) return `${baseQty} ${baseUnit}`;
    const toUnit = (y as any).toUnitId;
    const chefName = formatChefUnitName(toUnit, 1);
    const chefQty = (baseQty / baseUnitQty) * toQty;
    return `${baseQty} ${baseUnit} (${chefQty.toFixed(1)} ${chefName})`;
  };

  /** Plain‑English conversion formula e.g. "1 cup = 2.5 g" or null if no yield. */
  const getChefFormulaText = (inventoryItemId: string, baseUnit: string): string | null => {
    const id = toIdString(inventoryItemId);
    const yields = yieldByItem.get(id) ?? [];
    if (!yields.length) return null;
    const y = yields[0];
    const fromQty = Number((y as any).fromQty ?? 0);
    const baseUnitQty = Number((y as any).baseUnitQty ?? 0);
    const toUnit = (y as any).toUnitId;
    const chefName = formatChefUnitName(toUnit, fromQty);
    if (fromQty <= 0 || baseUnitQty <= 0) return null;
    return `${fromQty} ${chefName} = ${baseUnitQty} ${baseUnit}`;
  };

  const mainStore = (locationData?.data as any)?.mainStore ?? [];
  const kitchenStock = (locationData?.data as any)?.kitchen ?? [];
  const frontHouseStock = (locationData?.data as any)?.frontHouse ?? [];

  useEffect(() => {
    if (typeof window === "undefined") return;
    console.log("[movement-flow] yieldMappings count:", yieldMappings.length);
    console.log("[movement-flow] yieldByItem keys:", Array.from(yieldByItem.keys()));
    if (yieldMappings.length > 0) {
      const sample = yieldMappings[0] as any;
      console.log("[movement-flow] sample yield:", {
        inventoryItemId: sample?.inventoryItemId,
        inventoryItemIdStr: String(sample?.inventoryItemId?._id ?? sample?.inventoryItemId),
        baseUnitQty: sample?.baseUnitQty,
        fromQty: sample?.fromQty,
        toQty: sample?.toQty,
      });
    }
  }, [yieldMappings, yieldByItem]);

  useEffect(() => {
    if (typeof window === "undefined" || !transfers.length) return;
    const row = transfers[0] as any;
    const line = row?.lines?.[0];
    if (line) {
      const itemId = String(line.inventoryItemId?._id ?? line.inventoryItemId ?? "");
      console.log("[movement-flow] sample transfer line:", {
        transferNumber: row?.transferNumber,
        itemName: line?.itemName,
        rawInventoryItemId: line?.inventoryItemId,
        itemId,
        quantity: line?.quantity,
        unit: line?.unit,
        yieldExists: yieldByItem.has(itemId),
      });
    }
  }, [transfers, yieldByItem]);

  const getAvailableAtLocation = (inventoryItemId: string, location: string) => {
    const id = String(inventoryItemId);
    const list =
      location === STOCK_LOCATION.MAIN_STORE
        ? mainStore
        : location === STOCK_LOCATION.KITCHEN
          ? kitchenStock
          : frontHouseStock;
    const row = (list as any[]).find(
      (s: any) => String(s.inventoryItemId?._id ?? s.inventoryItemId) === id
    );
    if (!row) return { quantity: 0, unit: "unit" };
    return {
      quantity: Number(row.quantity ?? 0),
      unit: row.unit ?? "unit",
    };
  };

  const getLineRequestedBaseQty = (line: TransferLine): number | null => {
    if (!line.inventoryItemId || Number(line.quantity) <= 0) return null;
    const item = inventoryItems.find((i: any) => String(i._id) === line.inventoryItemId) as any;
    if (!item) return Number(line.quantity) || 0;
    if (line.chefUnitId && line.chefUnitId !== "base") {
      const converted = convertChefQtyToBaseQty({
        inventoryItemId: line.inventoryItemId,
        chefQty: Number(line.quantity) || 0,
        chefUnitIdOrName: line.chefUnitId,
        item: { unit: item.unit, unitConversions: item.unitConversions },
        yieldMap,
      });
      return converted ?? null;
    }
    return Number(line.quantity) || 0;
  };

  const resetTransferForm = () => {
    setTransferForm({
      fromLocation: STOCK_LOCATION.MAIN_STORE,
      toLocation: STOCK_LOCATION.KITCHEN,
      transferDate: new Date().toISOString().slice(0, 19).replace("T", "T"),
      lines: [
        { inventoryItemId: "", itemName: "", quantity: "1", unit: "kg", chefUnitId: "" },
      ],
      notes: "",
    });
    setEditTransfer(null);
  };

  const openCreateTransfer = () => {
    resetTransferForm();
    setShowTransferModal(true);
  };

  const openEditTransfer = (row: any) => {
    setEditTransfer(row);
    setTransferForm({
      fromLocation: row.fromLocation ?? STOCK_LOCATION.MAIN_STORE,
      toLocation: row.toLocation ?? STOCK_LOCATION.KITCHEN,
      transferDate: row.transferDate
        ? new Date(row.transferDate).toISOString().slice(0, 19).replace("T", "T")
        : new Date().toISOString().slice(0, 19).replace("T", "T"),
      lines:
        row.lines?.map((l: any) => ({
          inventoryItemId: l.inventoryItemId?._id ?? l.inventoryItemId ?? "",
          itemName: l.itemName ?? "",
          quantity: String(l.quantity ?? 1),
          unit: l.unit ?? "kg",
          chefUnitId: "",
        })) ?? [
          { inventoryItemId: "", itemName: "", quantity: "1", unit: "kg", chefUnitId: "" },
        ],
      notes: row.notes ?? "",
    });
    setShowTransferModal(true);
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.fromLocation === transferForm.toLocation) {
      toast.error("From and to locations must differ");
      return;
    }
    const lines: { inventoryItemId: string; itemName: string; quantity: number; unit: string }[] = [];
    for (const l of transferForm.lines) {
      if (!l.inventoryItemId || Number(l.quantity) <= 0) continue;
      const opt = itemOptions.find((o: any) => o.value === l.inventoryItemId);
      const item = inventoryItems.find((i: any) => String(i._id) === l.inventoryItemId) as any;
      const baseUnit = opt?.unit ?? item?.unit ?? l.unit ?? "unit";
      let baseQty: number;
      if (l.chefUnitId && l.chefUnitId !== "base" && item) {
        const converted = convertChefQtyToBaseQty({
          inventoryItemId: l.inventoryItemId,
          chefQty: Number(l.quantity) || 0,
          chefUnitIdOrName: l.chefUnitId,
          item: { unit: item.unit, unitConversions: item.unitConversions },
          yieldMap,
        });
        if (converted == null) {
          toast.error(`No chef-unit conversion for ${l.itemName || item?.name}. Add a yield in Units & Yields.`);
          return;
        }
        baseQty = converted;
      } else {
        baseQty = Number(l.quantity) || 1;
      }
      lines.push({
        inventoryItemId: l.inventoryItemId,
        itemName: opt?.label?.split(" (")[0] ?? l.itemName ?? "Item",
        quantity: baseQty,
        unit: baseUnit,
      });
    }
    if (lines.length === 0) {
      toast.error("Add at least one line with quantity > 0");
      return;
    }

    for (const line of lines) {
      const available = getAvailableAtLocation(line.inventoryItemId, transferForm.fromLocation);
      if (line.quantity > available.quantity) {
        toast.error(
          `Insufficient stock for ${line.itemName}. Available at ${LOCATION_LABELS[transferForm.fromLocation] ?? transferForm.fromLocation}: ${available.quantity} ${available.unit}. You requested ${line.quantity} ${line.unit}.`
        );
        return;
      }
    }

    const payload = {
      department: DEPARTMENT,
      fromLocation: transferForm.fromLocation,
      toLocation: transferForm.toLocation,
      transferDate: `${transferForm.transferDate}Z`,
      lines,
      notes: transferForm.notes || undefined,
    };
    try {
      if (editTransfer) {
        await updateTransferMut.mutateAsync({
          id: editTransfer._id,
          department: DEPARTMENT,
          ...payload,
          ...(editTransfer.status === STATION_TRANSFER_STATUS.PENDING
            ? {}
            : { status: editTransfer.status }),
        });
        toast.success("Transfer updated");
      } else {
        await createTransferMut.mutateAsync(payload);
        toast.success("Transfer created");
      }
      setShowTransferModal(false);
      resetTransferForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleCompleteTransfer = async (row: any) => {
    try {
      await updateTransferMut.mutateAsync({
        id: row._id,
        department: DEPARTMENT,
        status: STATION_TRANSFER_STATUS.COMPLETED,
      });
      toast.success("Transfer completed");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleDeleteTransfer = async () => {
    if (!deleteTransferId) return;
    try {
      await deleteTransferMut.mutateAsync({ id: deleteTransferId, department: DEPARTMENT });
      toast.success("Transfer deleted");
      setDeleteTransferId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const addTransferLine = () => {
    setTransferForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        { inventoryItemId: "", itemName: "", quantity: "1", unit: "kg", chefUnitId: "" },
      ],
    }));
  };

  const removeTransferLine = (idx: number) => {
    setTransferForm((f) => ({
      ...f,
      lines: f.lines.filter((_, i) => i !== idx),
    }));
  };

  const updateTransferLine = (idx: number, field: keyof TransferLine, value: string) => {
    setTransferForm((f) => {
      const next = [...f.lines];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "inventoryItemId") {
        const opt = itemOptions.find((o: any) => o.value === value);
        next[idx].itemName = opt?.label?.split(" (")[0] ?? "";
        next[idx].unit = opt?.unit ?? "kg";
        next[idx].chefUnitId = "";
      }
      return { ...f, lines: next };
    });
  };

  const setTransferLineUnit = (idx: number, unitValue: string) => {
    setTransferForm((f) => {
      const next = [...f.lines];
      const line = next[idx];
      if (unitValue === "base") {
        const item = inventoryItems.find((i: any) => String(i._id) === line.inventoryItemId);
        next[idx] = { ...line, chefUnitId: "", unit: item?.unit ?? "kg" };
      } else {
        const opts = getChefUnitOptionsForItem(line.inventoryItemId);
        const opt = opts.find((o) => o.value === unitValue);
        next[idx] = { ...line, chefUnitId: unitValue, unit: opt?.label ?? unitValue };
      }
      return { ...f, lines: next };
    });
  };

  const resetKitchenForm = () => {
    setKitchenForm({
      usageDate: new Date().toISOString().slice(0, 19).replace("T", "T"),
      lines: [
        {
          inventoryItemId: "",
          itemName: "",
          issuedQty: "0",
          usedQty: "0",
          leftoverQty: "0",
          unit: "kg",
          chefUnitId: "",
        },
      ],
      notes: "",
    });
  };

  const openKitchenModal = () => {
    resetKitchenForm();
    setShowKitchenModal(true);
  };

  const addKitchenLine = () => {
    setKitchenForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        {
          inventoryItemId: "",
          itemName: "",
          issuedQty: "0",
          usedQty: "0",
          leftoverQty: "0",
          unit: "kg",
          chefUnitId: "",
        },
      ],
    }));
  };

  const removeKitchenLine = (idx: number) => {
    setKitchenForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  };

  const updateKitchenLine = (idx: number, field: keyof KitchenUsageLine, value: string) => {
    setKitchenForm((f) => {
      const next = [...f.lines];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "inventoryItemId") {
        const opt = itemOptions.find((o: any) => o.value === value);
        next[idx].itemName = opt?.label?.split(" (")[0] ?? "";
        next[idx].unit = opt?.unit ?? "kg";
        next[idx].chefUnitId = "";
      }
      return { ...f, lines: next };
    });
  };

  const setKitchenLineUnit = (idx: number, unitValue: string) => {
    setKitchenForm((f) => {
      const next = [...f.lines];
      const line = next[idx];
      if (unitValue === "base") {
        const item = inventoryItems.find((i: any) => String(i._id) === line.inventoryItemId);
        next[idx] = { ...line, chefUnitId: "", unit: item?.unit ?? "kg" };
      } else {
        const opts = getChefUnitOptionsForItem(line.inventoryItemId);
        const opt = opts.find((o) => o.value === unitValue);
        next[idx] = { ...line, chefUnitId: unitValue, unit: opt?.label ?? unitValue };
      }
      return { ...f, lines: next };
    });
  };

  const handleSubmitKitchen = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidLine = kitchenForm.lines.find((l) => {
      const issued = Number(l.issuedQty || 0);
      const used = Number(l.usedQty || 0);
      const leftover = Number(l.leftoverQty || 0);
      return l.inventoryItemId && issued > 0 && used + leftover > issued;
    });
    if (invalidLine) {
      toast.error(
        `${invalidLine.itemName}: Used + Leftover cannot exceed In kitchen. Please reduce quantities.`
      );
      return;
    }
    const lines: {
      inventoryItemId: string;
      itemName: string;
      issuedQty: number;
      usedQty: number;
      leftoverQty: number;
      unit: string;
    }[] = [];
    for (const l of kitchenForm.lines) {
      if (
        !l.inventoryItemId ||
        (Number(l.usedQty) <= 0 && Number(l.leftoverQty) <= 0) ||
        Number(l.issuedQty) < Number(l.usedQty) + Number(l.leftoverQty)
      )
        continue;
      const item = inventoryItems.find((i: any) => String(i._id) === l.inventoryItemId) as any;
      const baseUnit = item?.unit ?? l.unit ?? "unit";
      let issuedQty: number;
      let usedQty: number;
      let leftoverQty: number;
      if (l.chefUnitId && l.chefUnitId !== "base" && item) {
        const toBase = (qty: number) =>
          convertChefQtyToBaseQty({
            inventoryItemId: l.inventoryItemId,
            chefQty: qty,
            chefUnitIdOrName: l.chefUnitId!,
            item: { unit: item.unit, unitConversions: item.unitConversions },
            yieldMap,
          });
        const issuedBase = toBase(Number(l.issuedQty) || 0);
        const usedBase = toBase(Number(l.usedQty) || 0);
        const leftoverBase = toBase(Number(l.leftoverQty) || 0);
        if (issuedBase == null || usedBase == null || leftoverBase == null) {
          toast.error(
            `No chef-unit conversion for ${l.itemName || item?.name}. Add a yield in Restaurant → Units.`
          );
          return;
        }
        issuedQty = issuedBase;
        usedQty = usedBase;
        leftoverQty = leftoverBase;
      } else {
        issuedQty = Number(l.issuedQty) || 0;
        usedQty = Number(l.usedQty) || 0;
        leftoverQty = Number(l.leftoverQty) || 0;
      }
      lines.push({
        inventoryItemId: l.inventoryItemId,
        itemName: l.itemName,
        issuedQty,
        usedQty,
        leftoverQty,
        unit: baseUnit,
      });
    }
    if (lines.length === 0) {
      toast.error("Add at least one line with used/leftover and issued >= used + leftover");
      return;
    }
    try {
      await createKitchenMut.mutateAsync({
        department: DEPARTMENT,
        usageDate: `${kitchenForm.usageDate}Z`,
        lines,
        notes: kitchenForm.notes || undefined,
      });
      toast.success("Kitchen usage recorded");
      setShowKitchenModal(false);
      resetKitchenForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const tabs = [
    { id: "transfer" as const, label: "Record Transfer", icon: ArrowRight },
    { id: "kitchen" as const, label: "Kitchen Usage", icon: ChefHat },
    { id: "transfers" as const, label: "Transfers", icon: Package },
    { id: "ledger" as const, label: "Movement Ledger", icon: History },
    { id: "stock" as const, label: "Stock by Location", icon: Layers },
  ];

  const debugInfo = useMemo(() => {
    const first = (transfers as any[])[0];
    const line = first?.lines?.[0];
    const itemId = line ? toIdString(line.inventoryItemId) : "";
    return {
      yieldMappingsCount: yieldMappings.length,
      yieldByItemKeys: Array.from(yieldByItem.keys()),
      sampleYield: yieldMappings[0] as any,
      firstTransfer: first?.transferNumber,
      firstLine: line
        ? {
            itemName: line.itemName,
            rawInventoryItemId: line.inventoryItemId,
            itemId,
            quantity: line.quantity,
            unit: line.unit,
            yieldExists: yieldByItem.has(itemId),
          }
        : null,
    };
  }, [yieldMappings, yieldByItem, transfers]);

  const ledgerPreview = (ledgerRows as any[]).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f8f6f6] font-sans text-slate-900">
      <div
        className="h-1 w-full shrink-0 rounded-b-sm"
        style={{
          background: "linear-gradient(90deg, #ff6d00 0%, #ff9100 50%, #7b2cbf 100%)",
        }}
      />
      {showDebug && (
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 font-mono text-xs">
            <p className="mb-2 font-bold text-amber-800">[movement-flow] Debug (?debug=1)</p>
            <pre className="whitespace-pre-wrap break-all text-amber-900">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Branding header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ec5b13] text-white shadow-lg shadow-[#ec5b13]/30">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl uppercase">
              Movement Flow
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ec5b13]">
              Inventory Intelligence
            </p>
          </div>
        </div>

        {/* Hero section */}
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Inventory Movement
            </h2>
            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              Track inventory from{" "}
              <span className="font-semibold text-[#ec5b13]">Main Store</span> →{" "}
              <span className="font-semibold text-[#ec5b13]">Kitchen</span> →{" "}
              <span className="font-semibold text-[#ec5b13]">Front House</span>. Record
              transfers, kitchen usage (used vs leftover), and view the movement ledger.
            </p>
          </div>
          <Button
            onClick={openCreateTransfer}
            className="inline-flex items-center gap-2 rounded-xl bg-[#ec5b13] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#ec5b13]/30 transition-all hover:bg-[#d44f10] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New transfer
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-8 overflow-x-auto border-b border-slate-200">
          <div className="flex gap-6 whitespace-nowrap">
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-b-4 border-[#ec5b13] text-[#ec5b13]"
                      : "border-b-4 border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "transfer" && (
          <>
            {/* Visual flow representation */}
            <div className="relative mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="pointer-events-none absolute inset-y-0 left-1/3 hidden -translate-x-1/2 items-center justify-center text-[#ec5b13]/40 lg:flex">
                <ArrowRight className="h-10 w-10" />
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-2/3 hidden -translate-x-1/2 items-center justify-center text-[#ec5b13]/40 lg:flex">
                <ArrowRight className="h-10 w-10" />
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-[#ec5b13]/60">
                <div className="pointer-events-none absolute -right-6 -top-6 rounded-full bg-[#ec5b13]/5 p-10" />
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[#ec5b13]">
                  <Store className="h-7 w-7" />
                </div>
                <h3 className="mb-1 text-lg font-bold text-slate-900">Main Store</h3>
                <p className="text-sm text-slate-600">
                  Receives PO goods, issues bulk ingredients and supplies to the kitchen.
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  <span>Status: Stocked</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border-2 border-[#ec5b13] bg-white p-6 shadow-lg shadow-[#ec5b13]/10">
                <div className="pointer-events-none absolute -right-6 -top-6 rounded-full bg-[#ec5b13]/10 p-10" />
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ec5b13] text-white">
                  <ChefHat className="h-7 w-7" />
                </div>
                <h3 className="mb-1 text-lg font-bold text-slate-900">Kitchen</h3>
                <p className="text-sm text-slate-600">
                  Prep area, tracks used vs leftover. Converts raw stock into menu items.
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ec5b13]">
                  <span>Status: Processing</span>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#ec5b13]" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-[#ec5b13]/60">
                <div className="pointer-events-none absolute -right-6 -top-6 rounded-full bg-[#ec5b13]/5 p-10" />
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[#ec5b13]">
                  <UtensilsCrossed className="h-7 w-7" />
                </div>
                <h3 className="mb-1 text-lg font-bold text-slate-900">Front House</h3>
                <p className="text-sm text-slate-600">
                  Serving area, receives finished products from kitchen or beverages from store.
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  <span>Status: Serving</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>

            {/* Record transfer quick section */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Transfer</h3>
                  <p className="text-xs text-slate-500">
                    Move stock between Main Store, Kitchen, and Front House.
                  </p>
                </div>
              </div>
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      From Location
                    </label>
                    <AppReactSelect
                      value={LOCATION_OPTIONS.find(
                        (o) => o.value === transferForm.fromLocation
                      )}
                      onChange={(option: any) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          fromLocation: option?.value ?? prev.fromLocation,
                        }))
                      }
                      options={LOCATION_OPTIONS}
                      placeholder="Select location"
                    />
                  </div>
                  <div className="hidden items-center justify-center pb-2 text-[#ec5b13] md:flex lg:hidden">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      To Location
                    </label>
                    <AppReactSelect
                      value={LOCATION_OPTIONS.find(
                        (o) => o.value === transferForm.toLocation
                      )}
                      onChange={(option: any) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          toLocation: option?.value ?? prev.toLocation,
                        }))
                      }
                      options={LOCATION_OPTIONS}
                      placeholder="Select location"
                    />
                  </div>
                  <div className="flex items-stretch">
                    <Button
                      onClick={openCreateTransfer}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ec5b13] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#ec5b13]/30 transition-all hover:bg-[#d44f10] active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      Proceed to items
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent ledger preview */}
            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between px-1">
                <h3 className="text-base font-bold text-slate-900">Recent Ledger Movements</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("ledger")}
                  className="text-xs font-semibold text-[#ec5b13] hover:underline"
                >
                  View all records
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {ledgerLoading ? (
                  <div className="h-32 animate-pulse bg-slate-100" />
                ) : ledgerPreview.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No recent movements recorded.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            Timestamp
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            Item
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            From
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            To
                          </th>
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                            Qty
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerPreview.map((r: any) => {
                          let itemId = toIdString(r.inventoryItemId);
                          if (!itemId && (r.inventoryItemId?.name ?? r.itemName)) {
                            const match = inventoryItems.find(
                              (i: any) =>
                                String(i.name).toLowerCase() ===
                                String(r.inventoryItemId?.name ?? r.itemName).toLowerCase()
                            );
                            if (match) itemId = String(match._id);
                          }
                          const qtyText = formatQtyWithChef(
                            itemId,
                            Number(r.quantity ?? 0),
                            r.unit ?? ""
                          );
                          return (
                            <tr key={r._id}>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {new Date(r.createdAt).toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                {r.inventoryItemId?.name ?? r.itemName ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                  {LOCATION_LABELS[r.fromLocation] ?? r.fromLocation}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="rounded-md bg-[#ec5b13]/10 px-2 py-1 text-xs text-[#ec5b13]">
                                  {LOCATION_LABELS[r.toLocation] ?? r.toLocation}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-bold">{qtyText}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "kitchen" && (
          <Card className="overflow-hidden rounded-2xl border-[#e5e7eb] bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#1f2937]">Record kitchen usage</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Of items issued to kitchen: how much was used in prep vs leftover (returned).
                  </p>
                </div>
                <Button
                  onClick={openKitchenModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-[#ff7900] hover:to-[#ff9100] hover:shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  Record usage
                </Button>
              </div>
              {kitchenUsages.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-medium text-[#374151]">Recent kitchen usage</h3>
                  <ul className="space-y-3">
                    {(kitchenUsages as any[]).slice(0, 5).map((u: any) => (
                      <li
                        key={u._id}
                        className="rounded-lg border border-[#e5e7eb] px-4 py-3"
                      >
                        <p className="text-sm font-medium text-[#374151]">
                          {new Date(u.usageDate).toLocaleDateString("en-GB")}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {(u.lines ?? []).map((line: any, idx: number) => {
                            let id = toIdString(line.inventoryItemId);
                            if (!id && line.itemName) {
                              const match = inventoryItems.find((i: any) =>
                                String(i.name).toLowerCase() === String(line.itemName).toLowerCase()
                              );
                              if (match) id = String(match._id);
                            }
                            const formula = getChefFormulaText(id, line.unit ?? "");
                            return (
                              <li key={idx} className="flex flex-wrap items-center gap-x-2 text-sm text-[#6b7280]">
                                <span className="font-medium text-[#374151]">{line.itemName}:</span>
                                <span>
                                  In kitchen {formatQtyWithChef(id, Number(line.issuedQty ?? 0), line.unit ?? "")}
                                </span>
                                <span>→</span>
                                <span>
                                  Used {formatQtyWithChef(id, Number(line.usedQty ?? 0), line.unit ?? "")}
                                </span>
                                <span>+</span>
                                <span>
                                  Leftover {formatQtyWithChef(id, Number(line.leftoverQty ?? 0), line.unit ?? "")}
                                </span>
                                {formula && (
                                  <span className="text-xs text-[#9ca3af]">({formula})</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "transfers" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={openCreateTransfer}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 text-sm font-semibold text-white shadow-md"
              >
                <Plus className="h-4 w-4" />
                New transfer
              </Button>
            </div>
            {transfersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#f3f4f6]" />
                ))}
              </div>
            ) : transfers.length === 0 ? (
              <Card className="rounded-2xl border border-dashed border-[#e5e7eb] bg-[#fafafa] p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-[#9ca3af]" />
                <p className="mt-4 font-medium text-[#374151]">No transfers yet</p>
                <p className="mt-1 text-sm text-[#6b7280]">Create a transfer to move stock between locations.</p>
                <Button
                  onClick={openCreateTransfer}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] px-5 py-2.5 text-white"
                >
                  <Plus className="h-4 w-4" />
                  New transfer
                </Button>
              </Card>
            ) : (
              <ul className="space-y-4">
                {(transfers as any[]).map((row: any) => {
                  const first = row.lines?.[0];
                  return (
                    <li key={row._id}>
                      <Card className="overflow-hidden rounded-2xl border-[#e5e7eb] transition-shadow hover:shadow-md">
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-[#1f2937]">{row.transferNumber}</span>
                                <Badge
                                  variant={
                                    row.status === STATION_TRANSFER_STATUS.COMPLETED
                                      ? "success"
                                      : row.status === STATION_TRANSFER_STATUS.CANCELLED
                                        ? "danger"
                                        : "warning"
                                  }
                                >
                                  {STATUS_LABELS[row.status] ?? row.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                                <span>{LOCATION_LABELS[row.fromLocation] ?? row.fromLocation}</span>
                                <ArrowRight className="h-4 w-4" />
                                <span>{LOCATION_LABELS[row.toLocation] ?? row.toLocation}</span>
                              </div>
                              {(row.lines ?? []).length > 0 && (
                                <div className="space-y-1">
                                  {(row.lines as any[]).map((line: any, lineIdx: number) => {
                                    let itemId = toIdString(line.inventoryItemId);
                                    if (!itemId && line.itemName) {
                                      const match = inventoryItems.find(
                                        (i: any) =>
                                          String(i.name).toLowerCase() ===
                                          String(line.itemName).toLowerCase()
                                      );
                                      if (match) itemId = String(match._id);
                                    }
                                    const formulaText = getChefFormulaText(itemId, line.unit ?? "");
                                    return (
                                      <div key={lineIdx}>
                                        <p className="text-sm text-[#6b7280]">
                                          {line.itemName} ×{" "}
                                          {formatQtyWithChef(
                                            itemId,
                                            Number(line.quantity ?? 0),
                                            line.unit ?? ""
                                          )}
                                        </p>
                                        {formulaText && (
                                          <p className="text-xs text-[#9ca3af]">
                                            {formulaText}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <p className="text-xs text-[#9ca3af]">
                                {new Date(row.transferDate).toLocaleDateString("en-GB")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {row.status === STATION_TRANSFER_STATUS.PENDING && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteTransfer(row)}
                                  loading={updateTransferMut.isPending}
                                  className="rounded-lg bg-[#5a189a] text-white hover:bg-[#7b2cbf]"
                                >
                                  Complete
                                </Button>
                              )}
                              {row.status === STATION_TRANSFER_STATUS.PENDING && (
                                <button
                                  type="button"
                                  onClick={() => openEditTransfer(row)}
                                  className="rounded-lg p-2 text-[#5a189a] hover:bg-[#5a189a]/10"
                                  aria-label="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                              {row.status === STATION_TRANSFER_STATUS.PENDING && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTransferId(row._id)}
                                  className="rounded-lg p-2 text-[#dc2626] hover:bg-red-50"
                                  aria-label="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === "ledger" && (
          <Card className="overflow-hidden rounded-2xl border-[#e5e7eb]">
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap gap-4">
                <AppDatePicker
                  label="Start"
                  selected={ledgerStart}
                  onChange={setLedgerStart}
                />
                <AppDatePicker
                  label="End"
                  selected={ledgerEnd}
                  onChange={setLedgerEnd}
                />
              </div>
              {ledgerLoading ? (
                <div className="h-48 animate-pulse rounded-xl bg-[#f3f4f6]" />
              ) : ledgerRows.length === 0 ? (
                <p className="py-8 text-center text-[#6b7280]">No movements in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        <th className="px-4 py-3 text-left font-medium text-[#374151]">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-[#374151]">Item</th>
                        <th className="px-4 py-3 text-left font-medium text-[#374151]">From</th>
                        <th className="px-4 py-3 text-left font-medium text-[#374151]">To</th>
                        <th className="px-4 py-3 text-right font-medium text-[#374151]">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ledgerRows as any[]).map((r: any) => {
                        let itemId = toIdString(r.inventoryItemId);
                        if (!itemId && (r.inventoryItemId?.name ?? r.itemName)) {
                          const match = inventoryItems.find(
                            (i: any) =>
                              String(i.name).toLowerCase() ===
                              String(r.inventoryItemId?.name ?? r.itemName).toLowerCase()
                          );
                          if (match) itemId = String(match._id);
                        }
                        const formulaText = getChefFormulaText(itemId, r.unit ?? "");
                        return (
                          <tr key={r._id} className="border-b border-[#e5e7eb]">
                            <td className="px-4 py-3 text-[#6b7280]">
                              {new Date(r.createdAt).toLocaleString("en-GB")}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#1f2937]">
                              {r.inventoryItemId?.name ?? r.itemName ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-[#6b7280]">
                              {LOCATION_LABELS[r.fromLocation] ?? r.fromLocation}
                            </td>
                            <td className="px-4 py-3 text-[#6b7280]">
                              {LOCATION_LABELS[r.toLocation] ?? r.toLocation}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-medium">
                                {formatQtyWithChef(itemId, Number(r.quantity ?? 0), r.unit ?? "")}
                              </span>
                              {formulaText && (
                                <p className="mt-0.5 text-xs text-[#9ca3af]">{formulaText}</p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {ledgerPagination && ledgerPagination.total > ledgerPagination.limit && (
                <div className="mt-4 flex justify-between">
                  <p className="text-sm text-[#6b7280]">
                    Page {ledgerPagination.page} of{" "}
                    {Math.ceil(ledgerPagination.total / ledgerPagination.limit)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ledgerPage <= 1}
                      onClick={() => setLedgerPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ledgerPage >= Math.ceil(ledgerPagination.total / ledgerPagination.limit)}
                      onClick={() => setLedgerPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "stock" && (
          <div className="grid gap-6 sm:grid-cols-3">
            <Card className="overflow-hidden rounded-2xl border-[#e5e7eb]">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Store className="h-8 w-8 text-[#5a189a]" />
                  <h3 className="font-semibold text-[#1f2937]">Main Store</h3>
                </div>
                <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                  {mainStore.length === 0 ? (
                    <li className="text-sm text-[#6b7280]">No stock</li>
                  ) : (
                    (mainStore as any[]).map((s: any) => {
                      const id = toIdString(s.inventoryItemId);
                      const formula = getChefFormulaText(id, s.unit ?? "");
                      return (
                        <li key={s.inventoryItemId} className="flex flex-col gap-0.5 py-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#374151]">{s.itemName}</span>
                            <span className="font-medium">
                              {formatQtyWithChef(id, Number(s.quantity ?? 0), s.unit ?? "")}
                            </span>
                          </div>
                          {formula && (
                            <p className="text-xs text-[#9ca3af]">{formula}</p>
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              </CardContent>
            </Card>
            <Card className="overflow-hidden rounded-2xl border-[#e5e7eb]">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <ChefHat className="h-8 w-8 text-[#ff6d00]" />
                  <h3 className="font-semibold text-[#1f2937]">Kitchen</h3>
                </div>
                <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                  {kitchenStock.length === 0 ? (
                    <li className="text-sm text-[#6b7280]">No stock</li>
                  ) : (
                    (kitchenStock as any[]).map((s: any) => {
                      const id = toIdString(s.inventoryItemId);
                      const formula = getChefFormulaText(id, s.unit ?? "");
                      return (
                        <li key={s.inventoryItemId} className="flex flex-col gap-0.5 py-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#374151]">{s.itemName}</span>
                            <span className="font-medium">
                              {formatQtyWithChef(id, Number(s.quantity ?? 0), s.unit ?? "")}
                            </span>
                          </div>
                          {formula && (
                            <p className="text-xs text-[#9ca3af]">{formula}</p>
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              </CardContent>
            </Card>
            <Card className="overflow-hidden rounded-2xl border-[#e5e7eb]">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <UtensilsCrossed className="h-8 w-8 text-[#7b2cbf]" />
                  <h3 className="font-semibold text-[#1f2937]">Front House</h3>
                </div>
                <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                  {frontHouseStock.length === 0 ? (
                    <li className="text-sm text-[#6b7280]">No stock</li>
                  ) : (
                    (frontHouseStock as any[]).map((s: any) => {
                      const id = toIdString(s.inventoryItemId);
                      const formula = getChefFormulaText(id, s.unit ?? "");
                      return (
                        <li key={s.inventoryItemId} className="flex flex-col gap-0.5 py-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#374151]">{s.itemName}</span>
                            <span className="font-medium">
                              {formatQtyWithChef(id, Number(s.quantity ?? 0), s.unit ?? "")}
                            </span>
                          </div>
                          {formula && (
                            <p className="text-xs text-[#9ca3af]">{formula}</p>
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      <Modal
        open={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          resetTransferForm();
        }}
        title={editTransfer ? "Edit transfer" : "New transfer"}
        size="lg"
        className="rounded-2xl border-[#e5e7eb] bg-white shadow-xl"
      >
        <form onSubmit={handleSubmitTransfer} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <AppReactSelect
              label="From"
              value={transferForm.fromLocation}
              onChange={(v) => setTransferForm((f) => ({ ...f, fromLocation: v }))}
              options={LOCATION_OPTIONS}
            />
            <AppReactSelect
              label="To"
              value={transferForm.toLocation}
              onChange={(v) => setTransferForm((f) => ({ ...f, toLocation: v }))}
              options={LOCATION_OPTIONS.filter((o) => o.value !== transferForm.fromLocation)}
            />
          </div>
          <AppDatePicker
            label="Transfer date"
            selected={transferForm.transferDate ? new Date(transferForm.transferDate) : null}
            onChange={(d) =>
              setTransferForm((f) => ({
                ...f,
                transferDate: d ? d.toISOString().slice(0, 19).replace("T", "T") : "",
              }))
            }
          />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-[#374151]">Lines</label>
              <Button type="button" variant="outline" size="sm" onClick={addTransferLine}>
                Add line
              </Button>
            </div>
            <div className="space-y-3">
              {transferForm.lines.map((line, idx) => {
                const available = line.inventoryItemId
                  ? getAvailableAtLocation(line.inventoryItemId, transferForm.fromLocation)
                  : null;
                const requestedBase = getLineRequestedBaseQty(line);
                const exceeds =
                  available != null &&
                  requestedBase != null &&
                  requestedBase > available.quantity;
                const item = line.inventoryItemId
                  ? (inventoryItems.find((i: any) => String(i._id) === line.inventoryItemId) as any)
                  : null;
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 ${
                      exceeds ? "border-red-300 bg-red-50/50" : "border-[#e5e7eb]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-[180px] flex-1">
                        <AppReactSelect
                          value={line.inventoryItemId}
                          onChange={(v) => updateTransferLine(idx, "inventoryItemId", v)}
                          options={[{ value: "", label: "Select item…" }, ...itemOptions]}
                        />
                      </div>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateTransferLine(idx, "quantity", e.target.value)}
                        className="w-24"
                        placeholder="Qty"
                      />
                      <div className="w-[140px]">
                        <AppReactSelect
                          value={line.inventoryItemId ? (line.chefUnitId || "base") : ""}
                          onChange={(v) => setTransferLineUnit(idx, v)}
                          options={
                            line.inventoryItemId
                              ? getChefUnitOptionsForItem(line.inventoryItemId)
                              : [{ value: "", label: "Select item first" }]
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTransferLine(idx)}
                        className="rounded p-2 text-[#dc2626] hover:bg-red-50"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {line.inventoryItemId && (
                      <div className="mt-3 space-y-1 border-t border-[#e5e7eb] pt-3">
                        {available != null && (
                          <p className="text-xs text-[#6b7280]">
                            <span className="font-medium text-[#374151]">
                              Available at {LOCATION_LABELS[transferForm.fromLocation] ?? transferForm.fromLocation}:
                            </span>{" "}
                            {formatQtyWithChef(
                              line.inventoryItemId,
                              available.quantity,
                              available.unit
                            )}
                          </p>
                        )}
                        {exceeds && requestedBase != null && available != null && (
                          <p className="text-sm font-medium text-red-600">
                            Requested {formatQtyWithChef(line.inventoryItemId, requestedBase, item?.unit ?? "unit")} —
                            exceeds available by{" "}
                            {formatQtyWithChef(
                              line.inventoryItemId,
                              requestedBase - available.quantity,
                              item?.unit ?? "unit"
                            )}
                          </p>
                        )}
                        {item && (item.minimumStock > 0 || item.reorderLevel > 0) && (
                          <p className="text-xs text-[#6b7280]">
                            Min stock: {item.minimumStock} {item.unit}
                            {item.reorderLevel > 0 && ` · Reorder at: ${item.reorderLevel} ${item.unit}`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <Textarea
            label="Notes"
            value={transferForm.notes}
            onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTransferModal(false);
                resetTransferForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={transferForm.lines.some((l) => {
                const base = getLineRequestedBaseQty(l);
                if (base == null) return false;
                const avail = getAvailableAtLocation(l.inventoryItemId, transferForm.fromLocation);
                return base > avail.quantity;
              })}
              loading={createTransferMut.isPending || updateTransferMut.isPending}
              className="rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] text-white"
            >
              {editTransfer ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Kitchen Usage Modal */}
      <Modal
        open={showKitchenModal}
        onClose={() => {
          setShowKitchenModal(false);
          resetKitchenForm();
        }}
        title="Record kitchen usage"
        size="lg"
        className="rounded-2xl border-[#e5e7eb] bg-white shadow-xl"
      >
        <form onSubmit={handleSubmitKitchen} className="space-y-5">
          <p className="text-sm text-[#6b7280]">
            Record how much of each item was <strong>used in prep</strong> (went to front house) vs{" "}
            <strong>leftover</strong> (returned to store). Enter In kitchen (pre-filled from stock), then Used + Leftover.
            Used + Leftover must not exceed In kitchen.
          </p>
          <AppDatePicker
            label="Usage date"
            selected={kitchenForm.usageDate ? new Date(kitchenForm.usageDate) : null}
            onChange={(d) =>
              setKitchenForm((f) => ({
                ...f,
                usageDate: d ? d.toISOString().slice(0, 19).replace("T", "T") : "",
              }))
            }
          />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[#374151]">Items</label>
                <p className="text-xs text-[#6b7280]">
                  Select an item — In kitchen is pre-filled from stock (editable). Enter Used + Leftover (must not exceed In kitchen).
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addKitchenLine}>
                Add line
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {kitchenForm.lines.map((line, idx) => {
                const issuedNum = Number(line.issuedQty || 0);
                const usedNum = Number(line.usedQty || 0);
                const leftoverNum = Number(line.leftoverQty || 0);
                const exceeds = issuedNum > 0 && usedNum + leftoverNum > issuedNum;
                const item = line.inventoryItemId
                  ? (inventoryItems.find((i: any) => String(i._id) === line.inventoryItemId) as any)
                  : null;
                return (
                  <div
                    key={idx}
                    className={`grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-6 ${
                      exceeds ? "border-red-300 bg-red-50/50" : "border-[#e5e7eb]"
                    }`}
                  >
                    <div className="sm:col-span-2">
                      <AppReactSelect
                        value={line.inventoryItemId}
                        onChange={(v) => updateKitchenLine(idx, "inventoryItemId", v)}
                        options={[{ value: "", label: "Select item…" }, ...itemOptions]}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#374151]">Unit</label>
                      <AppReactSelect
                        value={line.inventoryItemId ? (line.chefUnitId || "base") : ""}
                        onChange={(v) => setKitchenLineUnit(idx, v)}
                        options={
                          line.inventoryItemId
                            ? getChefUnitOptionsForItem(line.inventoryItemId)
                            : [{ value: "", label: "—" }]
                        }
                      />
                    </div>
                    <Input
                      label="In kitchen"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.issuedQty}
                      onChange={(e) => updateKitchenLine(idx, "issuedQty", e.target.value)}
                      placeholder="From stock"
                    />
                    <Input
                      label="Used in prep"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.usedQty}
                      onChange={(e) => updateKitchenLine(idx, "usedQty", e.target.value)}
                      placeholder="Went to front house"
                    />
                    <div className="flex items-end gap-2">
                      <Input
                        label="Leftover"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.leftoverQty}
                        onChange={(e) => updateKitchenLine(idx, "leftoverQty", e.target.value)}
                        placeholder="Returned to store"
                      />
                      <button
                        type="button"
                        onClick={() => removeKitchenLine(idx)}
                        className="rounded p-2 text-[#dc2626] hover:bg-red-50"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {line.inventoryItemId && (
                      <div className="col-span-full mt-2 space-y-1 border-t border-[#e5e7eb] pt-3">
                        {exceeds && (
                          <p className="text-sm font-medium text-red-600">
                            Used ({usedNum}) + Leftover ({leftoverNum}) exceeds In kitchen ({issuedNum}).
                            Reduce quantities.
                          </p>
                        )}
                        {item && (item.minimumStock > 0 || item.reorderLevel > 0) && (
                          <p className="text-xs text-[#6b7280]">
                            Min stock: {item.minimumStock} {item.unit}
                            {item.reorderLevel > 0 && ` · Reorder at: ${item.reorderLevel} ${item.unit}`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <Textarea
            label="Notes"
            value={kitchenForm.notes}
            onChange={(e) => setKitchenForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowKitchenModal(false);
                resetKitchenForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={kitchenForm.lines.some((l) => {
                const issued = Number(l.issuedQty || 0);
                const used = Number(l.usedQty || 0);
                const leftover = Number(l.leftoverQty || 0);
                return issued > 0 && used + leftover > issued;
              })}
              loading={createKitchenMut.isPending}
              className="rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] text-white"
            >
              Record usage
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTransferId}
        onClose={() => setDeleteTransferId(null)}
        title="Delete transfer"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Are you sure you want to delete this transfer? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteTransferId(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteTransfer} loading={deleteTransferMut.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
