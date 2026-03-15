"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { setSidebarOpen } from "@/store/ui-slice";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAppDispatch } from "@/store/hooks";
import { cn } from "@/lib/cn";

export interface DashboardShellProps {
  title?: string;
  children: React.ReactNode;
}

export function DashboardShell({ title, children }: DashboardShellProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { sidebarOpen, sidebarCollapsed } = useAppSelector((s) => s.ui);

  // Close mobile sidebar when route changes
  useEffect(() => {
    dispatch(setSidebarOpen(false));
  }, [pathname, dispatch]);

  return (
    <div className="flex min-h-screen bg-[#F5F6FA]">
      {/* Sidebar - fixed, glassmorphism, accent strip. Does not scroll with the page. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col font-sans transition-all duration-300 ease-in-out",
          "bg-white/90 backdrop-blur-xl border-r border-white/20",
          sidebarCollapsed ? "w-[72px]" : "w-64",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          boxShadow: "1px 0 0 rgba(0,0,0,0.06), 4px 0 24px -4px rgba(36, 0, 70, 0.06)",
        }}
      >
        {/* Accent strip: vertical gradient (purple → orange) */}
        <div
          className="absolute inset-y-0 left-0 w-1 shrink-0 rounded-r-full opacity-90"
          style={{
            background: "linear-gradient(180deg, #240046 0%, #5a189a 35%, #ff6d00 100%)",
          }}
          aria-hidden
        />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      {/* Main content area - offset by sidebar width on desktop so it doesn't sit under fixed sidebar */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[margin] duration-300",
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
        )}
      >
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
