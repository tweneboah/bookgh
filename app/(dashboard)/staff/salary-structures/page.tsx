"use client";

import { useMemo, useState } from "react";
import {
  useSalaryStructures,
  useCreateSalaryStructure,
  useUpdateSalaryStructure,
  useDeleteSalaryStructure,
} from "@/hooks/api";
import { Button, Modal, Input, Badge, AppReactSelect } from "@/components/ui";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DEPARTMENT } from "@/constants";
import Link from "next/link";

const fmt = (n: number) =>
  `₵${new Intl.NumberFormat("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)}`;

const DEPARTMENT_OPTIONS = Object.entries(DEPARTMENT).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, " "),
}));

type ItemRow = { name: string; amount: string; percent: string; isPercent: boolean };
const emptyItem = (): ItemRow => ({ name: "", amount: "", percent: "", isPercent: false });

export default function SalaryStructuresPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    department: "",
    role: "",
    baseSalary: "",
    overtimeRate: "1.5",
    deductions: [emptyItem()] as ItemRow[],
    additions: [emptyItem()] as ItemRow[],
    isActive: true,
  });

  const { data, isLoading } = useSalaryStructures();
  const createMut = useCreateSalaryStructure();
  const updateMut = useUpdateSalaryStructure(editingId ?? "");
  const deleteMut = useDeleteSalaryStructure();

  const list = (data?.data ?? data) as Array<{
    _id: string;
    name: string;
    department?: string;
    role?: string;
    baseSalary: number;
    overtimeRate?: number;
    deductions?: { name: string; amount?: number; percent?: number; isPercent?: boolean }[];
    additions?: { name: string; amount?: number; percent?: number; isPercent?: boolean }[];
    isActive?: boolean;
  }> | undefined;
  const structures = Array.isArray(list) ? list : [];

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      department: "",
      role: "",
      baseSalary: "",
      overtimeRate: "1.5",
      deductions: [emptyItem()],
      additions: [emptyItem()],
      isActive: true,
    });
    setShowModal(true);
  };

  const openEdit = (s: (typeof structures)[0]) => {
    setEditingId(s._id);
    setForm({
      name: s.name,
      department: s.department ?? "",
      role: s.role ?? "",
      baseSalary: String(s.baseSalary ?? ""),
      overtimeRate: String(s.overtimeRate ?? 1.5),
      deductions: (s.deductions?.length ? s.deductions : [emptyItem()]).map((d) => ({
        name: d.name ?? "",
        amount: d.isPercent ? "" : String(d.amount ?? ""),
        percent: d.isPercent ? String(d.percent ?? "") : "",
        isPercent: !!d.isPercent,
      })),
      additions: (s.additions?.length ? s.additions : [emptyItem()]).map((d) => ({
        name: d.name ?? "",
        amount: d.isPercent ? "" : String(d.amount ?? ""),
        percent: d.isPercent ? String(d.percent ?? "") : "",
        isPercent: !!d.isPercent,
      })),
      isActive: s.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const baseSalary = parseFloat(form.baseSalary);
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (isNaN(baseSalary) || baseSalary < 0) {
      toast.error("Valid base salary required");
      return;
    }
    const deductions = form.deductions
      .filter((d) => d.name.trim())
      .map((d) => ({
        name: d.name.trim(),
        amount: d.isPercent ? undefined : (parseFloat(d.amount) || 0),
        percent: d.isPercent ? (parseFloat(d.percent) || 0) : undefined,
        isPercent: d.isPercent,
      }));
    const additions = form.additions
      .filter((d) => d.name.trim())
      .map((d) => ({
        name: d.name.trim(),
        amount: d.isPercent ? undefined : (parseFloat(d.amount) || 0),
        percent: d.isPercent ? (parseFloat(d.percent) || 0) : undefined,
        isPercent: d.isPercent,
      }));
    const payload = {
      name: form.name.trim(),
      department: form.department.trim() || undefined,
      role: form.role.trim() || undefined,
      baseSalary,
      overtimeRate: parseFloat(form.overtimeRate) || 1.5,
      deductions,
      additions,
      isActive: form.isActive,
    };
    try {
      if (editingId) {
        await updateMut.mutateAsync(payload);
        toast.success("Structure updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Structure created");
      }
      setShowModal(false);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
        : "Failed to save";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this salary structure? Employees assigned to it will need a new structure.")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Deleted");
      if (editingId === id) setShowModal(false);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const renderItemList = (
    items: ItemRow[],
    setItems: (fn: (prev: ItemRow[]) => ItemRow[]) => void,
    title: string
  ) => (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {items.map((d, i) => (
        <div key={i} className="mb-2 flex flex-wrap items-end gap-2">
          <Input
            placeholder="Name"
            value={d.name}
            onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            className="min-w-[100px] flex-1"
          />
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={d.isPercent}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, isPercent: e.target.checked, amount: "", percent: "" } : x))
                )
              }
            />
            %
          </label>
          {d.isPercent ? (
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              placeholder="%"
              value={d.percent}
              onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))}
              className="w-24"
            />
          ) : (
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="₵"
              value={d.amount}
              onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
              className="w-28"
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setItems((prev) => [...prev, emptyItem()])}
        className="mt-1"
      >
        <Plus className="mr-1 inline h-4 w-4" />
        Add
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/60" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#5a189a] to-[#7b2cbf] text-white shadow-lg shadow-[#5a189a]/20">
                <Layers className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Salary structures</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Define structures by role or department; assign employees on{" "}
                  <Link href="/staff/salary-payments" className="font-medium text-[#5a189a] hover:underline">
                    Salary payments
                  </Link>
                  .
                </p>
              </div>
            </div>
            <Button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff8500] font-semibold text-white shadow-md hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              New structure
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-5">
            <h2 className="text-base font-semibold text-slate-900">Structures</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : structures.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No salary structures yet. Create one to assign to employees when paying salary.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {structures.map((s) => (
                <div
                  key={s._id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <div>
                    <p className="font-medium text-slate-900">{s.name}</p>
                    <p className="text-sm text-slate-500">
                      Base {fmt(s.baseSalary ?? 0)}
                      {s.department ? ` · ${DEPARTMENT_OPTIONS.find((d) => d.value === s.department)?.label ?? s.department}` : ""}
                      {s.role ? ` · ${s.role}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.isActive === false && <Badge variant="warning">Inactive</Badge>}
                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(s._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit structure" : "New salary structure"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Waiter – Monthly"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AppReactSelect
              label="Department"
              value={form.department}
              onChange={(v) => setForm((f) => ({ ...f, department: v ?? "" }))}
              options={[{ value: "", label: "—" }, ...DEPARTMENT_OPTIONS]}
            />
            <Input
              label="Role (optional)"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g. Waiter"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Base salary (₵)"
              type="number"
              min="0"
              step="0.01"
              value={form.baseSalary}
              onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))}
              placeholder="0"
              required
            />
            <Input
              label="Overtime rate"
              type="number"
              min="1"
              step="0.25"
              value={form.overtimeRate}
              onChange={(e) => setForm((f) => ({ ...f, overtimeRate: e.target.value }))}
              placeholder="1.5"
            />
          </div>
          {renderItemList(
            form.deductions,
            (fn) => setForm((f) => ({ ...f, deductions: fn(f.deductions) })),
            "Deductions (tax, pension, etc.)"
          )}
          {renderItemList(
            form.additions,
            (fn) => setForm((f) => ({ ...f, additions: fn(f.additions) })),
            "Additions (allowances, etc.)"
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active (available for assignment)
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="bg-linear-to-r from-[#5a189a] to-[#7b2cbf] text-white"
            >
              {editingId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
