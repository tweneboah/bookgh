"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/housekeeping", label: "Overview" },
  { href: "/housekeeping/tasks", label: "Tasks" },
  { href: "/housekeeping/board", label: "Room board" },
  { href: "/housekeeping/reports", label: "Reports" },
];

export default function HousekeepingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const path = pathname.replace(/\?.*/, "");

  return (
    <div className="min-h-full font-sans" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <nav
        className="mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-white px-2 py-2 shadow-sm"
        aria-label="Housekeeping sections"
      >
        {TABS.map((t) => {
          const active =
            t.href === "/housekeeping"
              ? path === "/housekeeping"
              : path === t.href || path.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[#5a189a]/10 font-semibold text-[#5a189a] ring-1 ring-[#5a189a]/20"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
