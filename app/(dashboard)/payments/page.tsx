"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  usePayments,
  useCreatePayment,
  useInvoices,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Badge,
  AppReactSelect,
} from "@/components/ui";
import {
  FiPlus,
  FiCreditCard,
  FiFilter,
  FiDollarSign,
  FiCheckCircle,
  FiHash,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { PAYMENT_METHOD, PAYMENT_STATUS, DEPARTMENT } from "@/constants";

const fmt = (n: number) =>
  `₵${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const METHOD_OPTIONS = Object.entries(PAYMENT_METHOD).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const METHOD_BADGE_VARIANT: Record<string, "default" | "info" | "warning" | "success"> = {
  cash: "default",
  card: "info",
  mobileMoney: "warning",
  bankTransfer: "success",
};

const STATUS_BADGE_VARIANT: Record<string, "default" | "info" | "warning" | "success" | "danger"> = {
  pending: "warning",
  success: "success",
  failed: "danger",
  refunded: "default",
};

const DEPARTMENT_OPTIONS = Object.entries(DEPARTMENT).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, " "),
}));

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...Object.entries(PAYMENT_STATUS).map(([k, v]) => ({
    value: v,
    label: k.replace(/([A-Z])/g, " $1").trim(),
  })),
];

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const urlDepartment = searchParams.get("department") ?? "";
  const isDepartmentLocked = !!urlDepartment;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(urlDepartment);
  const [invoiceFilter, setInvoiceFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const [form, setForm] = useState({
    invoiceId: "",
    amount: "",
    paymentMethod: PAYMENT_METHOD.CASH as string,
    paystackReference: "",
  });

  useEffect(() => {
    setDepartmentFilter(urlDepartment);
    setInvoiceFilter("");
    setPage(1);
  }, [urlDepartment]);

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (statusFilter) params.status = statusFilter;
  if (departmentFilter) params.department = departmentFilter;
  if (invoiceFilter) params.invoiceId = invoiceFilter;

  const { data, isLoading } = usePayments(params);
  const invoicesQueryParams: Record<string, string> = { limit: "100" };
  if (departmentFilter) invoicesQueryParams.department = departmentFilter;
  const { data: invoicesData } = useInvoices(invoicesQueryParams);
  const createMut = useCreatePayment();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const invoices = invoicesData?.data ?? [];
  const invoiceMap = Object.fromEntries(
    invoices.map((inv: any) => [String(inv._id), inv])
  );

  const invoiceOptions = invoices
    .filter((inv: any) =>
      invoiceSearch
        ? (inv.invoiceNumber ?? "").toLowerCase().includes(invoiceSearch.toLowerCase())
        : true
    )
    .map((inv: any) => ({
      value: inv._id,
      label: `${inv.invoiceNumber} - ${inv.totalAmount != null ? fmt(inv.totalAmount) : ""}`,
    }));

  const departmentSelectOptions = isDepartmentLocked
    ? DEPARTMENT_OPTIONS.filter((o) => o.value === urlDepartment)
    : [{ value: "", label: "All Departments" }, ...DEPARTMENT_OPTIONS];

  const invoiceSelectOptions = [
    { value: "", label: "All Invoices" },
    ...invoices.slice(0, 50).map((inv: any) => ({
      value: inv._id,
      label: inv.invoiceNumber ?? inv._id,
    })),
  ];

  const resetForm = () => {
    setForm({
      invoiceId: "",
      amount: "",
      paymentMethod: PAYMENT_METHOD.CASH,
      paystackReference: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!form.invoiceId) {
      toast.error("Select an invoice");
      return;
    }

    try {
      await createMut.mutateAsync({
        invoiceId: form.invoiceId,
        department: invoiceMap[String(form.invoiceId)]?.department,
        amount,
        paymentMethod: form.paymentMethod,
        paystackReference: form.paystackReference.trim() || undefined,
      });
      toast.success("Payment recorded");
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const totalAmount = items.reduce((sum: number, row: any) => sum + (row.amount ?? 0), 0);
  const successCount = items.filter((r: any) => r.status === "success").length;

  const columns = [
    {
      key: "department",
      header: "Department",
      render: (row: any) =>
        DEPARTMENT_OPTIONS.find((o) => o.value === row.department)?.label ??
        row.department ??
        "-",
    },
    {
      key: "invoiceId",
      header: "Invoice / Event",
      render: (row: any) => {
        if (row.source === "eventBooking" && row.eventBookingId) {
          const ref = row.bookingReference ?? String(row.eventBookingId).slice(-6);
          return (
            <Link
              href={`/event-bookings/${row.eventBookingId}`}
              className="inline-flex items-center gap-1 text-[#5a189a] hover:underline"
            >
              <span className="rounded bg-[#5a189a]/10 px-1.5 py-0.5 text-xs font-medium text-[#5a189a]">
                Event
              </span>
              {ref}
            </Link>
          );
        }
        if (row.source === "poolBooking" && row.poolBookingId) {
          const ref = row.bookingReference ?? String(row.poolBookingId).slice(-6);
          return (
            <Link
              href={`/pool/bookings/${row.poolBookingId}`}
              className="inline-flex items-center gap-1 text-[#5a189a] hover:underline"
            >
              <span className="rounded bg-[#5a189a]/10 px-1.5 py-0.5 text-xs font-medium text-[#5a189a]">
                Pool
              </span>
              {ref}
            </Link>
          );
        }
        if (row.source === "playgroundBooking" && row.playgroundBookingId) {
          const ref = row.bookingReference ?? String(row.playgroundBookingId).slice(-6);
          return (
            <Link
              href={`/playground/bookings/${row.playgroundBookingId}`}
              className="inline-flex items-center gap-1 text-[#5a189a] hover:underline"
            >
              <span className="rounded bg-[#5a189a]/10 px-1.5 py-0.5 text-xs font-medium text-[#5a189a]">
                Playground
              </span>
              {ref}
            </Link>
          );
        }
        return (
          invoiceMap[String(row.invoiceId)]?.invoiceNumber ??
          String(row.invoiceId ?? "-")
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      render: (row: any) =>
        row.amount != null ? fmt(row.amount) : "-",
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (row: any) => (
        <Badge variant={METHOD_BADGE_VARIANT[row.paymentMethod] ?? "default"}>
          {METHOD_OPTIONS.find((o) => o.value === row.paymentMethod)?.label ?? row.paymentMethod}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => (
        <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? "default"}>
          {row.status ?? "pending"}
        </Badge>
      ),
    },
    {
      key: "paystackReference",
      header: "Paystack Ref",
      render: (row: any) => row.paystackReference ?? "-",
    },
    {
      key: "date",
      header: "Date",
      render: (row: any) =>
        row.createdAt
          ? format(new Date(row.createdAt), "MMM d, yyyy")
          : "-",
    },
    {
      key: "actions",
      header: "",
      render: () => null,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      {/* Hero */}
      <div className="relative bg-white border-b border-slate-100">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[min(80vw,420px)] h-[min(80vw,420px)] bg-gradient-to-br from-[#ff9100]/10 to-[#ff6d00]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#5a189a]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/25">
                  <FiCreditCard className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Payments
                  </h1>
                  {isDepartmentLocked && (
                    <p className="text-sm font-medium text-[#5a189a] mt-0.5">
                      {DEPARTMENT_OPTIONS.find((d) => d.value === urlDepartment)?.label ?? urlDepartment}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-slate-500 text-sm sm:text-base max-w-xl">
                Record and track payments across departments. Monitor financial health at a glance.
              </p>
            </div>
            <div className="shrink-0">
              <Button
                onClick={() => setShowModal(true)}
                className="h-12 px-6 rounded-xl font-semibold text-white border-0 shadow-lg shadow-[#ff6d00]/25 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-offset-2 focus:ring-[#ff6d00] transition-all hover:-translate-y-0.5"
              >
                <FiPlus className="h-5 w-5 mr-2" aria-hidden />
                Record Payment
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
                <FiHash className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Transactions</p>
                <p className="text-xl font-bold text-slate-900">
                  {pagination?.total ?? items.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff6d00]/10 text-[#ff6d00]">
                <FiDollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total (this page)</p>
                <p className="text-xl font-bold text-slate-900">{fmt(totalAmount)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <FiCheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Successful</p>
                <p className="text-xl font-bold text-slate-900">
                  {items.length ? successCount : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters + Table card */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                  <FiFilter className="h-4 w-4 text-[#5a189a]" />
                </div>
                <span>Filters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full sm:w-auto">
                <div className="min-w-0">
                  <AppReactSelect
                    value={departmentFilter}
                    onChange={(v) => {
                      setDepartmentFilter(v);
                      setInvoiceFilter("");
                      setPage(1);
                    }}
                    options={departmentSelectOptions}
                    placeholder="Department"
                    isClearable={!isDepartmentLocked}
                    className="w-full"
                  />
                </div>
                <div className="min-w-0">
                  <AppReactSelect
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setPage(1);
                    }}
                    options={STATUS_OPTIONS}
                    placeholder="Status"
                    isClearable
                    className="w-full"
                  />
                </div>
                <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                  <AppReactSelect
                    value={invoiceFilter}
                    onChange={(v) => {
                      setInvoiceFilter(v);
                      setPage(1);
                    }}
                    options={invoiceSelectOptions}
                    placeholder="Invoice"
                    isClearable
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-0 sm:p-2 min-h-[380px] [&_table]:w-full">
            <DataTable
              columns={columns}
              data={items}
              getRowKey={(row) => row._id}
              loading={isLoading}
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
              emptyTitle="No payments found"
              emptyDescription="There are no payment records matching your current criteria."
            />
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Record Payment"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Invoice
            </label>
            <Input
              placeholder="Search by invoice number..."
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              className="mb-2 rounded-xl border-slate-200 focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
            />
            <AppReactSelect
              value={form.invoiceId}
              onChange={(v) => setForm((f) => ({ ...f, invoiceId: v }))}
              options={[
                { value: "", label: "Select invoice..." },
                ...invoiceOptions.slice(0, 20),
              ]}
              placeholder="Select invoice..."
              className="w-full"
            />
            {!!form.invoiceId && (
              <p className="mt-2 text-xs text-slate-500">
                Department:{" "}
                <span className="font-medium text-slate-700">
                  {DEPARTMENT_OPTIONS.find(
                    (d) => d.value === invoiceMap[String(form.invoiceId)]?.department
                  )?.label ?? "N/A"}
                </span>
              </p>
            )}
          </div>
          <Input
            label="Amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) =>
              setForm((f) => ({ ...f, amount: e.target.value }))
            }
            required
            placeholder="0.00"
            className="rounded-xl border-slate-200 focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
          />
          <AppReactSelect
            label="Payment Method"
            value={form.paymentMethod}
            onChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}
            options={METHOD_OPTIONS}
            placeholder="Select method..."
            className="w-full"
          />
          <Input
            label="Paystack Reference (optional)"
            value={form.paystackReference}
            onChange={(e) =>
              setForm((f) => ({ ...f, paystackReference: e.target.value }))
            }
            placeholder="For card / mobile money"
            className="rounded-xl border-slate-200 focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
          />
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending}
              className="rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
            >
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
