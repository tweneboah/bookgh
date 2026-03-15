"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { useBookings, useRooms, useRoomCategories } from "@/hooks/api";
import {
  BedDouble,
  Gauge,
  Calendar,
  Building2,
  Users,
  Layers,
  Tags,
  Briefcase,
  Sparkles,
  Wrench,
  BarChart3,
  CreditCard,
  Receipt,
  PieChart,
  ArrowRight,
  Square,
  Search,
  ShieldCheck,
} from "lucide-react";

const quickLinks = [
  { href: "/front-desk-board", label: "Front Desk Board", icon: Gauge, color: "text-[#ff6d00]" },
  { href: "/bookings", label: "Bookings", icon: Calendar, color: "text-[#5a189a]" },
  { href: "/accommodation/roles", label: "Staff & roles", icon: ShieldCheck, color: "text-[#7b2cbf]" },
  { href: "/accommodation/employees", label: "Employees", icon: Users, color: "text-[#ff6d00]" },
  { href: "/bookings/calendar", label: "Booking Calendar", icon: Calendar, color: "text-[#7b2cbf]" },
  { href: "/rooms", label: "Rooms", icon: BedDouble, color: "text-[#5a189a]" },
  { href: "/rooms/floors", label: "Floors", icon: Building2, color: "text-slate-600" },
  { href: "/guests", label: "Guests", icon: Users, color: "text-[#9d4edd]" },
  { href: "/room-categories", label: "Room Categories", icon: Layers, color: "text-[#5a189a]" },
  { href: "/pricing-rules?department=accommodation", label: "Pricing Rules", icon: Tags, color: "text-[#ff6d00]" },
  { href: "/corporate-accounts", label: "Corporate Accounts", icon: Briefcase, color: "text-slate-600" },
  { href: "/housekeeping", label: "Housekeeping", icon: Sparkles, color: "text-[#9d4edd]" },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, color: "text-amber-600" },
  { href: "/assets", label: "Assets", icon: Square, color: "text-slate-600" },
  { href: "/lost-and-found", label: "Lost & Found", icon: Search, color: "text-slate-600" },
  { href: "/reports/accommodation", label: "Accommodation Reports", icon: BarChart3, color: "text-emerald-600" },
  { href: "/payments?department=accommodation", label: "Payments", icon: CreditCard, color: "text-blue-600" },
  { href: "/expenses?department=accommodation", label: "Expenses", icon: Receipt, color: "text-amber-600" },
  { href: "/reports/department?department=accommodation", label: "Accounting", icon: PieChart, color: "text-cyan-600" },
];

function MetricCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: typeof BedDouble;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="border-slate-100 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          </div>
          <div className={`rounded-xl p-2.5 ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccommodationOverviewPage() {
  const bookingsParams = useMemo(() => ({ limit: "1", page: "1" }), []);
  const roomsParams = useMemo(() => ({ limit: "1", page: "1" }), []);
  const categoriesParams = useMemo(() => ({ limit: "1", page: "1" }), []);

  const { data: bookingsData } = useBookings(bookingsParams);
  const { data: roomsData } = useRooms(roomsParams);
  const { data: categoriesData } = useRoomCategories(categoriesParams);

  const totalBookings = bookingsData?.meta?.pagination?.total ?? 0;
  const totalRooms = roomsData?.meta?.pagination?.total ?? 0;
  const totalCategories = categoriesData?.meta?.pagination?.total ?? 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-orange-50/80 via-white to-purple-50/50 px-6 py-6 shadow-sm">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#ff6d00]/10 blur-2xl" aria-hidden />
        <div className="absolute bottom-0 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-[#5a189a]/10 blur-2xl" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
              <BedDouble className="h-7 w-7 text-[#5a189a]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Accommodation</h1>
              <p className="mt-1 text-sm text-slate-600">
                Rooms, bookings, guests, pricing rules, housekeeping, and reports.
              </p>
            </div>
          </div>
          <Button asChild className="w-fit bg-[#ff6d00] text-white hover:bg-[#e56300]">
            <Link href="/bookings">
              New booking
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total rooms"
          value={totalRooms}
          icon={BedDouble}
          iconBg="bg-[#5a189a]/10"
          iconColor="text-[#5a189a]"
        />
        <MetricCard
          label="Room categories"
          value={totalCategories}
          icon={Layers}
          iconBg="bg-purple-100"
          iconColor="text-[#7b2cbf]"
        />
        <MetricCard
          label="Total bookings"
          value={totalBookings}
          icon={Calendar}
          iconBg="bg-orange-100"
          iconColor="text-[#ff6d00]"
        />
        <MetricCard
          label="Quick actions"
          value="Pricing & reports"
          icon={BarChart3}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Quick links</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quickLinks.map((link) => (
          <Card
            key={link.href}
            className="border-slate-100 bg-white transition hover:shadow-md"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <link.icon className={`h-5 w-5 ${link.color}`} />
                {link.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild variant="outline" className="w-full border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10">
                <Link href={link.href}>
                  Open
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
