"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  useBarInventoryMovements,
  useBarPurchaseOrders,
  useCreateBarInventoryMovement,
  useCreateBarStockCount,
  useInventoryItems,
  useReceiveBarPurchaseOrder,
} from "@/hooks/api";
import {
  AppDatePicker,
  AppReactSelect,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Input,
  Textarea,
} from "@/components/ui";
import toast from "react-hot-toast";
import { FiDownload, FiPackage, FiEye, FiArrowRight, FiRefreshCw, FiPrinter, FiInfo, FiChevronDown, FiList } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { PROCUREMENT_ORDER_STATUS } from "@/constants";
import { cn } from "@/lib/cn";

const MOVEMENT_QUICK_TEMPLATES = [
  { label: "Wastage (1 unit)", movementType: "wastage", quantity: "1", unit: "unit", reason: "Wastage / loss" },
  { label: "Restock (6 bottles)", movementType: "restock", quantity: "6", unit: "unit", reason: "Manual restock" },
  { label: "Adjustment (1)", movementType: "adjustment", quantity: "1", unit: "unit", reason: "Count correction" },
] as const;

const DATE_PRESETS = [
  { label: "Today", getRange: () => { const d = new Date(); return { start: d, end: d }; } },
  {
    label: "This week",
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end };
    },
  },
] as const;

const BAR_STOCK_TIPS = [
  "Use **Restock** for manual top-ups or gifts; use **Receive PO** when delivery matches a purchase order.",
  "**Physical count**: Enter what you counted live, then review System vs Physical and confirm before saving.",
  "**Movement Ledger** shows all bar stock changes. Use date presets or clear filters if the list is empty.",
];

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

export default function BarStockControlPage() {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [movementTypeFilter, setMovementTypeFilter] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("");
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
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [countLines, setCountLines] = useState<CountLine[]>([
    { inventoryItemId: "", physicalStock: "", note: "" },
  ]);
  const [countConfirmed, setCountConfirmed] = useState(false);
  const [movementConfirmed, setMovementConfirmed] = useState(false);
  const [lastAddedMovementId, setLastAddedMovementId] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [countSortByVariance, setCountSortByVariance] = useState(false);
  const [lastReceivedReceipt, setLastReceivedReceipt] = useState<any>(null);

  const queryClient = useQueryClient();
  const LEDGER_STORAGE_KEY = "bar-stock-control-last-item";
  const hasRestoredLastItem = useRef(false);
  const movementParams = useMemo(() => {
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (movementTypeFilter) params.movementType = movementTypeFilter;
    if (inventoryFilter) params.inventoryItemId = inventoryFilter;
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    return params;
  }, [page, movementTypeFilter, inventoryFilter, startDate, endDate]);

  const { data: inventoryData } = useInventoryItems({
    limit: "500",
    department: "bar",
  });
  const { data: movementData, isLoading } = useBarInventoryMovements(movementParams);
  const { data: poData, isLoading: poLoading } = useBarPurchaseOrders({
    page: "1",
    limit: "50",
  });
  const { data: receiptData } = useBarInventoryMovements({
    page: "1",
    limit: "10",
    movementType: "restock",
  });
  const { data: receiptHistoryData } = useBarInventoryMovements({
    page: "1",
    limit: "200",
    movementType: "restock",
    source: "po-receipt",
  });

  const inventoryList = inventoryData?.data ?? [];
  const inventoryItems = useMemo(
    () =>
      inventoryList.filter((i: any) =>
        ["liquor", "bar", "beverage", "mixer"].includes(String(i.category).toLowerCase())
      ),
    [inventoryList]
  );
  const movementRows = movementData?.data ?? [];
  const pagination = movementData?.meta?.pagination;
  const purchaseOrders = poData?.data ?? [];
  const receiptRows = receiptData?.data ?? [];
  const receiptHistoryRows = receiptHistoryData?.data ?? [];

  const inventoryMap = useMemo(
    () => Object.fromEntries(inventoryItems.map((item: any) => [String(item._id), item])),
    [inventoryItems]
  );

  const receiptHistoryGrouped = useMemo(() => {
    const byReceipt = new Map<
      string,
      { receiptNumber: string; date: string; poNumber: string; deliveryNote: string; lines: any[]; totalUnits: number }
    >();
    for (const row of receiptHistoryRows as any[]) {
      const meta = row.metadata ?? {};
      const rn = String(meta.receiptNumber ?? row._id);
      if (!byReceipt.has(rn)) {
        byReceipt.set(rn, {
          receiptNumber: rn,
          date: row.createdAt,
          poNumber: String(meta.poNumber ?? ""),
          deliveryNote: String(meta.deliveryNoteNumber ?? ""),
          lines: [],
          totalUnits: 0,
        });
      }
      const g = byReceipt.get(rn)!;
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
  }, [receiptHistoryRows, inventoryMap]);

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

  const loadAllBarItems = () => {
    const lines: CountLine[] = inventoryItems.map((item: any) => ({
      inventoryItemId: String(item._id),
      physicalStock: "",
      note: "",
    }));
    setCountLines(lines);
    setCountConfirmed(false);
    toast.success(`Added ${lines.length} items. Enter physical counts.`);
  };

  const exportCountSheet = () => {
    const header = ["Item", "Unit", "System (current)", "Physical (counted)", "Note"];
    const rows = inventoryItems.map((item: any) => [
      item.name,
      item.unit ?? "unit",
      Number(item.currentStock ?? 0).toFixed(3),
      "",
      "",
    ]);
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header.map(esc).join(","), ...rows.map((r: string[]) => r.map(esc).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bar-count-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Count sheet downloaded. Fill Physical column and use in stock count.");
  };

  useEffect(() => {
    setCountConfirmed(false);
  }, [countLines]);

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

  const inventoryOptions = useMemo(
    () =>
      inventoryItems.map((item: any) => ({
        value: String(item._id),
        label: `${item.name} (${Number(item.currentStock ?? 0).toFixed(0)} ${item.unit ?? "unit"})`,
      })),
    [inventoryItems]
  );

  useEffect(() => {
    if (hasRestoredLastItem.current || Object.keys(inventoryMap).length === 0) return;
    try {
      const saved = typeof window !== "undefined" ? sessionStorage.getItem(LEDGER_STORAGE_KEY) : null;
      if (saved && inventoryMap[saved]) {
        setMovementForm((f) => ({ ...f, inventoryItemId: saved }));
        hasRestoredLastItem.current = true;
      }
    } catch (_) {}
  }, [inventoryMap]);
  const receivablePOs = useMemo(
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
    () => receivablePOs.find((po: any) => String(po._id) === String(selectedPoId)) ?? null,
    [receivablePOs, selectedPoId]
  );
  const poLineKey = (poId: string, idx: number) => `${poId}-${idx}`;

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementForm.inventoryItemId || !movementForm.movementType || !movementForm.quantity) {
      toast.error("Item, movement type, and quantity are required");
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
      const res = await createMovementMut.mutateAsync({
        inventoryItemId: movementForm.inventoryItemId,
        movementType: movementForm.movementType,
        quantity,
        unit,
        reason: movementForm.reason || "Bar stock movement",
      });
      const created = (res as any)?.data ?? res;
      const newId = created?._id ? String(created._id) : null;
      const resultingStock = movementPreview?.resultingStock;
      try {
        sessionStorage.setItem(LEDGER_STORAGE_KEY, movementForm.inventoryItemId);
      } catch (_) {}
      await queryClient.refetchQueries({ queryKey: ["bar", "inventory-movements"] });
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
      if (newId) {
        setLastAddedMovementId(newId);
        setTimeout(() => setLastAddedMovementId(null), 4000);
      }
      document.getElementById("movement-ledger")?.scrollIntoView({ behavior: "smooth" });
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
      toast.error("Add at least one item count line");
      return;
    }
    try {
      const res = await createStockCountMut.mutateAsync({
        countedAt: countDate?.toISOString(),
        notes: countNotes || undefined,
        lines,
      });
      const summary = res?.data?.totals ?? res?.totals;
      setLastStockCount(res?.data ?? res ?? null);
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
      const response = await apiClient.get(`/bar/inventory-movements?${query}`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `bar-stock-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to export CSV");
    }
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
            mode === "full" ? remaining : Math.max(0, Number(partialReceive[key] ?? 0));
          const invId = String(line.inventoryItemId?._id ?? line.inventoryItemId ?? "").trim();
          return { lineIndex: idx, inventoryItemId: invId || undefined, quantity: qty };
        })
        .filter((l: any) => l.quantity > 0);
      if (!lines.length) {
        toast.error("No receivable quantities");
        return;
      }
      const res = await receiveMut.mutateAsync({
        id: poId,
        receivedDate: new Date().toISOString(),
        deliveryNoteNumber: deliveryNoteNumber || undefined,
        notes: receiptNote || undefined,
        lines,
      });
      const receipt = (res as any)?.data ?? res;
      setLastReceivedReceipt(receipt ?? null);
      const totalUnits = lines.reduce((sum: number, l: any) => sum + (l.quantity ?? 0), 0);
      toast.success(
        `PO ${po.poNumber} received. Added ${totalUnits.toFixed(0)} units across ${lines.length} item(s). Stock updated.`
      );
      setPartialReceive({});
      setReceiptNote("");
      setDeliveryNoteNumber("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to receive PO");
    } finally {
      setReceivingPoId(null);
    }
  };

  const clearLedgerFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setMovementTypeFilter("");
    setInventoryFilter("");
    setPage(1);
    toast.success("Filters cleared");
  };

  const setDatePreset = (preset: (typeof DATE_PRESETS)[number]) => {
    const { start, end } = preset.getRange();
    setStartDate(start);
    setEndDate(end);
    setPage(1);
  };

  const printHistoricalGrn = (group: (typeof receiptHistoryGrouped)[number]) => {
    const lines = group.lines
      .map(
        (line: any) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${line.itemName ?? ""}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${Number(line.quantity ?? 0).toFixed(3)} ${line.unit ?? ""}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${Number(line.previousStock ?? 0).toFixed(3)} → ${Number(line.resultingStock ?? 0).toFixed(3)}</td>
          </tr>
        `
      )
      .join("");
    const html = `
      <!DOCTYPE html><html><head><title>GRN ${group.receiptNumber}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px; color:#0f172a;">
        <h2 style="margin:0 0 8px 0;">Goods Received Note (GRN) — Bar</h2>
        <p style="margin:0 0 4px 0;"><strong>Receipt #:</strong> ${group.receiptNumber}</p>
        <p style="margin:0 0 4px 0;"><strong>PO #:</strong> ${group.poNumber}</p>
        <p style="margin:0 0 4px 0;"><strong>Delivery note:</strong> ${group.deliveryNote || "—"}</p>
        <p style="margin:0 0 12px 0;"><strong>Received:</strong> ${new Date(group.date).toLocaleString()}</p>
        <table style="width:100%; border-collapse: collapse; margin-top: 12px;">
          <thead><tr>
            <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Item</th>
            <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Qty</th>
            <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Stock (Before → After)</th>
          </tr></thead>
          <tbody>${lines}</tbody>
        </table>
      </body></html>
    `;
    const win = window.open("", "_blank");
    if (!win) { toast.error("Allow popups to print GRN"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const printGrn = () => {
    if (!lastReceivedReceipt?.lines?.length) {
      toast.error("Receive a PO first to print GRN");
      return;
    }
    const lines = lastReceivedReceipt.lines
      .map(
        (line: any) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${line.itemName ?? line.inventoryItemId}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${Number(line.quantity ?? 0).toFixed(3)} ${line.unit ?? ""}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${Number(line.previousStock ?? 0).toFixed(3)} → ${Number(line.resultingStock ?? 0).toFixed(3)}</td>
          </tr>
        `
      )
      .join("");
    const html = `
      <!DOCTYPE html><html><head><title>GRN ${lastReceivedReceipt.receiptNumber ?? "Bar"}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px; color:#0f172a;">
        <h2 style="margin:0 0 8px 0;">Goods Received Note (GRN) — Bar</h2>
        <p style="margin:0 0 4px 0;"><strong>Receipt #:</strong> ${lastReceivedReceipt.receiptNumber ?? "-"}</p>
        <p style="margin:0 0 4px 0;"><strong>PO #:</strong> ${lastReceivedReceipt.poNumber ?? "-"}</p>
        <p style="margin:0 0 4px 0;"><strong>Received:</strong> ${lastReceivedReceipt.receivedAt ? new Date(lastReceivedReceipt.receivedAt).toLocaleString() : "-"}</p>
        <table style="width:100%; border-collapse: collapse; margin-top: 12px;">
          <thead><tr>
            <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Item</th>
            <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Qty</th>
            <th style="text-align:left; padding:8px; border-bottom:2px solid #cbd5e1;">Stock (Before → After)</th>
          </tr></thead>
          <tbody>${lines}</tbody>
        </table>
      </body></html>
    `;
    const win = window.open("", "_blank");
    if (!win) { toast.error("Allow popups to print GRN"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const createMovementMut = useCreateBarInventoryMovement();
  const createStockCountMut = useCreateBarStockCount();
  const receiveMut = useReceiveBarPurchaseOrder();

  const columns = [
    {
      key: "createdAt",
      header: "Date",
      render: (row: any) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "inventoryItemId",
      header: "Item",
      render: (row: any) =>
        inventoryMap[String(row.inventoryItemId)]?.name ?? String(row.inventoryItemId),
    },
    { key: "movementType", header: "Type", render: (row: any) => row.movementType },
    {
      key: "quantity",
      header: "Qty",
      render: (row: any) => `${Number(row.quantity ?? 0).toFixed(3)} ${row.unit ?? ""}`,
    },
    {
      key: "stock",
      header: "Stock (Before → After)",
      render: (row: any) =>
        `${Number(row.previousStock ?? 0).toFixed(3)} → ${Number(row.resultingStock ?? 0).toFixed(3)}`,
    },
    { key: "reason", header: "Reason", render: (row: any) => row.reason ?? "-" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/98 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <FiPackage className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">BAR Stock Control</h1>
                <p className="mt-0.5 text-sm text-slate-500">Record movements, physical counts, receive POs, and view the ledger.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="#record-movement" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Record movement</a>
              <a href="#stock-count" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Stock count</a>
              <a href="#receive-pos" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Receive POs</a>
              <a href="#receive-history" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Receipt history</a>
              <a href="#movement-ledger" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Ledger</a>
            </div>
          </div>
        </div>
        <div className="h-0.5 w-full bg-linear-to-r from-[#ff8500]/40 via-[#5a189a]/40 to-[#ff8500]/40" />
        <div className="border-b border-slate-100 bg-slate-50/30 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => setShowTips((t) => !t)} className="flex w-full items-center justify-between text-left text-sm font-medium text-slate-700">
            <span className="flex items-center gap-2">
              <FiInfo className="h-4 w-4 text-[#5a189a]" aria-hidden />
              Tips
            </span>
            <FiChevronDown className={cn("h-4 w-4 transition-transform", showTips && "rotate-180")} aria-hidden />
          </button>
          {showTips && (
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
              {BAR_STOCK_TIPS.map((tip, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#5a189a]">•</span>
                  <span dangerouslySetInnerHTML={{ __html: tip.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 space-y-6">

      <div className="grid gap-6 xl:grid-cols-2">
        <Card id="record-movement" className="scroll-mt-6 overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle>Record Stock Movement</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={submitMovement} className="space-y-4">
              <div className="rounded-xl border border-slate-100 bg-linear-to-br from-[#5a189a]/5 to-[#9d4edd]/5 p-3">
                <p className="mb-2 text-xs font-medium text-slate-600">Quick templates</p>
                <div className="flex flex-wrap gap-2">
                  {MOVEMENT_QUICK_TEMPLATES.map((t) => (
                    <Button
                      key={t.label}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg border-[#5a189a]/25 text-[#5a189a] hover:bg-[#5a189a]/10"
                      onClick={() => {
                        setMovementForm((prev) => ({
                          ...prev,
                          movementType: t.movementType,
                          quantity: t.quantity,
                          unit: t.unit,
                          reason: t.reason,
                        }));
                        setMovementConfirmed(false);
                      }}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>
              <AppReactSelect
                label="Inventory Item"
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
                placeholder="Select item"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <AppReactSelect
                  label="Movement Type"
                  value={movementForm.movementType}
                  onChange={(value) =>
                    setMovementForm((prev) => ({ ...prev, movementType: value }))
                  }
                  options={ENTRY_MOVEMENT_OPTIONS}
                />
                <Input
                  label="Quantity"
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={movementForm.quantity}
                  onChange={(e) =>
                    setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Unit (from item)</label>
                {movementForm.inventoryItemId ? (
                  <div
                    className="flex h-10 w-full items-center rounded-lg border border-[#e5e7eb] bg-slate-50 px-3 text-sm text-slate-700"
                    title="Unit from inventory item (same unit everywhere)"
                  >
                    {movementForm.unit || inventoryMap[movementForm.inventoryItemId]?.unit || "—"}
                  </div>
                ) : (
                  <div className="flex h-10 w-full items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-400">
                    Select item
                  </div>
                )}
              </div>
              <Input
                label="Reason"
                value={movementForm.reason}
                onChange={(e) =>
                  setMovementForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="e.g. wastage, restock"
              />

              {movementPreview ? (
                <div className="rounded-xl border-2 border-[#5a189a]/20 bg-linear-to-br from-[#5a189a]/5 via-white to-[#9d4edd]/5 p-4 shadow-sm">
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
                      <dt className="text-slate-500">Item</dt>
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
                      className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)]"
                      style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
                      loading={createMovementMut.isPending}
                      disabled={!movementConfirmed}
                    >
                      Confirm & Save Movement
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Select item, movement type and quantity to see preview.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card id="stock-count" className="scroll-mt-6 overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle>Physical Stock Count</CardTitle>
            <p className="mt-1 text-sm font-normal text-slate-500">
              Enter items and counted quantities. Review previous vs current and the differences, then confirm to save.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={submitStockCount} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={loadAllBarItems} className="rounded-lg">
                  <FiList className="mr-1.5 h-4 w-4" aria-hidden />
                  Load all bar items
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={exportCountSheet} className="rounded-lg">
                  <FiDownload className="mr-1.5 h-4 w-4" aria-hidden />
                  Download count sheet (CSV)
                </Button>
              </div>
              <AppDatePicker
                label="Count Date"
                selected={countDate}
                onChange={setCountDate}
              />
              <Textarea
                label="Count Notes"
                value={countNotes}
                onChange={(e) => setCountNotes(e.target.value)}
                placeholder="Optional notes"
              />
              <div className="space-y-2">
                {countLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-100 bg-slate-50/30 p-3"
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <AppReactSelect
                        label="Item"
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
                      <Input
                        label="Physical Stock"
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
                    <Input
                      label="Line Note"
                      value={line.note}
                      onChange={(e) =>
                        setCountLines((rows) =>
                          rows.map((row, i) =>
                            i === idx ? { ...row, note: e.target.value } : row
                          )
                        )}
                      className="mt-2"
                    />
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
                        Remove
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
                          <th className="pb-2 pr-3 font-medium">Item</th>
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
                      className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)]"
                      style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
                      loading={createStockCountMut.isPending}
                      disabled={!countConfirmed}
                    >
                      Confirm & Save Stock Count
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <Card id="receive-pos" className="scroll-mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Receive Purchase Orders To Bar</CardTitle>
            {lastReceivedReceipt?.lines?.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={printGrn} className="rounded-lg border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10">
                <FiPrinter className="mr-1.5 h-4 w-4" aria-hidden />
                Print GRN
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">PO Number</th>
                  <th className="pb-3 font-medium">Supplier</th>
                  <th className="pb-3 font-medium">Lines</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!poLoading && receivablePOs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No approved/ordered POs to receive.
                    </td>
                  </tr>
                ) : (
                  receivablePOs.map((po: any) => (
                    <tr key={po._id} className="hover:bg-slate-50">
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPoId(String(po._id))}
                          className="font-medium text-[#5a189a] hover:underline"
                        >
                          {po.poNumber}
                        </button>
                      </td>
                      <td className="py-3">{po.supplierId?.name ?? "-"}</td>
                      <td className="py-3">
                        {Array.isArray(po.lines) ? po.lines.length : 0}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            po.status === PROCUREMENT_ORDER_STATUS.PARTIALLY_RECEIVED
                              ? "warning"
                              : po.status === PROCUREMENT_ORDER_STATUS.ORDERED
                                ? "info"
                                : "success"
                          }
                        >
                          {po.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-lg font-semibold text-white shadow-sm"
                          style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
                          onClick={() => receivePurchaseOrder(po, "full")}
                          loading={
                            receivingPoId === String(po._id) || receiveMut.isPending
                          }
                        >
                          Receive Full
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedPo && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                PO {selectedPo.poNumber} – partial receive
              </p>
              <div className="space-y-3 text-sm">
                {(selectedPo.lines ?? []).map((line: any, idx: number) => {
                  const totalQty = Number(line.quantity ?? 0);
                  const alreadyReceived = Number(line.receivedQuantity ?? 0);
                  const remaining = Math.max(0, totalQty - alreadyReceived);
                  const key = poLineKey(String(selectedPo._id), idx);
                  return (
                    <div
                      key={key}
                      className="grid gap-3 rounded-lg border border-slate-100 bg-white p-3 md:grid-cols-3"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{line.itemName}</p>
                        <p className="text-xs text-slate-500">
                          Ordered {totalQty} {line.unit} • Remaining {remaining}
                        </p>
                      </div>
                      <Input
                        label="Receive Qty"
                        type="number"
                        min={0}
                        step={0.001}
                        max={remaining}
                        value={partialReceive[key] ?? ""}
                        onChange={(e) =>
                          setPartialReceive((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            setPartialReceive((prev) => ({
                              ...prev,
                              [key]: String(remaining),
                            }))
                          }
                        >
                          Use Remaining
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Input
                  label="Delivery Note Number"
                  value={deliveryNoteNumber}
                  onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                  placeholder="Optional"
                />
                <Textarea
                  label="Receipt Note"
                  value={receiptNote}
                  onChange={(e) => setReceiptNote(e.target.value)}
                  placeholder="Optional"
                />
                <Button
                  type="button"
                  className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)]"
                  style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
                  onClick={() => receivePurchaseOrder(selectedPo, "partial")}
                  loading={
                    receivingPoId === String(selectedPo._id) || receiveMut.isPending
                  }
                >
                  Receive Partial To Bar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent PO Receipts (Bar)</CardTitle>
          <p className="mt-1 text-sm font-normal text-slate-500">
            Last 10 restock lines from PO receipts.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Item</th>
                  <th className="pb-3 font-medium">Qty</th>
                  <th className="pb-3 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receiptRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No recent PO receipts.
                    </td>
                  </tr>
                ) : (
                  receiptRows.slice(0, 10).map((row: any) => (
                    <tr key={row._id}>
                      <td className="py-3">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3">
                        {inventoryMap[String(row.inventoryItemId)]?.name ??
                          String(row.inventoryItemId)}
                      </td>
                      <td className="py-3">
                        {Number(row.quantity ?? 0).toFixed(3)} {row.unit}
                      </td>
                      <td className="py-3">
                        {Number(row.previousStock ?? 0).toFixed(3)} →{" "}
                        {Number(row.resultingStock ?? 0).toFixed(3)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card id="receive-history" className="scroll-mt-6">
        <CardHeader>
          <CardTitle>Receive history (Bar)</CardTitle>
          <p className="mt-1 text-sm font-normal text-slate-500">
            Past PO receipts into bar. Print GRN for any receipt.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Receipt #</th>
                  <th className="pb-3 font-medium">PO #</th>
                  <th className="pb-3 font-medium">Delivery note</th>
                  <th className="pb-3 font-medium">Items</th>
                  <th className="pb-3 font-medium">Total units</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receiptHistoryGrouped.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No receive history yet. Receive a PO above to see it here.
                    </td>
                  </tr>
                ) : (
                  receiptHistoryGrouped.map((group) => (
                    <tr key={group.receiptNumber} className="hover:bg-slate-50">
                      <td className="py-3 whitespace-nowrap">
                        {new Date(group.date).toLocaleString()}
                      </td>
                      <td className="py-3 font-mono text-xs">{group.receiptNumber}</td>
                      <td className="py-3">{group.poNumber || "—"}</td>
                      <td className="py-3 max-w-[120px] truncate" title={group.deliveryNote}>
                        {group.deliveryNote || "—"}
                      </td>
                      <td className="py-3">{group.lines.length}</td>
                      <td className="py-3">{group.totalUnits.toFixed(1)}</td>
                      <td className="py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => printHistoricalGrn(group)}
                          className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <FiPrinter className="mr-1.5 h-4 w-4" aria-hidden />
                          Print GRN
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card id="movement-ledger" className="scroll-mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Movement Ledger</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => queryClient.refetchQueries({ queryKey: ["bar", "inventory-movements"] })}
                disabled={isLoading}
                className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <FiRefreshCw className={cn("h-4 w-4 sm:mr-1.5", isLoading && "animate-spin")} aria-hidden />
                Refresh
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportLedgerCsv} className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50">
                <FiDownload className="h-4 w-4 sm:mr-1.5" aria-hidden />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDatePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={clearLedgerFilters}>
              Clear filters
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
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
              label="Item"
              value={inventoryFilter}
              onChange={(value) => {
                setInventoryFilter(value);
                setPage(1);
              }}
              options={[
                { value: "", label: "All items" },
                ...inventoryOptions,
              ]}
            />
          </div>
          <DataTable
            columns={columns}
            data={movementRows}
            loading={isLoading}
            getRowKey={(row) => row._id}
            getRowClassName={(row) =>
              lastAddedMovementId && String(row._id) === lastAddedMovementId
                ? "bg-emerald-50/80 animate-pulse"
                : undefined
            }
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
            emptyDescription={
              startDate || endDate || movementTypeFilter || inventoryFilter
                ? "No movements in this date range or filter. Try a wider range or use Clear filters. Then record a movement or receive a PO."
                : "Record stock movements or receive POs to build the ledger."
            }
          />
          {!isLoading && movementRows.length === 0 && (
            <div className="flex flex-wrap gap-2 text-sm">
              <a href="#record-movement" className="font-medium text-[#5a189a] hover:underline">Record a movement</a>
              <span className="text-slate-400">|</span>
              <a href="#receive-pos" className="font-medium text-[#5a189a] hover:underline">Receive a PO</a>
            </div>
          )}
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
