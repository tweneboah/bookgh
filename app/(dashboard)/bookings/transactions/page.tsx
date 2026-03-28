"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useBookingTransactions } from "@/hooks/api";
import { DataTable, Badge, SearchInput } from "@/components/ui";
import { AppReactSelect } from "@/components/ui/react-select";
import { CreditCard, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@/constants";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(Number(n));

const METHOD_OPTIONS = Object.entries(PAYMENT_METHOD).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const METHOD_BADGE: Record<string, "default" | "info" | "warning" | "success"> = {
  cash: "default",
  card: "info",
  mobileMoney: "warning",
  bankTransfer: "success",
};

const STATUS_BADGE: Record<string, "default" | "info" | "warning" | "success" | "danger"> = {
  pending: "warning",
  success: "success",
  failed: "danger",
  refunded: "default",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...Object.entries(PAYMENT_STATUS).map(([k, v]) => ({
    value: v,
    label: k.replace(/([A-Z])/g, " $1").trim(),
  })),
];

type TxRow = {
  _id: string;
  amount?: number;
  paymentMethod?: string;
  status?: string;
  createdAt?: string;
  paystackReference?: string;
  invoiceNumber?: string;
  bookingReference?: string;
  bookingId?: string;
  guest?: { firstName?: string; lastName?: string; email?: string };
  metadata?: { source?: string; bookingReference?: string };
};

export default function BookingTransactionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (statusFilter) params.status = statusFilter;
  if (search.trim()) params.q = search.trim();

  const { data, isLoading } = useBookingTransactions(params);
  const items = (Array.isArray(data?.data) ? data.data : []) as TxRow[];
  const pagination = data?.meta?.pagination as
    | {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext?: boolean;
        hasPrev?: boolean;
      }
    | undefined;

  const pageTotal = useMemo(
    () => items.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [items]
  );

  const columns = [
    {
      key: "date",
      header: "Date",
      render: (row: TxRow) =>
        row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy HH:mm") : "—",
    },
    {
      key: "booking",
      header: "Booking",
      render: (row: TxRow) =>
        row.bookingReference ? (
          <span className="font-medium text-slate-900">{row.bookingReference}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "guest",
      header: "Guest",
      render: (row: TxRow) => {
        const g = row.guest;
        if (g?.firstName || g?.lastName) {
          return `${g.firstName ?? ""} ${g.lastName ?? ""}`.trim();
        }
        return g?.email ?? "—";
      },
    },
    {
      key: "invoice",
      header: "Invoice",
      render: (row: TxRow) => row.invoiceNumber ?? "—",
    },
    {
      key: "amount",
      header: "Amount",
      render: (row: TxRow) => (row.amount != null ? fmt(row.amount) : "—"),
    },
    {
      key: "method",
      header: "Method",
      render: (row: TxRow) => (
        <Badge variant={METHOD_BADGE[row.paymentMethod ?? ""] ?? "default"}>
          {METHOD_OPTIONS.find((o) => o.value === row.paymentMethod)?.label ??
            row.paymentMethod ??
            "—"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: TxRow) => (
        <Badge variant={STATUS_BADGE[row.status ?? ""] ?? "default"}>
          {row.status ?? "—"}
        </Badge>
      ),
    },
    {
      key: "ref",
      header: "Reference",
      render: (row: TxRow) => (
        <span className="max-w-[140px] truncate font-mono text-xs text-slate-600">
          {row.paystackReference ?? (row.metadata?.source === "checkout" ? "Checkout" : "—")}
        </span>
      ),
    },
  ];

  return (
    <div
      className="min-h-screen bg-white text-slate-800"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <header className="relative overflow-hidden border-b border-slate-100 bg-white">
        <div
          className="absolute left-0 top-0 h-full w-1.5 rounded-r-full bg-gradient-to-b from-[#ff8500] via-[#ff9100] to-[#5a189a] sm:w-2"
          aria-hidden
        />
        <div className="relative px-4 py-5 sm:px-6 md:px-8">
          <Link
            href="/bookings"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#5a189a] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 pl-2 sm:pl-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a189a]/15 to-[#9d4edd]/10 text-[#5a189a] ring-1 ring-[#5a189a]/20">
                  <CreditCard className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Accommodation
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Booking transactions
              </h1>
              <p className="max-w-2xl text-sm text-slate-600">
                All payments recorded against room bookings (invoices linked to a booking): online
                deposits, checkout settlements, and manual accommodation payments.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 md:px-8">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total transactions</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {isLoading ? "—" : pagination?.total ?? items.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Amount (this page)</p>
            <p className="mt-1 text-2xl font-bold text-[#5a189a]">
              {isLoading ? "—" : fmt(pageTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-medium text-slate-500">Tip</p>
            <p className="mt-1 text-sm text-slate-600">
              Use{" "}
              <Link href="/payments?department=accommodation" className="font-medium text-[#5a189a] hover:underline">
                Payments
              </Link>{" "}
              to record a payment against any invoice.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] max-w-md flex-1">
            <SearchInput
              placeholder="Search by booking reference…"
              value={searchInput}
              onChange={setSearchInput}
              onSearch={handleSearch}
              className="w-full"
            />
          </div>
          <div className="w-full min-w-[180px] sm:w-52">
            <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
            <AppReactSelect
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              placeholder="Filter…"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          getRowKey={(row) => String(row._id)}
          loading={isLoading}
          emptyTitle="No booking transactions"
          emptyDescription="Payments appear here when they are linked to a room booking invoice (e.g. Paystack deposit or checkout settlement)."
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
        />
      </main>
    </div>
  );
}
