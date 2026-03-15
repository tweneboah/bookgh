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
  BAR_PERMISSIONS,
  BAR_ROLE_MATRIX,
  BAR_ROLE_PERMISSION_MATRIX,
} from "@/constants";
import { Fragment } from "react";
import { useAppSelector } from "@/store/hooks";
import { ShieldCheck } from "lucide-react";

const PERMISSION_LABELS: Record<string, string> = {
  [BAR_PERMISSIONS.EMPLOYEES_MANAGE]: "Manage employees",
  [BAR_PERMISSIONS.ROLES_VIEW]: "View staff & roles",
  [BAR_PERMISSIONS.OVERVIEW_VIEW]: "Bar overview",
  [BAR_PERMISSIONS.MENU_ITEMS_VIEW]: "Menu items",
  [BAR_PERMISSIONS.RECIPES_VIEW]: "Recipes",
  [BAR_PERMISSIONS.INVENTORY_ITEMS_VIEW]: "Inventory items",
  [BAR_PERMISSIONS.INVENTORY_VIEW]: "Inventory",
  [BAR_PERMISSIONS.ORDER_CREATE]: "Create orders",
  [BAR_PERMISSIONS.ORDER_UPDATE]: "Update/serve orders",
  [BAR_PERMISSIONS.ORDER_VOID]: "Void orders",
  [BAR_PERMISSIONS.STOCK_CONTROL_VIEW]: "Stock control",
  [BAR_PERMISSIONS.SHIFT_OPEN]: "Open shift",
  [BAR_PERMISSIONS.SHIFT_CLOSE]: "Close shift",
  [BAR_PERMISSIONS.SHIFTS_VIEW]: "View shifts",
  [BAR_PERMISSIONS.PRICING_RULES_VIEW]: "Happy hour rules",
  [BAR_PERMISSIONS.SUPPLIERS_VIEW]: "Suppliers",
  [BAR_PERMISSIONS.PURCHASE_ORDERS_VIEW]: "Purchase orders",
  [BAR_PERMISSIONS.STOCK_MANAGE]: "Manage stock",
  [BAR_PERMISSIONS.STOCK_ADJUST]: "Manual stock adjustment",
  [BAR_PERMISSIONS.STOCK_OVERRIDE_NEGATIVE]: "Negative stock override",
  [BAR_PERMISSIONS.VARIANCE_APPROVE]: "Approve variance/wastage",
  [BAR_PERMISSIONS.REPORT_VIEW]: "BAR reports",
  [BAR_PERMISSIONS.PAYMENTS_VIEW]: "Payments",
  [BAR_PERMISSIONS.EXPENSES_VIEW]: "Expenses",
  [BAR_PERMISSIONS.ACCOUNTING_VIEW]: "Accounting",
  [BAR_PERMISSIONS.FINANCE_VIEW]: "Finance",
};

const PERMISSION_GROUPS = [
  {
    key: "staff",
    label: "Staff & management",
    permissions: [BAR_PERMISSIONS.EMPLOYEES_MANAGE, BAR_PERMISSIONS.ROLES_VIEW],
  },
  {
    key: "operations",
    label: "Operations",
    permissions: [
      BAR_PERMISSIONS.OVERVIEW_VIEW,
      BAR_PERMISSIONS.MENU_ITEMS_VIEW,
      BAR_PERMISSIONS.RECIPES_VIEW,
      BAR_PERMISSIONS.INVENTORY_ITEMS_VIEW,
      BAR_PERMISSIONS.INVENTORY_VIEW,
      BAR_PERMISSIONS.ORDER_CREATE,
      BAR_PERMISSIONS.ORDER_UPDATE,
      BAR_PERMISSIONS.ORDER_VOID,
      BAR_PERMISSIONS.STOCK_CONTROL_VIEW,
      BAR_PERMISSIONS.SHIFT_OPEN,
      BAR_PERMISSIONS.SHIFT_CLOSE,
      BAR_PERMISSIONS.SHIFTS_VIEW,
      BAR_PERMISSIONS.PRICING_RULES_VIEW,
    ],
  },
  {
    key: "procurement",
    label: "Procurement",
    permissions: [
      BAR_PERMISSIONS.SUPPLIERS_VIEW,
      BAR_PERMISSIONS.PURCHASE_ORDERS_VIEW,
    ],
  },
  {
    key: "stock",
    label: "Stock (advanced)",
    permissions: [
      BAR_PERMISSIONS.STOCK_MANAGE,
      BAR_PERMISSIONS.STOCK_ADJUST,
      BAR_PERMISSIONS.STOCK_OVERRIDE_NEGATIVE,
      BAR_PERMISSIONS.VARIANCE_APPROVE,
    ],
  },
  {
    key: "finance",
    label: "Finance & reports",
    permissions: [
      BAR_PERMISSIONS.REPORT_VIEW,
      BAR_PERMISSIONS.PAYMENTS_VIEW,
      BAR_PERMISSIONS.EXPENSES_VIEW,
      BAR_PERMISSIONS.ACCOUNTING_VIEW,
      BAR_PERMISSIONS.FINANCE_VIEW,
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

export default function BarRoleMatrixPage() {
  const currentUserRole = useAppSelector((state) => state.auth.user?.role ?? "");
  const knownPermissions = new Set(Object.values(BAR_PERMISSIONS));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-pink-50 p-2">
            <ShieldCheck className="h-5 w-5 text-[#C71585]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">BAR Role Capability Matrix</h1>
            <p className="mt-1 text-sm text-slate-500">
              Clear ownership of BAR actions for manager, bartender, cashier, and accountant.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissions by Role</CardTitle>
          <CardDescription>
            Last updated from config: <code>BAR_PERMISSIONS</code> and{" "}
            <code>BAR_ROLE_PERMISSION_MATRIX</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-3 pr-4 font-semibold">Capability</th>
                  <th className="py-3 px-4 font-semibold">Permission Key</th>
                  {BAR_ROLE_MATRIX.map((roleDef) => (
                    <th key={roleDef.role} className="py-3 px-4 font-semibold">
                      <span>{roleDef.label}</span>
                      {currentUserRole === roleDef.role ? (
                        <Badge variant="info" className="ml-2 align-middle">
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
                    <tr className="bg-[#FFF5FB]">
                      <td
                        colSpan={2 + BAR_ROLE_MATRIX.length}
                        className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-[#C71585]"
                      >
                        {group.label}
                      </td>
                    </tr>
                    {group.permissions
                      .filter((permission) => knownPermissions.has(permission))
                      .map((permission) => (
                        <tr key={permission}>
                          <td className="py-3 pr-4 font-medium text-slate-800">
                            {PERMISSION_LABELS[permission] ?? permission}
                          </td>
                          <td className="py-3 px-4">
                            <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                              {permission}
                            </code>
                          </td>
                          {BAR_ROLE_MATRIX.map((roleDef) => (
                            <td key={roleDef.role} className="py-3 px-4">
                              <AccessCell
                                allowed={
                                  BAR_ROLE_PERMISSION_MATRIX[roleDef.role]?.includes(
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
    </div>
  );
}
