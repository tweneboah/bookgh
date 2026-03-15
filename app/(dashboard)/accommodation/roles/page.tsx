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
  ACCOMMODATION_PERMISSIONS,
  ACCOMMODATION_ROLE_MATRIX,
  ACCOMMODATION_ROLE_PERMISSION_MATRIX,
} from "@/constants";
import { Fragment } from "react";
import { useAppSelector } from "@/store/hooks";
import { ShieldCheck } from "lucide-react";

const PERMISSION_LABELS: Record<string, string> = {
  [ACCOMMODATION_PERMISSIONS.BOOKING_CREATE]: "Create bookings",
  [ACCOMMODATION_PERMISSIONS.BOOKING_UPDATE]: "Update bookings",
  [ACCOMMODATION_PERMISSIONS.BOOKING_CANCEL]: "Cancel bookings",
  [ACCOMMODATION_PERMISSIONS.CHECK_IN]: "Check in guests",
  [ACCOMMODATION_PERMISSIONS.CHECK_OUT]: "Check out guests",
  [ACCOMMODATION_PERMISSIONS.GUESTS_VIEW]: "View guests",
  [ACCOMMODATION_PERMISSIONS.GUESTS_EDIT]: "Edit guests",
  [ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_VIEW]: "View housekeeping",
  [ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_UPDATE]: "Update housekeeping",
  [ACCOMMODATION_PERMISSIONS.LOST_AND_FOUND_MANAGE]: "Manage lost & found",
  [ACCOMMODATION_PERMISSIONS.MAINTENANCE_VIEW]: "View maintenance",
  [ACCOMMODATION_PERMISSIONS.REPORTS_VIEW]: "View reports",
  [ACCOMMODATION_PERMISSIONS.PAYMENTS_VIEW]: "View payments",
  [ACCOMMODATION_PERMISSIONS.PAYMENTS_PROCESS]: "Process payments",
  [ACCOMMODATION_PERMISSIONS.ROOMS_VIEW]: "View rooms",
  [ACCOMMODATION_PERMISSIONS.ROOMS_EDIT]: "Edit rooms",
  [ACCOMMODATION_PERMISSIONS.PRICING_VIEW]: "View pricing",
  [ACCOMMODATION_PERMISSIONS.PRICING_EDIT]: "Edit pricing",
};

const PERMISSION_GROUPS = [
  {
    key: "bookings",
    label: "Bookings",
    permissions: [
      ACCOMMODATION_PERMISSIONS.BOOKING_CREATE,
      ACCOMMODATION_PERMISSIONS.BOOKING_UPDATE,
      ACCOMMODATION_PERMISSIONS.BOOKING_CANCEL,
      ACCOMMODATION_PERMISSIONS.CHECK_IN,
      ACCOMMODATION_PERMISSIONS.CHECK_OUT,
    ],
  },
  {
    key: "guests",
    label: "Guests",
    permissions: [
      ACCOMMODATION_PERMISSIONS.GUESTS_VIEW,
      ACCOMMODATION_PERMISSIONS.GUESTS_EDIT,
    ],
  },
  {
    key: "rooms",
    label: "Rooms & pricing",
    permissions: [
      ACCOMMODATION_PERMISSIONS.ROOMS_VIEW,
      ACCOMMODATION_PERMISSIONS.ROOMS_EDIT,
      ACCOMMODATION_PERMISSIONS.PRICING_VIEW,
      ACCOMMODATION_PERMISSIONS.PRICING_EDIT,
    ],
  },
  {
    key: "housekeeping",
    label: "Housekeeping",
    permissions: [
      ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_VIEW,
      ACCOMMODATION_PERMISSIONS.HOUSEKEEPING_UPDATE,
      ACCOMMODATION_PERMISSIONS.LOST_AND_FOUND_MANAGE,
    ],
  },
  {
    key: "maintenance",
    label: "Maintenance",
    permissions: [ACCOMMODATION_PERMISSIONS.MAINTENANCE_VIEW],
  },
  {
    key: "finance",
    label: "Finance & reports",
    permissions: [
      ACCOMMODATION_PERMISSIONS.REPORTS_VIEW,
      ACCOMMODATION_PERMISSIONS.PAYMENTS_VIEW,
      ACCOMMODATION_PERMISSIONS.PAYMENTS_PROCESS,
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

export default function AccommodationRolesPage() {
  const currentUserRole = useAppSelector((state) => state.auth.user?.role ?? "");
  const knownPermissions = new Set(Object.values(ACCOMMODATION_PERMISSIONS));

  return (
    <div
      className="min-h-screen bg-white text-slate-800"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <header className="relative overflow-hidden border-b border-slate-100 bg-white">
        <div
          className="absolute left-0 top-0 h-full w-1.5 min-w-0 rounded-r-full bg-gradient-to-b from-[#ff8500] via-[#ff9100] to-[#5a189a] sm:w-2"
          aria-hidden
        />
        <div
          className="absolute right-0 top-0 h-32 w-48 rounded-bl-[80px] bg-gradient-to-br from-[#ff9100]/10 to-[#5a189a]/5 sm:h-40 sm:w-64 sm:rounded-bl-[100px]"
          aria-hidden
        />
        <div className="relative px-4 py-5 sm:px-6 sm:py-6 md:px-8">
          <div className="flex items-start gap-3 pl-3 sm:pl-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a189a]/15 to-[#9d4edd]/10 text-[#5a189a] ring-1 ring-[#5a189a]/20">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Accommodation
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Staff & role matrix
              </h1>
              <p className="mt-1 max-w-lg text-sm text-slate-600">
                Permissions by role for front desk, reservation, housekeeping, maintenance, and accounting.
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
              Config: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">ACCOMMODATION_PERMISSIONS</code>
              {" · "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">ACCOMMODATION_ROLE_PERMISSION_MATRIX</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-slate-600">
                    <th className="py-3 pr-4 font-semibold">Capability</th>
                    <th className="py-3 px-4 font-semibold">Permission key</th>
                    {ACCOMMODATION_ROLE_MATRIX.map((roleDef) => (
                      <th key={roleDef.role} className="py-3 px-4 font-semibold">
                        <span>{roleDef.label}</span>
                        {currentUserRole === roleDef.role ? (
                          <Badge variant="info" className="ml-2 align-middle text-xs">
                            You
                          </Badge>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMISSION_GROUPS.map((group) => (
                    <Fragment key={group.key}>
                      <tr className="bg-gradient-to-r from-[#5a189a]/5 to-[#ff9100]/5">
                        <td
                          colSpan={2 + ACCOMMODATION_ROLE_MATRIX.length}
                          className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-[#5a189a]"
                        >
                          {group.label}
                        </td>
                      </tr>
                      {group.permissions
                        .filter((permission) => knownPermissions.has(permission))
                        .map((permission) => (
                          <tr key={permission} className="transition-colors hover:bg-slate-50/50">
                            <td className="py-3 pr-4 font-medium text-slate-800">
                              {PERMISSION_LABELS[permission] ?? permission}
                            </td>
                            <td className="py-3 px-4">
                              <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                {permission}
                              </code>
                            </td>
                            {ACCOMMODATION_ROLE_MATRIX.map((roleDef) => (
                              <td key={roleDef.role} className="py-3 px-4">
                                <AccessCell
                                  allowed={
                                    ACCOMMODATION_ROLE_PERMISSION_MATRIX[roleDef.role]?.includes(
                                      permission
                                    ) ?? false
                                  }
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
