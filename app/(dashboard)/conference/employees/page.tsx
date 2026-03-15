"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUsers, useCreateUser, useBranches } from "@/hooks/api";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Modal,
  Input,
  Badge,
  SearchInput,
  AppReactSelect,
  EmptyState,
} from "@/components/ui";
import { Users, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { USER_ROLES, CONFERENCE_ROLE_MATRIX } from "@/constants";

const CONFERENCE_ROLES = new Set(CONFERENCE_ROLE_MATRIX.map((r) => r.role));

function formatRoleLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const CONFERENCE_ROLE_OPTIONS = CONFERENCE_ROLE_MATRIX.map((r) => ({
  value: r.role,
  label: r.label,
}));

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

export default function ConferenceEmployeesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const params: Record<string, string> = { page: String(page), limit: "50" };

  const { data, isLoading } = useUsers(params);
  const { data: branchesData } = useBranches({ limit: "100" });
  const createMut = useCreateUser();

  const rawItems = data?.data ?? data;
  const allItems = Array.isArray(rawItems) ? (rawItems as UserRow[]) : [];
  const items = useMemo(
    () => allItems.filter((u) => u.role && CONFERENCE_ROLES.has(u.role)),
    [allItems]
  );
  const branches = (branchesData?.data ?? branchesData) as Array<{ _id: string; name?: string }> | undefined;
  const branchList = Array.isArray(branches) ? branches : [];
  const branchOptions = [
    { value: "", label: "No branch" },
    ...branchList.map((b) => ({ value: b._id, label: b.name ?? b._id })),
  ];

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreate(true);
  }, [searchParams]);

  const closeCreateModal = useCallback(() => {
    setShowCreate(false);
    if (searchParams.get("create") === "1") {
      router.replace("/conference/employees", { scroll: false });
    }
  }, [router, searchParams]);

  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: USER_ROLES.EVENT_COORDINATOR as string,
    branchId: "",
  });

  const getBranchName = (bid: string | { name?: string } | undefined) => {
    if (!bid) return "—";
    if (typeof bid === "object") return bid.name ?? "—";
    const b = branchList.find((x) => x._id === bid);
    return b?.name ?? "—";
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
      toast.success("Employee created");
      closeCreateModal();
      setCreateForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        role: USER_ROLES.EVENT_COORDINATOR,
        branchId: "",
      });
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
          "Failed to create employee"
      );
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchInput.trim()) return items;
    const q = searchInput.trim().toLowerCase();
    return items.filter(
      (u) =>
        (u.firstName ?? "").toLowerCase().includes(q) ||
        (u.lastName ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    );
  }, [items, searchInput]);

  return (
    <div
      className="min-h-screen bg-white text-slate-800"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <header className="border-b border-slate-100 bg-white pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employees</h1>
            <p className="mt-1 text-sm text-slate-600">
              Conference staff: event managers, sales, coordinators, and accounting.
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6d00] to-[#ff9100] px-4 py-2.5 font-semibold text-white shadow-lg shadow-[#ff8500]/25 transition hover:opacity-95"
          >
            <UserPlus className="h-5 w-5" aria-hidden />
            Create employee
          </Button>
        </div>
      </header>

      <main className="mt-6">
        <div className="mb-4">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onSearch={() => {}}
            placeholder="Search by name or email..."
            className="max-w-sm"
          />
        </div>

        <Card className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Users className="h-5 w-5 text-[#5a189a]" />
              Conference staff ({filteredItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#5a189a]" />
              </div>
            ) : filteredItems.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No conference employees"
                description="Create an employee to assign conference roles (event coordinator, sales officer, etc.)."
                action={{ label: "Create employee", onClick: () => setShowCreate(true) }}
                actionClassName="bg-gradient-to-r from-[#ff6d00] to-[#ff9100] text-white hover:opacity-95"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Branch</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Last login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((row) => (
                      <tr key={row._id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {[row.firstName, row.lastName].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.email ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="default">
                            {CONFERENCE_ROLE_OPTIONS.find((o) => o.value === row.role)?.label ?? formatRoleLabel(row.role ?? "")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{getBranchName(row.branchId)}</td>
                        <td className="px-4 py-3">
                          {row.isActive !== false ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.lastLogin ? format(new Date(row.lastLogin), "MMM d, yyyy") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="mt-3 text-xs text-slate-500">
          Only users with conference roles are listed. To assign or change roles, use{" "}
          <a href="/users" className="font-medium text-[#5a189a] hover:underline">
            Users
          </a>
          .
        </p>
      </main>

      <Modal open={showCreate} onClose={closeCreateModal} title="" size="lg">
        <div className="relative overflow-hidden rounded-t-xl border-b border-slate-100 bg-gradient-to-r from-[#5a189a] to-[#7b2cbf] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
              <UserPlus className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Create employee</h2>
              <p className="text-sm text-white/90">Register a new conference staff member.</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleCreateSubmit} className="space-y-4 p-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Profile</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                value={createForm.firstName}
                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                required
                placeholder="John"
              />
              <Input
                label="Last name"
                value={createForm.lastName}
                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                required
                placeholder="Doe"
              />
            </div>
            <div className="mt-4">
              <Input
                label="Phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Account</p>
            <Input
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="john@example.com"
              className="mb-4"
            />
            <Input
              label="Password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Role & branch</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <AppReactSelect
                label="Role"
                value={createForm.role}
                options={CONFERENCE_ROLE_OPTIONS}
                onChange={(value) => setCreateForm((f) => ({ ...f, role: value ?? "" }))}
                placeholder="Select role..."
              />
              <AppReactSelect
                label="Branch"
                value={createForm.branchId}
                options={branchOptions}
                onChange={(value) => setCreateForm((f) => ({ ...f, branchId: value ?? "" }))}
                placeholder="Select branch..."
                isClearable
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMut.isPending}
              className="bg-gradient-to-r from-[#ff6d00] to-[#ff9100] text-white hover:opacity-95"
            >
              Create employee
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
