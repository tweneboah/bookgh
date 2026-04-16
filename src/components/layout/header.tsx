"use client";

import { Menu, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/auth-slice";
import { toggleSidebar } from "@/store/ui-slice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/bookings": "Bookings",
  "/rooms": "Rooms",
  "/guests": "Guests",
  "/room-categories": "Room Categories",
  "/event-halls": "Event Halls",
  "/event-bookings": "Event Bookings",
  "/event-bookings/calendar": "Event Calendar",
  "/event-bookings/pipeline": "Proposals pipeline",
  "/event-bookings/": "Event BEO",
  "/event-resources": "Resources",
  "/invoices": "Invoices",
  "/payments": "Payments",
  "/expenses": "Expenses",
  "/housekeeping": "Housekeeping",
  "/maintenance": "Maintenance",
  "/reports/maintenance": "Maintenance Reports",
  "/reports/conference": "Conference Reports",
  "/assets": "Assets",
  "/lost-and-found": "Lost & Found",
  "/pricing-rules": "Pricing rules",
  "/restaurant/pricing-rules": "Restaurant pricing rules",
  "/pos/menu-items": "Menu Items",
  "/pos/tables": "Tables",
  "/pos/orders": "Orders",
  "/pos/inventory": "Inventory",
  "/restaurant/stock-control": "Restaurant Stock Control",
  "/bar/stock-control": "BAR Stock Control",
  "/bar/recipes": "BAR Recipe Engine",
  "/conference": "Conference Overview",
  "/restaurant/recipes": "Recipe Engine",
  "/restaurant/production": "Production Batches",
  "/restaurant/kds": "KDS Workflow",
  "/restaurant/inventory-scan": "Barcode Inventory Scan",
  "/reports/restaurant": "Restaurant Reports",
  "/reports/restaurant-consolidated": "Restaurant Consolidated Reports",
  "/users": "Users",
  "/staff/shifts": "Shifts",
  "/staff/attendance": "Attendance",
  "/settings": "Settings",
  "/settings/website-builder": "Website builder",
  "/notifications": "Notifications",
  "/activity-logs": "Activity Logs",
  "/platform/tenants": "Tenants",
  "/platform/subscription-plans": "Subscription Plans",
  "/pool/areas": "Pool Areas",
  "/pool/bookings": "Pool Bookings",
  "/pool/maintenance": "Pool Maintenance",
  "/reports/pool": "Pool Reports",
  "/pool": "Pool Overview",
};

function getPageTitle(pathname: string): string {
  if (pathname.includes("website-builder")) return "Website builder";
  if (pathname.includes("/event-bookings/") && pathname.includes("/expenses")) return "Event Expenses";
  if (pathname.includes("/event-bookings/") && pathname.includes("/beo")) return "Event BEO";
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || (path !== "/dashboard" && pathname.startsWith(path))) {
      return title;
    }
  }
  const segment = pathname.split("/").filter(Boolean).pop();
  return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : "Bookgh";
}

export interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const unreadNotifications = 0;
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const pageTitle = title ?? getPageTitle(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    setUserMenuOpen(false);
    // Client-side navigation — instant, no server round-trip
    router.replace("/login");
  }, [dispatch, router]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  // Stable placeholder until mounted so server/client match (avoids hydration error)
  const initials = !mounted
    ? "…"
    : user
      ? `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase() || "?"
      : "?";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 transition-colors">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <Badge
              variant="danger"
              className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]"
            >
              {unreadNotifications}
            </Badge>
          )}
        </Link>

        {/* User dropdown */}
        <div ref={userMenuRef} className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-700">
              {initials}
            </div>
            <span className="hidden text-slate-700 sm:inline">
              {!mounted ? "…" : (user?.firstName ?? "User")}
            </span>
          </Button>
          {userMenuOpen && (
            <ul
              role="menu"
              className={cn(
                "absolute right-0 z-50 mt-2 min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
              )}
            >
              <li role="none">
                <Link
                  href="/settings"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Profile
                </Link>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}
