"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUsers, useCreateUser, useBranches } from "@/hooks/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Modal,
  Input,
  AppReactSelect,
} from "@/components/ui";
import { USER_ROLES, RESTAURANT_ROLE_MATRIX } from "@/constants";
import Link from "next/link";
import {
  UtensilsCrossed,
  Users,
  ChefHat,
  Wine,
  LayoutDashboard,
  UserCircle,
  Mail,
  Shield,
  UserPlus,
  DollarSign,
} from "lucide-react";
import toast from "react-hot-toast";

/** Format camelCase for display (e.g. frontDesk → Front Desk) */
function formatRoleLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/** Restaurant departments and the roles that belong to each */
const RESTAURANT_DEPARTMENTS: { id: string; label: string; icon: typeof ChefHat; roles: string[] }[] = [
  {
    id: "kitchen",
    label: "Kitchen",
    icon: ChefHat,
    roles: [
      USER_ROLES.RESTAURANT_MANAGER,
      USER_ROLES.HEAD_CHEF,
      USER_ROLES.SOUS_CHEF,
      USER_ROLES.KITCHEN_STAFF,
      USER_ROLES.PROCUREMENT_OFFICER,
      USER_ROLES.STOREKEEPER,
    ],
  },
  {
    id: "service",
    label: "Service (Front of House)",
    icon: UtensilsCrossed,
    roles: [
      USER_ROLES.CASHIER,
      USER_ROLES.WAITER,
      USER_ROLES.HOSTESS,
      USER_ROLES.SUPERVISOR,
      USER_ROLES.POS_STAFF,
    ],
  },
  {
    id: "bar",
    label: "Bar",
    icon: Wine,
    roles: [
      USER_ROLES.BAR_MANAGER,
      USER_ROLES.BARTENDER,
      USER_ROLES.BAR_CASHIER,
    ],
  },
  {
    id: "management",
    label: "Management & Finance",
    icon: LayoutDashboard,
    roles: [
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.HOTEL_OWNER,
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.FINANCE_MANAGER,
      USER_ROLES.ACCOUNTANT,
    ],
  },
];

const ROLE_TO_DEPARTMENT = (() => {
  const map: Record<string, string> = {};
  RESTAURANT_DEPARTMENTS.forEach((dept) => {
    dept.roles.forEach((role) => {
      map[role] = dept.id;
    });
  });
  return map;
})();

const RESTAURANT_ROLE_OPTIONS = RESTAURANT_ROLE_MATRIX.map((r) => ({
  value: r.role,
  label: r.label,
}));

type UserRow = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
};

export default function RestaurantEmployeesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: USER_ROLES.WAITER as string,
    branchId: "",
  });

  const { data, isLoading } = useUsers({ limit: "500" });
  const { data: branchesData } = useBranches({ limit: "100" });
  const createMut = useCreateUser();
  const rawItems = data?.data ?? data;
  const users = Array.isArray(rawItems) ? (rawItems as UserRow[]) : [];
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
      router.replace("/restaurant/employees", { scroll: false });
    }
  }, [router, searchParams]);

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
        role: USER_ROLES.WAITER,
        branchId: "",
      });
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
          "Failed to create employee"
      );
    }
  };

  const byDepartment = useMemo(() => {
    const map: Record<string, UserRow[]> = {};
    RESTAURANT_DEPARTMENTS.forEach((d) => {
      map[d.id] = [];
    });
    map.other = [];

    users.forEach((user) => {
      const role = user.role ?? "";
      const deptId = ROLE_TO_DEPARTMENT[role] ?? "other";
      if (!map[deptId]) map[deptId] = [];
      map[deptId].push(user);
    });

    return map;
  }, [users]);

  const totalRestaurant = users.filter((u) => ROLE_TO_DEPARTMENT[u.role ?? ""]).length;
  const otherUsers = byDepartment.other ?? [];

  return (
    <div className="min-h-0 bg-white font-sans">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-1 h-1 w-12 rounded-full bg-gradient-to-r from-[#ff6d00] to-[#ff9e00]" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Restaurant employees
          </h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Departments and team members with their roles
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Summary */}
        <Card className="mb-6 rounded-xl border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="h-5 w-5 text-[#5a189a]" />
              <span className="font-medium">
                {totalRestaurant} in restaurant departments
              </span>
            </div>
            {otherUsers.length > 0 && (
              <span className="text-sm text-slate-500">
                {otherUsers.length} in other roles
              </span>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {RESTAURANT_DEPARTMENTS.map((d) => (
              <Card key={d.id} className="rounded-xl border-slate-200/80">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-lg">{d.label}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {RESTAURANT_DEPARTMENTS.map((dept) => {
              const list = byDepartment[dept.id] ?? [];
              const Icon = dept.icon;
              return (
                <Card
                  key={dept.id}
                  className="overflow-hidden rounded-xl border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <CardHeader className="border-b border-slate-100 bg-[#faf9fc] px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80">
                        <Icon className="h-5 w-5 text-[#5a189a]" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-900 sm:text-lg">
                          {dept.label}
                        </CardTitle>
                        <p className="text-sm text-slate-500">
                          {list.length} {list.length === 1 ? "employee" : "employees"}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {list.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">
                        No employees in this department
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {list.map((user) => (
                          <li
                            key={user._id}
                            className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 hover:bg-slate-50/80"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                              <UserCircle className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-900">
                                {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "—"}
                              </p>
                              {user.email && (
                                <p className="flex items-center gap-1.5 text-sm text-slate-500">
                                  <Mail className="h-3.5 w-3.5 shrink-0" />
                                  {user.email}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={user.isActive === false ? "danger" : "success"}
                                className="shrink-0"
                              >
                                {user.isActive === false ? "Inactive" : "Active"}
                              </Badge>
                              <span className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                                <Shield className="h-3.5 w-3.5 shrink-0" />
                                {formatRoleLabel(user.role ?? "")}
                              </span>
                              <Link
                                href={`/staff/salary-payments?openPayroll=${encodeURIComponent(user._id)}`}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-[#5a189a]/30 hover:text-[#5a189a]"
                              >
                                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                                Payroll
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {otherUsers.length > 0 && (
              <Card className="overflow-hidden rounded-xl border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80">
                      <Users className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-700 sm:text-lg">
                        Other roles
                      </CardTitle>
                      <p className="text-sm text-slate-500">
                        {otherUsers.length} {otherUsers.length === 1 ? "employee" : "employees"} not in restaurant departments
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-slate-100">
                    {otherUsers.map((user) => (
                      <li
                        key={user._id}
                        className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 hover:bg-slate-50/80"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                          <UserCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">
                            {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "—"}
                          </p>
                          {user.email && (
                            <p className="flex items-center gap-1.5 text-sm text-slate-500">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              {user.email}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={user.isActive === false ? "danger" : "success"}
                            className="shrink-0"
                          >
                            {user.isActive === false ? "Inactive" : "Active"}
                          </Badge>
                          <span className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                            <Shield className="h-3.5 w-3.5 shrink-0" />
                            {formatRoleLabel(user.role ?? "")}
                          </span>
                          <Link
                            href={`/staff/salary-payments?openPayroll=${encodeURIComponent(user._id)}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-[#5a189a]/30 hover:text-[#5a189a]"
                          >
                            <DollarSign className="h-3.5 w-3.5 shrink-0" />
                            Payroll
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <Modal open={showCreate} onClose={closeCreateModal} title="" size="lg">
        <div className="relative overflow-hidden rounded-t-xl border-b border-slate-100 bg-gradient-to-r from-[#5a189a] to-[#7b2cbf] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
              <UserPlus className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Create employee</h2>
              <p className="text-sm text-white/90">Register a new restaurant staff member.</p>
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
                options={RESTAURANT_ROLE_OPTIONS}
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
