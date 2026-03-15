"use client";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  POOL_PERMISSIONS,
  POOL_ROLE_MATRIX,
  POOL_ROLE_PERMISSION_MATRIX,
} from "@/constants";
import { Fragment } from "react";
import { useAppSelector } from "@/store/hooks";
import { Droplets } from "lucide-react";

const PERMISSION_LABELS: Record<string, string> = {
  [POOL_PERMISSIONS.EMPLOYEES_MANAGE]: "Manage employees",
  [POOL_PERMISSIONS.ROLES_VIEW]: "View staff & roles",
  [POOL_PERMISSIONS.OVERVIEW_VIEW]: "Pool overview",
  [POOL_PERMISSIONS.AREAS_VIEW]: "Pool areas",
  [POOL_PERMISSIONS.BOOKINGS_VIEW]: "Bookings",
  [POOL_PERMISSIONS.MAINTENANCE_VIEW]: "Maintenance",
  [POOL_PERMISSIONS.INVOICES_VIEW]: "Invoices",
  [POOL_PERMISSIONS.PAYMENTS_VIEW]: "Income (Payments)",
  [POOL_PERMISSIONS.EXPENSES_VIEW]: "Expenses",
  [POOL_PERMISSIONS.ACCOUNTING_VIEW]: "Accounting",
  [POOL_PERMISSIONS.REPORTS_VIEW]: "Pool reports",
};

const PERMISSION_GROUPS = [
  {
    key: "staff",
    label: "Staff & management",
    permissions: [POOL_PERMISSIONS.EMPLOYEES_MANAGE, POOL_PERMISSIONS.ROLES_VIEW],
  },
  {
    key: "operations",
    label: "Operations",
    permissions: [
      POOL_PERMISSIONS.OVERVIEW_VIEW,
      POOL_PERMISSIONS.AREAS_VIEW,
      POOL_PERMISSIONS.BOOKINGS_VIEW,
      POOL_PERMISSIONS.MAINTENANCE_VIEW,
    ],
  },
  {
    key: "finance",
    label: "Finance & reports",
    permissions: [
      POOL_PERMISSIONS.INVOICES_VIEW,
      POOL_PERMISSIONS.PAYMENTS_VIEW,
      POOL_PERMISSIONS.EXPENSES_VIEW,
      POOL_PERMISSIONS.ACCOUNTING_VIEW,
      POOL_PERMISSIONS.REPORTS_VIEW,
    ],
  },
] as const;

function AccessCell({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <Badge variant="success">Allowed</Badge>
  ) : (
    <Badge variant="outline">Restricted</Badge>
  );
}

export default function PoolRolesPage() {
  const currentUserRole = useAppSelector((state) => state.auth.user?.role ?? "");
  const knownPermissions = new Set(Object.values(POOL_PERMISSIONS));

  return (
    <div
      className="min-h-screen bg-white text-slate-800"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <header className="relative overflow-hidden border-b border-slate-100 bg-white">
        <div className="absolute left-0 top-0 h-full w-1.5 min-w-0 rounded-r-full bg-gradient-to-b from-[#ff8500] via-[#ff9100] to-[#5a189a] sm:w-2" aria-hidden />
        <div className="absolute right-0 top-0 h-32 w-48 rounded-bl-[80px] bg-gradient-to-br from-[#ff9100]/10 to-[#5a189a]/5 sm:h-40 sm:w-64 sm:rounded-bl-[100px]" aria-hidden />
        <div className="relative px-4 py-5 sm:px-6 sm:py-6 md:px-8">
          <div className="flex items-start gap-3 pl-3 sm:pl-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a189a]/15 to-[#9d4edd]/10 text-[#5a189a] ring-1 ring-[#5a189a]/20">
              <Droplets className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Pool Department</span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Staff & role matrix</h1>
              <p className="mt-1 max-w-lg text-sm text-slate-600">
                Permissions by role for pool operations, maintenance, and accounting.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        <Card className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <CardHeader>
            <CardTitle>Permissions by role</CardTitle>
            <CardDescription>
              Config: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">POOL_PERMISSIONS</code>
              {" · "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">POOL_ROLE_PERMISSION_MATRIX</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-slate-600">
                    <th className="py-3 pr-4 font-semibold">Capability</th>
                    <th className="py-3 px-4 font-semibold">Permission key</th>
                    {POOL_ROLE_MATRIX.map((roleDef) => (
                      <th key={roleDef.role} className="py-3 px-4 font-semibold">
                        <span>{roleDef.label}</span>
                        {currentUserRole === roleDef.role ? (
                          <Badge variant="info" className="ml-2 align-middle text-xs">You</Badge>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMISSION_GROUPS.map((group) => (
                    <Fragment key={group.key}>
                      <tr className="bg-gradient-to-r from-[#5a189a]/5 to-[#ff9100]/5">
                        <td colSpan={2 + POOL_ROLE_MATRIX.length} className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-[#5a189a]">
                          {group.label}
                        </td>
                      </tr>
                      {group.permissions
                        .filter((p) => knownPermissions.has(p))
                        .map((permission) => (
                          <tr key={permission} className="transition-colors hover:bg-slate-50/50">
                            <td className="py-3 pr-4 font-medium text-slate-800">{PERMISSION_LABELS[permission] ?? permission}</td>
                            <td className="py-3 px-4">
                              <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{permission}</code>
                            </td>
                            {POOL_ROLE_MATRIX.map((roleDef) => (
                              <td key={roleDef.role} className="py-3 px-4">
                                <AccessCell
                                  allowed={POOL_ROLE_PERMISSION_MATRIX[roleDef.role]?.includes(permission) ?? false}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
