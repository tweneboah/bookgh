"use client";

import { useState, useCallback, useMemo } from "react";
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
  Badge,
  SearchInput,
  EmptyState,
  Dropdown,
  Textarea,
  AppReactSelect,
} from "@/components/ui";
import {
  Plus,
  Trash2,
  Building2,
  Percent,
  X,
  MoreHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import { CORPORATE_STATUS } from "@/constants";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const formatGHS = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const STATUS_OPTIONS = Object.entries(CORPORATE_STATUS).map(([k, v]) => ({
  value: v,
  label: k.charAt(0) + k.slice(1).toLowerCase(),
}));

const STATUS_STYLE: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  [CORPORATE_STATUS.ACTIVE]: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
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

export default function CorporateAccountsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
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

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setSearchInput(value);
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

  const openEdit = (item: any) => {
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
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Corporate account deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Something went wrong"
      );
    }
  };

  const stats = useMemo(() => {
    const active = items.filter((i: any) => i.status === CORPORATE_STATUS.ACTIVE).length;
    const totalBookings = items.reduce((s: number, i: any) => s + (i.totalBookings ?? 0), 0);
    const totalSpend = items.reduce((s: number, i: any) => s + (i.totalSpend ?? 0), 0);
    return { total: items.length, active, totalBookings, totalSpend };
  }, [items]);

  return (
    <div className="min-h-screen bg-white">
      {/* White header — premium */}
      <header className="border-b border-slate-100 bg-white px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Corporate Accounts
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">
                Manage corporate clients with negotiated rates and company billing
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                onSearch={handleSearch}
                placeholder="Search company, contact..."
                className="min-w-[200px] max-w-xs rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
              />
              <Button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00] px-4 py-2.5 font-semibold text-white shadow-lg shadow-[#ff8500]/25 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ff8500]/50"
              >
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Stats strip — card row */}
        {items.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accounts</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.active}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bookings</p>
              <p className="mt-1 text-2xl font-bold text-[#5a189a]">{stats.totalBookings}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total spend</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatGHS(stats.totalSpend)}</p>
            </div>
          </div>
        )}

        {/* Content — card list on mobile, table on desktop */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center px-4 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5a189a] border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No corporate accounts"
              description="Add your first corporate account to offer negotiated rates and company billing."
              action={{ label: "Add Account", onClick: openCreate }}
              actionClassName="rounded-xl bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-md hover:opacity-95"
              className="mx-4 my-12 rounded-2xl border-slate-200 bg-slate-50/50"
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-4 py-3 font-semibold text-slate-700">Company</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Contact</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Discount</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Bookings</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Spend</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row: any) => {
                      const style = STATUS_STYLE[row.status] ?? STATUS_STYLE[CORPORATE_STATUS.INACTIVE];
                      return (
                        <tr
                          key={row._id}
                          className="border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{row.companyName}</p>
                            <p className="text-xs text-slate-500">{row.contactPerson}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-700">{row.contactEmail}</p>
                            {row.contactPhone && (
                              <p className="text-xs text-slate-500">{row.contactPhone}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-[#5a189a]">{row.negotiatedRate ?? 0}%</span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{row.totalBookings ?? 0}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{formatGHS(row.totalSpend ?? 0)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text} ${style.border}`}
                            >
                              {row.status?.charAt(0).toUpperCase() + row.status?.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Dropdown
                              trigger={
                                <Button variant="ghost" size="sm" aria-label="Actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="ml-1 hidden sm:inline">Actions</span>
                                </Button>
                              }
                              items={[
                                { id: "edit", label: "Edit", onClick: () => openEdit(row) },
                                {
                                  id: "delete",
                                  label: "Delete",
                                  onClick: () => setShowDelete(row._id),
                                  className: "text-red-600",
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {items.map((row: any) => {
                  const style = STATUS_STYLE[row.status] ?? STATUS_STYLE[CORPORATE_STATUS.INACTIVE];
                  return (
                    <div
                      key={row._id}
                      className="flex flex-col gap-3 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{row.companyName}</p>
                          <p className="text-sm text-slate-500">{row.contactPerson}</p>
                        </div>
                        <Dropdown
                          trigger={
                            <Button variant="ghost" size="sm" aria-label="Actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                          items={[
                            { id: "edit", label: "Edit", onClick: () => openEdit(row) },
                            {
                              id: "delete",
                              label: "Delete",
                              onClick: () => setShowDelete(row._id),
                              className: "text-red-600",
                            },
                          ]}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Percent className="h-3.5 w-3" />
                          {row.negotiatedRate ?? 0}% off
                        </span>
                        <span className="text-slate-400">·</span>
                        <span>{row.totalBookings ?? 0} bookings</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-medium text-slate-900">{formatGHS(row.totalSpend ?? 0)}</span>
                      </div>
                      <span
                        className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text} ${style.border}`}
                      >
                        {row.status?.charAt(0).toUpperCase() + row.status?.slice(1)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination && pagination.total > pagination.limit && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-sm text-slate-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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
      </main>

      {/* Add/Edit Modal — white header, sections */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title=""
        size="xl"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="relative border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between pr-10">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a189a] to-[#7b2cbf] text-white shadow-md">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editItem ? "Edit Corporate Account" : "Add Corporate Account"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {editItem ? "Update company and billing details" : "Create a new corporate client"}
                  </p>
                </div>
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
                className="absolute right-3 top-3 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div className="space-y-6">
              <section className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Company</h3>
                <Input
                  label="Company Name"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  required
                  placeholder="Acme Corporation"
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
                <Input
                  label="Address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Company address"
                  className="mt-3 rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
                <Input
                  label="Tax ID"
                  value={form.taxId}
                  onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                  placeholder="Optional"
                  className="mt-3 rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
              </section>

              <section className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Contact</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Contact Person"
                    value={form.contactPerson}
                    onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                    required
                    placeholder="Jane Smith"
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                  <Input
                    label="Contact Email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    required
                    placeholder="jane@acme.com"
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                </div>
                <Input
                  label="Contact Phone"
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  placeholder="Optional"
                  className="mt-3 rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
              </section>

              <section className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Financials</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Negotiated discount (%)"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.negotiatedRate}
                    onChange={(e) => setForm((f) => ({ ...f, negotiatedRate: e.target.value }))}
                    required
                    placeholder="10"
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                  <Input
                    label="Credit limit"
                    type="number"
                    min="0"
                    value={form.creditLimit}
                    onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                    placeholder="Optional"
                    className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                  />
                </div>
                <Input
                  label="Payment terms"
                  value={form.paymentTerms}
                  onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                  placeholder="e.g. Net 30"
                  className="mt-3 rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
              </section>

              <section className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Contract</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Contract start</label>
                    <ReactDatePicker
                      selected={form.contractStartDate ? new Date(form.contractStartDate) : null}
                      onChange={(d) =>
                        setForm((f) => ({
                          ...f,
                          contractStartDate: d ? d.toISOString().slice(0, 10) : "",
                        }))
                      }
                      dateFormat="MMM d, yyyy"
                      placeholderText="Select date"
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                      withPortal
                      popperClassName="react-datepicker-popper-z"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Contract end</label>
                    <ReactDatePicker
                      selected={form.contractEndDate ? new Date(form.contractEndDate) : null}
                      onChange={(d) =>
                        setForm((f) => ({
                          ...f,
                          contractEndDate: d ? d.toISOString().slice(0, 10) : "",
                        }))
                      }
                      dateFormat="MMM d, yyyy"
                      placeholderText="Select date"
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                      withPortal
                      popperClassName="react-datepicker-popper-z"
                    />
                  </div>
                </div>
                {editItem && (
                  <div className="mt-3">
                    <AppReactSelect
                      label="Status"
                      options={STATUS_OPTIONS}
                      value={form.status}
                      onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                      placeholder="Select status"
                    />
                  </div>
                )}
              </section>

              <section>
                <Textarea
                  label="Notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes"
                  rows={3}
                  className="rounded-xl border-slate-200 focus:border-[#5a189a] focus:ring-2 focus:ring-[#5a189a]/20"
                />
              </section>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="border-slate-200 font-medium text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending || updateMut.isPending}
              className="rounded-xl bg-gradient-to-r from-[#ff6d00] via-[#ff8500] to-[#ff9e00] font-semibold text-white shadow-lg shadow-[#ff8500]/25 hover:opacity-95"
            >
              {editItem ? "Update Account" : "Create Account"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
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
