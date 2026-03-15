"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  usePurchaseOrders,
  useReceivePurchaseOrder,
  useCreateRestaurantInventoryMovement,
  useCreateRestaurantStockCount,
  useInventoryItems,
  useRestaurantInventoryMovements,
} from "@/hooks/api";
import {
  AppDatePicker,
  AppReactSelect,
  Badge,
  Button,
  DataTable,
  Input,
  Textarea,
} from "@/components/ui";
import toast from "react-hot-toast";
import { FiDownload, FiPrinter, FiInfo, FiPackage, FiFilter, FiEye, FiArrowRight } from "react-icons/fi";

const STOCK_CONTROL_FIELD_INFOS: Record<string, string> = {
  ingredient: "The inventory item (ingredient) this movement or count applies to.",
  movementType: "Restock = add stock; Wastage/Loss = reduce (e.g. spill, expiry); Adjustment = correct errors; Reversal = undo a previous entry.",
  quantity: "Amount to add or deduct. Must match the unit (e.g. kg, ml).",
  unit: "Unit for the quantity (e.g. kg, g, litre, ml, bunch, pcs). Should match the ingredient's base unit.",
  reason: "Short reason for the movement (e.g. kitchen wastage, received from PO).",
  countDate: "Date and time when the physical count was done.",
  countNotes: "Optional notes for the whole count (e.g. who counted, location).",
  countLineIngredient: "Ingredient being counted in this line.",
  physicalStock: "The quantity you actually counted (in the ingredient's unit). System will compare to book stock.",
  lineNote: "Optional note for this line (e.g. variance reason).",
  deliveryNoteNumber: "Supplier's delivery note or reference number (for GRN and records).",
  receiptNote: "Optional note for this receipt (e.g. partial delivery, condition).",
  receiveQty: "Quantity received for this line. For partial receive, enter the amount received now.",
  mapToInventory: "Which restaurant inventory item to add stock to. Leave default to use PO line's item or auto-create.",
};

function LabelWithInfo({
  id,
  label,
  infoKey,
  openKey,
  onToggle,
  containerRef,
}: {
  id: string;
  label: string;
  infoKey: string;
  openKey: string | null;
  onToggle: (key: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const info = STOCK_CONTROL_FIELD_INFOS[infoKey] ?? "";
  const isOpen = openKey === infoKey;

  return (
    <div ref={isOpen ? containerRef : undefined} className="relative flex items-center gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {info && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggle(isOpen ? "" : infoKey);
            }}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition-colors hover:border-[#5a189a] hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
            aria-label={`Info: ${label}`}
          >
            <FiInfo className="h-3 w-3" />
          </button>
          {isOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg">
              {info}
            </div>
          )}
        </>
      )}
    </div>
  );
}
import apiClient from "@/lib/api-client";
import { DEPARTMENT, PROCUREMENT_ORDER_STATUS } from "@/constants";

type CountLine = {
  inventoryItemId: string;
  physicalStock: string;
  note: string;
};

const MOVEMENT_TYPE_OPTIONS = [
  { value: "", label: "All movement types" },
  { value: "restock", label: "Restock" },
  { value: "wastage", label: "Wastage / Loss" },
  { value: "adjustment", label: "Adjustment" },
  { value: "reversal", label: "Reversal" },
];

const ENTRY_MOVEMENT_OPTIONS = MOVEMENT_TYPE_OPTIONS.filter((opt) => opt.value);

export default function RestaurantStockControlPage() {
  const [page, setPage] = useState(1);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

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

  const [movementForm, setMovementForm] = useState({
    inventoryItemId: "",
    movementType: "wastage",
    quantity: "",
    unit: "",
    reason: "",
  });
  const [countDate, setCountDate] = useState<Date | null>(new Date());
  const [countNotes, setCountNotes] = useState("");
  const [lastStockCount, setLastStockCount] = useState<any>(null);
  const [receivingPoId, setReceivingPoId] = useState<string | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [partialReceive, setPartialReceive] = useState<Record<string, string>>({});
  const [lineInventoryMap, setLineInventoryMap] = useState<Record<string, string>>({});
  const [receiptNote, setReceiptNote] = useState("");
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [countLines, setCountLines] = useState<CountLine[]>([
    { inventoryItemId: "", physicalStock: "", note: "" },
  ]);
  const [countConfirmed, setCountConfirmed] = useState(false);
  const [movementConfirmed, setMovementConfirmed] = useState(false);
  const [countSortByVariance, setCountSortByVariance] = useState(false);
  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState<string | null>(null);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);

  const movementParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: "20",
    };
    if (movementTypeFilter) params.movementType = movementTypeFilter;
    if (inventoryFilter) params.inventoryItemId = inventoryFilter;
    // Normalize date filters to cover the full selected days.
    if (startDate) params.startDate = startOfDay(startDate).toISOString();
    if (endDate) params.endDate = endOfDay(endDate).toISOString();
    return params;
  }, [page, movementTypeFilter, inventoryFilter, startDate, endDate]);

  const { data: inventoryData } = useInventoryItems({
    limit: "500",
    department: "restaurant",
  });
  const { data: movementData, isLoading } = useRestaurantInventoryMovements(movementParams);
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
  const pagination = movementData?.meta?.pagination;
  const purchaseOrders = poData?.data ?? [];
  const receiptRows = receiptData?.data ?? [];

  const inventoryMap = useMemo(
    () => Object.fromEntries(inventoryItems.map((item: any) => [String(item._id), item])),
    [inventoryItems]
  );

  const inventoryOptions = useMemo(
    () =>
      inventoryItems.map((item: any) => ({
        value: String(item._id),
        label: `${item.name} (${item.unit ?? "unit"})`,
      })),
    [inventoryItems]
  );

  type ReceiptGroup = {
    receiptNumber: string;
    date: string;
    poNumber: string;
    deliveryNote: string;
    receiptType: string;
    note: string;
    reason: string;
    lines: { itemName: string; quantity: number; unit: string; previousStock: number; resultingStock: number }[];
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

  const selectedReceiptGroup = useMemo(
    () => receiptHistoryGrouped.find((g) => g.receiptNumber === selectedReceiptNumber) ?? null,
    [receiptHistoryGrouped, selectedReceiptNumber]
  );

  const stockCountPreview = useMemo(() => {
    return countLines
      .filter((line) => line.inventoryItemId && line.physicalStock !== "")
      .map((line) => {
        const item = inventoryMap[line.inventoryItemId] as { name?: string; unit?: string; currentStock?: number } | undefined;
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
    let gain = 0, loss = 0, match = 0;
    stockCountPreview.forEach((r) => {
      if (r.variance > 0) gain++;
      else if (r.variance < 0) loss++;
      else match++;
    });
    return { gain, loss, match };
  }, [stockCountPreview]);

  const isDeductionType = (type: string) =>
    ["sale", "wastage", "closing"].includes(type);
  const movementPreview = useMemo(() => {
    if (
      !movementForm.inventoryItemId ||
      !movementForm.movementType ||
      movementForm.quantity === ""
    ) {
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

  useEffect(() => {
    setMovementConfirmed(false);
  }, [
    movementForm.inventoryItemId,
    movementForm.movementType,
    movementForm.quantity,
    movementForm.unit,
  ]);

  useEffect(() => {
    setCountConfirmed(false);
  }, [countLines]);

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
      if (resultingStock != null) {
        toast.success(`Movement saved. Stock is now ${resultingStock.toFixed(1)} ${movementPreview?.unit ?? ""}.`);
      } else {
        toast.success("Stock movement logged");
      }
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
      const summary = res?.data?.totals;
      setLastStockCount(res?.data ?? null);
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

  const exportLedgerCsv = async () => {
    try {
      const query = new URLSearchParams({
        ...movementParams,
        format: "csv",
      }).toString();
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
      if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const header = [
      "Ingredient",
      "Unit",
      "SystemStock",
      "PhysicalStock",
      "Variance",
      "Note",
    ];
    const rows = lastStockCount.rows.map((row: any) =>
      [
        row.itemName,
        row.unit,
        row.systemStock,
        row.physicalStock,
        row.variance,
        row.note ?? "",
      ]
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
            mode === "full"
              ? remaining
              : Math.max(0, Number(partialReceive[key] ?? 0));
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

  const printGrnReceipt = () => {
    if (!lastReceipt?.lines?.length) {
      toast.error("Receive a PO first to print GRN receipt");
      return;
    }
    const totalLines = lastReceipt.lines
      .map(
        (line: any) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${line.itemName}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${Number(line.quantity ?? 0).toFixed(3)} ${line.unit ?? ""}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${Number(line.previousStock ?? 0).toFixed(3)} -> ${Number(line.resultingStock ?? 0).toFixed(3)}</td>
          </tr>
        `
      )
      .join("");
    const html = `
      <html>
        <head>
          <title>GRN Receipt ${lastReceipt.receiptNumber ?? ""}</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 24px; color:#0f172a;">
          <h2 style="margin:0 0 8px 0;">Goods Received Note (GRN)</h2>
          <p style="margin:0 0 4px 0;"><strong>Receipt #:</strong> ${lastReceipt.receiptNumber ?? "-"}</p>
          <p style="margin:0 0 4px 0;"><strong>PO #:</strong> ${lastReceipt.poNumber ?? "-"}</p>
          <p style="margin:0 0 4px 0;"><strong>Delivery Note #:</strong> ${lastReceipt.deliveryNoteNumber ?? "-"}</p>
          <p style="margin:0 0 12px 0;"><strong>Received At:</strong> ${new Date(lastReceipt.receivedAt).toLocaleString()}</p>
          <table style="width:100%; border-collapse: collapse; margin-top: 12px;">
            <thead>
              <tr>
                <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Ingredient</th>
                <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Received Qty</th>
                <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Stock Impact</th>
              </tr>
            </thead>
            <tbody>${totalLines}</tbody>
          </table>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Unable to open print window");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const printHistoricalReceipt = (seedRow: any) => {
    const receiptNumber = seedRow?.metadata?.receiptNumber;
    const receiptRowsForPrint = receiptNumber
      ? receiptRows.filter((row: any) => row?.metadata?.receiptNumber === receiptNumber)
      : [seedRow];
    if (!receiptRowsForPrint.length) {
      toast.error("Receipt data not available");
      return;
    }
    const first = receiptRowsForPrint[0];
    const totalLines = receiptRowsForPrint
      .map(
        (row: any) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${
              inventoryMap[String(row.inventoryItemId)]?.name ?? String(row.inventoryItemId)
            }</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${Number(
              row.quantity ?? 0
            ).toFixed(3)} ${row.unit ?? ""}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${Number(
              row.previousStock ?? 0
            ).toFixed(3)} -> ${Number(row.resultingStock ?? 0).toFixed(3)}</td>
          </tr>
        `
      )
      .join("");
    const html = `
      <html>
        <head><title>GRN Receipt ${first?.metadata?.receiptNumber ?? ""}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px; color:#0f172a;">
          <h2 style="margin:0 0 8px 0;">Goods Received Note (GRN)</h2>
          <p style="margin:0 0 4px 0;"><strong>Receipt #:</strong> ${first?.metadata?.receiptNumber ?? "-"}</p>
          <p style="margin:0 0 4px 0;"><strong>PO #:</strong> ${first?.metadata?.poNumber ?? "-"}</p>
          <p style="margin:0 0 4px 0;"><strong>Delivery Note #:</strong> ${
            first?.metadata?.deliveryNoteNumber ?? "-"
          }</p>
          <p style="margin:0 0 12px 0;"><strong>Received At:</strong> ${new Date(
            first?.createdAt
          ).toLocaleString()}</p>
          <table style="width:100%; border-collapse: collapse; margin-top: 12px;">
            <thead>
              <tr>
                <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Ingredient</th>
                <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Received Qty</th>
                <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Stock Impact</th>
              </tr>
            </thead>
            <tbody>${totalLines}</tbody>
          </table>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Unable to open print window");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const selectedMovement = useMemo(
    () => movementRows.find((r: any) => String(r._id) === selectedMovementId) ?? null,
    [movementRows, selectedMovementId]
  );

  const columns = [
    {
      key: "createdAt",
      header: "Date",
      render: (row: any) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "inventoryItemId",
      header: "Ingredient",
      render: (row: any) =>
        inventoryMap[String(row.inventoryItemId)]?.name ?? String(row.inventoryItemId),
    },
    { key: "movementType", header: "Type" },
    {
      key: "quantity",
      header: "Qty",
      render: (row: any) => `${Number(row.quantity ?? 0).toFixed(3)} ${row.unit ?? ""}`,
    },
    {
      key: "stock",
      header: "Stock (Before -> After)",
      render: (row: any) =>
        `${Number(row.previousStock ?? 0).toFixed(3)} -> ${Number(row.resultingStock ?? 0).toFixed(3)}`,
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
          className="rounded-lg border-slate-200 text-[#5a189a] hover:bg-[#5a189a]/10 hover:border-[#5a189a]/40"
          onClick={() => setSelectedMovementId(selectedMovementId === String(row._id) ? null : String(row._id))}
        >
          <FiEye className="h-4 w-4 mr-1" aria-hidden />
          {selectedMovementId === String(row._id) ? "Hide" : "View details"}
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      {/* Hero */}
      <div className="relative border-b border-slate-100 bg-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[min(80vw,400px)] h-[min(80vw,400px)] bg-gradient-to-br from-[#ff9100]/10 to-[#ff6d00]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#5a189a]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/25">
                  <FiPackage className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Restaurant Stock Control
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 max-w-xl">
                    Track ingredients, log wastage and movements, run physical counts, and receive purchase orders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Record Stock Movement</h2>
            <p className="text-sm text-slate-500 mb-5">Log restock, wastage, or adjustments.</p>
            <div>
            <form onSubmit={submitMovement} className="space-y-4">
              <div className="space-y-1.5">
                <LabelWithInfo id="sc-movement-ingredient" label="Ingredient" infoKey="ingredient" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                <AppReactSelect
                  value={movementForm.inventoryItemId}
                  onChange={(value) => {
                    const item = inventoryMap[value];
                    setMovementForm((prev) => ({
                      ...prev,
                      inventoryItemId: value,
                      unit: item?.unit ?? prev.unit,
                    }));
                  }}
                  options={inventoryOptions}
                  placeholder="Select ingredient"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <LabelWithInfo id="sc-movement-type" label="Movement Type" infoKey="movementType" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <AppReactSelect
                    value={movementForm.movementType}
                    onChange={(value) =>
                      setMovementForm((prev) => ({ ...prev, movementType: value }))
                    }
                    options={ENTRY_MOVEMENT_OPTIONS}
                  />
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="sc-movement-qty" label="Quantity" infoKey="quantity" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input
                    id="sc-movement-qty"
                    type="number"
                    min={0.001}
                    step={0.001}
                    value={movementForm.quantity}
                    onChange={(e) =>
                      setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <LabelWithInfo id="sc-movement-unit" label="Unit (from ingredient)" infoKey="unit" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  {movementForm.inventoryItemId ? (
                    <div
                      className="flex h-10 w-full items-center rounded-lg border border-[#e5e7eb] bg-slate-50 px-3 text-sm text-slate-700"
                      title="Unit from ingredient (same unit everywhere)"
                    >
                      {movementForm.unit || inventoryMap[movementForm.inventoryItemId]?.unit || "—"}
                    </div>
                  ) : (
                    <div className="flex h-10 w-full items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-400">
                      Select ingredient
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <LabelWithInfo id="sc-movement-reason" label="Reason" infoKey="reason" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                  <Input
                    id="sc-movement-reason"
                    value={movementForm.reason}
                    onChange={(e) =>
                      setMovementForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    placeholder="e.g. kitchen wastage"
                  />
                </div>
              </div>

              {movementPreview ? (
                <div className="rounded-xl border-2 border-[#5a189a]/20 bg-gradient-to-br from-[#5a189a]/5 via-white to-[#9d4edd]/5 p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5a189a]/15">
                      <FiEye className="h-4 w-4 text-[#5a189a]" aria-hidden />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wide text-[#5a189a]">
                      Preview
                    </span>
                  </div>
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    Review below — then confirm and save. This movement will update the ledger.
                  </p>
                  <dl className="grid gap-2 text-sm">
                    <div className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                      <dt className="text-slate-500">Ingredient</dt>
                      <dd className="font-medium text-slate-800">{movementPreview.itemName}</dd>
                    </div>
                    <div className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                      <dt className="text-slate-500">Type</dt>
                      <dd className="font-medium capitalize text-slate-800">
                        {movementPreview.movementType}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                      <dt className="text-slate-500">Quantity</dt>
                      <dd className="font-medium text-slate-800">
                        {movementPreview.quantity.toFixed(3)} {movementPreview.unit}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                      <dt className="text-slate-500">Reason</dt>
                      <dd className="font-medium text-slate-800">{movementPreview.reason}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                      <dt className="text-slate-500">Stock</dt>
                      <dd className="flex items-center gap-1.5 font-medium text-slate-800">
                        <span>{movementPreview.currentStock.toFixed(3)}</span>
                        <FiArrowRight className="h-4 w-4 text-[#5a189a]" aria-hidden />
                        <span
                          className={
                            movementPreview.isDeduction
                              ? "text-red-600"
                              : "text-emerald-600"
                          }
                        >
                          {movementPreview.resultingStock.toFixed(3)} {movementPreview.unit}
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <label className="mt-4 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={movementConfirmed}
                      onChange={(e) => setMovementConfirmed(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/20"
                    />
                    <span className="text-sm text-slate-700">
                      I confirm this movement and want to update stock
                    </span>
                  </label>
                  <div className="mt-3">
                    <Button
                      type="submit"
                      className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
                      loading={createMovementMut.isPending}
                      disabled={!movementConfirmed}
                    >
                      Confirm & Save Movement
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Select ingredient, movement type and quantity to see preview.
                </p>
              )}
            </form>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Physical Stock Count</h2>
            <p className="text-sm text-slate-500 mb-5">Record physical counts and reconcile variance.</p>
            <div>
            <form onSubmit={submitStockCount} className="space-y-4">
              <div className="space-y-1.5">
                <LabelWithInfo id="sc-count-date" label="Count Date" infoKey="countDate" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                <AppDatePicker
                  selected={countDate}
                  onChange={(date) => setCountDate(date)}
                />
              </div>
              <div className="space-y-1.5">
                <LabelWithInfo id="sc-count-notes" label="Count Notes" infoKey="countNotes" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                <Textarea
                  id="sc-count-notes"
                  value={countNotes}
                  onChange={(e) => setCountNotes(e.target.value)}
                  placeholder="Optional notes for this stock count"
                />
              </div>
              <div className="space-y-2">
                {countLines.map((line, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/30 p-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <LabelWithInfo id={`sc-count-ingredient-${idx}`} label="Ingredient" infoKey="countLineIngredient" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                        <AppReactSelect
                          value={line.inventoryItemId}
                          onChange={(value) =>
                            setCountLines((rows) =>
                              rows.map((row, i) =>
                                i === idx ? { ...row, inventoryItemId: value } : row
                              )
                            )
                          }
                          options={inventoryOptions}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <LabelWithInfo id={`sc-count-physical-${idx}`} label="Physical Stock" infoKey="physicalStock" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                        <Input
                          id={`sc-count-physical-${idx}`}
                          type="number"
                          min={0}
                          step={0.001}
                          value={line.physicalStock}
                          onChange={(e) =>
                            setCountLines((rows) =>
                              rows.map((row, i) =>
                                i === idx ? { ...row, physicalStock: e.target.value } : row
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <LabelWithInfo id={`sc-count-line-note-${idx}`} label="Line Note" infoKey="lineNote" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                      <Input
                        id={`sc-count-line-note-${idx}`}
                        value={line.note}
                        onChange={(e) =>
                          setCountLines((rows) =>
                            rows.map((row, i) =>
                              i === idx ? { ...row, note: e.target.value } : row
                            )
                          )
                        }
                        placeholder="Optional variance note"
                      />
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCountLines((rows) => rows.filter((_, i) => i !== idx))
                        }
                        disabled={countLines.length <= 1}
                      >
                        Remove Line
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCountLines((rows) => [
                      ...rows,
                      { inventoryItemId: "", physicalStock: "", note: "" },
                    ])
                  }
                >
                  Add Line
                </Button>
                <Button type="button" variant="outline" onClick={exportLastStockCountCsv} className="rounded-xl border-slate-200">
                  <FiDownload className="h-4 w-4" />
                  Export Count CSV
                </Button>
              </div>

              {stockCountPreview.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      Review: System (previous) vs Physical (counted) — confirm before saving
                    </p>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={countSortByVariance}
                        onChange={(e) => setCountSortByVariance(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      Sort by largest difference
                    </label>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-3 text-xs">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                      {varianceSummary.gain} over
                    </span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">
                      {varianceSummary.loss} short
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                      {varianceSummary.match} match
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                          <th className="pb-2 pr-3 font-medium">Ingredient</th>
                          <th className="pb-2 pr-3 font-medium">Unit</th>
                          <th className="pb-2 pr-3 font-medium">System (Previous)</th>
                          <th className="pb-2 pr-3 font-medium">Physical (Current)</th>
                          <th className="pb-2 pr-3 font-medium">Difference</th>
                          <th className="pb-2 font-medium">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockCountPreviewSorted.map((row) => (
                          <tr key={row.inventoryItemId}>
                            <td className="py-2 pr-3 font-medium text-slate-800">
                              {row.itemName}
                            </td>
                            <td className="py-2 pr-3 text-slate-600">{row.unit}</td>
                            <td className="py-2 pr-3">{row.systemStock.toFixed(3)}</td>
                            <td className="py-2 pr-3">{row.physicalStock.toFixed(3)}</td>
                            <td className="py-2 pr-3">
                              {row.variance === 0 ? (
                                <span className="text-slate-500">—</span>
                              ) : row.variance > 0 ? (
                                <span className="text-emerald-600 font-medium">
                                  +{row.variance.toFixed(3)}
                                </span>
                              ) : (
                                <span className="text-red-600 font-medium">
                                  {row.variance.toFixed(3)}
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-slate-500">{row.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <label className="mt-4 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={countConfirmed}
                      onChange={(e) => setCountConfirmed(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]/20"
                    />
                    <span className="text-sm text-slate-700">
                      I have reviewed the differences and confirm updating stock to the physical counts
                    </span>
                  </label>
                  <div className="mt-3">
                    <Button
                      type="submit"
                      className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
                      loading={createStockCountMut.isPending}
                      disabled={!countConfirmed}
                    >
                      Confirm & Save Stock Count
                    </Button>
                  </div>
                </div>
              )}
            </form>
            </div>
          </div>
        </div>

        {/* Receive Purchase Orders */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
            <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#ff6d00] to-[#ff9e00] shrink-0" aria-hidden />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Receive Purchase Orders To Restaurant</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Receive approved POs into restaurant inventory. Use <strong>Receive Full</strong> in each row, or click a PO number / <strong>View details</strong> to see receive options below.
              </p>
            </div>
          </div>
          <div className="p-6 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">PO Number</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Lines</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap min-w-[200px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!poLoading && receivablePurchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <FiPackage className="h-10 w-10 text-slate-300" aria-hidden />
                        <p className="font-medium text-slate-600">No purchase orders to receive</p>
                        <p className="text-sm max-w-md">
                          Only POs with status <strong>Approved</strong>, <strong>Ordered</strong>, or <strong>Partially received</strong> appear here. Create and approve a PO in Procurement to see it and use the receive button.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  receivablePurchaseOrders.map((po: any) => (
                    <tr key={po._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPoId(String(po._id))}
                          className="font-semibold text-[#5a189a] hover:text-[#7b2cbf] hover:underline underline-offset-2"
                        >
                          {po.poNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{po.supplierId?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{Array.isArray(po.lines) ? po.lines.length : 0}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {new Intl.NumberFormat("en-GH", {
                          style: "currency",
                          currency: "GHS",
                        }).format(Number(po.totalAmount ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{po.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap min-w-[200px]">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
                            onClick={() => setSelectedPoId(selectedPoId === String(po._id) ? null : String(po._id))}
                          >
                            <FiEye className="h-4 w-4 mr-1" aria-hidden />
                            {selectedPoId === String(po._id) ? "Hide" : "View details"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-lg font-semibold text-white border-0 shadow-sm bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] shrink-0"
                            onClick={() => receivePurchaseOrder(po, "full")}
                            loading={
                              receivingPoId === String(po._id) ||
                              receivePurchaseOrderMut.isPending
                            }
                          >
                            Receive Full
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedPo ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* PO header — comprehensive summary */}
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">PO {selectedPo.poNumber}</h3>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {selectedPo.supplierId?.name ?? "—"}
                    </p>
                  </div>
                  <Badge variant="info" className="shrink-0">{selectedPo.status}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                  <div>
                    <span className="text-slate-500">Order date</span>
                    <p className="font-medium text-slate-800">
                      {selectedPo.orderDate
                        ? new Date(selectedPo.orderDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Expected date</span>
                    <p className="font-medium text-slate-800">
                      {selectedPo.expectedDate
                        ? new Date(selectedPo.expectedDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Lines</span>
                    <p className="font-medium text-slate-800">
                      {Array.isArray(selectedPo.lines) ? selectedPo.lines.length : 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Total</span>
                    <p className="font-bold text-slate-900">
                      {new Intl.NumberFormat("en-GH", {
                        style: "currency",
                        currency: "GHS",
                      }).format(Number(selectedPo.totalAmount ?? 0))}
                    </p>
                  </div>
                </div>
                {selectedPo.notes ? (
                  <p className="mt-3 text-sm text-slate-600 border-t border-slate-100 pt-3">
                    <span className="font-medium text-slate-700">Notes:</span> {selectedPo.notes}
                  </p>
                ) : null}
              </div>

              {/* Line items table */}
              <div className="px-5 py-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Line items</h4>
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-left">
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Item</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Unit</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Ordered</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Received</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Remaining</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Unit cost</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Line total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedPo.lines ?? []).map((line: any, idx: number) => {
                        const totalQty = Number(line.quantity ?? 0);
                        const alreadyReceived = Number(line.receivedQuantity ?? 0);
                        const remaining = Math.max(0, totalQty - alreadyReceived);
                        const unitCost = Number(line.unitCost ?? 0);
                        const totalCost = Number(line.totalCost ?? 0);
                        return (
                          <tr key={`${String(selectedPo._id)}-${idx}`} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2.5 font-medium text-slate-700">{idx + 1}</td>
                            <td className="px-3 py-2.5 font-medium text-slate-800">{line.itemName}</td>
                            <td className="px-3 py-2.5 text-slate-600">{line.unit ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{totalQty.toFixed(3)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600">{alreadyReceived.toFixed(3)}</td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-800">{remaining.toFixed(3)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600">
                              {new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(unitCost)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                              {new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(totalCost)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Receive form: per-line inputs */}
                <div className="mt-5 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-800">Receive into restaurant inventory</h4>
                  {(selectedPo.lines ?? []).map((line: any, idx: number) => {
                    const totalQty = Number(line.quantity ?? 0);
                    const alreadyReceived = Number(line.receivedQuantity ?? 0);
                    const remaining = Math.max(0, totalQty - alreadyReceived);
                    const key = poLineKey(String(selectedPo._id), idx);
                    const linkedInventoryId = String(
                      line.inventoryItemId?._id ?? line.inventoryItemId ?? ""
                    ).trim();
                    return (
                      <div
                        key={`form-${String(selectedPo._id)}-${idx}`}
                        className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50/30 p-3 sm:grid-cols-2 lg:grid-cols-4"
                      >
                        <div className="sm:col-span-2">
                          <p className="font-medium text-slate-800">{line.itemName}</p>
                          <p className="text-xs text-slate-500">
                            Remaining: {remaining.toFixed(3)} {line.unit}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <LabelWithInfo id={`sc-receive-qty-${key}`} label="Receive qty" infoKey="receiveQty" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                          <div className="flex gap-2">
                            <Input
                              id={`sc-receive-qty-${key}`}
                              type="number"
                              min={0}
                              step={0.001}
                              max={remaining}
                              value={partialReceive[key] ?? ""}
                              onChange={(e) =>
                                setPartialReceive((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              onClick={() =>
                                setPartialReceive((prev) => ({ ...prev, [key]: String(remaining) }))
                              }
                            >
                              Use Remaining
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <LabelWithInfo id={`sc-map-inv-${key}`} label="Map to inventory" infoKey="mapToInventory" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                          <AppReactSelect
                            value={lineInventoryMap[key] ?? linkedInventoryId}
                            onChange={(value) =>
                              setLineInventoryMap((prev) => ({ ...prev, [key]: value }))
                            }
                            options={[
                              { value: "", label: "Auto-create if missing" },
                              ...inventoryOptions,
                            ]}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Delivery & receipt notes */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <LabelWithInfo id="sc-delivery-note" label="Delivery note number" infoKey="deliveryNoteNumber" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                    <Input
                      id="sc-delivery-note"
                      value={deliveryNoteNumber}
                      onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                      placeholder="Supplier delivery note #"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <LabelWithInfo id="sc-receipt-note" label="Receipt note" infoKey="receiptNote" openKey={openInfoKey} onToggle={setOpenInfoKey} containerRef={infoPopoverRef} />
                    <Textarea
                      id="sc-receipt-note"
                      value={receiptNote}
                      onChange={(e) => setReceiptNote(e.target.value)}
                      placeholder="Optional note for this receipt"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  <Button
                    type="button"
                    className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
                    onClick={() => receivePurchaseOrder(selectedPo, "partial")}
                    loading={
                      receivingPoId === String(selectedPo._id) ||
                      receivePurchaseOrderMut.isPending
                    }
                  >
                    <FiArrowRight className="h-4 w-4 mr-2" />
                    Receive Partial To Restaurant
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl font-semibold text-white border-0 bg-gradient-to-r from-[#ff6d00] to-[#ff8500]"
                    onClick={() => receivePurchaseOrder(selectedPo, "full")}
                    loading={
                      receivingPoId === String(selectedPo._id) ||
                      receivePurchaseOrderMut.isPending
                    }
                  >
                    Receive Full
                  </Button>
                  <Button type="button" variant="outline" onClick={printGrnReceipt} className="rounded-xl">
                    <FiDownload className="h-4 w-4 mr-2" />
                    Print GRN
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-slate-600"
                    onClick={() => setSelectedPoId(null)}
                  >
                    Close details
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">
              Click a PO number or <strong>View details</strong> to see full PO and receive options.
            </p>
          )}
          </div>
        </div>

        {/* Recent PO Receipts (Restaurant) */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
            <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#5a189a] to-[#9d4edd] shrink-0" aria-hidden />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent PO Receipts (Restaurant)</h2>
              <p className="text-sm text-slate-500 mt-0.5">Latest goods received into restaurant stock. View details to see full receipt info.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Receipt details panel (when a receipt is selected) */}
            {selectedReceiptGroup && (
              <div className="rounded-xl border-2 border-[#5a189a]/30 bg-slate-50/50 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-base font-semibold text-slate-900">Receipt details: {selectedReceiptGroup.receiptNumber}</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg border-slate-200 text-[#5a189a] hover:bg-[#5a189a]/10"
                      onClick={() => selectedReceiptGroup.rawRows[0] && printHistoricalReceipt(selectedReceiptGroup.rawRows[0])}
                    >
                      <FiPrinter className="h-4 w-4 mr-1.5" />
                      Print GRN
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-slate-600"
                      onClick={() => setSelectedReceiptNumber(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500 font-medium">Received at</dt>
                    <dd className="text-slate-900 mt-0.5">{new Date(selectedReceiptGroup.date).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">PO number</dt>
                    <dd className="text-slate-900 mt-0.5 font-mono">{selectedReceiptGroup.poNumber || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Receipt # (GRN)</dt>
                    <dd className="text-slate-900 mt-0.5 font-mono">{selectedReceiptGroup.receiptNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Delivery note</dt>
                    <dd className="text-slate-900 mt-0.5">{selectedReceiptGroup.deliveryNote || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Receipt type</dt>
                    <dd className="text-slate-900 mt-0.5">
                      <Badge variant="default" className="rounded-md">{selectedReceiptGroup.receiptType}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Line items</dt>
                    <dd className="text-slate-900 mt-0.5">{selectedReceiptGroup.lines.length} ingredient(s)</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Total quantity received</dt>
                    <dd className="text-slate-900 mt-0.5">{Number(selectedReceiptGroup.totalUnits).toFixed(3)} units</dd>
                  </div>
                  {selectedReceiptGroup.reason && (
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500 font-medium">Reason</dt>
                      <dd className="text-slate-900 mt-0.5">{selectedReceiptGroup.reason}</dd>
                    </div>
                  )}
                  {selectedReceiptGroup.note && (
                    <div className="sm:col-span-2 lg:col-span-4">
                      <dt className="text-slate-500 font-medium">Receipt note</dt>
                      <dd className="text-slate-900 mt-0.5">{selectedReceiptGroup.note}</dd>
                    </div>
                  )}
                </dl>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Line items & stock impact</h4>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left">
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Ingredient</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Qty received</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Unit</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Stock (before → after)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedReceiptGroup.lines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="px-4 py-2.5 font-medium text-slate-800">{line.itemName}</td>
                            <td className="px-4 py-2.5 text-slate-700">{Number(line.quantity).toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-slate-600">{line.unit}</td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {Number(line.previousStock).toFixed(3)} → {Number(line.resultingStock).toFixed(3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Receipt #</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">PO #</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Delivery note</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Items</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Total units</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receiptHistoryGrouped.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <FiPackage className="h-10 w-10 text-slate-300" aria-hidden />
                          <p className="font-medium text-slate-600">No recent PO receipts</p>
                          <p className="text-sm">Receipts will appear here after you receive purchase orders.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    receiptHistoryGrouped.map((group) => (
                      <tr
                        key={group.receiptNumber}
                        className={`hover:bg-slate-50/80 transition-colors ${selectedReceiptNumber === group.receiptNumber ? "bg-[#5a189a]/5" : ""}`}
                      >
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{new Date(group.date).toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">{group.receiptNumber}</td>
                        <td className="px-4 py-3 text-slate-700">{group.poNumber || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate" title={group.deliveryNote}>{group.deliveryNote || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="default" className="rounded-md text-xs">{group.receiptType}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{group.lines.length}</td>
                        <td className="px-4 py-3 text-slate-700">{Number(group.totalUnits).toFixed(3)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-lg border-slate-200 text-[#5a189a] hover:bg-[#5a189a]/10 hover:border-[#5a189a]/40"
                              onClick={() => setSelectedReceiptNumber(selectedReceiptNumber === group.receiptNumber ? null : group.receiptNumber)}
                            >
                              <FiEye className="h-4 w-4 mr-1" />
                              {selectedReceiptNumber === group.receiptNumber ? "Hide" : "View details"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
                              onClick={() => group.rawRows[0] && printHistoricalReceipt(group.rawRows[0])}
                            >
                              <FiPrinter className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Movement Ledger */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/30">
            <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#5a189a] to-[#9d4edd] shrink-0" aria-hidden />
            <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Movement Ledger</h2>
                <p className="text-sm text-slate-500 mt-0.5">View and export ingredient movement history. Use <strong>View details</strong> on a row to see full movement info.</p>
              </div>
              <Button type="button" variant="outline" onClick={exportLedgerCsv} className="rounded-xl border-slate-200 shrink-0">
                <FiDownload className="h-4 w-4" />
                Export Ledger CSV
              </Button>
            </div>
          </div>
          <div className="p-6 space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-3">
              <FiFilter className="h-4 w-4 text-[#5a189a]" aria-hidden />
              <span className="text-sm font-semibold">Filters</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AppDatePicker
              label="Start Date"
              selected={startDate}
              onChange={(date) => {
                setStartDate(date);
                setPage(1);
              }}
            />
            <AppDatePicker
              label="End Date"
              selected={endDate}
              onChange={(date) => {
                setEndDate(date);
                setPage(1);
              }}
            />
            <AppReactSelect
              label="Movement Type"
              value={movementTypeFilter}
              onChange={(value) => {
                setMovementTypeFilter(value);
                setPage(1);
              }}
              options={MOVEMENT_TYPE_OPTIONS}
            />
            <AppReactSelect
              label="Ingredient"
              value={inventoryFilter}
              onChange={(value) => {
                setInventoryFilter(value);
                setPage(1);
              }}
              options={[{ value: "", label: "All ingredients" }, ...inventoryOptions]}
            />
            </div>
          </div>

            {/* Movement details panel */}
            {selectedMovement && (
              <div className="rounded-xl border-2 border-[#5a189a]/30 bg-slate-50/50 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-base font-semibold text-slate-900">Movement details</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-slate-600"
                    onClick={() => setSelectedMovementId(null)}
                  >
                    Close
                  </Button>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500 font-medium">Date & time</dt>
                    <dd className="text-slate-900 mt-0.5">{new Date(selectedMovement.createdAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Ingredient</dt>
                    <dd className="text-slate-900 mt-0.5 font-medium">
                      {inventoryMap[String(selectedMovement.inventoryItemId)]?.name ?? String(selectedMovement.inventoryItemId)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Movement type</dt>
                    <dd className="text-slate-900 mt-0.5">
                      <Badge variant="default" className="rounded-md capitalize">{String(selectedMovement.movementType)}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Quantity</dt>
                    <dd className="text-slate-900 mt-0.5">
                      {Number(selectedMovement.quantity ?? 0).toFixed(3)} {selectedMovement.unit ?? "unit"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Stock before</dt>
                    <dd className="text-slate-900 mt-0.5">{Number(selectedMovement.previousStock ?? 0).toFixed(3)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Stock after</dt>
                    <dd className="text-slate-900 mt-0.5">{Number(selectedMovement.resultingStock ?? 0).toFixed(3)}</dd>
                  </div>
                  {selectedMovement.reason && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-slate-500 font-medium">Reason</dt>
                      <dd className="text-slate-900 mt-0.5">{selectedMovement.reason}</dd>
                    </div>
                  )}
                  {selectedMovement.metadata && typeof selectedMovement.metadata === "object" && (
                    <>
                      {(selectedMovement.metadata as any).source && (
                        <div>
                          <dt className="text-slate-500 font-medium">Source</dt>
                          <dd className="text-slate-900 mt-0.5">{String((selectedMovement.metadata as any).source)}</dd>
                        </div>
                      )}
                      {((selectedMovement.metadata as any).enteredQuantity != null || (selectedMovement.metadata as any).enteredUnit) && (
                        <div className="sm:col-span-2">
                          <dt className="text-slate-500 font-medium">Entered (as recorded)</dt>
                          <dd className="text-slate-900 mt-0.5">
                            {(selectedMovement.metadata as any).enteredQuantity != null
                              ? `${Number((selectedMovement.metadata as any).enteredQuantity).toFixed(3)}`
                              : "—"}
                            {(selectedMovement.metadata as any).enteredUnit
                              ? ` ${(selectedMovement.metadata as any).enteredUnit}`
                              : ""}
                          </dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </div>
            )}

          <div className="rounded-xl border border-slate-100 overflow-hidden">
          <DataTable
            columns={columns}
            data={movementRows}
            loading={isLoading}
            getRowKey={(row: any) => row._id}
            getRowClassName={(row: any) => (selectedMovementId === String(row._id) ? "bg-[#5a189a]/5" : undefined)}
            pagination={
              pagination
                ? {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: pagination.total,
                    onPageChange: setPage,
                  }
                : undefined
            }
            emptyTitle="No movement records"
            emptyDescription="Record stock movements to build your ingredient ledger."
          />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
