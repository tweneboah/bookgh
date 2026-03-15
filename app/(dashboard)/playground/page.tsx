"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import {
  Building2,
  Calendar,
  CalendarCheck,
  Wrench,
  FileText,
  CreditCard,
  Receipt,
  PieChart,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";

const quickLinks = [
  {
    href: "/playground/areas",
    label: "Playground Areas",
    icon: Building2,
    color: "text-emerald-600",
  },
  {
    href: "/playground/bookings",
    label: "Bookings",
    icon: Calendar,
    color: "text-[#5a189a]",
  },
  {
    href: "/playground/calendar",
    label: "Calendar",
    icon: CalendarCheck,
    color: "text-[#7b2cbf]",
  },
  {
    href: "/playground/equipment",
    label: "Equipment (slides, seesaws, swings)",
    icon: SlidersHorizontal,
    color: "text-amber-600",
  },
  {
    href: "/playground/maintenance",
    label: "Maintenance",
    icon: Wrench,
    color: "text-orange-600",
  },
  {
    href: "/invoices?department=playground",
    label: "Invoices",
    icon: FileText,
    color: "text-slate-600",
  },
  {
    href: "/payments?department=playground",
    label: "Income (Payments)",
    icon: CreditCard,
    color: "text-emerald-600",
  },
  {
    href: "/expenses?department=playground",
    label: "Expenses",
    icon: Receipt,
    color: "text-orange-600",
  },
  {
    href: "/reports/department?department=playground",
    label: "Department P&L",
    icon: PieChart,
    color: "text-[#5a189a]",
  },
  {
    href: "/reports/income-expense-statement?department=playground",
    label: "Income statement",
    icon: TrendingUp,
    color: "text-violet-600",
  },
];

export default function PlaygroundOverviewPage() {
  return (
    <div
      className="min-h-screen bg-white font-sans"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div
          className="absolute left-0 top-0 h-full w-1 bg-[linear-gradient(180deg,#ff6d00_0%,#ff9e00_100%)]"
          aria-hidden
        />
        <div className="relative px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Playground Department
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage playground areas, equipment (slides, seesaws, swings), and
            maintenance
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm transition hover:border-[#5a189a]/30 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 ${link.color}`}
                >
                  <link.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{link.label}</p>
                  <p className="text-sm text-slate-500">
                    Playground operations
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
