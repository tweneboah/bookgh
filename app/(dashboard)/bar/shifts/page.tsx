"use client";

import { useState } from "react";
import { AppDatePicker, Badge, Button, DataTable, Input, Modal } from "@/components/ui";
import { useBarShifts, useCloseBarShift, useOpenBarShift } from "@/hooks/api";
import toast from "react-hot-toast";
import { FiClock, FiPlus, FiCheckCircle } from "react-icons/fi";

const OPEN_SHIFT_TEMPLATES = [
  { key: "morning", label: "Morning Shift", shiftName: "Morning Shift", openingCash: 500 },
  { key: "afternoon", label: "Afternoon Shift", shiftName: "Afternoon Shift", openingCash: 700 },
  { key: "night", label: "Night Shift", shiftName: "Night Shift", openingCash: 1000 },
] as const;

const CLOSE_NOTES_TEMPLATES = [
  {
    key: "normal",
    label: "Normal Close",
    note: "No major variance. Operations normal.",
  },
  {
    key: "wastage-approved",
    label: "Wastage Approved",
    note: "Minor wastage recorded and approved.",
  },
  {
    key: "cash-balanced",
    label: "Cash Balanced",
    note: "Cash balanced. Pending card settlement confirmation.",
  },
] as const;

export default function BarShiftsPage() {
  const [page, setPage] = useState(1);
  const [showOpen, setShowOpen] = useState(false);
  const [shiftName, setShiftName] = useState("");
  const [openingCash, setOpeningCash] = useState(0);
  const [closeShiftId, setCloseShiftId] = useState<string | null>(null);
  const [closingCash, setClosingCash] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [varianceNotes, setVarianceNotes] = useState("");

  const { data, isLoading } = useBarShifts({ page: String(page), limit: "20" });
  const openMut = useOpenBarShift();
  const closeMut = useCloseBarShift();
  const rows = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const submitOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openMut.mutateAsync({ shiftName, openingCash });
      toast.success("Shift opened");
      setShowOpen(false);
      setShiftName("");
      setOpeningCash(0);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to open shift");
    }
  };

  const submitClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeShiftId) return;
    try {
      await closeMut.mutateAsync({
        id: closeShiftId,
        closingCash,
        closingStockSnapshot: [],
        varianceNotes,
      });
      toast.success("Shift closed");
      setCloseShiftId(null);
      setClosingCash(0);
      setVarianceNotes("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Failed to close shift");
    }
  };

  const columns = [
    { key: "shiftName", header: "Shift", render: (row: any) => row.shiftName },
    { key: "openedAt", header: "Opened", render: (row: any) => new Date(row.openedAt).toLocaleString() },
    {
      key: "openedBy",
      header: "Opened By",
      render: (row: any) => {
        const u = row.openedBy;
        if (!u) return "-";
        if (typeof u === "object" && (u.firstName != null || u.email)) {
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
          return name || u.email || u._id || "-";
        }
        return String(u);
      },
    },
    { key: "openingCash", header: "Opening Cash", render: (row: any) => row.openingCash ?? 0 },
    { key: "closingCash", header: "Closing Cash", render: (row: any) => row.closingCash ?? "-" },
    {
      key: "status",
      header: "Status",
      render: (row: any) =>
        row.isClosed ? <Badge variant="default">Closed</Badge> : <Badge variant="success">Open</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) =>
        row.isClosed ? (
          <span className="text-slate-400">—</span>
        ) : (
          <Button
            size="sm"
            onClick={() => setCloseShiftId(row._id)}
            className="rounded-lg border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10"
          >
            <FiCheckCircle className="h-4 w-4 sm:mr-1.5" aria-hidden />
            Close Shift
          </Button>
        ),
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/98 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">BAR Shifts</h1>
              <p className="mt-1 text-sm text-slate-500">Track opening and closing cash and shift accountability.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <AppDatePicker selected={selectedDate} onChange={setSelectedDate} />
              <Button
                onClick={() => setShowOpen(true)}
                className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,109,0,0.4)]"
                style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}
              >
                <FiPlus className="h-4 w-4 sm:mr-2" aria-hidden />
                Open Shift
              </Button>
            </div>
          </div>
        </div>
        <div className="h-0.5 w-full bg-linear-to-r from-[#ff8500]/40 via-[#5a189a]/40 to-[#ff8500]/40" />
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-100 border-l-4 border-l-[#5a189a] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <FiClock className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">All shifts</h2>
                <p className="text-xs text-slate-500">Open a new shift or close an active one.</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto min-w-0">
            <DataTable
              columns={columns}
              data={rows}
              loading={isLoading}
              getRowKey={(row) => row._id}
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
              emptyTitle="No shifts"
              emptyDescription="Open a shift to start BAR operations."
            />
          </div>
        </div>
      </main>

      <Modal open={showOpen} onClose={() => setShowOpen(false)} title="Open Shift" className="max-w-md rounded-2xl border-slate-100 shadow-[0_24px_48px_rgba(0,0,0,0.12)]">
        <form onSubmit={submitOpen} className="space-y-5" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-[#5a189a]/5 to-[#9d4edd]/5 p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Quick templates</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OPEN_SHIFT_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => {
                    setShiftName(template.shiftName);
                    setOpeningCash(template.openingCash);
                  }}
                  className="rounded-xl border border-[#5a189a]/25 bg-white px-4 py-2.5 text-sm font-medium text-[#5a189a] shadow-sm transition-all hover:bg-[#5a189a]/10"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Shift name</label>
            <Input value={shiftName} onChange={(e) => setShiftName(e.target.value)} required className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Opening cash</label>
            <Input type="number" min={0} step="0.01" value={openingCash} onChange={(e) => setOpeningCash(Number(e.target.value))} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowOpen(false)} className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button>
            <Button type="submit" loading={openMut.isPending} className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)]" style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}>Open</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!closeShiftId} onClose={() => setCloseShiftId(null)} title="Close Shift" className="max-w-md rounded-2xl border-slate-100 shadow-[0_24px_48px_rgba(0,0,0,0.12)]">
        <form onSubmit={submitClose} className="space-y-5" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Closing cash</label>
            <Input type="number" min={0} step="0.01" value={closingCash} onChange={(e) => setClosingCash(Number(e.target.value))} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-sm font-semibold text-slate-800">Quick variance notes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CLOSE_NOTES_TEMPLATES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setVarianceNotes(item.note)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Variance notes</label>
            <Input value={varianceNotes} onChange={(e) => setVarianceNotes(e.target.value)} className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20" />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setCloseShiftId(null)} className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button>
            <Button type="submit" loading={closeMut.isPending} className="rounded-xl font-semibold text-white shadow-[0_4px_14px_rgba(255,109,0,0.35)]" style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9100 100%)" }}>Close Shift</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
