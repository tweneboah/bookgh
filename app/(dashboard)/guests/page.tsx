"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  useGuests,
  useCreateGuest,
  useUpdateGuest,
  useDeleteGuest,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Badge,
  SearchInput,
  AppReactSelect,
} from "@/components/ui";
import { Plus, Pencil, Trash2, Eye, Users, Crown, ShieldOff, UserCheck } from "lucide-react";
import toast from "react-hot-toast";
import { ID_TYPE, VIP_TIER } from "@/constants";

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

const VIP_BADGE_VARIANT: Record<string, "outline" | "default" | "warning" | "info"> = {
  none: "outline",
  silver: "default",
  gold: "warning",
  platinum: "info",
};

export default function GuestsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
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

  const items = data?.data ?? [];
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

  const openEdit = (item: any) => {
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
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await deleteMut.mutateAsync(showDelete);
      toast.success("Guest deleted");
      setShowDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Something went wrong");
    }
  };

  const totalGuests = pagination?.total ?? items.length;
  const vipCount = items.filter((r: any) => r.vipTier && r.vipTier !== VIP_TIER.NONE).length;
  const blacklistedCount = items.filter((r: any) => r.isBlacklisted).length;

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: any) =>
        `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "-",
    },
    { key: "email", header: "Email", render: (row: any) => row.email ?? "-" },
    { key: "phone", header: "Phone", render: (row: any) => row.phone ?? "-" },
    {
      key: "vipTier",
      header: "VIP Tier",
      render: (row: any) => (
        <Badge variant={VIP_BADGE_VARIANT[row.vipTier] ?? "outline"} className="rounded-md">
          {VIP_TIER_OPTIONS.find((o) => o.value === row.vipTier)?.label ?? row.vipTier ?? "None"}
        </Badge>
      ),
    },
    {
      key: "totalStays",
      header: "Total Stays",
      render: (row: any) => row.totalStays ?? 0,
    },
    {
      key: "totalSpend",
      header: "Total Spend",
      render: (row: any) =>
        row.totalSpend != null ? fmt(row.totalSpend) : fmt(0),
    },
    {
      key: "blacklisted",
      header: "Blacklisted",
      render: (row: any) =>
        row.isBlacklisted ? (
          <Badge variant="danger" className="rounded-md">Blacklisted</Badge>
        ) : (
          "-"
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Link href={`/guests/${row._id}`}>
            <Button
              variant="outline"
              size="sm"
              aria-label="View"
              className="rounded-lg border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10 hover:border-[#5a189a]/50"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(row)}
            aria-label="Edit"
            className="rounded-lg border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10 hover:border-[#5a189a]/50"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDelete(row._id)}
            aria-label="Delete"
            className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      {/* Hero — white background */}
      <div className="relative border-b border-slate-100 bg-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[min(80vw,380px)] h-[min(80vw,380px)] bg-[#ff9100]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#5a189a]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6d00] to-[#ff9e00] text-white shadow-lg shadow-[#ff6d00]/25">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
                    Guests
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage guest profiles, VIP tiers, and stay history.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={openCreate}
              className="shrink-0 rounded-xl font-semibold text-white border-0 shadow-md shadow-[#ff6d00]/20 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00] focus:ring-2 focus:ring-[#ff6d00] focus:ring-offset-2"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden />
              Add Guest
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Guests</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5a189a]/10 text-[#5a189a]">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totalGuests}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">VIP</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff6d00]/10 text-[#ff6d00]">
                <Crown className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{vipCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Blacklisted</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                <ShieldOff className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{blacklistedCount}</p>
          </div>
        </div>

        {/* Guest directory card */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-start gap-4">
              <div className="h-10 w-1 rounded-full bg-gradient-to-b from-[#5a189a] to-[#9d4edd] shrink-0" aria-hidden />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Guest Directory</h2>
                <p className="text-sm text-slate-500 mt-0.5">Search and manage all guest profiles.</p>
              </div>
            </div>
            <div className="w-full sm:w-72 shrink-0">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                onSearch={handleSearch}
                placeholder="Search name, email, phone..."
                className="w-full"
              />
            </div>
          </div>
          <div className="p-0">
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
              emptyTitle="No guests"
              emptyDescription="Add your first guest to get started."
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
        title={editItem ? "Edit Guest" : "Add Guest"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
              required
              placeholder="John"
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
              required
              placeholder="Doe"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((f) => ({ ...f, email: e.target.value }))
            }
            placeholder="Optional"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) =>
              setForm((f) => ({ ...f, phone: e.target.value }))
            }
            placeholder="Optional"
          />
          <Input
            label="Nationality"
            value={form.nationality}
            onChange={(e) =>
              setForm((f) => ({ ...f, nationality: e.target.value }))
            }
            placeholder="Optional"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppReactSelect
              label="ID Type"
              options={[
                { value: "", label: "None" },
                ...ID_TYPE_OPTIONS,
              ]}
              value={form.idType}
              onChange={(v) => setForm((f) => ({ ...f, idType: v ?? "" }))}
              placeholder="Select..."
            />
            <Input
              label="ID Number"
              value={form.idNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, idNumber: e.target.value }))
              }
              placeholder="Optional"
            />
          </div>
          <AppReactSelect
            label="VIP Tier"
            options={VIP_TIER_OPTIONS}
            value={form.vipTier}
            onChange={(v) => setForm((f) => ({ ...f, vipTier: v ?? VIP_TIER.NONE }))}
            placeholder="Select tier..."
          />
          <Input
            label="Tags (comma-separated)"
            value={form.tags}
            onChange={(e) =>
              setForm((f) => ({ ...f, tags: e.target.value }))
            }
            placeholder="e.g. vip, regular, corporate"
          />
          <div className="flex justify-end gap-2 pt-2">
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
              loading={createMut.isPending || updateMut.isPending}
              className="rounded-xl font-semibold text-white border-0 bg-gradient-to-r from-[#ff6d00] to-[#ff8500] hover:from-[#ff7900] hover:to-[#ff9e00]"
            >
              {editItem ? "Update" : "Create"}
            </Button>
          </div>
        </form>
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
