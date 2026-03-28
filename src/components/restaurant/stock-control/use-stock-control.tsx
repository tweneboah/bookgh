"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { DEPARTMENT, PROCUREMENT_ORDER_STATUS } from "@/constants";
import {
  useCreateRestaurantInventoryMovement,
  useCreateRestaurantStockCount,
  useInventoryItems,
  useItemYields,
  usePurchaseOrders,
  useReceivePurchaseOrder,
  useRestaurantInventoryMovements,
} from "@/hooks/api";

export type CountLine = {
  inventoryItemId: string;
  physicalStock: string;
  note: string;
};

export const MOVEMENT_TYPE_OPTIONS = [
  { value: "", label: "All movement types" },
  { value: "restock", label: "Restock" },
  { value: "wastage", label: "Wastage / Loss" },
  { value: "adjustment", label: "Adjustment" },
  { value: "reversal", label: "Reversal" },
];

export const ENTRY_MOVEMENT_OPTIONS = MOVEMENT_TYPE_OPTIONS.filter((opt) => opt.value);

export function useRestaurantStockControl() {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState<Date | null>(() => startOfDay(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(() => endOfDay(new Date()));
  const [movementTypeFilter, setMovementTypeFilter] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("");

  const [openInfoKey, setOpenInfoKey] = useState<string | null>(null);
  const infoPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openInfoKey) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (infoPopoverRef.current && !infoPopoverRef.current.contains(e.target as Node)) {
        setOpenInfoKey(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openInfoKey]);

  const movementParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: "20",
    };
    if (movementTypeFilter) params.movementType = movementTypeFilter;
    if (inventoryFilter) params.inventoryItemId = inventoryFilter;
    if (startDate) params.startDate = startOfDay(startDate).toISOString();
    if (endDate) params.endDate = endOfDay(endDate).toISOString();
    return params;
  }, [page, movementTypeFilter, inventoryFilter, startDate, endDate]);

  const { data: inventoryData } = useInventoryItems({ limit: "500", department: "restaurant" });
  const { data: yieldsData } = useItemYields({ limit: "500" });
  const { data: movementData, isLoading: movementLoading } =
    useRestaurantInventoryMovements(movementParams);
  const { data: poData, isLoading: poLoading } = usePurchaseOrders({
    page: "1",
    limit: "50",
    department: "restaurant",
  });
  const { data: receiptData } = useRestaurantInventoryMovements({
    page: "1",
    limit: "10",
    movementType: "restock",
    source: "po-receipt",
  });

  const receivePurchaseOrderMut = useReceivePurchaseOrder();
  const createMovementMut = useCreateRestaurantInventoryMovement();
  const createStockCountMut = useCreateRestaurantStockCount();

  const inventoryItems = inventoryData?.data ?? [];
  const movementRows = movementData?.data ?? [];
  const movementPagination = movementData?.meta?.pagination;
  const purchaseOrders = poData?.data ?? [];
  const receiptRows = receiptData?.data ?? [];
  const yieldMappings = yieldsData?.data ?? [];

  const inventoryMap = useMemo(
    () => Object.fromEntries(inventoryItems.map((item: any) => [String(item._id), item])),
    [inventoryItems]
  );

  const yieldByItem = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const y of yieldMappings) {
      const itemId =
        typeof y.inventoryItemId === "object" ? y.inventoryItemId._id : y.inventoryItemId;
      if (!m.has(itemId)) m.set(itemId, []);
      m.get(itemId)!.push(y);
    }
    return m;
  }, [yieldMappings]);

  const formatChefUnitName = (unitObj: any, qty: number) => {
    const rawName = String(unitObj?.name ?? unitObj?.abbreviation ?? "unit").trim();
    if (!rawName) return "unit";
    if (qty === 1) return rawName;
    if (rawName.endsWith("s")) return rawName;
    return `${rawName}s`;
  };

  const buildChefReadableEquivalents = (inventoryItemId: string, baseQty: number) => {
    const mappings = yieldByItem.get(inventoryItemId) ?? [];
    return mappings
      .map((y: any) => {
        const fromQty = Number(y?.fromQty ?? 0);
        const toQty = Number(y?.toQty ?? 0);
        const baseUnitQty = Number(y?.baseUnitQty ?? 0);
        if (fromQty <= 0 || toQty <= 0 || baseUnitQty <= 0) return null;

        const fromUnit = y?.fromUnitId;
        const toUnit = y?.toUnitId;
        const purchaseQtyLeft = (baseQty / baseUnitQty) * fromQty;
        const chefQtyLeft = (baseQty / baseUnitQty) * toQty;
        return {
          id: String(y?._id ?? `${inventoryItemId}-${fromQty}-${toQty}`),
          purchaseQtyLeft,
          chefQtyLeft,
          purchaseUnitName: formatChefUnitName(fromUnit, purchaseQtyLeft),
          chefUnitName: formatChefUnitName(toUnit, chefQtyLeft),
          baseUnitQty,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      purchaseQtyLeft: number;
      chefQtyLeft: number;
      purchaseUnitName: string;
      chefUnitName: string;
      baseUnitQty: number;
    }>;
  };

  const chefReadableText = (inventoryItemId: string, baseQty: number) => {
    const eq = buildChefReadableEquivalents(inventoryItemId, baseQty);
    if (!eq.length) return null;
    const primary = eq[0];
    return `${primary.purchaseQtyLeft.toFixed(2)} ${primary.purchaseUnitName} / ${primary.chefQtyLeft.toFixed(
      1
    )} ${primary.chefUnitName}`;
  };

  const inventoryOptions = useMemo(
    () =>
      inventoryItems.map((item: any) => ({
        value: String(item._id),
        label: `${item.name} (${item.unit ?? "unit"})`,
      })),
    [inventoryItems]
  );

  // Movement entry
  const [movementForm, setMovementForm] = useState({
    inventoryItemId: "",
    movementType: "wastage",
    quantity: "",
    unit: "",
    reason: "",
  });
  const [movementConfirmed, setMovementConfirmed] = useState(false);

  useEffect(() => {
    setMovementConfirmed(false);
  }, [movementForm.inventoryItemId, movementForm.movementType, movementForm.quantity, movementForm.unit]);

  const isDeductionType = (type: string) => ["sale", "wastage", "closing"].includes(type);
  const movementPreview = useMemo(() => {
    if (!movementForm.inventoryItemId || !movementForm.movementType || movementForm.quantity === "") {
      return null;
    }
    const qty = Number(movementForm.quantity);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    const item = inventoryMap[movementForm.inventoryItemId] as
      | { name?: string; unit?: string; currentStock?: number }
      | undefined;
    const currentStock = Number(item?.currentStock ?? 0);
    const deduct = isDeductionType(movementForm.movementType);
    const resultingStock = deduct
      ? Number((currentStock - qty).toFixed(4))
      : Number((currentStock + qty).toFixed(4));
    const unit = movementForm.unit || item?.unit || "unit";
    return {
      itemName: item?.name ?? movementForm.inventoryItemId,
      movementType: movementForm.movementType,
      quantity: qty,
      unit,
      reason: movementForm.reason || "—",
      currentStock,
      resultingStock,
      isDeduction: deduct,
    };
  }, [movementForm, inventoryMap]);

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementForm.inventoryItemId || !movementForm.movementType || !movementForm.quantity) {
      toast.error("Ingredient, movement type, and quantity are required");
      return;
    }
    if (!movementConfirmed && movementPreview) {
      toast.error("Review the preview and confirm before saving");
      return;
    }
    const quantity = Number(movementForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    try {
      const item = inventoryMap[movementForm.inventoryItemId];
      const unit = item?.unit ?? movementForm.unit ?? "unit";
      await createMovementMut.mutateAsync({
        inventoryItemId: movementForm.inventoryItemId,
        movementType: movementForm.movementType,
        quantity,
        unit,
        reason: movementForm.reason || "Restaurant stock movement",
      });
      const resultingStock = movementPreview?.resultingStock;
      toast.success(
        resultingStock != null
          ? `Movement saved. Stock is now ${resultingStock.toFixed(1)} ${movementPreview?.unit ?? ""}.`
          : "Stock movement logged"
      );
      setMovementForm({
        inventoryItemId: "",
        movementType: "wastage",
        quantity: "",
        unit: "",
        reason: "",
      });
      setMovementConfirmed(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to log movement");
    }
  };

  // Stock count
  const [countDate, setCountDate] = useState<Date | null>(new Date());
  const [countNotes, setCountNotes] = useState("");
  const [countLines, setCountLines] = useState<CountLine[]>([
    { inventoryItemId: "", physicalStock: "", note: "" },
  ]);
  const [countConfirmed, setCountConfirmed] = useState(false);
  const [countSortByVariance, setCountSortByVariance] = useState(false);
  const [lastStockCount, setLastStockCount] = useState<any>(null);

  useEffect(() => {
    setCountConfirmed(false);
  }, [countLines]);

  const stockCountPreview = useMemo(() => {
    return countLines
      .filter((line) => line.inventoryItemId && line.physicalStock !== "")
      .map((line) => {
        const item = inventoryMap[line.inventoryItemId] as
          | { name?: string; unit?: string; currentStock?: number }
          | undefined;
        const systemStock = Number(item?.currentStock ?? 0);
        const physicalStock = Number(line.physicalStock);
        const variance = Number((physicalStock - systemStock).toFixed(4));
        return {
          inventoryItemId: line.inventoryItemId,
          itemName: item?.name ?? line.inventoryItemId,
          unit: item?.unit ?? "unit",
          systemStock,
          physicalStock,
          variance,
          note: line.note || "",
        };
      });
  }, [countLines, inventoryMap]);

  const stockCountPreviewSorted = useMemo(() => {
    if (!countSortByVariance) return stockCountPreview;
    return [...stockCountPreview].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [stockCountPreview, countSortByVariance]);

  const varianceSummary = useMemo(() => {
    let gain = 0;
    let loss = 0;
    let match = 0;
    stockCountPreview.forEach((r) => {
      if (r.variance > 0) gain++;
      else if (r.variance < 0) loss++;
      else match++;
    });
    return { gain, loss, match };
  }, [stockCountPreview]);

  const submitStockCount = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = countLines
      .filter((line) => line.inventoryItemId && line.physicalStock !== "")
      .map((line) => ({
        inventoryItemId: line.inventoryItemId,
        physicalStock: Number(line.physicalStock),
        note: line.note || undefined,
      }));
    if (!lines.length) {
      toast.error("Add at least one ingredient count line");
      return;
    }
    if (!countConfirmed) {
      toast.error("Review the preview and confirm before saving");
      return;
    }
    try {
      const res = await createStockCountMut.mutateAsync({
        countedAt: countDate?.toISOString(),
        notes: countNotes || undefined,
        lines,
      });
      setLastStockCount(res?.data ?? null);
      const summary = res?.data?.totals;
      toast.success(
        `Stock count saved${summary ? ` (loss: ${summary.lossItems}, gain: ${summary.gainItems})` : ""}`
      );
      setCountNotes("");
      setCountLines([{ inventoryItemId: "", physicalStock: "", note: "" }]);
      setCountConfirmed(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to save stock count");
    }
  };

  // PO receiving
  const [receivingPoId, setReceivingPoId] = useState<string | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [partialReceive, setPartialReceive] = useState<Record<string, string>>({});
  const [lineInventoryMap, setLineInventoryMap] = useState<Record<string, string>>({});
  const [receiptNote, setReceiptNote] = useState("");
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  const receivablePurchaseOrders = useMemo(
    () =>
      purchaseOrders.filter((po: any) =>
        [
          PROCUREMENT_ORDER_STATUS.APPROVED,
          PROCUREMENT_ORDER_STATUS.ORDERED,
          PROCUREMENT_ORDER_STATUS.PARTIALLY_RECEIVED,
        ].includes(po.status)
      ),
    [purchaseOrders]
  );

  const selectedPo = useMemo(
    () =>
      receivablePurchaseOrders.find((po: any) => String(po._id) === String(selectedPoId)) ??
      null,
    [receivablePurchaseOrders, selectedPoId]
  );

  const poLineKey = (poId: string, idx: number) => `${poId}-${idx}`;

  const receivePurchaseOrder = async (po: any, mode: "full" | "partial") => {
    const poId = String(po._id);
    try {
      setReceivingPoId(poId);
      const lines = (po.lines ?? [])
        .map((line: any, idx: number) => {
          const alreadyReceived = Number(line.receivedQuantity ?? 0);
          const remaining = Math.max(0, Number(line.quantity ?? 0) - alreadyReceived);
          const key = poLineKey(poId, idx);
          const qty =
            mode === "full" ? remaining : Math.max(0, Number(partialReceive[key] ?? 0));
          const mappedInventoryId =
            lineInventoryMap[key] ||
            String(line.inventoryItemId?._id ?? line.inventoryItemId ?? "").trim();
          return {
            lineIndex: idx,
            inventoryItemId: mappedInventoryId || undefined,
            quantity: qty,
          };
        })
        .filter((line: any) => line.quantity > 0);
      if (!lines.length) {
        toast.error("No receivable quantities selected");
        return;
      }
      const res = await receivePurchaseOrderMut.mutateAsync({
        id: poId,
        department: "restaurant",
        receiveToDepartment: DEPARTMENT.RESTAURANT,
        receivedDate: new Date().toISOString(),
        deliveryNoteNumber: deliveryNoteNumber || undefined,
        notes: receiptNote || undefined,
        lines,
      });
      setLastReceipt(res?.data ?? null);
      toast.success(
        `PO ${po.poNumber} ${mode === "full" ? "fully" : "partially"} received into Restaurant stock`
      );
      setPartialReceive({});
      setLineInventoryMap({});
      setReceiptNote("");
      setDeliveryNoteNumber("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to receive PO");
    } finally {
      setReceivingPoId(null);
    }
  };

  // Receipts history grouping
  type ReceiptGroup = {
    receiptNumber: string;
    date: string;
    poNumber: string;
    deliveryNote: string;
    receiptType: string;
    note: string;
    reason: string;
    lines: {
      itemName: string;
      quantity: number;
      unit: string;
      previousStock: number;
      resultingStock: number;
    }[];
    totalUnits: number;
    rawRows: any[];
  };

  const receiptHistoryGrouped = useMemo(() => {
    const byReceipt = new Map<string, ReceiptGroup>();
    for (const row of receiptRows as any[]) {
      const meta = row.metadata ?? {};
      const rn = String(meta.receiptNumber ?? row._id);
      if (!byReceipt.has(rn)) {
        byReceipt.set(rn, {
          receiptNumber: rn,
          date: row.createdAt,
          poNumber: String(meta.poNumber ?? ""),
          deliveryNote: String(meta.deliveryNoteNumber ?? ""),
          receiptType: meta.receiptType === "partial" ? "Partial" : "Full",
          note: String(meta.note ?? ""),
          reason: String(row.reason ?? ""),
          lines: [],
          totalUnits: 0,
          rawRows: [],
        });
      }
      const g = byReceipt.get(rn)!;
      g.rawRows.push(row);
      g.lines.push({
        itemName: inventoryMap[String(row.inventoryItemId)]?.name ?? String(row.inventoryItemId),
        quantity: row.quantity,
        unit: row.unit,
        previousStock: row.previousStock,
        resultingStock: row.resultingStock,
      });
      g.totalUnits += Number(row.quantity ?? 0);
      if (new Date(row.createdAt) < new Date(g.date)) g.date = row.createdAt;
    }
    return Array.from(byReceipt.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [receiptRows, inventoryMap]);

  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState<string | null>(null);
  const selectedReceiptGroup = useMemo(
    () => receiptHistoryGrouped.find((g) => g.receiptNumber === selectedReceiptNumber) ?? null,
    [receiptHistoryGrouped, selectedReceiptNumber]
  );

  // Exports
  const exportLedgerCsv = async () => {
    try {
      const query = new URLSearchParams({ ...movementParams, format: "csv" }).toString();
      const response = await apiClient.get(`/restaurant/inventory-movements?${query}`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `restaurant-stock-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to export ledger CSV");
    }
  };

  const exportLastStockCountCsv = () => {
    if (!lastStockCount?.rows?.length) {
      toast.error("Run a stock count first");
      return;
    }
    const esc = (value: unknown) => {
      const str = String(value ?? "");
      if (/[\",\\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const header = ["Ingredient", "Unit", "SystemStock", "PhysicalStock", "Variance", "Note"];
    const rows = lastStockCount.rows.map((row: any) =>
      [row.itemName, row.unit, row.systemStock, row.physicalStock, row.variance, row.note ?? ""]
        .map(esc)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blobUrl = window.URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `restaurant-stock-count-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  return {
    // shared
    page,
    setPage,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    movementTypeFilter,
    setMovementTypeFilter,
    inventoryFilter,
    setInventoryFilter,
    openInfoKey,
    setOpenInfoKey,
    infoPopoverRef,

    inventoryItems,
    inventoryOptions,
    inventoryMap,
    movementRows,
    movementLoading,
    movementPagination,
    yieldMappings,
    buildChefReadableEquivalents,
    chefReadableText,

    // movement entry
    movementForm,
    setMovementForm,
    movementPreview,
    movementConfirmed,
    setMovementConfirmed,
    submitMovement,
    createMovementMut,

    // stock count
    countDate,
    setCountDate,
    countNotes,
    setCountNotes,
    countLines,
    setCountLines,
    countConfirmed,
    setCountConfirmed,
    countSortByVariance,
    setCountSortByVariance,
    stockCountPreview,
    stockCountPreviewSorted,
    varianceSummary,
    submitStockCount,
    createStockCountMut,
    exportLastStockCountCsv,

    // receiving
    purchaseOrders,
    poLoading,
    receivablePurchaseOrders,
    selectedPoId,
    setSelectedPoId,
    selectedPo,
    receivingPoId,
    partialReceive,
    setPartialReceive,
    lineInventoryMap,
    setLineInventoryMap,
    receiptNote,
    setReceiptNote,
    deliveryNoteNumber,
    setDeliveryNoteNumber,
    lastReceipt,
    receivePurchaseOrder,
    receivePurchaseOrderMut,
    poLineKey,

    // receipts
    receiptRows,
    receiptHistoryGrouped,
    selectedReceiptNumber,
    setSelectedReceiptNumber,
    selectedReceiptGroup,

    // exports
    exportLedgerCsv,
  };
}

