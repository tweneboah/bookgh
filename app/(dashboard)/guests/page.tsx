"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Epilogue, Manrope } from "next/font/google";
import {
  useGuests,
  useCreateGuest,
  useUpdateGuest,
  useDeleteGuest,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  AppReactSelect,
} from "@/components/ui";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Users,
  Search,
  Filter,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Stars,
} from "lucide-react";
import { cn } from "@/lib/cn";
import toast from "react-hot-toast";
import { ID_TYPE, VIP_TIER } from "@/constants";

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

const ID_TYPE_OPTIONS = Object.entries(ID_TYPE).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const VIP_TIER_OPTIONS = Object.entries(VIP_TIER).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

type GuestRow = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  vipTier?: string;
  totalStays?: number;
  totalSpend?: number;
  isBlacklisted?: boolean;
  createdAt?: string;
  tags?: string[];
  nationality?: string;
  idType?: string;
  idNumber?: string;
};

const VIP_BADGE_STYLE: Record<string, string> = {
  none: "bg-[#e6e8ea] text-[#595c5d]",
  silver: "bg-[#d7e4ec] text-[#354147]",
  gold: "bg-[#f7b21f]/25 text-[#7a5400]",
  platinum: "bg-[#9b3f00]/15 text-[#4f1d00]",
};

export default function GuestsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editItem, setEditItem] = useState<GuestRow | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    idType: "",
    idNumber: "",
    vipTier: VIP_TIER.NONE as string,
    tags: "",
  });

  const params: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (search) params.q = search;

  const { data, isLoading } = useGuests(params);
  const createMut = useCreateGuest();
  const updateMut = useUpdateGuest();
  const deleteMut = useDeleteGuest();

  const items = useMemo(() => (data?.data ?? []) as GuestRow[], [data?.data]);
  const pagination = data?.meta?.pagination;

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setSearchInput(value);
    setPage(1);
  }, []);

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      nationality: "",
      idType: "",
      idNumber: "",
      vipTier: VIP_TIER.NONE,
      tags: "",
    });
    setEditItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: GuestRow) => {
    setEditItem(item);
    setForm({
      firstName: item.firstName ?? "",
      lastName: item.lastName ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      nationality: item.nationality ?? "",
      idType: item.idType ?? "",
      idNumber: item.idNumber ?? "",
      vipTier: item.vipTier ?? VIP_TIER.NONE,
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      nationality: form.nationality.trim() || undefined,
      idType: form.idType || undefined,
      idNumber: form.idNumber.trim() || undefined,
      vipTier: form.vipTier,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem._id, ...payload });
        toast.success("Guest updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Guest created");
      }
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined;
      toast.error(msg ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Guest deleted");
      setShowDelete(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined;
      toast.error(msg ?? "Something went wrong");
    }
  };

  const totalGuests = pagination?.total ?? items.length;
  const vipCount = items.filter((r) => r.vipTier && r.vipTier !== VIP_TIER.NONE).length;
  const blacklistedCount = items.filter((r) => r.isBlacklisted).length;
  const hasPrev = (pagination?.page ?? page) > 1;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;
  const hasNext = pagination ? pagination.page < totalPages : false;

  const exportCsv = useCallback(() => {
    if (!items.length) {
      toast.error("No guests to export");
      return;
    }
    const header = "Name,Email,Phone,VIP Tier,Total Stays,Total Spend,Blacklisted\n";
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = items
      .map((g) =>
        [
          esc(`${g.firstName ?? ""} ${g.lastName ?? ""}`.trim()),
          esc(g.email ?? ""),
          esc(g.phone ?? ""),
          esc(g.vipTier ?? VIP_TIER.NONE),
          String(g.totalStays ?? 0),
          String(g.totalSpend ?? 0),
          g.isBlacklisted ? "yes" : "no",
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guests.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  const showingLabel = useMemo(() => {
    if (!pagination) return `Showing ${items.length} guests`;
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `Showing ${start}-${end} of ${pagination.total} guests`;
  }, [pagination, items.length]);

  return (
    <div className={cn(manrope.className, "min-h-screen bg-[#f5f6f7] text-[#2c2f30]")}>
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-10 md:py-12">
        <header className="mb-12 flex flex-col justify-between gap-8 md:mb-16 md:flex-row md:items-end">
          <div className="space-y-2">
            <h1
              className={cn(
                epilogue.className,
                "text-5xl font-black tracking-tighter text-[#2c2f30] md:text-7xl"
              )}
            >
              Guests
            </h1>
            <p className="max-w-md text-lg font-medium leading-relaxed text-[#595c5d]">
              Manage guest profiles, VIP tiers, and stay history.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className={cn(
              epilogue.className,
              "inline-flex items-center gap-2 rounded-xl px-8 py-4 font-bold text-[#fff0ea] shadow-[0px_20px_40px_rgba(44,47,48,0.06)] transition-transform duration-150 hover:scale-95"
            )}
            style={{ background: "linear-gradient(135deg, #ff7a2c 0%, #9b3f00 100%)" }}
          >
            <Plus className="h-5 w-5" />
            Add Guest
          </button>
        </header>

        <section className="mb-12 grid grid-cols-1 gap-6 md:mb-16 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-bl-full bg-[#9b3f00]/5 transition-transform group-hover:scale-110" />
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#595c5d]">Total Guests</p>
            <div className="flex items-baseline gap-2">
              <span className={cn(epilogue.className, "text-6xl font-black text-[#9b3f00]")}>{totalGuests}</span>
              <span className="text-sm font-medium text-[#595c5d]">active profiles</span>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-bl-full bg-[#7a5400]/5 transition-transform group-hover:scale-110" />
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#595c5d]">VIP</p>
            <div className="flex items-baseline gap-2">
              <span className={cn(epilogue.className, "text-6xl font-black text-[#e7a407]")}>{vipCount}</span>
              <span className="text-sm font-medium text-[#595c5d]">tier members</span>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-bl-full bg-[#b02500]/5 transition-transform group-hover:scale-110" />
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#595c5d]">Blacklisted</p>
            <div className="flex items-baseline gap-2">
              <span className={cn(epilogue.className, "text-6xl font-black text-[#b92902]")}>{blacklistedCount}</span>
              <span className="text-sm font-medium text-[#595c5d]">restricted</span>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl bg-white shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
          <div className="flex flex-col items-center justify-between gap-4 border-b border-[#abadae]/15 p-6 md:flex-row">
            <div className="relative w-full md:w-96">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#595c5d]" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch(searchInput);
                  }
                }}
                placeholder="Search guests by name or email..."
                className="w-full rounded-lg border-none bg-[#eff1f2] py-3 pl-12 pr-4 text-sm font-medium text-[#2c2f30] transition-all focus:bg-white focus:ring-2 focus:ring-[#9b3f00]/40"
              />
            </div>
            <div className="flex w-full items-center gap-3 md:w-auto">
              <button
                type="button"
                onClick={() => handleSearch(searchInput)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#e0e3e4] px-4 py-3 text-sm font-bold text-[#2c2f30] transition-colors hover:bg-[#d1d5d7] md:flex-none"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#e0e3e4] px-4 py-3 text-sm font-bold text-[#2c2f30] transition-colors hover:bg-[#d1d5d7] md:flex-none"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="bg-[#eff1f2]">
                  {["Name", "Contact", "VIP Tier", "Stays", "Total Spend", "Status", "Actions"].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        epilogue.className,
                        "px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#595c5d]",
                        i === 3 ? "text-center" : "",
                        i === 6 ? "text-right" : ""
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#abadae]/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm font-medium text-[#595c5d]">
                      Loading guests...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr className="bg-[#eff1f2]/30">
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                        <Users className="h-10 w-10 text-[#757778]" />
                        <p className="text-sm font-medium text-[#595c5d]">No guests found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const fullName = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Guest";
                    const vip = row.vipTier ?? VIP_TIER.NONE;
                    const vipLabel = VIP_TIER_OPTIONS.find((o) => o.value === vip)?.label ?? vip;
                    return (
                      <tr key={row._id} className="group transition-colors hover:bg-[#9b3f00]/5">
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-[#dadddf]" />
                            <div>
                              <p className={cn(epilogue.className, "text-base font-bold text-[#2c2f30]")}>{fullName}</p>
                              <p className="text-xs font-medium uppercase tracking-tight text-[#595c5d]">
                                Member since{" "}
                                {row.createdAt
                                  ? new Date(row.createdAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-[#2c2f30]">{row.email ?? "—"}</p>
                            <p className="text-xs text-[#595c5d]">{row.phone ?? "—"}</p>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                              VIP_BADGE_STYLE[vip] ?? VIP_BADGE_STYLE.none
                            )}
                          >
                            <Stars className="h-3.5 w-3.5" />
                            {vipLabel}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span className={cn(epilogue.className, "font-bold text-[#2c2f30]")}>
                            {row.totalStays ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          <p className={cn(epilogue.className, "font-bold text-[#2c2f30]")}>
                            {fmt(row.totalSpend ?? 0)}
                          </p>
                        </td>
                        <td className="px-6 py-6">
                          {row.isBlacklisted ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b02500]">
                              <span className="h-2 w-2 rounded-full bg-[#b02500]" />
                              Blacklisted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#515d64]">
                              <span className="h-2 w-2 rounded-full bg-[#515d64]" />
                              No Blacklist
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link
                              href={`/guests/${row._id}`}
                              className="rounded-lg p-2 text-[#595c5d] transition-colors hover:bg-white hover:text-[#9b3f00]"
                              aria-label="View guest"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="rounded-lg p-2 text-[#595c5d] transition-colors hover:bg-white hover:text-[#9b3f00]"
                              aria-label="Edit guest"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDelete(row._id)}
                              className="rounded-lg p-2 text-[#595c5d] transition-colors hover:bg-white hover:text-[#b02500]"
                              aria-label="Delete guest"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-2 text-[#595c5d] transition-colors hover:bg-white hover:text-[#9b3f00]"
                              aria-label="More actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#abadae]/15 bg-[#eff1f2]/50 p-6">
            <p className="text-xs font-medium text-[#595c5d]">{showingLabel}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#abadae]/20 bg-white text-[#595c5d] disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#9b3f00] text-sm font-bold text-white">
                {pagination?.page ?? 1}
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!hasNext}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#abadae]/20 bg-white text-[#595c5d] disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <div className="relative mt-20">
          <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-[#9b3f00]/5 blur-3xl" />
          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#abadae]/10 pt-10 text-[10px] font-bold uppercase tracking-[0.2em] text-[#595c5d]/60 md:flex-row">
            <span>Solaris Analytics Guest Directory</span>
            <span className="flex items-center gap-4">
              <span>Privacy</span>
              <span>Audit Logs</span>
              <span>Systems</span>
            </span>
          </div>
        </div>
      </main>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title=""
        size="6xl"
        className="max-h-[92vh] border-[#abadae]/25 bg-[#f5f6f7]"
        bodyClassName="p-0"
      >
        <div className="p-4 md:p-6">
          <main className="mx-auto flex min-h-[72vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-[0px_20px_40px_rgba(44,47,48,0.06)]">
            <aside className="relative hidden w-1/3 flex-col justify-between overflow-hidden bg-[#e6e8ea] p-10 md:flex">
              <div className="relative z-10">
                
                <h2 className={cn(epilogue.className, "mt-12 text-4xl font-bold leading-tight tracking-tight text-[#2c2f30]")}>
                  {editItem ? "Edit" : "Add"} <br />
                  <span className="text-[#ff7a2c]">Guest</span>
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[#595c5d]">
                  Create a guest profile to track stays and preferences.
                </p>
              </div>
              <div className="relative z-10">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                    <Users className="h-5 w-5 text-[#9b3f00]" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#595c5d]">Analytics Sync</span>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-[#9b3f00]/5 blur-3xl" />
            </aside>

            <section className="flex-1 p-8 md:p-12">
              <div className="mb-8 md:hidden">
                <h2 className={cn(epilogue.className, "text-3xl font-black text-[#2c2f30]")}>
                  {editItem ? "Edit Guest" : "Add Guest"}
                </h2>
                <p className="mt-1 text-sm text-[#595c5d]">Create a new guest profile to track stays and preferences.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Input
                    label="First Name"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    required
                    placeholder="e.g. Julian"
                    className="rounded-xl border-none bg-[#eff1f2] px-5 py-4 font-medium transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#9b3f00]/20"
                  />
                  <Input
                    label="Last Name"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    required
                    placeholder="e.g. Thorne"
                    className="rounded-xl border-none bg-[#eff1f2] px-5 py-4 font-medium transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#9b3f00]/20"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="j.thorne@example.com"
                    className="rounded-xl border-none bg-[#eff1f2] px-5 py-4 font-medium transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#9b3f00]/20"
                  />
                  <Input
                    label="Phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+233 55 000 0000"
                    className="rounded-xl border-none bg-[#eff1f2] px-5 py-4 font-medium transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#9b3f00]/20"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <Input
                    label="Nationality"
                    value={form.nationality}
                    onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                    placeholder="e.g. Swiss"
                    className="rounded-xl border-none bg-[#eff1f2] px-5 py-4 font-medium transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#9b3f00]/20"
                  />
                  <AppReactSelect
                    label="ID Type"
                    visualVariant="solar"
                    options={[{ value: "", label: "None" }, ...ID_TYPE_OPTIONS]}
                    value={form.idType}
                    onChange={(v) => setForm((f) => ({ ...f, idType: v ?? "" }))}
                    placeholder="Select..."
                  />
                  <Input
                    label="ID Number"
                    value={form.idNumber}
                    onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
                    placeholder="X-0000-0000"
                    className="rounded-xl border-none bg-[#eff1f2] px-5 py-4 font-medium transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#9b3f00]/20"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <AppReactSelect
                    label="VIP Tier"
                    visualVariant="solar"
                    options={VIP_TIER_OPTIONS}
                    value={form.vipTier}
                    onChange={(v) => setForm((f) => ({ ...f, vipTier: v ?? VIP_TIER.NONE }))}
                    placeholder="Select tier..."
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Tags"
                      value={form.tags}
                      onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                      placeholder="Frequent, Vegan, Late-Checkin"
                      className="rounded-xl border-none bg-[#eff1f2] px-5 py-4 font-medium transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#9b3f00]/20"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse items-center justify-end gap-4 pt-2 md:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className={cn(epilogue.className, "w-full px-8 py-4 text-sm font-bold text-[#595c5d] transition-colors hover:text-[#2c2f30] md:w-auto")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMut.isPending || updateMut.isPending}
                    className={cn(
                      epilogue.className,
                      "w-full rounded-xl px-12 py-4 text-base font-bold text-[#fff0ea] shadow-[0px_10px_20px_rgba(155,63,0,0.2)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 md:w-auto"
                    )}
                    style={{ background: "linear-gradient(135deg, #ff7a2c 0%, #9b3f00 100%)" }}
                  >
                    {createMut.isPending || updateMut.isPending
                      ? "Saving..."
                      : editItem
                        ? "Update Guest"
                        : "Create Guest"}
                  </button>
                </div>
              </form>
            </section>
          </main>
        </div>
      </Modal>

      <Modal
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete Guest"
      >
        <p className="text-slate-600">
          Are you sure you want to delete this guest? This action cannot be
          undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowDelete(null)} className="rounded-xl border-slate-200">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteMut.isPending}
            className="rounded-xl"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
