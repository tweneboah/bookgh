"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Manrope } from "next/font/google";
import { useBookings, useRooms, useRoomCategories } from "@/hooks/api";
import { cn } from "@/lib/cn";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-accommodation-manrope",
  display: "swap",
});

function MsIcon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={cn("material-symbols-outlined inline-flex select-none", className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  );
}

type OpCard = {
  icon: string;
  title: string;
  description: string;
  href: string;
};

const operationCards: OpCard[] = [
  {
    icon: "dashboard_customize",
    title: "Front Desk Board",
    description: "Real-time room status",
    href: "/front-desk-board",
  },
  {
    icon: "calendar_month",
    title: "Booking Calendar",
    description: "Schedule & availability",
    href: "/bookings/calendar",
  },
  {
    icon: "book_online",
    title: "Bookings",
    description: "Manage reservations",
    href: "/bookings",
  },
  {
    icon: "door_front",
    title: "Rooms",
    description: "Inventory management",
    href: "/rooms",
  },
  {
    icon: "layers",
    title: "Floors",
    description: "Physical structure",
    href: "/rooms/floors",
  },
  {
    icon: "person_search",
    title: "Guests",
    description: "Profiles & history",
    href: "/guests",
  },
  {
    icon: "hotel_class",
    title: "Room Categories",
    description: "Suite configurations",
    href: "/room-categories",
  },
  {
    icon: "gavel",
    title: "Pricing Rules",
    description: "Dynamic rate engine",
    href: "/pricing-rules?department=accommodation",
  },
  {
    icon: "cleaning_services",
    title: "Housekeeping",
    description: "Status & assignments",
    href: "/housekeeping",
  },
  {
    icon: "build",
    title: "Maintenance",
    description: "Repairs & tickets",
    href: "/maintenance",
  },
  {
    icon: "inventory",
    title: "Assets",
    description: "Property inventory",
    href: "/assets",
  },
  {
    icon: "search_off",
    title: "Lost & Found",
    description: "Guest item tracking",
    href: "/lost-and-found",
  },
  {
    icon: "analytics",
    title: "Accommodation Reports",
    description: "KPIs & analytics",
    href: "/reports/accommodation",
  },
];

const staffLinks = [
  { icon: "manage_accounts", title: "Staff & Roles", href: "/accommodation/roles" },
  { icon: "group", title: "Employees", href: "/accommodation/employees" },
  { icon: "corporate_fare", title: "Corporate Accounts", href: "/corporate-accounts" },
];

const financeLinks = [
  { icon: "payments", title: "Payments", href: "/payments?department=accommodation" },
  { icon: "receipt_long", title: "Expenses", href: "/expenses?department=accommodation" },
  {
    icon: "account_balance_wallet",
    title: "Accounting",
    href: "/reports/department?department=accommodation",
  },
];

export default function AccommodationOverviewPage() {
  const metaParams = useMemo(() => ({ limit: "1", page: "1" }), []);
  const weeklyParams = useMemo(() => ({ limit: "400", page: "1" }), []);

  const { data: bookingsData } = useBookings(metaParams);
  const { data: bookingsForWeek } = useBookings(weeklyParams);
  const { data: roomsData } = useRooms(metaParams);
  const { data: categoriesData } = useRoomCategories(metaParams);

  const totalBookings = bookingsData?.meta?.pagination?.total ?? 0;
  const totalRooms = roomsData?.meta?.pagination?.total ?? 0;
  const totalCategories = categoriesData?.meta?.pagination?.total ?? 0;

  const weeklyBookingsCount = useMemo(() => {
    const list = (bookingsForWeek?.data ?? []) as Array<{ createdAt?: string }>;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    return list.filter((b) => b.createdAt && new Date(b.createdAt) >= weekStart).length;
  }, [bookingsForWeek]);

  return (
    <div
      className={cn(
        manrope.variable,
        "relative min-h-full bg-[#f7f9fb] pb-12 font-sans text-[#191c1e]"
      )}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="pointer-events-none fixed right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-[#a04100]/5 opacity-50 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[300px] w-[300px] rounded-full bg-[#059eff]/5 opacity-30 blur-3xl lg:left-64" />

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <section className="mb-10 flex flex-col justify-end gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <nav className="mb-2 flex gap-2 text-[11px] font-bold uppercase tracking-widest text-[#5a4136]">
              <span>Main</span>
              <span className="text-[#e2bfb0]">/</span>
              <span className="text-[#a04100]">Accommodation</span>
            </nav>
            <h1
              className={cn(
                manrope.className,
                "text-3xl font-extrabold tracking-tight text-[#191c1e] sm:text-4xl"
              )}
            >
              Accommodation Overview
            </h1>
          </div>
          <Link
            href="/bookings"
            className={cn(
              manrope.className,
              "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a04100] to-[#ff6b00] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#a04100]/10 transition-all hover:shadow-[#a04100]/20 active:scale-95"
            )}
          >
            <MsIcon name="add_circle" className="text-xl" />
            New Booking
          </Link>
        </section>

        {/* Stats */}
        <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="group flex h-40 flex-col justify-between rounded-[1.5rem] bg-white p-6 shadow-sm transition-all hover:bg-[#f7f9fb] hover:shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <div className="flex items-start justify-between">
              <span className="rounded-lg bg-orange-50 p-2 text-[#a04100]">
                <MsIcon name="meeting_room" />
              </span>
              <span className="rounded-full bg-[#059eff]/20 px-2 py-1 text-[10px] font-bold uppercase text-[#003357]">
                Live Status
              </span>
            </div>
            <div>
              <p
                className={cn(
                  manrope.className,
                  "text-4xl font-extrabold text-[#191c1e] transition-colors group-hover:text-[#a04100]"
                )}
              >
                {totalRooms}
              </p>
              <p className="text-sm font-medium text-[#5a4136]">Total Rooms</p>
            </div>
          </div>

          <div className="group flex h-40 flex-col justify-between rounded-[1.5rem] bg-white p-6 shadow-sm transition-all hover:bg-[#f7f9fb] hover:shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <div className="flex items-start justify-between">
              <span className="rounded-lg bg-orange-50 p-2 text-[#a04100]">
                <MsIcon name="category" />
              </span>
            </div>
            <div>
              <p
                className={cn(
                  manrope.className,
                  "text-4xl font-extrabold text-[#191c1e] transition-colors group-hover:text-[#a04100]"
                )}
              >
                {totalCategories}
              </p>
              <p className="text-sm font-medium text-[#5a4136]">Room Categories</p>
            </div>
          </div>

          <div className="group flex h-40 flex-col justify-between rounded-[1.5rem] bg-white p-6 shadow-sm transition-all hover:bg-[#f7f9fb] hover:shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
            <div className="flex items-start justify-between">
              <span className="rounded-lg bg-orange-50 p-2 text-[#a04100]">
                <MsIcon name="calendar_today" />
              </span>
              <span className="rounded-full bg-[#ffdbcc]/80 px-2 py-1 text-[10px] font-bold uppercase text-[#7a3000]">
                Weekly
              </span>
            </div>
            <div>
              <p
                className={cn(
                  manrope.className,
                  "text-4xl font-extrabold text-[#191c1e] transition-colors group-hover:text-[#a04100]"
                )}
              >
                {weeklyBookingsCount}
              </p>
              <p className="text-sm font-medium text-[#5a4136]">Bookings (last 7 days)</p>
            </div>
          </div>
        </section>

        {/* Operations */}
        <section className="mb-16">
          <h2
            className={cn(
              manrope.className,
              "mb-6 flex items-center gap-2 text-lg font-bold text-[#191c1e]"
            )}
          >
            <span className="h-6 w-1 rounded-full bg-[#a04100]" />
            Operations Management
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {operationCards.map((card) => (
              <div
                key={card.href}
                className="group flex flex-col gap-4 rounded-2xl border border-transparent bg-[#f2f4f6] p-5 transition-all hover:border-[#e2bfb0]/40 hover:bg-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#a04100] shadow-sm transition-transform group-hover:scale-110">
                  <MsIcon name={card.icon} />
                </div>
                <div>
                  <p className={cn(manrope.className, "text-sm font-bold text-[#191c1e]")}>
                    {card.title}
                  </p>
                  <p className="mt-1 text-[11px] text-[#5a4136]">{card.description}</p>
                </div>
                <Link
                  href={card.href}
                  className={cn(
                    manrope.className,
                    "w-full rounded-lg bg-[#e6e8ea] py-2 text-center text-xs font-bold text-[#5a4136] transition-colors group-hover:bg-[#a04100] group-hover:text-white"
                  )}
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Staff + Finance */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-[#f2f4f6] p-6 sm:p-8">
            <h3
              className={cn(
                manrope.className,
                "mb-6 flex items-center justify-between text-xl font-extrabold text-[#191c1e]"
              )}
            >
              Staff & Human Resources
              <MsIcon name="badge" className="text-[#e2bfb0]" />
            </h3>
            <div className="space-y-4">
              {staffLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex cursor-pointer items-center justify-between rounded-xl bg-white p-4 transition-all hover:shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <MsIcon name={item.icon} className="text-[#5a4136]" />
                    <span className={cn(manrope.className, "text-sm font-bold text-[#191c1e]")}>
                      {item.title}
                    </span>
                  </div>
                  <MsIcon
                    name="arrow_forward_ios"
                    className="text-sm text-[#e2bfb0] transition-colors group-hover:text-[#a04100]"
                  />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#f2f4f6] p-6 sm:p-8">
            <h3
              className={cn(
                manrope.className,
                "mb-6 flex items-center justify-between text-xl font-extrabold text-[#191c1e]"
              )}
            >
              Financial Management
              <MsIcon name="account_balance" className="text-[#e2bfb0]" />
            </h3>
            <div className="space-y-4">
              {financeLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex cursor-pointer items-center justify-between rounded-xl bg-white p-4 transition-all hover:shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <MsIcon name={item.icon} className="text-[#5a4136]" />
                    <span className={cn(manrope.className, "text-sm font-bold text-[#191c1e]")}>
                      {item.title}
                    </span>
                  </div>
                  <MsIcon
                    name="arrow_forward_ios"
                    className="text-sm text-[#e2bfb0] transition-colors group-hover:text-[#a04100]"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Reference total + weekly note */}
        <p className="mt-8 text-center text-xs text-[#5a4136]/80">
          All-time bookings in system:{" "}
          <span className="font-semibold text-[#191c1e]">{totalBookings}</span>
        </p>
      </div>
    </div>
  );
}
