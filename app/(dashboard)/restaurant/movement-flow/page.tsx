"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useStationTransfers,
  useCreateStationTransfer,
  useUpdateStationTransfer,
  useDeleteStationTransfer,
  useBulkDeleteStationTransfers,
  useBulkDeleteMovementLedger,
  useBulkDeleteLocationStock,
  useLocationStock,
  useMovementLedger,
  useKitchenUsage,
  useCreateKitchenUsage,
  useUpdateKitchenUsage,
  useDeleteKitchenUsage,
  useUpdateStationMovement,
  useDeleteStationMovement,
  useUpdateLocationStock,
  useDeleteLocationStock,
  useInventoryItems,
  useItemYields,
} from "@/hooks/api";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { buildYieldMap, convertChefQtyToBaseQty } from "@/lib/unit-conversion";
import { formatDisplayQuantity } from "@/lib/format-display-qty";
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
  ArrowRightLeft,
  Package,
  ChefHat,
  Store,
  UtensilsCrossed,
  Plus,
  Trash2,
  Edit2,
  History,
  Layers,
  X,
  CalendarDays,
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

/** Match API rows where inventoryItemId may be a string, ObjectId, or populated doc. */
function inventoryIdsEqual(stockRow: { inventoryItemId?: unknown }, selectedId: string): boolean {
  const a = toIdString(stockRow?.inventoryItemId);
  const b = String(selectedId ?? "").trim();
  return a.length > 0 && b.length > 0 && a === b;
}

export default function MovementFlowPage() {
  const searchParams = useSearchParams();
  const showDebug = searchParams.get("debug") === "1";
  /** Dev / ?debug=1 / NEXT_PUBLIC_DEBUG_STATION_TRANSFER=1 — browser console filter: [movement-flow:store→kitchen] */
  const logStoreKitchenFlow = (...args: unknown[]) => {
    if (typeof window === "undefined") return;
    if (
      !showDebug &&
      process.env.NODE_ENV !== "development" &&
      process.env.NEXT_PUBLIC_DEBUG_STATION_TRANSFER !== "1"
    ) {
      return;
    }
    console.log("[movement-flow:store→kitchen]", ...args);
  };
  if (typeof window !== "undefined") {
    console.log("[movement-flow] render");
  }
  const [activeTab, setActiveTab] = useState<"transfer" | "kitchen" | "transfers" | "ledger" | "stock">("transfer");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showKitchenModal, setShowKitchenModal] = useState(false);
  const [editTransfer, setEditTransfer] = useState<any>(null);
  const [deleteTransferId, setDeleteTransferId] = useState<string | null>(null);
  const [selectedTransferIds, setSelectedTransferIds] = useState<string[]>([]);
  const [confirmBulkTransfers, setConfirmBulkTransfers] = useState(false);
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<string[]>([]);
  const [confirmBulkLedger, setConfirmBulkLedger] = useState(false);
  const [selectedLocationStockIds, setSelectedLocationStockIds] = useState<string[]>([]);
  const [confirmBulkLocationStock, setConfirmBulkLocationStock] = useState(false);
  const [editKitchenUsage, setEditKitchenUsage] = useState<any>(null);
  const [deleteKitchenId, setDeleteKitchenId] = useState<string | null>(null);
  const [ledgerEdit, setLedgerEdit] = useState<{
    id: string;
    itemName: string;
    reason: string;
  } | null>(null);
  const [deleteLedgerId, setDeleteLedgerId] = useState<string | null>(null);
  const [stockEdit, setStockEdit] = useState<{
    id: string;
    quantity: string;
    unit: string;
    label: string;
  } | null>(null);
  const [deleteLocationStockId, setDeleteLocationStockId] = useState<string | null>(null);
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
  const kitchenListParams = useMemo(
    () => ({ page: "1", limit: "100", department: DEPARTMENT }),
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

  /** Page-1 ledger for Record Transfer tab previews (not tied to ledger tab pagination). */
  const homeLedgerParams = useMemo(
    () => ({
      page: "1",
      limit: "40",
      department: DEPARTMENT,
      ...(ledgerStart ? { startDate: ledgerStart.toISOString() } : {}),
      ...(ledgerEnd ? { endDate: ledgerEnd.toISOString() } : {}),
    }),
    [ledgerStart, ledgerEnd]
  );

  const { data: transfersData, isLoading: transfersLoading } = useStationTransfers(params);
  const { data: locationData } = useLocationStock({ department: DEPARTMENT });
  const { data: ledgerData, isLoading: ledgerLoading } = useMovementLedger(ledgerParams);
  const { data: homeLedgerData, isLoading: homeLedgerLoading } = useMovementLedger(homeLedgerParams);
  const { data: kitchenData } = useKitchenUsage(kitchenListParams);
  const { data: itemsData } = useInventoryItems({ limit: "500", department: DEPARTMENT });
  const { data: yieldsData } = useItemYields({ limit: "1000" });

  const createTransferMut = useCreateStationTransfer();
  const updateTransferMut = useUpdateStationTransfer();
  const deleteTransferMut = useDeleteStationTransfer();
  const bulkDeleteTransfersMut = useBulkDeleteStationTransfers();
  const bulkDeleteLedgerMut = useBulkDeleteMovementLedger();
  const bulkDeleteLocationStockMut = useBulkDeleteLocationStock();
  const createKitchenMut = useCreateKitchenUsage();
  const updateKitchenMut = useUpdateKitchenUsage();
  const deleteKitchenMut = useDeleteKitchenUsage();
  const updateLedgerMut = useUpdateStationMovement();
  const deleteLedgerMut = useDeleteStationMovement();
  const updateLocationStockMut = useUpdateLocationStock();
  const deleteLocationStockMut = useDeleteLocationStock();

  const transfers = transfersData?.data ?? [];
  const ledgerRows = ledgerData?.data ?? [];
  const homeLedgerRows = homeLedgerData?.data ?? [];
  const ledgerPagination = ledgerData?.meta?.pagination;

  const homeLedgerPreview = useMemo(() => homeLedgerRows.slice(0, 6), [homeLedgerRows]);
  const mainStoreHistoryRows = useMemo(
    () =>
      homeLedgerRows.filter(
        (r: any) =>
          r.fromLocation === STOCK_LOCATION.MAIN_STORE ||
          r.toLocation === STOCK_LOCATION.MAIN_STORE
      ),
    [homeLedgerRows]
  );
  const transferHistoryPreview = useMemo(() => (transfers as any[]).slice(0, 8), [transfers]);
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

  /**
   * Some historical location-stock rows can point to item ids that are no longer directly
   * resolvable from the immediate API payload. Build a best-effort name lookup so stock cards
   * still show human-friendly labels after kitchen/front-house moves.
   */
  const itemNameById = useMemo(() => {
    const map = new Map<string, string>();
    const setIfValid = (idLike: unknown, nameLike: unknown) => {
      const id = toIdString(idLike);
      const name = String(nameLike ?? "").trim();
      if (!id || !name) return;
      if (!map.has(id)) map.set(id, name);
    };

    (inventoryItems as any[]).forEach((i: any) => setIfValid(i?._id, i?.name));
    (transfers as any[]).forEach((t: any) =>
      (t?.lines ?? []).forEach((line: any) =>
        setIfValid(line?.inventoryItemId, line?.itemName ?? line?.inventoryItemId?.name)
      )
    );
    (kitchenUsages as any[]).forEach((u: any) =>
      (u?.lines ?? []).forEach((line: any) =>
        setIfValid(line?.inventoryItemId, line?.itemName ?? line?.inventoryItemId?.name)
      )
    );
    (ledgerRows as any[]).forEach((r: any) =>
      setIfValid(r?.inventoryItemId, r?.itemName ?? r?.inventoryItemId?.name)
    );

    return map;
  }, [inventoryItems, transfers, kitchenUsages, ledgerRows]);

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
    const fmt = (q: number) => formatDisplayQuantity(q, 1);
    if (baseQty <= 0) return `0 ${baseUnit}`;
    const id = toIdString(inventoryItemId);
    const yields = yieldByItem.get(id) ?? [];
    if (!yields.length) return `${fmt(baseQty)} ${baseUnit}`;
    const y = yields[0];
    const fromQty = Number((y as any).fromQty ?? 0);
    const toQty = Number((y as any).toQty ?? 0);
    const baseUnitQty = Number((y as any).baseUnitQty ?? 0);
    if (fromQty <= 0 || toQty <= 0 || baseUnitQty <= 0) return `${fmt(baseQty)} ${baseUnit}`;
    const toUnit = (y as any).toUnitId;
    const chefName = formatChefUnitName(toUnit, 1);
    const chefQty = (baseQty / baseUnitQty) * toQty;
    return `${fmt(baseQty)} ${baseUnit} (${fmt(chefQty)} ${chefName})`;
  };

  /** Second-line label for kitchen usage: yield/chef units only (matches receipts / stock-control `≈` pattern). */
  const formatYieldEquivSubtitle = (inventoryItemId: string, baseQty: number): string | null => {
    const fmt = (q: number) => formatDisplayQuantity(q, 1);
    if (baseQty <= 0) return null;
    const id = toIdString(inventoryItemId);
    const yields = yieldByItem.get(id) ?? [];
    if (!yields.length) return null;
    const y = yields[0];
    const fromQty = Number((y as any).fromQty ?? 0);
    const toQty = Number((y as any).toQty ?? 0);
    const baseUnitQty = Number((y as any).baseUnitQty ?? 0);
    if (fromQty <= 0 || toQty <= 0 || baseUnitQty <= 0) return null;
    const toUnit = (y as any).toUnitId;
    const chefQty = (baseQty / baseUnitQty) * toQty;
    const chefName = formatChefUnitName(toUnit, chefQty);
    return `≈ ${fmt(chefQty)} ${chefName}`;
  };

  const formatBaseQtyOnly = (baseQty: number, baseUnit: string) => {
    const fmt = (q: number) => formatDisplayQuantity(q, 1);
    const u = baseUnit || "unit";
    if (baseQty <= 0) return `0 ${u}`;
    return `${fmt(baseQty)} ${u}`;
  };

  /**
   * Same yield semantics as {@link formatQtyWithChef}: `chefQty = (baseQty / baseUnitQty) * toQty`.
   * Shows base → chef units, not "1 plate = X kg" (that misread `fromQty` with the *to* unit name).
   */
  const getChefFormulaText = (inventoryItemId: string, baseUnit: string): string | null => {
    const fmt = (q: number) => formatDisplayQuantity(q, 1);
    const u = baseUnit?.trim() || "unit";
    const id = toIdString(inventoryItemId);
    const yields = yieldByItem.get(id) ?? [];
    if (!yields.length) return null;
    const y = yields[0];
    const fromQty = Number((y as any).fromQty ?? 0);
    const toQty = Number((y as any).toQty ?? 0);
    const baseUnitQty = Number((y as any).baseUnitQty ?? 0);
    const toUnit = (y as any).toUnitId;
    const fromUnit = (y as any).fromUnitId;

    if (baseUnitQty > 0 && toQty > 0) {
      const chefName = formatChefUnitName(toUnit, toQty);
      return `${fmt(baseUnitQty)} ${u} → ${fmt(toQty)} ${chefName}`;
    }
    if (fromQty > 0 && toQty > 0) {
      const fromName = formatChefUnitName(fromUnit, fromQty);
      const toName = formatChefUnitName(toUnit, toQty);
      return `${fmt(fromQty)} ${fromName} → ${fmt(toQty)} ${toName}`;
    }
    return null;
  };

  const mainStore = (locationData?.data as any)?.mainStore ?? [];
  const kitchenStock = (locationData?.data as any)?.kitchen ?? [];
  const frontHouseStock = (locationData?.data as any)?.frontHouse ?? [];

  /** Hide depleted rows in the stock cards so kitchen doesn’t show e.g. “Rice — 0 kg” after a full recipe use. */
  const kitchenStockVisible = useMemo(
    () => (kitchenStock as any[]).filter((s) => Number(s?.quantity ?? 0) > 0),
    [kitchenStock]
  );
  const frontHouseStockVisible = useMemo(
    () => (frontHouseStock as any[]).filter((s) => Number(s?.quantity ?? 0) > 0),
    [frontHouseStock]
  );

  const pendingTransferIds = useMemo(
    () =>
      (transfers as any[])
        .filter((t) => t.status === STATION_TRANSFER_STATUS.PENDING)
        .map((t) => String(t._id)),
    [transfers]
  );

  useEffect(() => {
    setSelectedTransferIds((prev) => prev.filter((id) => pendingTransferIds.includes(id)));
  }, [pendingTransferIds]);

  const deletableLocationStockIds = useMemo(() => {
    const k = (kitchenStock as any[])
      .map((s) => toIdString(s._id))
      .filter((id) => id.length > 0);
    const f = (frontHouseStock as any[])
      .map((s) => toIdString(s._id))
      .filter((id) => id.length > 0);
    return [...k, ...f];
  }, [kitchenStock, frontHouseStock]);

  useEffect(() => {
    setSelectedLocationStockIds((prev) =>
      prev.filter((id) => deletableLocationStockIds.includes(id))
    );
  }, [deletableLocationStockIds]);

  const ledgerRowIds = useMemo(
    () => (ledgerRows as any[]).map((r) => String(r._id)).filter(Boolean),
    [ledgerRows]
  );

  useEffect(() => {
    setSelectedLedgerIds([]);
  }, [ledgerPage, ledgerStart, ledgerEnd]);

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

  /** Available qty: main store = POS `currentStock` only; kitchen/front = location-stock rows only (no cross-source fallback). */
  const getAvailableAtLocation = (inventoryItemId: string, location: string) => {
    const id = String(inventoryItemId);
    if (location === STOCK_LOCATION.MAIN_STORE) {
      const item = inventoryItems.find((i: any) => String(i._id) === id);
      if (!item) return { quantity: 0, unit: "unit" };
      return {
        quantity: Number(item.currentStock ?? 0),
        unit: String(item.unit ?? "unit"),
      };
    }
    const list =
      location === STOCK_LOCATION.KITCHEN ? kitchenStock : frontHouseStock;
    const row = (list as any[]).find((s: any) => inventoryIdsEqual(s, id));
    if (!row) return { quantity: 0, unit: "unit" };
    return {
      quantity: Number(row.quantity ?? 0),
      unit: String(row.unit ?? "unit"),
    };
  };

  const resolveLocationItemName = (s: any): string => {
    const fromApi = String(s?.itemName ?? "").trim();
    if (fromApi) return fromApi;
    const id = toIdString(s?.inventoryItemId);
    const knownName = itemNameById.get(id);
    if (knownName) return knownName;
    const inv = inventoryItems.find((i: any) => String(i._id) === id);
    if (inv?.name) return String(inv.name);
    if (id) return `Unknown item (${id.slice(-6)})`;
    const rowId = toIdString(s?._id);
    return rowId ? `Orphan stock row (${rowId.slice(-6)})` : "Orphan stock row";
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

  const stockByLocationStats = useMemo(() => {
    const sumQty = (rows: any[]) =>
      rows.reduce((sum, row) => sum + Number(row?.quantity ?? 0), 0);

    const mainStoreQty = sumQty(mainStore as any[]);
    const kitchenQty = sumQty(kitchenStock as any[]);
    const frontHouseQty = sumQty(frontHouseStock as any[]);

    const tracked = new Set<string>();
    [...(mainStore as any[]), ...(kitchenStock as any[]), ...(frontHouseStock as any[])].forEach(
      (row) => {
        const id = toIdString(row?.inventoryItemId);
        if (id) tracked.add(id);
      }
    );

    let expectedKitchenIn = 0;
    let expectedFrontIn = 0;
    let expectedKitchenOut = 0;
    let expectedFrontOut = 0;

    (transfers as any[])
      .filter((t: any) => t?.status === STATION_TRANSFER_STATUS.PENDING)
      .forEach((t: any) => {
        (t?.lines ?? []).forEach((line: any) => {
          const itemId = toIdString(line?.inventoryItemId);
          if (!itemId) return;
          const item = inventoryItems.find((i: any) => String(i._id) === itemId);
          let qty = Number(line?.quantity ?? 0);
          if (line?.chefUnitId && line.chefUnitId !== "base" && item) {
            const converted = convertChefQtyToBaseQty({
              inventoryItemId: itemId,
              chefQty: Number(line?.quantity ?? 0),
              chefUnitIdOrName: line.chefUnitId,
              item: { unit: item.unit, unitConversions: item.unitConversions },
              yieldMap,
            });
            qty = converted ?? qty;
          }
          if (!Number.isFinite(qty) || qty <= 0) return;
          if (t?.toLocation === STOCK_LOCATION.KITCHEN) expectedKitchenIn += qty;
          if (t?.toLocation === STOCK_LOCATION.FRONT_HOUSE) expectedFrontIn += qty;
          if (t?.fromLocation === STOCK_LOCATION.KITCHEN) expectedKitchenOut += qty;
          if (t?.fromLocation === STOCK_LOCATION.FRONT_HOUSE) expectedFrontOut += qty;
        });
      });

    const usedQty = (kitchenUsages as any[]).reduce(
      (sum, u) =>
        sum +
        (u?.lines ?? []).reduce(
          (lineSum: number, line: any) =>
            lineSum + Number(line?.usedQty ?? line?.quantityUsed ?? 0),
          0
        ),
      0
    );
    const leftoverQty = (kitchenUsages as any[]).reduce(
      (sum, u) =>
        sum +
        (u?.lines ?? []).reduce(
          (lineSum: number, line: any) => lineSum + Number(line?.leftoverQty ?? 0),
          0
        ),
      0
    );

    return {
      itemsTracked: tracked.size,
      availableTotal: mainStoreQty + kitchenQty + frontHouseQty,
      availableKitchen: kitchenQty,
      availableFront: frontHouseQty,
      usedQty,
      leftoverQty,
      expectedKitchen: expectedKitchenIn - expectedKitchenOut,
      expectedFront: expectedFrontIn - expectedFrontOut,
    };
  }, [mainStore, kitchenStock, frontHouseStock, transfers, kitchenUsages, inventoryItems, yieldMap]);

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
    logStoreKitchenFlow("submit: start", {
      from: transferForm.fromLocation,
      to: transferForm.toLocation,
      edit: !!editTransfer,
    });
    if (transferForm.fromLocation === transferForm.toLocation) {
      logStoreKitchenFlow("submit: blocked — same from/to");
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
          logStoreKitchenFlow("submit: blocked — no chef-unit conversion", {
            inventoryItemId: l.inventoryItemId,
            chefUnitId: l.chefUnitId,
          });
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
      logStoreKitchenFlow("submit: blocked — no lines");
      toast.error("Add at least one line with quantity > 0");
      return;
    }

    for (const line of lines) {
      const available = getAvailableAtLocation(line.inventoryItemId, transferForm.fromLocation);
      if (line.quantity > available.quantity) {
        logStoreKitchenFlow("submit: blocked — insufficient stock (client check)", {
          itemName: line.itemName,
          inventoryItemId: line.inventoryItemId,
          requested: line.quantity,
          available: available.quantity,
          atLocation: transferForm.fromLocation,
        });
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
      logStoreKitchenFlow("submit: calling API (inventory file unchanged until you Complete the transfer)", {
        action: editTransfer ? "PATCH update" : "POST create",
        lines: lines.map((l) => ({ inventoryItemId: l.inventoryItemId, qty: l.quantity, unit: l.unit })),
      });
      if (editTransfer) {
        await updateTransferMut.mutateAsync({
          id: editTransfer._id,
          department: DEPARTMENT,
          ...payload,
          ...(editTransfer.status === STATION_TRANSFER_STATUS.PENDING
            ? {}
            : { status: editTransfer.status }),
        });
        logStoreKitchenFlow("submit: PATCH ok");
        toast.success("Transfer updated");
      } else {
        await createTransferMut.mutateAsync(payload);
        logStoreKitchenFlow("submit: POST ok — transfer is PENDING; use Complete to apply stock");
        toast.success("Transfer created");
      }
      setShowTransferModal(false);
      resetTransferForm();
    } catch (err: any) {
      logStoreKitchenFlow("submit: API error", {
        status: err?.response?.status,
        message: err?.response?.data?.error?.message,
        code: err?.response?.data?.error?.code,
      });
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleCompleteTransfer = async (row: any) => {
    logStoreKitchenFlow("complete: start — this PATCH should deduct main store & add kitchen", {
      transferId: row?._id,
      transferNumber: row?.transferNumber,
      currentStatus: row?.status,
      from: row?.fromLocation,
      to: row?.toLocation,
      lineCount: Array.isArray(row?.lines) ? row.lines.length : 0,
    });
    try {
      await updateTransferMut.mutateAsync({
        id: row._id,
        department: DEPARTMENT,
        status: STATION_TRANSFER_STATUS.COMPLETED,
      });
      logStoreKitchenFlow("complete: PATCH ok — check server terminal for [station-transfer] applyStationTransferCompletion");
      toast.success("Transfer completed");
    } catch (err: any) {
      logStoreKitchenFlow("complete: API error", {
        status: err?.response?.status,
        message: err?.response?.data?.error?.message,
        code: err?.response?.data?.error?.code,
      });
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

  const toggleTransferSelect = (id: string) => {
    setSelectedTransferIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteTransfers = async () => {
    if (selectedTransferIds.length === 0) return;
    try {
      const res = await bulkDeleteTransfersMut.mutateAsync({
        ids: selectedTransferIds,
        department: DEPARTMENT,
      });
      const payload = (res as { data?: { deleted?: number; skippedCompleted?: number; skippedNotFound?: number } })
        .data ?? (res as { deleted?: number; skippedCompleted?: number; skippedNotFound?: number });
      const deleted = payload.deleted ?? 0;
      const skippedCompleted = payload.skippedCompleted ?? 0;
      const skippedNotFound = payload.skippedNotFound ?? 0;
      let msg = `Deleted ${deleted} transfer(s).`;
      if (skippedCompleted > 0) msg += ` ${skippedCompleted} completed (skipped).`;
      if (skippedNotFound > 0) msg += ` ${skippedNotFound} not found.`;
      toast.success(msg);
      setConfirmBulkTransfers(false);
      setSelectedTransferIds([]);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const toggleLedgerSelect = (id: string) => {
    setSelectedLedgerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteLedger = async () => {
    if (selectedLedgerIds.length === 0) return;
    try {
      const res = await bulkDeleteLedgerMut.mutateAsync({
        ids: selectedLedgerIds,
        department: DEPARTMENT,
      });
      const payload = (res as { data?: { deleted?: number; requested?: number } }).data ??
        (res as { deleted?: number; requested?: number });
      toast.success(
        `Removed ${payload.deleted ?? 0} ledger row(s) (${payload.requested ?? selectedLedgerIds.length} requested).`
      );
      setConfirmBulkLedger(false);
      setSelectedLedgerIds([]);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const toggleLocationStockSelect = (id: string) => {
    setSelectedLocationStockIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteLocationStock = async () => {
    if (selectedLocationStockIds.length === 0) return;
    try {
      const res = await bulkDeleteLocationStockMut.mutateAsync({
        ids: selectedLocationStockIds,
        department: DEPARTMENT,
      });
      const payload = (res as { data?: { deleted?: number; requested?: number } }).data ??
        (res as { deleted?: number; requested?: number });
      toast.success(
        `Removed ${payload.deleted ?? 0} location stock row(s). Adjust main store balances in POS inventory if needed.`
      );
      setConfirmBulkLocationStock(false);
      setSelectedLocationStockIds([]);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
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
    setEditKitchenUsage(null);
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

  const openEditKitchen = (u: any) => {
    setEditKitchenUsage(u);
    setKitchenForm({
      usageDate: u.usageDate
        ? new Date(u.usageDate).toISOString().slice(0, 19).replace("T", "T")
        : new Date().toISOString().slice(0, 19).replace("T", "T"),
      lines:
        (u.lines ?? []).length > 0
          ? (u.lines as any[]).map((l: any) => ({
              inventoryItemId: toIdString(l.inventoryItemId),
              itemName: String(l.itemName ?? ""),
              issuedQty: String(l.issuedQty ?? 0),
              usedQty: String(l.usedQty ?? 0),
              leftoverQty: String(l.leftoverQty ?? 0),
              unit: String(l.unit ?? "kg"),
              chefUnitId: "",
            }))
          : [
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
      notes: u.notes ?? "",
    });
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
      const payload = {
        department: DEPARTMENT,
        usageDate: `${kitchenForm.usageDate}Z`,
        lines,
        notes: kitchenForm.notes || undefined,
      };
      if (editKitchenUsage?._id) {
        await updateKitchenMut.mutateAsync({
          id: String(editKitchenUsage._id),
          ...payload,
        });
        toast.success("Kitchen usage updated");
      } else {
        await createKitchenMut.mutateAsync(payload);
        toast.success("Kitchen usage recorded");
      }
      setShowKitchenModal(false);
      resetKitchenForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleDeleteKitchen = async () => {
    if (!deleteKitchenId) return;
    try {
      await deleteKitchenMut.mutateAsync({ id: deleteKitchenId, department: DEPARTMENT });
      toast.success("Kitchen usage removed");
      setDeleteKitchenId(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleSaveLedgerEdit = async () => {
    if (!ledgerEdit) return;
    const payload: Record<string, string> = {};
    if (ledgerEdit.itemName.trim()) payload.itemName = ledgerEdit.itemName.trim();
    if (ledgerEdit.reason.trim()) payload.reason = ledgerEdit.reason.trim();
    if (Object.keys(payload).length === 0) {
      toast.error("Enter a display name or reason to save");
      return;
    }
    try {
      await updateLedgerMut.mutateAsync({
        id: ledgerEdit.id,
        department: DEPARTMENT,
        ...payload,
      });
      toast.success("Ledger entry updated");
      setLedgerEdit(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleDeleteLedgerOne = async () => {
    if (!deleteLedgerId) return;
    try {
      await deleteLedgerMut.mutateAsync({ id: deleteLedgerId, department: DEPARTMENT });
      toast.success("Ledger row removed");
      setDeleteLedgerId(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleSaveStockEdit = async () => {
    if (!stockEdit) return;
    const q = Number(stockEdit.quantity);
    if (Number.isNaN(q) || q < 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    try {
      await updateLocationStockMut.mutateAsync({
        id: stockEdit.id,
        department: DEPARTMENT,
        quantity: q,
        unit: stockEdit.unit.trim() || undefined,
      });
      toast.success("Location stock updated");
      setStockEdit(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleDeleteLocationStockOne = async () => {
    if (!deleteLocationStockId) return;
    try {
      await deleteLocationStockMut.mutateAsync({
        id: deleteLocationStockId,
        department: DEPARTMENT,
      });
      toast.success("Location stock row removed");
      setDeleteLocationStockId(null);
      setSelectedLocationStockIds((prev) => prev.filter((x) => x !== deleteLocationStockId));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
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

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-orange-50/20 to-sky-50/30 pb-[max(0.5rem,env(safe-area-inset-bottom))] font-sans text-slate-900">
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
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
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
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:gap-6 md:flex-row md:items-end">
          <div className="min-w-0 max-w-2xl">
            <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              Inventory Movement
            </h2>
            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              Track inventory from{" "}
              <span className="font-semibold text-[#ec5b13]">Main Store</span> →{" "}
              <span className="font-semibold text-[#ec5b13]">Kitchen</span> →{" "}
              <span className="font-semibold text-[#ec5b13]">Front House</span>. Record
              transfers, kitchen usage (used vs leftover), and view the movement ledger.{" "}
              <span className="font-medium text-slate-700">
                Transfers move stock between locations. When a POS order is served, ingredients are
                deducted from <strong>Front house</strong> only—so each site shows what was received
                (transfers) vs what was used for service (orders).
              </span>
            </p>
          </div>
          <Button
            onClick={openCreateTransfer}
            className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#ec5b13] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#ec5b13]/30 transition-all hover:bg-[#d44f10] active:scale-95 md:w-auto"
          >
            <Plus className="h-4 w-4 shrink-0" />
            New transfer
          </Button>
        </div>

        {/* Tabs — grid on small screens; no horizontal-only scroll */}
        <nav
          className="mb-6 sm:mb-8"
          aria-label="Movement flow sections"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex min-h-[48px] touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 text-center text-[11px] font-semibold leading-tight transition-colors sm:flex-row sm:gap-2 sm:text-xs lg:text-sm",
                    isActive
                      ? "border-[#ec5b13] bg-[#ec5b13]/10 text-[#ec5b13] shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="max-w-[10rem] sm:max-w-none">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>

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
                      value={transferForm.fromLocation}
                      onChange={(v) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          fromLocation: v || prev.fromLocation,
                          ...(v && prev.toLocation === v
                            ? {
                                toLocation:
                                  LOCATION_OPTIONS.find((o) => o.value !== v)?.value ??
                                  prev.toLocation,
                              }
                            : {}),
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
                      value={transferForm.toLocation}
                      onChange={(v) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          toLocation: v || prev.toLocation,
                        }))
                      }
                      options={LOCATION_OPTIONS.filter(
                        (o) => o.value !== transferForm.fromLocation
                      )}
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

            <div className="mt-8 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-end">
              <p className="w-full text-xs font-semibold uppercase tracking-wide text-slate-600">
                History period (main store movements &amp; ledger previews — same range as Movement Ledger tab)
              </p>
              <AppDatePicker label="Start" selected={ledgerStart} onChange={setLedgerStart} />
              <AppDatePicker label="End" selected={ledgerEnd} onChange={setLedgerEnd} />
            </div>

            {/* Recent station transfers — edit / delete / complete (pending) */}
            <div className="mt-10">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-1">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent transfer orders</h3>
                  <p className="text-xs text-slate-500">
                    Edit, delete, or complete while <strong>pending</strong>. Uses the same list as the
                    Transfers tab.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("transfers")}
                  className="text-xs font-semibold text-[#ec5b13] hover:underline"
                >
                  Open Transfers tab
                </button>
              </div>
              {transfersLoading ? (
                <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ) : transferHistoryPreview.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
                  No transfers yet. Use <strong>Proceed to items</strong> above to create one.
                </p>
              ) : (
                <ul className="space-y-3">
                  {transferHistoryPreview.map((row: any) => (
                    <li
                      key={row._id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">{row.transferNumber}</span>
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
                          <p className="text-sm text-slate-600">
                            <span>{LOCATION_LABELS[row.fromLocation] ?? row.fromLocation}</span>
                            <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-[#ec5b13]" />
                            <span>{LOCATION_LABELS[row.toLocation] ?? row.toLocation}</span>
                            <span className="text-slate-400"> · </span>
                            {new Date(row.transferDate).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {row.status === STATION_TRANSFER_STATUS.PENDING && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleCompleteTransfer(row)}
                                loading={updateTransferMut.isPending}
                                className="rounded-lg bg-[#5a189a] text-white hover:bg-[#7b2cbf]"
                              >
                                Complete
                              </Button>
                              <button
                                type="button"
                                onClick={() => openEditTransfer(row)}
                                className="rounded-lg p-2 text-[#5a189a] hover:bg-[#5a189a]/10"
                                aria-label="Edit transfer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTransferId(String(row._id))}
                                className="rounded-lg p-2 text-[#dc2626] hover:bg-red-50"
                                aria-label="Delete transfer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Main store–related ledger rows */}
            <div className="mt-10">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2 px-1">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Main store movements</h3>
                  <p className="text-xs text-slate-500">
                    Ledger history where stock moved from or to <strong>Main Store</strong> (inventory).
                    Edit label/reason or delete a row.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("ledger")}
                  className="text-xs font-semibold text-[#ec5b13] hover:underline"
                >
                  Full movement ledger
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {homeLedgerLoading ? (
                  <div className="h-32 animate-pulse bg-slate-100" />
                ) : mainStoreHistoryRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No main store movements in this date range.
                  </p>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100 md:hidden">
                      {mainStoreHistoryRows.map((r: any) => {
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
                          <div
                            key={r._id}
                            className="space-y-3 bg-white p-4 first:rounded-t-2xl last:rounded-b-2xl"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900">
                                {r.inventoryItemId?.name ?? r.itemName ?? "—"}
                              </p>
                              <p className="shrink-0 text-xs text-slate-500">
                                {new Date(r.createdAt).toLocaleString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                {LOCATION_LABELS[r.fromLocation] ?? r.fromLocation}
                              </span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-[#ec5b13]" aria-hidden />
                              <span className="rounded-md bg-[#ec5b13]/10 px-2 py-1 text-xs text-[#ec5b13]">
                                {LOCATION_LABELS[r.toLocation] ?? r.toLocation}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{qtyText}</p>
                            {r.reason ? (
                              <p className="text-xs leading-relaxed text-slate-500">{r.reason}</p>
                            ) : null}
                            <div className="flex justify-end gap-1 border-t border-slate-100 pt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setLedgerEdit({
                                    id: String(r._id),
                                    itemName:
                                      r.inventoryItemId?.name ?? r.itemName ?? "",
                                    reason: r.reason ?? "",
                                  })
                                }
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#5a189a] hover:bg-[#5a189a]/10"
                                aria-label="Edit ledger row"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteLedgerId(String(r._id))}
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#dc2626] hover:bg-red-50"
                                aria-label="Delete ledger row"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                              Time
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
                            <th className="w-24 px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {mainStoreHistoryRows.map((r: any) => {
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
                                  {new Date(r.createdAt).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
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
                                <td className="px-4 py-3 text-sm font-bold">
                                  {qtyText}
                                  {r.reason && (
                                    <p className="mt-1 max-w-[200px] text-xs font-normal text-slate-500">
                                      {r.reason}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right align-top">
                                  <div className="flex justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLedgerEdit({
                                          id: String(r._id),
                                          itemName:
                                            r.inventoryItemId?.name ?? r.itemName ?? "",
                                          reason: r.reason ?? "",
                                        })
                                      }
                                      className="rounded-lg p-2 text-[#5a189a] hover:bg-[#5a189a]/10"
                                      aria-label="Edit ledger row"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteLedgerId(String(r._id))}
                                      className="rounded-lg p-2 text-[#dc2626] hover:bg-red-50"
                                      aria-label="Delete ledger row"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Recent ledger preview (all locations) */}
            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between px-1">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent ledger movements</h3>
                  <p className="text-xs text-slate-500">
                    Latest rows in the date range (kitchen ↔ front house included). Same edit/delete as
                    the Movement Ledger tab.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("ledger")}
                  className="text-xs font-semibold text-[#ec5b13] hover:underline"
                >
                  View all records
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {homeLedgerLoading ? (
                  <div className="h-32 animate-pulse bg-slate-100" />
                ) : homeLedgerPreview.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No recent movements recorded.
                  </p>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100 md:hidden">
                      {homeLedgerPreview.map((r: any) => {
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
                          <div
                            key={r._id}
                            className="space-y-3 bg-white p-4 first:rounded-t-2xl last:rounded-b-2xl"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900">
                                {r.inventoryItemId?.name ?? r.itemName ?? "—"}
                              </p>
                              <p className="shrink-0 text-xs text-slate-500">
                                {new Date(r.createdAt).toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                {LOCATION_LABELS[r.fromLocation] ?? r.fromLocation}
                              </span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-[#ec5b13]" aria-hidden />
                              <span className="rounded-md bg-[#ec5b13]/10 px-2 py-1 text-xs text-[#ec5b13]">
                                {LOCATION_LABELS[r.toLocation] ?? r.toLocation}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{qtyText}</p>
                            {r.reason ? (
                              <p className="text-xs leading-relaxed text-slate-500">{r.reason}</p>
                            ) : null}
                            <div className="flex justify-end gap-1 border-t border-slate-100 pt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setLedgerEdit({
                                    id: String(r._id),
                                    itemName:
                                      r.inventoryItemId?.name ?? r.itemName ?? "",
                                    reason: r.reason ?? "",
                                  })
                                }
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#5a189a] hover:bg-[#5a189a]/10"
                                aria-label="Edit ledger row"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteLedgerId(String(r._id))}
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#dc2626] hover:bg-red-50"
                                aria-label="Delete ledger row"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
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
                            <th className="w-24 px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {homeLedgerPreview.map((r: any) => {
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
                                <td className="px-4 py-3 text-sm font-bold">
                                  {qtyText}
                                  {r.reason && (
                                    <p className="mt-1 max-w-[200px] text-xs font-normal text-slate-500">
                                      {r.reason}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right align-top">
                                  <div className="flex justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLedgerEdit({
                                          id: String(r._id),
                                          itemName:
                                            r.inventoryItemId?.name ?? r.itemName ?? "",
                                          reason: r.reason ?? "",
                                        })
                                      }
                                      className="rounded-lg p-2 text-[#5a189a] hover:bg-[#5a189a]/10"
                                      aria-label="Edit ledger row"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteLedgerId(String(r._id))}
                                      className="rounded-lg p-2 text-[#dc2626] hover:bg-red-50"
                                      aria-label="Delete ledger row"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
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
                  <h3 className="text-sm font-medium text-[#374151]">Kitchen usage history</h3>
                  <p className="text-xs text-[#9ca3af]">
                    Quantities are in inventory (base) units; when a yield mapping exists, yield units appear on the
                    line below.
                  </p>
                  <ul className="space-y-3">
                    {(kitchenUsages as any[]).map((u: any) => (
                      <li
                        key={u._id}
                        className="rounded-lg border border-[#e5e7eb] px-4 py-3"
                      >
                        {(() => {
                          const isAuto = !!u.sourceType && u.sourceType !== "manual";
                          const autoLabel =
                            u.sourceType === "productionBatch"
                              ? "Auto (from production)"
                              : u.sourceType === "recipe"
                                ? "Auto (from recipe)"
                                : "Auto";
                          const autoSourceText =
                            u.sourceLabel ||
                            (u.sourceType === "productionBatch"
                              ? "Auto-generated from production batch"
                              : u.sourceType === "recipe"
                                ? "Auto-generated from recipe"
                                : "Auto-generated");
                          const sourceRefId = toIdString(u.sourceRefId);
                          const sourceHref =
                            u.sourceType === "productionBatch" && sourceRefId
                              ? `/restaurant/production?sourceBatchId=${encodeURIComponent(sourceRefId)}`
                              : u.sourceType === "recipe" && sourceRefId
                                ? `/restaurant/recipes?sourceRecipeId=${encodeURIComponent(sourceRefId)}`
                                : null;
                          return (
                            <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#374151]">
                              {new Date(u.usageDate).toLocaleDateString("en-GB")}
                            </p>
                            {isAuto && (
                              <Badge variant="info">{autoLabel}</Badge>
                            )}
                          </div>
                          {!isAuto && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditKitchen(u)}
                                className="rounded-lg p-2 text-[#5a189a] hover:bg-[#5a189a]/10"
                                aria-label="Edit kitchen usage"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteKitchenId(String(u._id))}
                                className="rounded-lg p-2 text-[#dc2626] hover:bg-red-50"
                                aria-label="Delete kitchen usage"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        {isAuto && (
                          <p className="mt-1 text-xs text-slate-500">
                            {autoSourceText}
                            {sourceHref ? (
                              <>
                                {" "}
                                <Link
                                  href={sourceHref}
                                  className="font-medium text-[#5a189a] underline underline-offset-2 hover:text-[#7b2cbf]"
                                >
                                  Open source
                                </Link>
                              </>
                            ) : null}
                          </p>
                        )}
                            </>
                          );
                        })()}
                        <ul className="mt-2 space-y-3">
                          {(u.lines ?? []).map((line: any, idx: number) => {
                            let id = toIdString(line.inventoryItemId);
                            if (!id && line.itemName) {
                              const match = inventoryItems.find((i: any) =>
                                String(i.name).toLowerCase() === String(line.itemName).toLowerCase()
                              );
                              if (match) id = String(match._id);
                            }
                            const unit = line.unit ?? "";
                            const issued = Number(line.issuedQty ?? line.quantityUsed ?? 0);
                            const used = Number(line.usedQty ?? line.quantityUsed ?? 0);
                            const leftover = Number(line.leftoverQty ?? 0);
                            const chefQty = Number(line.chefQty ?? 0);
                            const chefUnitKey = String(line.chefUnitId ?? "").trim();
                            const chefYieldMatch = chefUnitKey
                              ? (yieldMappings as any[]).find((y: any) => {
                                  const toId = String(y?.toUnitId?._id ?? y?.toUnitId ?? "");
                                  return toId === chefUnitKey;
                                })
                              : null;
                            const chefUnitName = String(
                              chefYieldMatch?.toUnitId?.name ??
                                chefYieldMatch?.toUnitName ??
                                ""
                            ).trim();
                            const formula = getChefFormulaText(id, unit);
                            const col = (label: string, qty: number) => {
                              const sub = formatYieldEquivSubtitle(id, qty);
                              return (
                                <div className="min-w-28">
                                  <div className="text-[#6b7280]">
                                    <span className="text-[#6b7280]">{label} </span>
                                    <span className="font-medium text-[#374151]">{formatBaseQtyOnly(qty, unit)}</span>
                                  </div>
                                  {sub ? (
                                    <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-500">{sub}</p>
                                  ) : null}
                                </div>
                              );
                            };
                            return (
                              <li key={idx} className="rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2">
                                <p className="text-sm font-medium text-[#374151]">{line.itemName}</p>
                                <div className="mt-2 flex flex-wrap items-start gap-x-3 gap-y-2 text-sm">
                                  {col("In kitchen", issued)}
                                  <span className="pt-0.5 text-slate-400" aria-hidden>
                                    →
                                  </span>
                                  {col("Used", used)}
                                  <span className="pt-0.5 text-slate-400" aria-hidden>
                                    +
                                  </span>
                                  {col("Leftover", leftover)}
                                </div>
                                {formula ? (
                                  <p className="mt-2 text-xs text-[#9ca3af]">Yield: {formula}</p>
                                ) : null}
                                {chefQty > 0 ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Chef yield: {formatDisplayQuantity(chefQty, 1)}{" "}
                                    {formatChefUnitName(chefUnitName || "unit", chefQty)}
                                  </p>
                                ) : null}
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
            <p className="text-sm text-[#6b7280]">
              Use <strong>Edit</strong> or <strong>Delete</strong> on each card while the transfer is{" "}
              <strong>pending</strong>. Complete applies stock; completed transfers cannot be deleted here.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                {pendingTransferIds.length > 0 && (
                  <>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#d1d5db] text-[#ff6d00] focus:ring-[#ff6d00]"
                        checked={
                          selectedTransferIds.length > 0 &&
                          selectedTransferIds.length === pendingTransferIds.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransferIds([...pendingTransferIds]);
                          } else {
                            setSelectedTransferIds([]);
                          }
                        }}
                        aria-label="Select all pending transfers"
                      />
                      <span>Select all pending</span>
                    </label>
                    <span className="text-sm text-[#6b7280]">
                      {selectedTransferIds.length} selected
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={selectedTransferIds.length === 0}
                      onClick={() => setConfirmBulkTransfers(true)}
                    >
                      Delete selected
                    </Button>
                  </>
                )}
              </div>
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
                            {row.status === STATION_TRANSFER_STATUS.PENDING && (
                              <div className="flex shrink-0 pt-1">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-[#d1d5db] text-[#ff6d00] focus:ring-[#ff6d00]"
                                  checked={selectedTransferIds.includes(String(row._id))}
                                  onChange={() => toggleTransferSelect(String(row._id))}
                                  aria-label={`Select transfer ${row.transferNumber}`}
                                />
                              </div>
                            )}
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
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="flex flex-wrap gap-4">
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
                {ledgerRows.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#d1d5db] text-[#ff6d00] focus:ring-[#ff6d00]"
                        checked={
                          ledgerRowIds.length > 0 &&
                          selectedLedgerIds.length === ledgerRowIds.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLedgerIds([...ledgerRowIds]);
                          } else {
                            setSelectedLedgerIds([]);
                          }
                        }}
                        aria-label="Select all rows on this page"
                      />
                      <span>Page</span>
                    </label>
                    <span className="text-sm text-[#6b7280]">
                      {selectedLedgerIds.length} selected
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={selectedLedgerIds.length === 0}
                      onClick={() => setConfirmBulkLedger(true)}
                    >
                      Delete selected
                    </Button>
                  </div>
                )}
              </div>
              {ledgerLoading ? (
                <div className="h-48 animate-pulse rounded-xl bg-[#f3f4f6]" />
              ) : ledgerRows.length === 0 ? (
                <p className="py-8 text-center text-[#6b7280]">No movements in this period.</p>
              ) : (
                <>
                  <div className="divide-y divide-[#e5e7eb] rounded-xl border border-[#e5e7eb] md:hidden">
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
                        <div
                          key={r._id}
                          className="flex gap-3 bg-white p-4 first:rounded-t-xl last:rounded-b-xl"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-5 w-5 shrink-0 rounded border-[#d1d5db] text-[#ff6d00] focus:ring-[#ff6d00]"
                            checked={selectedLedgerIds.includes(String(r._id))}
                            onChange={() => toggleLedgerSelect(String(r._id))}
                            aria-label="Select ledger row"
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 text-sm font-semibold text-[#1f2937]">
                                {r.inventoryItemId?.name ?? r.itemName ?? "—"}
                              </p>
                              <p className="max-w-[11rem] shrink-0 text-right text-[11px] leading-snug text-[#6b7280]">
                                {new Date(r.createdAt).toLocaleString("en-GB")}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-[#6b7280]">
                              <span>{LOCATION_LABELS[r.fromLocation] ?? r.fromLocation}</span>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#ec5b13]" aria-hidden />
                              <span>{LOCATION_LABELS[r.toLocation] ?? r.toLocation}</span>
                            </div>
                            <p className="text-base font-semibold text-[#111827]">
                              {formatQtyWithChef(itemId, Number(r.quantity ?? 0), r.unit ?? "")}
                            </p>
                            {formulaText ? (
                              <p className="text-xs text-[#9ca3af]">{formulaText}</p>
                            ) : null}
                            {r.reason ? (
                              <p className="text-xs leading-relaxed text-[#6b7280]">{r.reason}</p>
                            ) : null}
                            <div className="flex justify-end gap-1 border-t border-[#f3f4f6] pt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setLedgerEdit({
                                    id: String(r._id),
                                    itemName:
                                      r.inventoryItemId?.name ?? r.itemName ?? "",
                                    reason: r.reason ?? "",
                                  })
                                }
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#5a189a] hover:bg-[#5a189a]/10"
                                aria-label="Edit ledger row"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteLedgerId(String(r._id))}
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#dc2626] hover:bg-red-50"
                                aria-label="Delete ledger row"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e5e7eb]">
                          <th className="w-10 px-2 py-3 text-left font-medium text-[#374151]">
                            <span className="sr-only">Select</span>
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-[#374151]">Date</th>
                          <th className="px-4 py-3 text-left font-medium text-[#374151]">Item</th>
                          <th className="px-4 py-3 text-left font-medium text-[#374151]">From</th>
                          <th className="px-4 py-3 text-left font-medium text-[#374151]">To</th>
                          <th className="px-4 py-3 text-right font-medium text-[#374151]">Qty</th>
                          <th className="w-24 px-4 py-3 text-right font-medium text-[#374151]">
                            Actions
                          </th>
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
                              <td className="px-2 py-3 align-middle">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-[#d1d5db] text-[#ff6d00] focus:ring-[#ff6d00]"
                                  checked={selectedLedgerIds.includes(String(r._id))}
                                  onChange={() => toggleLedgerSelect(String(r._id))}
                                  aria-label="Select ledger row"
                                />
                              </td>
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
                                {r.reason && (
                                  <p className="mt-1 max-w-[200px] text-left text-xs text-[#6b7280]">
                                    {r.reason}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right align-top">
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLedgerEdit({
                                        id: String(r._id),
                                        itemName:
                                          r.inventoryItemId?.name ?? r.itemName ?? "",
                                        reason: r.reason ?? "",
                                      })
                                    }
                                    className="rounded-lg p-2 text-[#5a189a] hover:bg-[#5a189a]/10"
                                    aria-label="Edit ledger row"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteLedgerId(String(r._id))}
                                    className="rounded-lg p-2 text-[#dc2626] hover:bg-red-50"
                                    aria-label="Delete ledger row"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {ledgerPagination && ledgerPagination.total > ledgerPagination.limit && (
                <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-center text-sm text-[#6b7280] sm:text-left">
                    Page {ledgerPagination.page} of{" "}
                    {Math.ceil(ledgerPagination.total / ledgerPagination.limit)}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ledgerPage <= 1}
                      onClick={() => setLedgerPage((p) => p - 1)}
                      className="min-h-[44px] touch-manipulation"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ledgerPage >= Math.ceil(ledgerPagination.total / ledgerPagination.limit)}
                      onClick={() => setLedgerPage((p) => p + 1)}
                      className="min-h-[44px] touch-manipulation"
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
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Items tracked
                </p>
                <p className="mt-1 text-xl font-bold text-[#111827]">{stockByLocationStats.itemsTracked}</p>
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Available total
                </p>
                <p className="mt-1 text-xl font-bold text-[#111827]">
                  {formatDisplayQuantity(stockByLocationStats.availableTotal, 1)}
                </p>
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Used (prep)
                </p>
                <p className="mt-1 text-xl font-bold text-[#ff6d00]">
                  {formatDisplayQuantity(stockByLocationStats.usedQty, 1)}
                </p>
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Leftover returned
                </p>
                <p className="mt-1 text-xl font-bold text-[#7b2cbf]">
                  {formatDisplayQuantity(stockByLocationStats.leftoverQty, 1)}
                </p>
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Kitchen available
                </p>
                <p className="mt-1 text-lg font-semibold text-[#111827]">
                  {formatDisplayQuantity(stockByLocationStats.availableKitchen, 1)}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-[#9ca3af]">
                  Sum of each row&apos;s quantity (units can differ per item; not one common unit).
                </p>
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Front available
                </p>
                <p className="mt-1 text-lg font-semibold text-[#111827]">
                  {formatDisplayQuantity(stockByLocationStats.availableFront, 1)}
                </p>
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Expected kitchen (pending)
                </p>
                <p className="mt-1 text-lg font-semibold text-[#111827]">
                  {formatDisplayQuantity(stockByLocationStats.expectedKitchen, 1)}
                </p>
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Expected front (pending)
                </p>
                <p className="mt-1 text-lg font-semibold text-[#111827]">
                  {formatDisplayQuantity(stockByLocationStats.expectedFront, 1)}
                </p>
              </div>
            </div>
            {deletableLocationStockIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-4 py-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#d1d5db] text-[#ff6d00] focus:ring-[#ff6d00]"
                    checked={
                      selectedLocationStockIds.length > 0 &&
                      selectedLocationStockIds.length === deletableLocationStockIds.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLocationStockIds([...deletableLocationStockIds]);
                      } else {
                        setSelectedLocationStockIds([]);
                      }
                    }}
                    aria-label="Select all kitchen and front house rows"
                  />
                  <span>Select all (kitchen &amp; front)</span>
                </label>
                <span className="text-sm text-[#6b7280]">
                  {selectedLocationStockIds.length} selected
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={selectedLocationStockIds.length === 0}
                  onClick={() => setConfirmBulkLocationStock(true)}
                >
                  Delete selected
                </Button>
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-3">
            <Card className="overflow-hidden rounded-2xl border-[#e5e7eb]">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Store className="h-8 w-8 text-[#5a189a]" />
                  <h3 className="font-semibold text-[#1f2937]">Main Store</h3>
                </div>
                <p className="mt-2 text-xs text-[#6b7280]">
                  Balances live on each POS inventory item. Use POS inventory to adjust main store stock.
                </p>
                <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                  {mainStore.length === 0 ? (
                    <li className="text-sm text-[#6b7280]">No stock</li>
                  ) : (
                    (mainStore as any[]).map((s: any) => {
                      const id = toIdString(s.inventoryItemId);
                      const formula = getChefFormulaText(id, s.unit ?? "");
                      return (
                        <li key={`ms-${id}`} className="flex flex-col gap-0.5 py-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#374151]">{resolveLocationItemName(s)}</span>
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
                  {kitchenStockVisible.length === 0 ? (
                    <li className="text-sm text-[#6b7280]">No stock</li>
                  ) : (
                    kitchenStockVisible.map((s: any) => {
                      const id = toIdString(s.inventoryItemId);
                      const rowId = toIdString(s._id);
                      const canSelect = rowId.length > 0;
                      const formula = getChefFormulaText(id, s.unit ?? "");
                      return (
                        <li key={rowId || `kit-${id}`} className="flex flex-col gap-0.5 py-1">
                          <div className="flex items-start gap-2">
                            {canSelect && (
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#d1d5db] text-[#ff6d00] focus:ring-[#ff6d00]"
                                checked={selectedLocationStockIds.includes(rowId)}
                                onChange={() => toggleLocationStockSelect(rowId)}
                                aria-label={`Select ${resolveLocationItemName(s)} in kitchen`}
                              />
                            )}
                            <div className="flex min-w-0 flex-1 justify-between gap-2 text-sm">
                              <span className="text-[#374151]">{resolveLocationItemName(s)}</span>
                              <span className="flex shrink-0 items-center gap-1 font-medium">
                                {formatQtyWithChef(id, Number(s.quantity ?? 0), s.unit ?? "")}
                                {canSelect && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setStockEdit({
                                          id: rowId,
                                          quantity: String(s.quantity ?? 0),
                                          unit: String(s.unit ?? ""),
                                          label: `${resolveLocationItemName(s)} (Kitchen)`,
                                        })
                                      }
                                      className="rounded p-1 text-[#5a189a] hover:bg-[#5a189a]/10"
                                      aria-label="Edit kitchen stock"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteLocationStockId(rowId)}
                                      className="rounded p-1 text-[#dc2626] hover:bg-red-50"
                                      aria-label="Delete kitchen stock row"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                          {formula && (
                            <p
                              className={`text-xs text-[#9ca3af] ${canSelect ? "pl-6" : ""}`}
                            >
                              {formula}
                            </p>
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
                  {frontHouseStockVisible.length === 0 ? (
                    <li className="text-sm text-[#6b7280]">No stock</li>
                  ) : (
                    frontHouseStockVisible.map((s: any) => {
                      const id = toIdString(s.inventoryItemId);
                      const rowId = toIdString(s._id);
                      const canSelect = rowId.length > 0;
                      const formula = getChefFormulaText(id, s.unit ?? "");
                      return (
                        <li key={rowId || `fh-${id}`} className="flex flex-col gap-0.5 py-1">
                          <div className="flex items-start gap-2">
                            {canSelect && (
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#d1d5db] text-[#ff6d00] focus:ring-[#ff6d00]"
                                checked={selectedLocationStockIds.includes(rowId)}
                                onChange={() => toggleLocationStockSelect(rowId)}
                                aria-label={`Select ${resolveLocationItemName(s)} in front house`}
                              />
                            )}
                            <div className="flex min-w-0 flex-1 justify-between gap-2 text-sm">
                              <span className="text-[#374151]">{resolveLocationItemName(s)}</span>
                              <span className="flex shrink-0 items-center gap-1 font-medium">
                                {formatQtyWithChef(id, Number(s.quantity ?? 0), s.unit ?? "")}
                                {canSelect && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setStockEdit({
                                          id: rowId,
                                          quantity: String(s.quantity ?? 0),
                                          unit: String(s.unit ?? ""),
                                          label: `${resolveLocationItemName(s)} (Front house)`,
                                        })
                                      }
                                      className="rounded p-1 text-[#5a189a] hover:bg-[#5a189a]/10"
                                      aria-label="Edit front house stock"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteLocationStockId(rowId)}
                                      className="rounded p-1 text-[#dc2626] hover:bg-red-50"
                                      aria-label="Delete front house stock row"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                          {formula && (
                            <p
                              className={`text-xs text-[#9ca3af] ${canSelect ? "pl-6" : ""}`}
                            >
                              {formula}
                            </p>
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              </CardContent>
            </Card>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Modal — Bookgh: white base, orange/purple accents */}
      <Modal
        open={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          resetTransferForm();
        }}
        title=""
        size="2xl"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
        className="overflow-hidden rounded-2xl border-0 bg-white shadow-2xl ring-1 ring-slate-200/70"
      >
        <div className="flex min-h-0 max-h-[90vh] flex-1 flex-col">
          <form onSubmit={handleSubmitTransfer} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="relative overflow-hidden border-b border-[#fed7aa]/80 bg-gradient-to-br from-[#fff7ed] via-white to-[#f5f0ff] px-6 pb-6 pt-7">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-[#ff6d00]/20 to-transparent blur-2xl" />
                <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-[#7b2cbf]/15 blur-2xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] shadow-lg shadow-[#ff6d00]/25 ring-2 ring-white/60">
                      <ArrowRightLeft className="h-7 w-7 text-white" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#5a189a]">
                        {editTransfer ? "Update movement" : "Stock movement"}
                      </p>
                      <h2 id="modal-title" className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                        {editTransfer ? "Edit transfer" : "New transfer"}
                      </h2>
                      <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
                        {editTransfer
                          ? "Adjust where stock is coming from, what moves, and when — your team sees the update right away."
                          : "Pick where stock leaves and where it lands, line up items and quantities, and move inventory in one confident step."}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowTransferModal(false);
                      resetTransferForm();
                    }}
                    className="shrink-0 rounded-full text-slate-500 hover:bg-white/90 hover:text-slate-900"
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-6 px-6 py-6">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/40 ring-1 ring-slate-100">
                <p className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#faf5ff] px-2.5 py-0.5 text-[11px] font-bold text-[#5a189a] ring-1 ring-[#e9d5ff]">
                    Route
                  </span>
                  <span className="text-slate-400">Choose origin and destination</span>
                </p>
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Store className="h-3.5 w-3.5" />
                      </span>
                      From
                    </span>
                    <AppReactSelect
                      value={transferForm.fromLocation}
                      onChange={(v) =>
                        setTransferForm((f) => ({
                          ...f,
                          fromLocation: v,
                          ...(f.toLocation === v
                            ? {
                                toLocation:
                                  LOCATION_OPTIONS.find((o) => o.value !== v)?.value ?? f.toLocation,
                              }
                            : {}),
                        }))
                      }
                      options={LOCATION_OPTIONS}
                      placeholder="Origin location"
                      visualVariant="m3"
                    />
                  </div>
                  <div className="hidden shrink-0 items-center justify-center pb-1 md:flex">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffedd5] to-[#faf5ff] ring-1 ring-[#fed7aa]/80">
                      <ArrowRight className="h-5 w-5 text-[#c2410c]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        {transferForm.toLocation === STOCK_LOCATION.KITCHEN ? (
                          <ChefHat className="h-3.5 w-3.5" />
                        ) : transferForm.toLocation === STOCK_LOCATION.FRONT_HOUSE ? (
                          <UtensilsCrossed className="h-3.5 w-3.5" />
                        ) : (
                          <Store className="h-3.5 w-3.5" />
                        )}
                      </span>
                      To
                    </span>
                    <AppReactSelect
                      value={transferForm.toLocation}
                      onChange={(v) => setTransferForm((f) => ({ ...f, toLocation: v }))}
                      options={LOCATION_OPTIONS.filter((o) => o.value !== transferForm.fromLocation)}
                      placeholder="Destination"
                      visualVariant="m3"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm ring-1 ring-slate-100">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <CalendarDays className="h-4 w-4 text-[#ea580c]" />
                  When does this transfer happen?
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
              </div>

              <div>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">Line items</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                        {transferForm.lines.length}{" "}
                        {transferForm.lines.length === 1 ? "line" : "lines"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Add one row per SKU. We show availability at your origin location.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTransferLine}
                    className="rounded-full border-[#e9d5ff] bg-[#faf5ff]/80 font-semibold text-[#5a189a] hover:bg-[#f3e8ff]"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
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
                        className={`rounded-2xl border p-4 transition-shadow ${
                          exceeds
                            ? "border-red-200 bg-gradient-to-br from-red-50/90 to-white shadow-sm ring-1 ring-red-100"
                            : "border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100 hover:shadow-md"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="min-w-[180px] flex-1">
                            <AppReactSelect
                              value={line.inventoryItemId}
                              onChange={(v) => updateTransferLine(idx, "inventoryItemId", v)}
                              options={[{ value: "", label: "Select item…" }, ...itemOptions]}
                              visualVariant="m3"
                            />
                          </div>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateTransferLine(idx, "quantity", e.target.value)}
                            className="w-24 rounded-xl border-slate-200"
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
                              visualVariant="m3"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTransferLine(idx)}
                            className="rounded-xl p-2.5 text-red-600 transition-colors hover:bg-red-50"
                            aria-label="Remove line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {line.inventoryItemId && (
                          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
                            {available != null && (
                              <p className="text-xs text-slate-600">
                                <span className="font-semibold text-slate-800">
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
                              <p className="text-sm font-semibold text-red-600">
                                Requested {formatQtyWithChef(line.inventoryItemId, requestedBase, item?.unit ?? "unit")}{" "}
                                — exceeds available by{" "}
                                {formatQtyWithChef(
                                  line.inventoryItemId,
                                  requestedBase - available.quantity,
                                  item?.unit ?? "unit"
                                )}
                              </p>
                            )}
                            {item && (item.minimumStock > 0 || item.reorderLevel > 0) && (
                              <p className="text-xs text-slate-500">
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

              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-1 ring-1 ring-slate-100">
                <Textarea
                  label="Notes (optional)"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-[#7b2cbf]/30"
                />
              </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200/90 bg-gradient-to-r from-slate-50/90 to-[#fff7ed]/40 px-6 py-4">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-[11px] text-slate-500 sm:text-left">
                  Transfers update location stock when saved. Double-check quantities against on-hand.
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTransferModal(false);
                      resetTransferForm();
                    }}
                    className="rounded-xl border-slate-200 font-semibold"
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
                    className="rounded-xl bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] px-6 font-bold text-white shadow-lg shadow-orange-500/25 transition hover:from-[#f97316] hover:to-[#fb923c]"
                  >
                    {editTransfer ? "Save changes" : "Create transfer"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Kitchen Usage Modal */}
      <Modal
        open={showKitchenModal}
        onClose={() => {
          setShowKitchenModal(false);
          resetKitchenForm();
        }}
        title={editKitchenUsage ? "Edit kitchen usage" : "Record kitchen usage"}
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
              loading={createKitchenMut.isPending || updateKitchenMut.isPending}
              className="rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9e00] text-white"
            >
              {editKitchenUsage ? "Save changes" : "Record usage"}
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

      <Modal
        open={confirmBulkTransfers}
        onClose={() => setConfirmBulkTransfers(false)}
        title="Delete selected transfers"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Delete {selectedTransferIds.length} pending transfer(s)? Completed transfers are never removed.
          This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmBulkTransfers(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDeleteTransfers}
            loading={bulkDeleteTransfersMut.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmBulkLedger}
        onClose={() => setConfirmBulkLedger(false)}
        title="Remove ledger history"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Permanently remove {selectedLedgerIds.length} movement ledger row(s) from this page? This
          deletes audit history for those entries and cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmBulkLedger(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDeleteLedger}
            loading={bulkDeleteLedgerMut.isPending}
          >
            Remove
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmBulkLocationStock}
        onClose={() => setConfirmBulkLocationStock(false)}
        title="Remove location stock rows"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Remove {selectedLocationStockIds.length} kitchen / front house stock row(s)? This clears those
          location balances for the selected items. Main store stock is not changed here—adjust it in
          POS inventory if needed.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmBulkLocationStock(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDeleteLocationStock}
            loading={bulkDeleteLocationStockMut.isPending}
          >
            Remove
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!deleteKitchenId}
        onClose={() => setDeleteKitchenId(null)}
        title="Delete kitchen usage"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Remove this kitchen usage record and reverse its stock movements (kitchen, front house, main
          store)? This cannot be undone if stock levels no longer allow reversal—you will see an error
          instead.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteKitchenId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteKitchen}
            loading={deleteKitchenMut.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!ledgerEdit}
        onClose={() => setLedgerEdit(null)}
        title="Edit ledger row"
        size="sm"
      >
        {ledgerEdit && (
          <div className="space-y-4">
            <p className="text-xs text-[#6b7280]">
              Adjust display name and reason only. Quantities are not changed here—delete the row if the
              movement was recorded incorrectly.
            </p>
            <Input
              label="Display name"
              value={ledgerEdit.itemName}
              onChange={(e) =>
                setLedgerEdit((prev) => (prev ? { ...prev, itemName: e.target.value } : prev))
              }
            />
            <Textarea
              label="Reason / note"
              value={ledgerEdit.reason}
              onChange={(e) =>
                setLedgerEdit((prev) => (prev ? { ...prev, reason: e.target.value } : prev))
              }
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setLedgerEdit(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLedgerEdit} loading={updateLedgerMut.isPending}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteLedgerId}
        onClose={() => setDeleteLedgerId(null)}
        title="Delete ledger row"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Remove this movement from the ledger? Stock levels are not adjusted—use this only to clean up
          incorrect history.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteLedgerId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteLedgerOne}
            loading={deleteLedgerMut.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!stockEdit}
        onClose={() => setStockEdit(null)}
        title="Edit location stock"
        size="sm"
      >
        {stockEdit && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-[#374151]">{stockEdit.label}</p>
            <Input
              label="Quantity (base unit)"
              type="number"
              min="0"
              step="0.0001"
              value={stockEdit.quantity}
              onChange={(e) =>
                setStockEdit((prev) => (prev ? { ...prev, quantity: e.target.value } : prev))
              }
            />
            <Input
              label="Unit label"
              value={stockEdit.unit}
              onChange={(e) =>
                setStockEdit((prev) => (prev ? { ...prev, unit: e.target.value } : prev))
              }
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStockEdit(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveStockEdit} loading={updateLocationStockMut.isPending}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteLocationStockId}
        onClose={() => setDeleteLocationStockId(null)}
        title="Delete location stock row"
        size="sm"
      >
        <p className="text-[#6b7280]">
          Remove this kitchen or front house stock row? The balance for that item at that location will
          be cleared.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteLocationStockId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteLocationStockOne}
            loading={deleteLocationStockMut.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
