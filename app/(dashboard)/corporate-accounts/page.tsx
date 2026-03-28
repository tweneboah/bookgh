"use client";

import { useState, useCallback, useMemo } from "react";
import { Manrope } from "next/font/google";
import {
  useCorporateAccounts,
  useCreateCorporateAccount,
  useUpdateCorporateAccount,
  useDeleteCorporateAccount,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  EmptyState,
  Dropdown,
  Textarea,
  AppReactSelect,
} from "@/components/ui";
import { Building2, X } from "lucide-react";
import toast from "react-hot-toast";
import { CORPORATE_STATUS } from "@/constants";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/cn";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-corp-manrope",
  display: "swap",
});

const formatGHS = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

function MsIcon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={cn("material-symbols-outlined inline-flex select-none", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  );
}

const STATUS_STYLE: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  [CORPORATE_STATUS.ACTIVE]: {
    bg: "bg-[#059eff]",
    text: "text-white",
    border: "border-transparent",
  },
  [CORPORATE_STATUS.INACTIVE]: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
  },
  [CORPORATE_STATUS.SUSPENDED]: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

const EMPTY_FORM = {
  companyName: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  taxId: "",
  negotiatedRate: "",
  creditLimit: "",
  paymentTerms: "",
  contractStartDate: "",
  contractEndDate: "",
  notes: "",
  status: CORPORATE_STATUS.ACTIVE as string,
};

type CorporateAccount = {
  _id: string;
  companyName?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  taxId?: string;
  negotiatedRate?: number;
  creditLimit?: number;
  paymentTerms?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  notes?: string;
  status?: string;
  totalBookings?: number;
  totalSpend?: number;
};

type ApiError = {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
};

export default function CorporateAccountsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<CorporateAccount | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (search) params.search = search;

  const { data, isLoading } = useCorporateAccounts(params);
  const createMut = useCreateCorporateAccount();
  const updateMut = useUpdateCorporateAccount();
  const deleteMut = useDeleteCorporateAccount();

  const items = useMemo<CorporateAccount[]>(() => data?.data ?? [], [data?.data]);
  const pagination = data?.meta?.pagination;

  const handleSearch = useCallback((value: string) => {
    setSearch(value.trim());
    setPage(1);
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: CorporateAccount) => {
    setEditItem(item);
    setForm({
      companyName: item.companyName ?? "",
      contactPerson: item.contactPerson ?? "",
      contactEmail: item.contactEmail ?? "",
      contactPhone: item.contactPhone ?? "",
      address: item.address ?? "",
      taxId: item.taxId ?? "",
      negotiatedRate: item.negotiatedRate?.toString() ?? "",
      creditLimit: item.creditLimit?.toString() ?? "",
      paymentTerms: item.paymentTerms ?? "",
      contractStartDate: item.contractStartDate
        ? new Date(item.contractStartDate).toISOString().slice(0, 10)
        : "",
      contractEndDate: item.contractEndDate
        ? new Date(item.contractEndDate).toISOString().slice(0, 10)
        : "",
      notes: item.notes ?? "",
      status: item.status ?? CORPORATE_STATUS.ACTIVE,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      companyName: form.companyName.trim(),
      contactPerson: form.contactPerson.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim() || undefined,
      address: form.address.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
      negotiatedRate: parseFloat(form.negotiatedRate) || 0,
      creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      contractStartDate: form.contractStartDate
        ? new Date(form.contractStartDate).toISOString()
        : undefined,
      contractEndDate: form.contractEndDate
        ? new Date(form.contractEndDate).toISOString()
        : undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editItem) payload.status = form.status;

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Corporate account updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Corporate account created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      const message = (err as ApiError)?.response?.data?.error?.message;
      toast.error(message ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Corporate account deleted");
      setShowDelete(null);
    } catch (err: unknown) {
      const message = (err as ApiError)?.response?.data?.error?.message;
      toast.error(message ?? "Something went wrong");
    }
  };

  const stats = useMemo(() => {
    const active = items.filter((i) => i.status === CORPORATE_STATUS.ACTIVE).length;
    const totalBookings = items.reduce((s, i) => s + (i.totalBookings ?? 0), 0);
    const totalSpend = items.reduce((s, i) => s + (i.totalSpend ?? 0), 0);
    return { total: items.length, active, totalBookings, totalSpend };
  }, [items]);

  return (
    <div className={cn(manrope.variable, "min-h-screen bg-[#f7f9fb] text-[#191c1e]")}>
      <main className="px-4 pb-12 pt-6 md:px-6 md:pt-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <header className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className={cn(manrope.className, "text-4xl font-extrabold tracking-tight")}>Corporate Accounts</h1>
              <p className="mt-1 font-medium text-[#5a4136]">
                Manage corporate clients with negotiated rates and company billing
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search company, contact..."
                onChange={(e) => handleSearch(e.target.value)}
                className="h-11 min-w-[220px] rounded-xl border-none bg-[#f2f4f6] px-4 text-sm outline-none ring-0 focus:ring-2 focus:ring-[#a04100]/20"
              />
              <button
                type="button"
                onClick={openCreate}
                className={cn(
                  manrope.className,
                  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#a04100] to-[#ff6b00] px-6 py-3 font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                )}
              >
                <MsIcon name="add" />
                Add Account
              </button>
            </div>
          </header>

          <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Accounts"
              value={stats.total}
              icon="corporate_fare"
              iconWrap="bg-[#cfe2f9] text-[#526478]"
            />
            <MetricCard
              label="Active"
              value={stats.active}
              icon="verified"
              iconWrap="bg-[#059eff] text-white"
            />
            <MetricCard
              label="Bookings"
              value={stats.totalBookings}
              icon="calendar_today"
              iconWrap="bg-[#cfe2f9] text-[#526478]"
            />
            <MetricCard
              label="Total spend"
              value={formatGHS(stats.totalSpend)}
              icon="payments"
              iconWrap="bg-[#059eff] text-white"
            />
          </div>

          <section className="rounded-2xl bg-[#f2f4f6] p-1">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              {isLoading ? (
                <div className="flex items-center justify-center px-4 py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#a04100] border-t-transparent" />
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No corporate accounts"
                  description="Add your first corporate account to offer negotiated rates and company billing."
                  action={{ label: "Add Account", onClick: openCreate }}
                  actionClassName="rounded-xl bg-gradient-to-r from-[#a04100] to-[#ff6b00] font-semibold text-white shadow-md hover:opacity-95"
                  className="mx-4 my-12 rounded-2xl border-slate-200 bg-slate-50/50"
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#f2f4f6]/70">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#5a4136]">Company</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#5a4136]">Contact</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#5a4136]">Discount</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#5a4136]">Bookings</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#5a4136]">Spend</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#5a4136]">Status</th>
                          <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-[#5a4136]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => {
                          const style = STATUS_STYLE[row.status] ?? STATUS_STYLE[CORPORATE_STATUS.INACTIVE];
                          return (
                            <tr key={row._id} className="transition-colors duration-200 hover:bg-[#f2f4f6]">
                              <td className="px-6 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                                    <MsIcon name="domain" />
                                  </div>
                                  <span className={cn(manrope.className, "font-bold text-[#191c1e]")}>{row.companyName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#191c1e]">{row.contactPerson}</span>
                                  <span className="text-xs text-[#5a4136]">{row.contactEmail}</span>
                                  {row.contactPhone && (
                                    <span className="mt-0.5 text-xs font-medium text-[#5a4136]">{row.contactPhone}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-bold text-orange-700">
                                  {row.negotiatedRate ?? 0}%
                                </span>
                              </td>
                              <td className="px-6 py-6">
                                <span className={cn(manrope.className, "font-bold text-[#191c1e]")}>{row.totalBookings ?? 0}</span>
                              </td>
                              <td className="px-6 py-6">
                                <span className={cn(manrope.className, "font-bold text-[#191c1e]")}>{formatGHS(row.totalSpend ?? 0)}</span>
                              </td>
                              <td className="px-6 py-6">
                                <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-bold", style.bg, style.text, style.border)}>
                                  {row.status?.charAt(0).toUpperCase() + row.status?.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-6 text-right">
                                <Dropdown
                                  trigger={
                                    <button className="p-2 text-[#5a4136] transition-colors hover:text-[#a04100]">
                                      <MsIcon name="more_vert" />
                                    </button>
                                  }
                                  items={[
                                    { id: "edit", label: "Edit", onClick: () => openEdit(row) },
                                    { id: "delete", label: "Delete", onClick: () => setShowDelete(row._id) },
                                  ]}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {pagination && pagination.total > pagination.limit && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                      <p className="text-sm text-slate-500">
                        Showing {(pagination.page - 1) * pagination.limit + 1}–
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="border-slate-200"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page * pagination.limit >= pagination.total}
                          onClick={() => setPage((p) => p + 1)}
                          className="border-slate-200"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#a04100] to-[#ff6b00] p-8 text-white lg:col-span-2">
              <div className="relative z-10">
                <h2 className={cn(manrope.className, "mb-2 text-2xl font-extrabold")}>Corporate Growth Insights</h2>
                <p className="max-w-md text-white/80">
                  {items.length > 0
                    ? `${items[0]?.companyName ?? "Top account"} spend has increased this month. Consider offering a loyalty bonus or suite upgrades.`
                    : "Track company spending trends and negotiate better long-term partnerships."}
                </p>
              </div>
              <div className="relative z-10 mt-6">
                <button className="rounded-lg bg-white px-5 py-2 text-sm font-bold text-[#a04100] shadow-xl shadow-black/10 transition-transform active:scale-95">
                  View Report
                </button>
              </div>
              <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <MsIcon name="trending_up" className="absolute right-8 top-8 text-8xl text-white/20" />
            </div>

            <div className="flex flex-col justify-center rounded-2xl border border-[#e2bfb0]/20 bg-[#e6e8ea] p-8">
              <h4 className={cn(manrope.className, "mb-4 text-lg font-bold text-[#191c1e]")}>Pending Contracts</h4>
              <div className="mb-4 flex items-center gap-4 rounded-xl bg-white p-3">
                <div className="h-2 w-2 rounded-full bg-[#ba1a1a]" />
                <div>
                  <p className="text-sm font-bold text-[#191c1e]">Global Tech Systems</p>
                  <p className="text-xs text-[#5a4136]">Awaiting digital signature</p>
                </div>
              </div>
              <button className="flex items-center gap-1 text-sm font-bold text-[#a04100] transition-all hover:gap-2">
                Manage Contracts
                <MsIcon name="chevron_right" className="text-base" />
              </button>
            </div>
          </section>
        </div>
      </main>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title=""
        size="xl"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f7f9fb] p-0 shadow-xl"
      >
        <form onSubmit={handleSubmit} className="max-h-[85vh] overflow-y-auto">
          <div className="border-b border-[#e2bfb0]/40 bg-white px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <nav className="mb-2 flex items-center gap-2 text-xs font-medium text-[#5a4136]">
                  <span>Corporate Accounts</span>
                  <MsIcon name="chevron_right" className="text-sm" />
                  <span className="font-bold text-[#a04100]">{editItem ? "Edit Account" : "Add Account"}</span>
                </nav>
                <h2 className={cn(manrope.className, "text-2xl font-extrabold text-[#191c1e]")}>
                  {editItem ? "Edit Corporate Account" : "Add Corporate Account"}
                </h2>
                <p className="mt-1 text-sm text-[#4e6073]">
                  Create a new corporate client for negotiated rates and company billing.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                aria-label="Close"
                className="text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 p-4 sm:p-6">
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <section className="rounded-xl border border-[#e2bfb0]/25 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#cfe2f9] text-[#526478]">
                    <MsIcon name="business" />
                  </div>
                  <h3 className={cn(manrope.className, "text-xl font-bold text-[#191c1e]")}>Company Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Company Name"
                    value={form.companyName}
                    onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                    required
                    placeholder="e.g. Global Tech Solutions Inc."
                    className="col-span-2 rounded-lg border-none bg-[#f2f4f6] focus:ring-2 focus:ring-[#ff6b00]/30"
                  />
                  <Input
                    label="Tax ID / VAT Number"
                    value={form.taxId}
                    onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                    placeholder="TX-998-002-11"
                    className="col-span-2 rounded-lg border-none bg-[#f2f4f6] md:col-span-1 focus:ring-2 focus:ring-[#ff6b00]/30"
                  />
                  <div className="col-span-2 md:col-span-1">
                    <AppReactSelect
                      label="Industry"
                      options={[
                        { value: "Technology & Software", label: "Technology & Software" },
                        { value: "Finance & Banking", label: "Finance & Banking" },
                        { value: "Healthcare", label: "Healthcare" },
                        { value: "Manufacturing", label: "Manufacturing" },
                      ]}
                      value={form.notes || "Technology & Software"}
                      onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
                    />
                  </div>
                  <Textarea
                    label="Office Address"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Full legal address including city and postal code"
                    rows={3}
                    className="col-span-2 rounded-lg border-none bg-[#f2f4f6] focus:ring-2 focus:ring-[#ff6b00]/30"
                  />
                </div>
              </section>

              <section className="rounded-xl border border-[#e2bfb0]/25 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#059eff] text-white">
                    <MsIcon name="contact_page" />
                  </div>
                  <h3 className={cn(manrope.className, "text-xl font-bold text-[#191c1e]")}>Primary Contact Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Contact Person"
                    value={form.contactPerson}
                    onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                    required
                    placeholder="John Doe"
                    className="col-span-2 rounded-lg border-none bg-[#f2f4f6] md:col-span-1 focus:ring-2 focus:ring-[#ff6b00]/30"
                  />
                  <Input
                    label="Job Title"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Logistics Manager"
                    className="col-span-2 rounded-lg border-none bg-[#f2f4f6] md:col-span-1 focus:ring-2 focus:ring-[#ff6b00]/30"
                  />
                  <Input
                    label="Contact Email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    required
                    placeholder="j.doe@company.com"
                    className="col-span-2 rounded-lg border-none bg-[#f2f4f6] md:col-span-1 focus:ring-2 focus:ring-[#ff6b00]/30"
                  />
                  <Input
                    label="Contact Phone"
                    value={form.contactPhone}
                    onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="col-span-2 rounded-lg border-none bg-[#f2f4f6] md:col-span-1 focus:ring-2 focus:ring-[#ff6b00]/30"
                  />
                </div>
              </section>
            </div>

            <div className="col-span-12 space-y-6 lg:col-span-4">
              <section className="rounded-xl border border-[#e2bfb0]/25 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <MsIcon name="payments" />
                  </div>
                  <h3 className={cn(manrope.className, "text-xl font-bold text-[#191c1e]")}>Negotiated Terms</h3>
                </div>
                <div className="space-y-4">
                  <Input
                    label="Default Discount %"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.negotiatedRate}
                    onChange={(e) => setForm((f) => ({ ...f, negotiatedRate: e.target.value }))}
                    required
                    placeholder="15"
                    className="rounded-lg border-none bg-[#f2f4f6] focus:ring-2 focus:ring-[#ff6b00]/30"
                  />
                  <Input
                    label="Credit Limit (GHS)"
                    type="number"
                    min="0"
                    value={form.creditLimit}
                    onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                    placeholder="10,000.00"
                    className="rounded-lg border-none bg-[#f2f4f6] focus:ring-2 focus:ring-[#ff6b00]/30"
                  />
                  <Input
                    label="Payment Terms"
                    value={form.paymentTerms}
                    onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                    placeholder="Net 30 Days"
                    className="rounded-lg border-none bg-[#f2f4f6] focus:ring-2 focus:ring-[#ff6b00]/30"
                  />
                </div>
              </section>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#a04100] to-[#ff6b00] p-5 text-white shadow-xl">
                <h4 className={cn(manrope.className, "mb-3 text-lg font-bold")}>Account Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between opacity-90">
                    <span>Rate Tier</span>
                    <span className="font-bold">Platinum Executive</span>
                  </div>
                  <div className="flex items-center justify-between opacity-90">
                    <span>Billing Priority</span>
                    <span className="font-bold">High Priority</span>
                  </div>
                  <div className="flex items-center justify-between opacity-90">
                    <span>Onboarding</span>
                    <span className="font-bold">Pending Setup</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  loading={createMut.isPending || updateMut.isPending}
                  className={cn(
                    manrope.className,
                    "rounded-xl bg-[#ff6b00] py-3 font-bold text-white shadow-lg shadow-orange-200/50 hover:-translate-y-0.5 transition-all"
                  )}
                >
                  {editItem ? "Update Account" : "Save Account"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className={cn(manrope.className, "font-bold text-[#a04100] hover:bg-[#e2bfb0]/20")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white/70 px-6 py-4 text-[10px] italic text-slate-400">
            All account creation logs are audited for executive compliance.
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Corporate Account"
        className="rounded-2xl border border-slate-200 shadow-xl"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this corporate account? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDelete(null)} className="border-slate-200">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteMut.isPending}
            className="rounded-xl font-semibold"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  iconWrap,
}: {
  label: string;
  value: string | number;
  icon: string;
  iconWrap: string;
}) {
  return (
    <div className="group rounded-xl bg-white p-6 transition-all hover:bg-[#f7f9fb] hover:shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#5a4136]">{label}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-3xl font-extrabold text-[#191c1e]">{value}</h3>
        <div className={cn("rounded-full p-2 transition-colors", iconWrap, "group-hover:bg-[#ff6b00] group-hover:text-white")}>
          <MsIcon name={icon} />
        </div>
      </div>
    </div>
  );
}
