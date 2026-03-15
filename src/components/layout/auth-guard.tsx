"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { DashboardShell } from "./dashboard-shell";
import { Forbidden } from "./forbidden";

const CUSTOMER_ALLOWED_ROUTES = [
  "/dashboard",
  "/my-bookings",
  "/settings",
];

function isCustomerRoute(pathname: string): boolean {
  return CUSTOMER_ALLOWED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#5a189a]" />
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, isLoading, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  // Always render same shell so server and client markup match (avoids hydration error).
  const showContent = mounted && !isLoading && isAuthenticated;

  if (!showContent) {
    return (
      <DashboardShell>
        <LoadingScreen />
      </DashboardShell>
    );
  }

  if (user?.role === "customer" && !isCustomerRoute(pathname)) {
    return (
      <DashboardShell>
        <Forbidden />
      </DashboardShell>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
