"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  Lightbulb,
  Tag,
  BookOpen,
  Building2,
  LogIn,
  Rocket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const PRIMARY = "#ec5b13";

const navLinks: { href: string; label: string; primary: boolean; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Platform", primary: true, icon: LayoutDashboard },
  { href: "/#solutions", label: "Solutions", primary: false, icon: Lightbulb },
  { href: "/#pricing", label: "Pricing", primary: false, icon: Tag },
  { href: "/#resources", label: "Resources", primary: false, icon: BookOpen },
  { href: "/browse-hotels", label: "Browse Hotels", primary: false, icon: Building2 },
];

export function PlatformNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 min-h-14 items-center justify-between sm:h-20">
          <Link href="/" className="flex items-center gap-2" onClick={closeMobile}>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg p-1.5 text-white sm:h-10 sm:w-10 sm:p-2"
              style={{ backgroundColor: PRIMARY }}
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">domain</span>
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Bookgh
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {navLinks.map(({ href, label, primary, icon: Icon }) =>
              href.startsWith("/#") ? (
                <a
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80",
                    primary ? "" : "text-slate-700"
                  )}
                  style={primary ? { color: PRIMARY } : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {label}
                </a>
              ) : (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80",
                    primary ? "" : "text-slate-700"
                  )}
                  style={primary ? { color: PRIMARY } : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {label}
                </Link>
              )
            )}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex md:items-center md:gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 text-sm font-bold text-slate-700 transition-colors hover:opacity-80"
            >
              <LogIn className="h-4 w-4 shrink-0" strokeWidth={2} />
              Sign In
            </Link>
            <Link
              href="/register-hotel"
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:opacity-95"
              style={{
                background: `linear-gradient(135deg, ${PRIMARY} 0%, #ff8c42 100%)`,
                boxShadow: "0 10px 30px rgba(236, 91, 19, 0.25)",
              }}
            >
              <Rocket className="h-4 w-4 shrink-0" strokeWidth={2} />
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel — smooth height + content slide */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden",
          mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "border-t border-slate-200 bg-white px-4 py-4 pb-6 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            )}
          >
            <ul className="flex flex-col gap-0.5">
              {navLinks.map(({ href, label, primary, icon: Icon }, i) => (
                <li
                  key={href}
                  className={cn(
                    "transition-all duration-300 ease-out",
                    mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                  )}
                  style={{ transitionDelay: mobileOpen ? `${50 + i * 30}ms` : "0ms" }}
                >
                  {href.startsWith("/#") ? (
                    <a
                      href={href}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                        primary ? "" : "text-slate-700 hover:bg-slate-50"
                      )}
                      style={primary ? { color: PRIMARY } : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                      {label}
                    </a>
                  ) : (
                    <Link
                      href={href}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                        primary ? "" : "text-slate-700 hover:bg-slate-50"
                      )}
                      style={primary ? { color: PRIMARY } : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <div
              className={cn(
                "mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 transition-all duration-300",
                mobileOpen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
              )}
              style={{ transitionDelay: mobileOpen ? "200ms" : "0ms" }}
            >
              <Link
                href="/login"
                onClick={closeMobile}
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <LogIn className="h-5 w-5 shrink-0" strokeWidth={2} />
                Sign In
              </Link>
              <Link
                href="/register-hotel"
                onClick={closeMobile}
                className="flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:opacity-95"
                style={{
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, #ff8c42 100%)`,
                  boxShadow: "0 10px 30px rgba(236, 91, 19, 0.25)",
                }}
              >
                <Rocket className="h-5 w-5 shrink-0" strokeWidth={2} />
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
