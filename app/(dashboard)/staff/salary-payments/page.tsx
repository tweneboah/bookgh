"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useUsers,
  useEmployeePayroll,
  useUpsertEmployeePayroll,
  useSalaryStructures,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Badge,
  AppReactSelect,
  AppDatePicker,
} from "@/components/ui";
import { DollarSign, UserPlus, FileText, Building2, Smartphone, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { DEPARTMENT, PAYMENT_METHOD, EXPENSE_STATUS } from "@/constants";
import Link from "next/link";

const fmt = (n: number) =>
  `₵${new Intl.NumberFormat("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)}`;

const DEPARTMENT_OPTIONS = Object.entries(DEPARTMENT).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, " "),
}));

const METHOD_OPTIONS = Object.entries(PAYMENT_METHOD).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const PAYMENT_METHOD_PAYROLL = [
  { value: "bank", label: "Bank transfer" },
  { value: "mobileMoney", label: "Mobile money (MoMo)" },
  { value: "cash", label: "Cash" },
] as const;

const MOMO_PROVIDERS = [
  { value: "", label: "—" },
  { value: "MTN", label: "MTN" },
  { value: "Vodafone", label: "Vodafone" },
  { value: "AirtelTigo", label: "AirtelTigo" },
];

const SALARY_ACCOUNT_CODE = "staff-salaries";

/** Compute net from structure: base + additions - deductions */
function netFromStructure(structure: {
  baseSalary: number;
  deductions?: { amount?: number; percent?: number; isPercent?: boolean }[];
  additions?: { amount?: number; percent?: number; isPercent?: boolean }[];
}): number {
  const base = structure.baseSalary ?? 0;
  const deduct = (structure.deductions ?? []).reduce((s, d) => {
    if (d.isPercent && d.percent != null) return s + base * (d.percent / 100);
    return s + (d.amount ?? 0);
  }, 0);
  const add = (structure.additions ?? []).reduce((s, d) => {
    if (d.isPercent && d.percent != null) return s + base * (d.percent / 100);
    return s + (d.amount ?? 0);
  }, 0);
  return Math.max(0, base + add - deduct);
}

/** Compute net from legacy payroll (no structure) */
function netFromLegacyPayroll(p: { baseSalary?: number; deductions?: { amount?: number; percent?: number; isPercent?: boolean }[] }): number {
  const base = p.baseSalary ?? 0;
  const deduct = (p.deductions ?? []).reduce((s, d) => {
    if (d.isPercent && d.percent != null) return s + base * (d.percent / 100);
    return s + (d.amount ?? 0);
  }, 0);
  return Math.max(0, base - deduct);
}

export default function StaffSalaryPaymentsPage() {
  const searchParams = useSearchParams();
  const urlDept = searchParams.get("department") ?? "";
  const [department, setDepartment] = useState(urlDept || DEPARTMENT.RESTAURANT);
  const [showModal, setShowModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [form, setForm] = useState({
    staffId: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: PAYMENT_METHOD.CASH,
    period: "",
    notes: "",
    /** One-off deduction for this payment (amount, label) */
    deductionAmount: "",
    deductionLabel: "",
    /** One-off addition for this payment (amount, label) */
    additionAmount: "",
    additionLabel: "",
  });
  const [payrollForm, setPayrollForm] = useState({
    salaryStructureId: "",
    paymentMethod: "cash" as "bank" | "mobileMoney" | "cash",
    bankAccountNumber: "",
    bankName: "",
    momoNumber: "",
    momoProvider: "",
    employeeNumber: "",
  });

  const openPayrollUserId = searchParams.get("openPayroll") ?? "";
  const openedPayrollRef = useRef(false);

  const effectiveStaffId = form.staffId || openPayrollUserId;
  const { data: payrollData } = useEmployeePayroll(effectiveStaffId);
  const payroll = payrollData?.data ?? payrollData;
  const upsertPayroll = useUpsertEmployeePayroll();
  const { data: structuresData } = useSalaryStructures();
  const structuresList = (structuresData?.data ?? structuresData) as Array<{ _id: string; name: string; department?: string; baseSalary: number; isActive?: boolean; deductions?: unknown[]; additions?: unknown[] }> | undefined;
  const structures = Array.isArray(structuresList) ? structuresList : [];
  const structureOptions = useMemo(() => {
    const opts = structures
      .filter((s) => s.isActive !== false)
      .map((s) => ({ value: s._id, label: `${s.name} (${fmt(s.baseSalary ?? 0)})` }));
    if (opts.length) opts.unshift({ value: "", label: "— Select structure —" });
    return opts;
  }, [structures]);

  /** Resolved structure from payroll (populated salaryStructureId or null) */
  const payrollStructure = useMemo(() => {
    const p = payroll as { salaryStructureId?: unknown } | undefined;
    if (!p?.salaryStructureId || typeof p.salaryStructureId !== "object") return null;
    const pop = p.salaryStructureId as { _id: string; name: string; baseSalary: number; deductions?: unknown[]; additions?: unknown[] };
    return pop;
  }, [payroll]);

  /** Net from structure or legacy payroll */
  const structureNet = useMemo(() => {
    if (payrollStructure) return netFromStructure(payrollStructure);
    if (payroll && (payroll as { baseSalary?: number }).baseSalary != null) return netFromLegacyPayroll(payroll as Parameters<typeof netFromLegacyPayroll>[0]);
    return 0;
  }, [payroll, payrollStructure]);

  useEffect(() => {
    if (!openPayrollUserId || openedPayrollRef.current) return;
    openedPayrollRef.current = true;
    setForm((f) => ({ ...f, staffId: openPayrollUserId }));
    setShowPayrollModal(true);
  }, [openPayrollUserId]);

  useEffect(() => {
    if (!payroll || !form.staffId) return;
    const net = structureNet;
    setForm((f) => ({
      ...f,
      amount: net > 0 ? String(net) : f.amount,
      paymentMethod: ((payroll as { paymentMethod?: string }).paymentMethod === "bank" || (payroll as { paymentMethod?: string }).paymentMethod === "mobileMoney")
        ? (payroll as { paymentMethod: string }).paymentMethod
        : f.paymentMethod,
    }));
  }, [form.staffId, payroll, structureNet]);

  const expenseParams = useMemo(
    () => ({
      department,
      accountCode: SALARY_ACCOUNT_CODE,
      limit: "50",
      page: "1",
    }),
    [department]
  );
  const { data: expensesData, isLoading } = useExpenses(expenseParams);
  const { data: usersData } = useUsers({ limit: "500" });
  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();

  const items = (expensesData?.data ?? []) as Array<{
    _id: string;
    staffId?: string;
    amount: number;
    date: string;
    paymentMethod?: string;
    description?: string;
    status?: string;
    period?: string;
  }>;
  const users = (usersData?.data ?? usersData) as Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }> | undefined;
  const userList = Array.isArray(users) ? users : [];
  const userById = useMemo(() => {
    const m: Record<string, { firstName?: string; lastName?: string }> = {};
    userList.forEach((u) => {
      m[u._id] = { firstName: u.firstName, lastName: u.lastName };
    });
    return m;
  }, [userList]);

  const staffOptions = useMemo(
    () =>
      userList.map((u) => ({
        value: u._id,
        label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u._id,
      })),
    [userList]
  );

  const openPayrollModal = () => {
    if (!form.staffId) {
      toast.error("Select a staff member first");
      return;
    }
    const p = payroll as Record<string, unknown> | undefined;
    const sid = p?.salaryStructureId;
    const structureId = typeof sid === "object" && sid && "_id" in sid ? String((sid as { _id: string })._id) : (typeof sid === "string" ? sid : "");
    setPayrollForm({
      salaryStructureId: structureId,
      paymentMethod: (p?.paymentMethod as "bank" | "mobileMoney" | "cash") ?? "cash",
      bankAccountNumber: String(p?.bankAccountNumber ?? ""),
      bankName: String(p?.bankName ?? ""),
      momoNumber: String(p?.momoNumber ?? ""),
      momoProvider: String(p?.momoProvider ?? ""),
      employeeNumber: String(p?.employeeNumber ?? ""),
    });
    setShowPayrollModal(true);
  };

  const handlePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staffId) return;
    if (!payrollForm.salaryStructureId?.trim()) {
      toast.error("Select a salary structure");
      return;
    }
    try {
      await upsertPayroll.mutateAsync({
        userId: form.staffId,
        salaryStructureId: payrollForm.salaryStructureId.trim(),
        paymentMethod: payrollForm.paymentMethod,
        bankAccountNumber: payrollForm.bankAccountNumber.trim() || undefined,
        bankName: payrollForm.bankName.trim() || undefined,
        momoNumber: payrollForm.momoNumber.trim() || undefined,
        momoProvider: payrollForm.momoProvider.trim() || undefined,
        employeeNumber: payrollForm.employeeNumber.trim() || undefined,
      });
      toast.success("Payroll details saved");
      setShowPayrollModal(false);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
        : "Failed to save";
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let amount = parseFloat(form.amount);
    const ded = parseFloat(form.deductionAmount) || 0;
    const add = parseFloat(form.additionAmount) || 0;
    amount = Math.max(0, amount - ded + add);
    if (!form.staffId || !amount) {
      toast.error("Select staff and enter a valid amount");
      return;
    }
    const staff = userById[form.staffId];
    const staffName = [staff?.firstName, staff?.lastName].filter(Boolean).join(" ") || "Staff";
    const periodText = form.period.trim() || format(new Date(form.date), "MMM yyyy");
    const description = `Salary – ${staffName} (${periodText})`;
    const noteParts = [form.notes.trim()].filter(Boolean);
    if (form.deductionLabel.trim() && ded) noteParts.push(`Deduction: ${form.deductionLabel.trim()} (${fmt(ded)})`);
    if (form.additionLabel.trim() && add) noteParts.push(`Addition: ${form.additionLabel.trim()} (${fmt(add)})`);
    const notes = noteParts.length ? noteParts.join(". ") : undefined;

    try {
      await createMut.mutateAsync({
        department,
        category: "Salary",
        description,
        amount,
        date: new Date(form.date + "T00:00:00").toISOString(),
        paymentMethod: form.paymentMethod,
        accountCode: SALARY_ACCOUNT_CODE,
        staffId: form.staffId,
        notes,
      });
      toast.success("Salary payment recorded");
      setShowModal(false);
      setForm({
        staffId: "",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        paymentMethod: PAYMENT_METHOD.CASH,
        period: "",
        notes: "",
        deductionAmount: "",
        deductionLabel: "",
        additionAmount: "",
        additionLabel: "",
      });
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
        : "Something went wrong";
      toast.error(message);
    }
  };

  const totalPaid = useMemo(
    () => items.reduce((s, r) => s + (r.amount ?? 0), 0),
    [items]
  );

  const handleApprove = async (row: { _id: string }) => {
    try {
      await updateMut.mutateAsync({
        id: row._id,
        department,
        status: EXPENSE_STATUS.APPROVED,
      });
      toast.success("Salary payment approved");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
        : "Failed to approve";
      toast.error(msg);
    }
  };

  const handleReject = async (row: { _id: string }) => {
    try {
      await updateMut.mutateAsync({
        id: row._id,
        department,
        status: EXPENSE_STATUS.REJECTED,
      });
      toast.success("Salary payment rejected");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
        : "Failed to reject";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#5a189a] to-[#7b2cbf] text-white shadow-lg shadow-[#5a189a]/20">
                <DollarSign className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Staff salary payments
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Record salary payments; they appear under Staff salaries in accounting.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AppReactSelect
                value={department}
                onChange={setDepartment}
                options={DEPARTMENT_OPTIONS}
                placeholder="Department"
                className="w-44"
              />
              <Button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff8500] font-semibold text-white shadow-md hover:opacity-95"
              >
                <UserPlus className="h-4 w-4" />
                Record payment
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Salary payments for <strong>{DEPARTMENT_OPTIONS.find((d) => d.value === department)?.label ?? department}</strong> (COA: Staff salaries)
          </p>
          <Link
            href="/reports/income-expense-statement"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5a189a] hover:underline"
          >
            <FileText className="h-4 w-4" />
            View in Income & Expense Statement
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Recent salary payments</h2>
              <span className="text-sm font-medium text-slate-600">
                Total this list: {fmt(totalPaid)}
              </span>
            </div>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No salary payments for this department yet. Use “Record payment” to add one.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((row) => {
                const name = row.staffId
                  ? (() => {
                      const u = userById[row.staffId];
                      return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") : "—";
                    })()
                  : row.description ?? "—";
                return (
                  <div
                    key={row._id}
                    className="flex items-center justify-between px-4 py-3 sm:px-5"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{name}</p>
                      <p className="text-xs text-slate-500">
                        {row.date ? format(new Date(row.date), "MMM d, yyyy") : ""}
                        {row.paymentMethod ? ` · ${row.paymentMethod}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{fmt(row.amount)}</span>
                      <Badge
                        variant={
                          row.status === "approved"
                            ? "success"
                            : row.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {row.status ?? "pending"}
                      </Badge>
                      {(row.status === "pending" || !row.status) && (
                        <span className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(row)}
                            disabled={updateMut.isPending}
                            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            aria-label="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(row)}
                            disabled={updateMut.isPending}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            aria-label="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payroll summary when staff selected */}
      {form.staffId && (
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Salary structure & payment</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openPayrollModal}
              className="text-[#5a189a] border-[#5a189a]/30 hover:bg-[#5a189a]/5"
            >
              {payroll ? "Edit payroll" : "Assign structure"}
            </Button>
          </div>
          {payroll ? (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {payrollStructure ? (
                <>
                  <div>
                    <p className="text-slate-500">Structure</p>
                    <p className="font-semibold text-slate-900">{payrollStructure.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Base salary</p>
                    <p className="font-semibold text-slate-900">{fmt(payrollStructure.baseSalary ?? 0)}</p>
                  </div>
                  {(payrollStructure.deductions?.length ?? 0) > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-slate-500">Deductions</p>
                      <ul className="mt-1 space-y-0.5">
                        {(payrollStructure.deductions as { name: string; amount?: number; percent?: number; isPercent?: boolean }[]).map((d, i) => (
                          <li key={i} className="text-slate-700">
                            {d.name}: {d.isPercent ? `${d.percent}%` : fmt(d.amount ?? 0)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(payrollStructure.additions?.length ?? 0) > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-slate-500">Additions</p>
                      <ul className="mt-1 space-y-0.5">
                        {(payrollStructure.additions as { name: string; amount?: number; percent?: number; isPercent?: boolean }[]).map((d, i) => (
                          <li key={i} className="text-slate-700">
                            {d.name}: {d.isPercent ? `${d.percent}%` : fmt(d.amount ?? 0)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500">Net (from structure)</p>
                    <p className="font-semibold text-slate-900">{fmt(structureNet)}</p>
                  </div>
                </>
              ) : (payroll as { baseSalary?: number }).baseSalary != null ? (
                <>
                  <div>
                    <p className="text-slate-500">Base salary (legacy)</p>
                    <p className="font-semibold text-slate-900">{fmt((payroll as { baseSalary: number }).baseSalary)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Net</p>
                    <p className="font-semibold text-slate-900">{fmt(structureNet)}</p>
                  </div>
                </>
              ) : null}
              <div className="sm:col-span-2 flex flex-wrap gap-4">
                {(payroll as { paymentMethod?: string }).paymentMethod === "bank" && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <span>{(payroll as { bankName?: string }).bankName || "Bank"}: {(payroll as { bankAccountNumber?: string }).bankAccountNumber}</span>
                  </div>
                )}
                {(payroll as { paymentMethod?: string }).paymentMethod === "mobileMoney" && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Smartphone className="h-4 w-4 text-slate-500" />
                    <span>{(payroll as { momoProvider?: string }).momoProvider || "MoMo"}: {(payroll as { momoNumber?: string }).momoNumber}</span>
                  </div>
                )}
                {(payroll as { employeeNumber?: string }).employeeNumber && (
                  <div className="text-slate-600">Emp #: {(payroll as { employeeNumber: string }).employeeNumber}</div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">
              No payroll assigned. Click &quot;Assign structure&quot; to link a salary structure and set account/MoMo details.
            </p>
          )}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Record salary payment"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <AppReactSelect
            label="Staff member"
            value={form.staffId}
            onChange={(v) => setForm((f) => ({ ...f, staffId: v ?? "" }))}
            options={staffOptions}
            placeholder="Select staff"
            className="w-full"
          />
          {structureNet > 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Net from structure: <strong>{fmt(structureNet)}</strong>
              {payrollStructure && ` (${payrollStructure.name})`}
            </p>
          )}
          <Input
            label="Amount (₵)"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder={structureNet > 0 ? String(structureNet) : "0"}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Input
                label="Deduction (this payment)"
                type="number"
                min="0"
                step="0.01"
                value={form.deductionAmount}
                onChange={(e) => setForm((f) => ({ ...f, deductionAmount: e.target.value }))}
                placeholder="0"
              />
              <Input
                value={form.deductionLabel}
                onChange={(e) => setForm((f) => ({ ...f, deductionLabel: e.target.value }))}
                placeholder="e.g. Advance, Loan"
                className="mt-1"
              />
            </div>
            <div>
              <Input
                label="Addition (this payment)"
                type="number"
                min="0"
                step="0.01"
                value={form.additionAmount}
                onChange={(e) => setForm((f) => ({ ...f, additionAmount: e.target.value }))}
                placeholder="0"
              />
              <Input
                value={form.additionLabel}
                onChange={(e) => setForm((f) => ({ ...f, additionLabel: e.target.value }))}
                placeholder="e.g. Bonus, Overtime"
                className="mt-1"
              />
            </div>
          </div>
          {(parseFloat(form.deductionAmount) || 0) > 0 || (parseFloat(form.additionAmount) || 0) > 0 ? (
            <p className="text-sm text-slate-600">
              Final amount: {fmt(Math.max(0, (parseFloat(form.amount) || 0) - (parseFloat(form.deductionAmount) || 0) + (parseFloat(form.additionAmount) || 0)))}
            </p>
          ) : null}
          <AppDatePicker
            label="Payment date"
            selected={form.date ? new Date(form.date + "T00:00:00") : null}
            onChange={(d) => setForm((f) => ({ ...f, date: d ? format(d, "yyyy-MM-dd") : "" }))}
          />
          <AppReactSelect
            label="Payment method"
            value={form.paymentMethod}
            onChange={(v) => setForm((f) => ({ ...f, paymentMethod: v ?? "" }))}
            options={METHOD_OPTIONS}
          />
          <Input
            label="Period (e.g. March 2025)"
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
            placeholder="Optional"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
          />
          <p className="text-xs text-slate-500">
            This will create an expense in <strong>{DEPARTMENT_OPTIONS.find((d) => d.value === department)?.label ?? department}</strong> with account code <strong>Staff salaries</strong>, visible in the Income & Expense Statement.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending}
              className="bg-linear-to-r from-[#ff6d00] to-[#ff8500] text-white"
            >
              Record payment
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showPayrollModal}
        onClose={() => setShowPayrollModal(false)}
        title={payroll ? "Edit payroll" : "Assign salary structure"}
        size="lg"
      >
        <form onSubmit={handlePayrollSubmit} className="space-y-4">
          {form.staffId && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              For: <strong>{userById[form.staffId] ? [userById[form.staffId].firstName, userById[form.staffId].lastName].filter(Boolean).join(" ") : form.staffId}</strong>
            </p>
          )}
          <AppReactSelect
            label="Salary structure"
            value={payrollForm.salaryStructureId}
            onChange={(v) => setPayrollForm((f) => ({ ...f, salaryStructureId: v ?? "" }))}
            options={structureOptions}
            placeholder="Select a structure (role/department)"
            className="w-full"
          />
          {structures.length === 0 && (
            <p className="text-sm text-amber-700">
              No salary structures yet. <Link href="/staff/salary-structures" className="font-medium underline">Create one</Link> (by role/department) then assign it here.
            </p>
          )}
          <Input
            label="Employee / payroll number"
            value={payrollForm.employeeNumber}
            onChange={(e) => setPayrollForm((f) => ({ ...f, employeeNumber: e.target.value }))}
            placeholder="Optional"
          />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment details (account / MoMo)</p>
            <AppReactSelect
              label="Payment method"
              value={payrollForm.paymentMethod}
              onChange={(v) => setPayrollForm((f) => ({ ...f, paymentMethod: (v as "bank" | "mobileMoney" | "cash") ?? "cash" }))}
              options={PAYMENT_METHOD_PAYROLL}
              className="w-full"
            />
            {payrollForm.paymentMethod === "bank" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  label="Bank name"
                  value={payrollForm.bankName}
                  onChange={(e) => setPayrollForm((f) => ({ ...f, bankName: e.target.value }))}
                  placeholder="e.g. GCB, Ecobank"
                />
                <Input
                  label="Account number"
                  value={payrollForm.bankAccountNumber}
                  onChange={(e) => setPayrollForm((f) => ({ ...f, bankAccountNumber: e.target.value }))}
                  placeholder="Account number"
                />
              </div>
            )}
            {payrollForm.paymentMethod === "mobileMoney" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <AppReactSelect
                  label="MoMo provider"
                  value={payrollForm.momoProvider}
                  onChange={(v) => setPayrollForm((f) => ({ ...f, momoProvider: v ?? "" }))}
                  options={MOMO_PROVIDERS}
                />
                <Input
                  label="MoMo number"
                  value={payrollForm.momoNumber}
                  onChange={(e) => setPayrollForm((f) => ({ ...f, momoNumber: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowPayrollModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={upsertPayroll.isPending}
              className="bg-linear-to-r from-[#5a189a] to-[#7b2cbf] text-white"
            >
              {payroll ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
