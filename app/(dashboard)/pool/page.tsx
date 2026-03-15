"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  Building2,
  CalendarCheck,
  Wrench,
  FileText,
  CreditCard,
  Receipt,
  PieChart,
  BarChart3,
  TrendingUp,
  Waves,
  ArrowRight,
  LayoutGrid,
  Wallet,
  LineChart,
} from "lucide-react";

const operationsLinks = [
  { href: "/pool/areas", label: "Pool Areas", icon: Building2, description: "Manage zones and capacity" },
  { href: "/pool/bookings", label: "Pool Bookings", icon: CalendarCheck, description: "View and manage bookings" },
  { href: "/pool/calendar", label: "Pool Calendar", icon: CalendarCheck, description: "Availability and schedule" },
  { href: "/pool/maintenance", label: "Maintenance", icon: Wrench, description: "Upkeep and repairs" },
];

const financeLinks = [
  { href: "/invoices?department=pool", label: "Invoices", icon: FileText, description: "Pool-related invoices" },
  { href: "/payments?department=pool", label: "Income (Payments)", icon: CreditCard, description: "Payment history" },
  { href: "/expenses?department=pool", label: "Expenses", icon: Receipt, description: "Track department spend" },
];

const reportsLinks = [
  { href: "/reports/department?department=pool", label: "Department P&L", icon: PieChart, description: "Profit & loss" },
  { href: "/reports/income-expense-statement?department=pool", label: "Income Statement", icon: TrendingUp, description: "Revenue and costs" },
  { href: "/reports/pool", label: "Pool Reports", icon: BarChart3, description: "Analytics and insights" },
];

function SectionCard({
  title,
  icon: Icon,
  gradientFrom,
  gradientTo,
  links,
}: {
  title: string;
  icon: React.ElementType;
  gradientFrom: string;
  gradientTo: string;
  links: { href: string; label: string; icon: React.ElementType; description: string }[];
}) {
  return (
    <Card className="overflow-hidden border-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <CardHeader className="border-b border-slate-100/80 bg-white px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm sm:h-11 sm:w-11"
            style={{ background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)` }}
          >
            <Icon className="h-5 w-5 sm:h-5 sm:w-5" strokeWidth={2} />
          </div>
          <CardTitle className="text-base font-semibold text-slate-900 sm:text-lg">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="group flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm group-hover:text-[#5a189a]">
                    <link.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-medium text-slate-900 group-hover:text-[#5a189a]">
                      {link.label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {link.description}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#ff8500]" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function PoolOverviewPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white px-5 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] sm:px-8 sm:py-8">
        <div
          className="absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-30 blur-3xl"
          style={{ background: "linear-gradient(135deg, #ff9e00 0%, #ff6d00 100%)" }}
          aria-hidden
        />
        <div
          className="absolute bottom-0 left-0 h-32 w-48 rounded-full opacity-20 blur-3xl"
          style={{ background: "linear-gradient(135deg, #5a189a 0%, #9d4edd 100%)" }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm sm:h-16 sm:w-16"
              style={{
                background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                boxShadow: "0 4px 14px rgba(90, 24, 154, 0.12)",
              }}
            >
              <Waves className="h-7 w-7 text-[#5a189a] sm:h-8 sm:w-8" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Pool Department
              </h1>
              <p className="mt-1 max-w-md text-sm text-slate-600 sm:text-base">
                Manage areas, bookings, maintenance, and financials in one place.
              </p>
            </div>
          </div>
          <Link
            href="/pool/bookings"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-base"
            style={{
              background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
              boxShadow: "0 4px 14px rgba(255, 109, 0, 0.35)",
            }}
          >
            View bookings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Section cards: Operations, Finance, Reports */}
      <div className="mt-8 grid gap-6 sm:mt-10 lg:grid-cols-3">
        <SectionCard
          title="Operations"
          icon={LayoutGrid}
          gradientFrom="#5a189a"
          gradientTo="#7b2cbf"
          links={operationsLinks}
        />
        <SectionCard
          title="Finance"
          icon={Wallet}
          gradientFrom="#ff6d00"
          gradientTo="#ff9e00"
          links={financeLinks}
        />
        <SectionCard
          title="Reports"
          icon={LineChart}
          gradientFrom="#3c096c"
          gradientTo="#9d4edd"
          links={reportsLinks}
        />
      </div>

      {/* Trust line */}
      <p className="mt-10 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
        Enterprise-ready pool management
      </p>
    </div>
  );
}
