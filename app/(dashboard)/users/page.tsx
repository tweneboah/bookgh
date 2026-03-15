"use client";

import { useState, useCallback } from "react";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useBranches,
} from "@/hooks/api";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Modal,
  Input,
  Badge,
  SearchInput,
  StatCard,
  AppReactSelect,
} from "@/components/ui";
import { Plus, Pencil, UserX, Users, UserCheck, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { USER_ROLES } from "@/constants";

/** Format camelCase value for display (e.g. frontDesk → Front Desk) */
function formatRoleLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const ROLE_OPTIONS = Object.entries(USER_ROLES).map(([, v]) => ({
  value: v,
  label: formatRoleLabel(v),
}));

const ROLE_BADGE_VARIANT: Record<string, "default" | "success" | "warning" | "info" | "danger"> = {
  superAdmin: "danger",
  hotelOwner: "warning",
  tenantAdmin: "warning",
  branchManager: "info",
  financeManager: "info",
  maintenanceManager: "warning",
  technician: "default",
  eventManager: "warning",
  salesOfficer: "info",
  operationsCoordinator: "default",
  restaurantManager: "warning",
  cashier: "info",
  waiter: "default",
  hostess: "default",
  supervisor: "warning",
  headChef: "warning",
  sousChef: "info",
  kitchenStaff: "default",
  procurementOfficer: "info",
  hrManager: "info",
  barManager: "warning",
  bartender: "default",
  barCashier: "info",
  frontDesk: "default",
  housekeeper: "success",
  maintenance: "success",
  accountant: "info",
  posStaff: "default",
  eventCoordinator: "default",
};

type UserRow = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  branchId?: string | { name?: string };
  isActive?: boolean;
  lastLogin?: string;
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editItem, setEditItem] = useState<UserRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState<string | null>(null);

  const params: Record<string, string> = { page: String(page), limit: "20" };
  if (search) params.q = search;

  const { data, isLoading } = useUsers(params);
  const { data: branchesData } = useBranches({ limit: "100" });
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();

  const rawItems = data?.data ?? data;
  const items = Array.isArray(rawItems) ? (rawItems as UserRow[]) : [];
  const pagination = (data?.meta as { pagination?: { page: number; limit: number; total: number } })?.pagination;
  const branches = (branchesData?.data ?? branchesData) as Array<{ _id: string; name?: string }> | undefined;
  const branchList = Array.isArray(branches) ? branches : [];

  const branchOptions = [
    { value: "", label: "No branch" },
    ...branchList.map((b) => ({ value: b._id, label: b.name ?? b._id })),
  ];

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setSearchInput(value);
    setPage(1);
  }, []);

  const activeCount = items.filter((i) => i.isActive !== false).length;

  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: USER_ROLES.FRONT_DESK as string,
    branchId: "",
  });

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    role: "",
    isActive: true,
    branchId: "",
  });

  const openCreate = () => {
    setCreateForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      role: USER_ROLES.FRONT_DESK,
      branchId: "",
    });
    setShowCreate(true);
  };

  const openEdit = (item: UserRow) => {
    setEditItem(item);
    setEditForm({
      firstName: item.firstName ?? "",
      lastName: item.lastName ?? "",
      phone: item.phone ?? "",
      role: item.role ?? USER_ROLES.FRONT_DESK,
      isActive: item.isActive ?? true,
      branchId: typeof item.branchId === "object" ? (item.branchId as { _id?: string })?._id ?? "" : (item.branchId ?? ""),
    });
    setShowEdit(true);
  };

  const getBranchName = (bid: string | { name?: string } | undefined) => {
    if (!bid) return "-";
    if (typeof bid === "object") return bid.name ?? "-";
    const b = branchList.find((x) => x._id === bid);
    return b?.name ?? "-";
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      firstName: createForm.firstName.trim(),
      lastName: createForm.lastName.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      phone: createForm.phone.trim() || undefined,
      role: createForm.role,
      branchId: createForm.branchId || undefined,
    };
    try {
      await createMut.mutateAsync(payload);
      toast.success("User created");
      setShowCreate(false);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to create user");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const payload = {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      phone: editForm.phone.trim() || undefined,
      role: editForm.role,
      isActive: editForm.isActive,
      branchId: editForm.branchId || undefined,
    };
    try {
      await updateMut.mutateAsync({ id: editItem._id, ...payload });
      toast.success("User updated");
      setShowEdit(false);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to update user");
    }
  };

  const handleDeactivate = async () => {
    if (!showDeactivate) return;
    try {
      await updateMut.mutateAsync({ id: showDeactivate, isActive: false });
      toast.success("User deactivated");
      setShowDeactivate(null);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to deactivate");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: UserRow) =>
        `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "-",
    },
    { key: "email", header: "Email", render: (row: UserRow) => row.email ?? "-" },
    {
      key: "role",
      header: "Role",
      render: (row: UserRow) => (
        <Badge variant={ROLE_BADGE_VARIANT[row.role ?? ""] ?? "default"}>
          {ROLE_OPTIONS.find((o) => o.value === row.role)?.label ?? row.role ?? "-"}
        </Badge>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      render: (row: UserRow) => getBranchName(row.branchId),
    },
    {
      key: "active",
      header: "Active",
      render: (row: UserRow) =>
        row.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="danger">Inactive</Badge>
        ),
    },
    {
      key: "lastLogin",
      header: "Last Login",
      render: (row: UserRow) =>
        row.lastLogin
          ? format(new Date(row.lastLogin), "MMM d, yyyy")
          : "-",
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: UserRow) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
            aria-label="Edit"
            className="text-slate-600 hover:bg-[#f5f0ff] hover:text-[#5a189a]"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {row.isActive !== false && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeactivate(row._id)}
              aria-label="Deactivate"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <UserX className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-0 bg-white font-sans">
      {/* Hero header — white with gradient accent */}
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-1 h-1 w-12 rounded-full bg-gradient-to-r from-[#ff6d00] to-[#ff9e00]" aria-hidden />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Users
              </h1>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">
                Manage team access and roles
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats row — mobile-first */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={Users}
            title="Total users"
            value={pagination?.total ?? 0}
            description="All users"
            className="rounded-xl border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          />
          <StatCard
            icon={UserCheck}
            title="Active on this page"
            value={activeCount}
            description={`of ${items.length} shown`}
            className="rounded-xl border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          />
          <StatCard
            icon={Shield}
            title="Roles"
            value={ROLE_OPTIONS.length}
            description="Available roles"
            className="rounded-xl border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hidden sm:block"
          />
        </div>

        {/* Toolbar card — search + Create User */}
        <Card className="mb-6 rounded-xl border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              onSearch={handleSearch}
              placeholder="Search name, email..."
              className="w-full sm:w-72"
            />
            <Button
              onClick={openCreate}
              className="h-11 shrink-0 bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-md transition hover:opacity-95 focus-visible:ring-[#ff8500]"
            >
              <Plus className="h-4 w-4" />
              Create User
            </Button>
          </CardContent>
        </Card>

        {/* Users table card */}
        <Card className="overflow-hidden rounded-xl border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardHeader className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
            <CardTitle className="text-base font-semibold text-slate-900 sm:text-lg">
              All users
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
              emptyTitle="No users"
              emptyDescription="Create your first user to get started."
              className="[&_table]:min-w-full [&_thead]:bg-[#faf9fc] [&_th]:text-slate-600 [&_th]:font-semibold"
            />
          </CardContent>
        </Card>
      </main>

      {/* Create User modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create User" size="lg" className="max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-xl">
        <form onSubmit={handleCreateSubmit} className="overflow-hidden">
          <div className="relative -mx-6 -mt-4 mb-6 overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#fff8f2] via-white to-[#f5f0ff] px-5 py-4">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#ff9e00]/20 blur-2xl" aria-hidden />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7b2cbf]/30 to-transparent" aria-hidden />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <Users className="h-5 w-5 text-[#7b2cbf]" />
              </div>
              <p className="text-sm text-slate-600">
                Add a new team member. Set name, email, password, role and optional branch.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Profile</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="First Name"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                  placeholder="John"
                  className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                />
                <Input
                  label="Last Name"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                  placeholder="Doe"
                  className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Optional"
                  className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Account</p>
              <div className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="john@example.com"
                  className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                />
                <Input
                  label="Password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Role & branch</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AppReactSelect
                  label="Role"
                  value={createForm.role}
                  options={ROLE_OPTIONS}
                  onChange={(value) => setCreateForm((f) => ({ ...f, role: value }))}
                  placeholder="Select role..."
                />
                <AppReactSelect
                  label="Branch"
                  value={createForm.branchId}
                  options={branchOptions}
                  onChange={(value) => setCreateForm((f) => ({ ...f, branchId: value }))}
                  placeholder="Select branch..."
                  isClearable
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="rounded-lg border-slate-200">
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createMut.isPending}
                className="rounded-lg bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] font-semibold text-white shadow-md hover:opacity-95 focus-visible:ring-[#ff8500]"
              >
                Create User
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit User modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit User" size="lg" className="max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-xl">
        <form onSubmit={handleEditSubmit} className="overflow-hidden">
          <div className="relative -mx-6 -mt-4 mb-6 overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#f5f0ff] via-white to-[#fff8f2] px-5 py-4">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#7b2cbf]/15 blur-2xl" aria-hidden />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5a189a]/30 to-transparent" aria-hidden />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <Pencil className="h-5 w-5 text-[#5a189a]" />
              </div>
              <p className="text-sm text-slate-600">
                Update name, phone, role, branch and active status.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Profile</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="First Name"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                  className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                />
                <Input
                  label="Last Name"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                  className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Optional"
                  className="rounded-lg border-slate-200 focus-visible:ring-[#5a189a]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Role & branch</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AppReactSelect
                  label="Role"
                  value={editForm.role}
                  options={ROLE_OPTIONS}
                  onChange={(value) => setEditForm((f) => ({ ...f, role: value }))}
                  placeholder="Select role..."
                />
                <AppReactSelect
                  label="Branch"
                  value={editForm.branchId}
                  options={branchOptions}
                  onChange={(value) => setEditForm((f) => ({ ...f, branchId: value }))}
                  placeholder="Select branch..."
                  isClearable
                />
              </div>
              <label className="mt-4 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)} className="rounded-lg border-slate-200">
                Cancel
              </Button>
              <Button
                type="submit"
                loading={updateMut.isPending}
                className="rounded-lg bg-gradient-to-r from-[#5a189a] to-[#7b2cbf] font-semibold text-white shadow-md hover:opacity-95 focus-visible:ring-[#5a189a]"
              >
                Update
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Deactivate User modal */}
      <Modal open={!!showDeactivate} onClose={() => setShowDeactivate(null)} title="Deactivate User" className="rounded-2xl border-0 shadow-xl">
        <p className="text-slate-600">
          Are you sure you want to deactivate this user? They will no longer be able to sign in.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowDeactivate(null)} className="rounded-lg border-slate-200">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            loading={updateMut.isPending}
            className="rounded-lg"
          >
            Deactivate
          </Button>
        </div>
      </Modal>
    </div>
  );
}
