"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BedDouble,
  Building2,
  LayoutDashboard,
  LogIn,
  Menu,
  UserPlus,
  X,
  CalendarCheck,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/cn";
import { getTenantDisplayLabel } from "@/lib/tenant-display";

const FONT_INTER = { fontFamily: "Inter, system-ui, sans-serif" };

export interface TenantTheme {
  primaryColor?: string;
  accentColor?: string;
}

export interface PublicNavbarProps {
  /** Optional class for the header element. */
  className?: string;
  /** Tenant branding when on tenant's page (or custom domain). */
  tenantName?: string;
  tenantLogo?: string;
  theme?: TenantTheme;
  /** When true, show "Admin login" to platform dashboard. */
  isCustomDomain?: boolean;
  /** When true, we're on a tenant's website (hotel page); hide "List your property", show Rooms/Event Hall/Contact and "Book Now". */
  isTenantSite?: boolean;
  /** Hotel/branch slug for tenant site links (e.g. rooms, event-halls, contact, book page). When set, "Book Now" links to /hotels/[tenantSlug]/book. */
  tenantSlug?: string;
  /** When user clicks "Book Now" and is authenticated. Used when tenantSlug is not set (legacy). */
  onBookNowClick?: () => void;
  /** URL to return to after login (e.g. /hotels/slug). Used for "Book Now" redirect when not authenticated and tenantSlug is not set. */
  bookNowReturnTo?: string;
  /** Platform base URL for Admin login (e.g. https://yourplatform.com). */
  platformLoginUrl?: string;
  /** Navbar layout: default | transparent | minimal | bold | floating | compact | centered | dark | accent-strip-only */
  navbarStyle?: "default" | "transparent" | "minimal" | "bold" | "floating" | "compact" | "centered" | "dark" | "accent-strip-only";
  /** Logo position in navbar */
  logoPosition?: "left" | "center";
  /** Layout: default = single row; split = logo left, links center, CTA right */
  layout?: "default" | "split";
  /** Modern link/CTA style (no pills): solid | outline | text | underline | ghost | caps | minimal */
  linkStyle?: "solid" | "outline" | "text" | "underline" | "ghost" | "caps" | "minimal";
}

const defaultTheme = { primaryColor: "#5a189a", accentColor: "#ff6d00" };

type LinkStyle = NonNullable<PublicNavbarProps["linkStyle"]>;

/** Map legacy pill linkStyle to modern (no pills). */
function normalizeNavbarLinkStyle(
  linkStyle: string | undefined
): LinkStyle {
  if (!linkStyle) return "solid";
  switch (linkStyle) {
    case "pill-filled":
    case "soft-pill":
      return "solid";
    case "pill-outline":
      return "outline";
    case "text":
    case "underline":
    case "ghost":
    case "caps":
    case "minimal":
    case "solid":
    case "outline":
      return linkStyle as LinkStyle;
    default:
      return "solid";
  }
}

function getPrimaryLinkProps(
  linkStyle: LinkStyle,
  t: TenantTheme,
  isDarkBar: boolean
): { className: string; style?: React.CSSProperties } {
  const base = "inline-flex items-center gap-2 text-sm font-semibold transition ";
  if (linkStyle === "solid") {
    return {
      className: base + "rounded-md px-4 py-2.5 text-white hover:opacity-95",
      style: {
        background: `linear-gradient(135deg, ${t.accentColor ?? "#ff6d00"} 0%, ${t.primaryColor ?? "#5a189a"} 100%)`,
        border: "none",
      },
    };
  }
  if (linkStyle === "outline") {
    return {
      className:
        base +
        (isDarkBar
          ? "rounded-md border border-white/80 px-4 py-2.5 text-white hover:bg-white/15"
          : "rounded-md border px-4 py-2.5 hover:opacity-90"),
      style: isDarkBar ? undefined : { borderColor: t.primaryColor ?? "#5a189a", color: t.primaryColor ?? "#5a189a" },
    };
  }
  if (linkStyle === "text") {
    return {
      className: base + (isDarkBar ? "px-3 py-2 text-white hover:opacity-90" : "px-3 py-2 hover:opacity-80"),
      style: isDarkBar ? undefined : { color: t.primaryColor ?? "#5a189a" },
    };
  }
  if (linkStyle === "underline") {
    return {
      className:
        base +
        (isDarkBar
          ? "px-3 py-2 text-white hover:opacity-90 border-b-2 border-transparent hover:border-white"
          : "px-3 py-2 border-b-2 border-transparent hover:border-current"),
      style: isDarkBar ? undefined : { color: t.primaryColor ?? "#5a189a" },
    };
  }
  if (linkStyle === "ghost") {
    return {
      className:
        base +
        (isDarkBar
          ? "rounded-md px-4 py-2.5 text-white hover:bg-white/15"
          : "rounded-md px-4 py-2.5 hover:bg-slate-100"),
      style: isDarkBar ? undefined : { color: t.primaryColor ?? "#5a189a" },
    };
  }
  if (linkStyle === "caps") {
    return {
      className:
        base +
        "text-xs uppercase tracking-wider " +
        (isDarkBar ? "px-2 py-1.5 text-white hover:opacity-90" : "px-2 py-1.5 hover:opacity-80"),
      style: isDarkBar ? undefined : { color: t.primaryColor ?? "#5a189a" },
    };
  }
  // minimal
  return {
    className: base + "text-sm " + (isDarkBar ? "px-2 py-1.5 text-white/90 hover:text-white" : "px-2 py-1.5 hover:opacity-80"),
    style: isDarkBar ? undefined : { color: t.primaryColor ?? "#5a189a" },
  };
}

function getSecondaryLinkProps(
  linkStyle: LinkStyle,
  t: TenantTheme,
  isDarkBar: boolean
): { className: string; style?: React.CSSProperties } {
  const base = "inline-flex items-center gap-2 text-sm font-semibold transition ";
  if (linkStyle === "solid" || linkStyle === "outline") {
    return {
      className:
        base +
        (isDarkBar
          ? "rounded-md border border-white/60 px-4 py-2.5 text-white hover:bg-white/15"
          : "rounded-md border border-slate-300 px-4 py-2.5 text-slate-700 hover:border-slate-400 hover:bg-slate-50"),
      style: undefined,
    };
  }
  if (linkStyle === "text" || linkStyle === "underline" || linkStyle === "minimal") {
    return {
      className:
        base +
        (isDarkBar
          ? "px-3 py-2 text-white/80 hover:text-white border-b-2 border-transparent hover:border-white/60"
          : "px-3 py-2 text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-300"),
      style: undefined,
    };
  }
  if (linkStyle === "ghost") {
    return {
      className:
        base +
        (isDarkBar
          ? "rounded-md px-4 py-2.5 text-white/90 hover:bg-white/10"
          : "rounded-md px-4 py-2.5 text-slate-600 hover:bg-slate-100"),
      style: undefined,
    };
  }
  // caps
  return {
    className:
      base +
      "text-xs uppercase tracking-wider " +
      (isDarkBar ? "px-2 py-1.5 text-white/70 hover:text-white" : "px-2 py-1.5 text-slate-500 hover:text-slate-700"),
    style: undefined,
  };
}

export function PublicNavbar({
  className,
  tenantName,
  tenantLogo,
  theme,
  isCustomDomain,
  isTenantSite,
  tenantSlug,
  onBookNowClick,
  bookNowReturnTo,
  platformLoginUrl,
  navbarStyle = "default",
  logoPosition = "left",
  layout = "split",
  linkStyle = "solid",
}: PublicNavbarProps) {
  const normalizedLinkStyle = normalizeNavbarLinkStyle(linkStyle);
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [menuEntering, setMenuEntering] = useState(false);
  const t = { ...defaultTheme, ...theme };
  const tenantDisplayLabel = getTenantDisplayLabel(tenantName);

  const closeMobileMenu = useCallback(() => {
    if (!mobileOpen) return;
    setMenuClosing(true);
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen && !menuClosing) {
      setMenuEntering(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMenuEntering(false));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [mobileOpen, menuClosing]);

  useEffect(() => {
    if (!menuClosing) return;
    const id = setTimeout(() => {
      setMobileOpen(false);
      setMenuClosing(false);
    }, 220);
    return () => clearTimeout(id);
  }, [menuClosing]);
  const showListYourProperty = !isTenantSite && !isCustomDomain && user?.role !== "customer";
  const isTransparent = navbarStyle === "transparent";
  const isMinimal = navbarStyle === "minimal";
  const isBold = navbarStyle === "bold";
  const isFloating = navbarStyle === "floating";
  const isCompact = navbarStyle === "compact";
  const isCentered = navbarStyle === "centered" || logoPosition === "center";
  const isDark = navbarStyle === "dark";
  const isAccentOnly = navbarStyle === "accent-strip-only";
  const useThemeBg = !isTransparent && !isBold && !isFloating && !isDark && (navbarStyle === "default" || isMinimal || isCompact || isAccentOnly);
  const isDarkBar = isBold || isDark || isTransparent || useThemeBg;
  const logoCenter = layout === "default" && (logoPosition === "center" || isCentered);
  const useSplitLayout = layout === "split";
  const adminLoginHref = platformLoginUrl
    ? `${platformLoginUrl.replace(/\/$/, "")}/login?returnTo=${encodeURIComponent("/dashboard")}`
    : "/login?returnTo=" + encodeURIComponent("/dashboard");

  const primaryLink = getPrimaryLinkProps(normalizedLinkStyle, t, isDarkBar);
  const secondaryLink = getSecondaryLinkProps(normalizedLinkStyle, t, isDarkBar);
  const headerClasses = cn(
    "sticky top-0 z-50 w-full",
    isTransparent && "bg-slate-900/20 backdrop-blur-md",
    isMinimal && "backdrop-blur-sm",
    isBold && "shadow-sm",
    isFloating && "mx-2 mt-2 max-w-7xl rounded-xl bg-white shadow-md sm:mx-4 sm:mt-4 sm:rounded-2xl lg:mx-auto lg:px-0",
    isCompact && !useThemeBg && "bg-white",
    isDark && "bg-slate-900 shadow-sm",
    !isTransparent && !isMinimal && !isBold && !isFloating && !isCompact && !isDark && !isAccentOnly && !useThemeBg && "bg-white",
    className
  );

  const headerStyle = ((): React.CSSProperties => {
    if (isBold) return { ...FONT_INTER, background: `linear-gradient(135deg, ${t.primaryColor} 0%, ${t.accentColor} 100%)`, color: "white" };
    if (useThemeBg) {
      return { ...FONT_INTER, backgroundColor: t.primaryColor ?? "#5a189a", color: "white" };
    }
    return FONT_INTER;
  })();

  const innerClasses = cn(
    "mx-auto max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8",
    isCompact && "h-11 sm:h-14",
    !isCompact && "h-14 sm:h-16 md:h-[4.5rem]",
    useSplitLayout && "flex md:grid md:grid-cols-3",
    !useSplitLayout && "flex",
    logoCenter && !useSplitLayout && "sm:grid sm:grid-cols-3"
  );

  const logoTextClass = cn(
    "truncate text-lg font-bold tracking-tight sm:text-xl md:text-2xl",
    isDarkBar ? "text-white" : "text-slate-900"
  );

  const menuButtonClass = cn(
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-slate-600 transition active:scale-[0.98] hover:bg-slate-100 hover:text-slate-900 sm:h-11 sm:w-11 sm:rounded-xl md:hidden touch-manipulation",
    isDarkBar ? "border-white/30 bg-white/10 hover:bg-white/20 text-white" : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50"
  );

  return (
    <header className={headerClasses} style={headerStyle}>
      <div className={innerClasses}>
        {/* Left: logo (split: always left; default: left unless centered). On mobile: flex-1 so it truncates and doesn't crowd the menu button. */}
        <div className={cn("flex min-w-0 items-center gap-2 sm:gap-3 md:shrink-0", useSplitLayout && "flex-1 md:flex-initial", useSplitLayout && "md:col-start-1")}>
          {(!logoCenter || useSplitLayout) && (
            <Link
              href={isTenantSite && tenantSlug ? `/hotels/${tenantSlug}` : isCustomDomain ? "#" : "/"}
              className="group flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition sm:gap-3 md:flex-initial md:overflow-visible"
            >
              {tenantLogo ? (
                <img src={tenantLogo} alt={tenantName ?? "Logo"} className="h-11 w-auto max-w-[180px] shrink-0 object-contain sm:h-12 sm:max-w-[220px] md:h-12" />
              ) : (
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-md transition group-hover:shadow-lg sm:h-10 sm:w-10 sm:rounded-xl md:h-11 md:w-11"
                  style={{
                    background: `linear-gradient(135deg, ${t.accentColor} 0%, ${t.primaryColor} 100%)`,
                    boxShadow: `0 4px 14px ${t.accentColor}40`,
                  }}
                >
                  <BedDouble className="h-4 w-4 shrink-0 sm:h-5 sm:w-5 md:h-6 md:w-6" strokeWidth={2.5} />
                </span>
              )}
              <span className={cn(logoTextClass, "truncate")} title={tenantName ?? "Bookgh"}>
                {tenantDisplayLabel || "Bookgh"}
              </span>
            </Link>
          )}
        </div>

        {/* Center: tenant site = Rooms, Event Hall, Contact; otherwise My Bookings / Sign up */}
        {useSplitLayout ? (
          <nav className="hidden items-center justify-center gap-4 md:flex md:col-start-2">
            {isTenantSite && tenantSlug ? (
              <>
                <Link href={`/hotels/${tenantSlug}#rooms`}>
                  <span className={secondaryLink.className} style={secondaryLink.style}>
                    Rooms
                  </span>
                </Link>
                <Link href={`/hotels/${tenantSlug}#event-halls`}>
                  <span className={secondaryLink.className} style={secondaryLink.style}>
                    Event Hall
                  </span>
                </Link>
                <Link href={`/hotels/${tenantSlug}#contact`}>
                  <span className={secondaryLink.className} style={secondaryLink.style}>
                    Contact
                  </span>
                </Link>
              </>
            ) : (
              <>
                {isAuthenticated && user?.role === "customer" && (
                  <Link href={platformLoginUrl ? `${platformLoginUrl.replace(/\/$/, "")}/my-bookings` : "/my-bookings"}>
                    <span className={secondaryLink.className} style={secondaryLink.style}>
                      <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                      My Bookings
                    </span>
                  </Link>
                )}
                {!isAuthenticated && !isCustomDomain && !isTenantSite && (
                  <Link href="/register">
                    <span className={secondaryLink.className} style={secondaryLink.style}>
                      <UserPlus className="h-4 w-4" strokeWidth={2} />
                      Sign up
                    </span>
                  </Link>
                )}
              </>
            )}
          </nav>
        ) : logoCenter ? (
          <div className="flex min-w-0 flex-1 justify-center sm:flex-initial">
            <Link
              href={isCustomDomain ? "#" : "/"}
              className="group flex shrink-0 items-center gap-2 transition sm:gap-3"
            >
              {tenantLogo ? (
                <img src={tenantLogo} alt={tenantName ?? "Logo"} className="h-11 w-auto max-w-[180px] object-contain sm:h-12 sm:max-w-[220px] md:h-12" />
              ) : (
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-md transition group-hover:shadow-lg sm:h-10 sm:w-10 sm:rounded-xl md:h-11 md:w-11"
                  style={{
                    background: `linear-gradient(135deg, ${t.accentColor} 0%, ${t.primaryColor} 100%)`,
                    boxShadow: `0 4px 14px ${t.accentColor}40`,
                  }}
                >
                  <BedDouble className="h-4 w-4 shrink-0 sm:h-5 sm:w-5 md:h-6 md:w-6" strokeWidth={2.5} />
                </span>
              )}
              <span className={cn(logoTextClass, "hidden sm:inline")} title={tenantName ?? "Bookgh"}>
                {tenantDisplayLabel || "Bookgh"}
              </span>
            </Link>
          </div>
        ) : null}

        {/* Right: primary CTA (split) or all nav (default) + mobile menu. shrink-0 so hamburger never squashes. */}
        <div className={cn("flex shrink-0 items-center justify-end gap-2 sm:gap-3 min-w-11 md:min-w-0", (logoCenter || useSplitLayout) && "md:justify-self-end", useSplitLayout && "md:col-start-3")}>
          {useSplitLayout ? (
            <nav className="hidden items-center gap-3 md:flex">
              {isCustomDomain && !isAuthenticated && (
                <a href={adminLoginHref} className={primaryLink.className} style={primaryLink.style}>
                  <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                  Admin login
                </a>
              )}
              {showListYourProperty && (
                <Link href="/register-hotel">
                  <span className={primaryLink.className} style={primaryLink.style}>
                    <Building2 className="h-4 w-4" strokeWidth={2.5} />
                    List your property
                  </span>
                </Link>
              )}
              {isTenantSite ? (
                tenantSlug ? (
                  <Link href={`/hotels/${tenantSlug}/book`}>
                    <span className={primaryLink.className} style={primaryLink.style}>
                      <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                      Book Now
                    </span>
                  </Link>
                ) : isAuthenticated && onBookNowClick ? (
                  <button type="button" onClick={onBookNowClick} className={primaryLink.className} style={primaryLink.style}>
                    <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                    Book Now
                  </button>
                ) : (
                  <Link href={bookNowReturnTo ? `/login?redirect=${encodeURIComponent(bookNowReturnTo)}` : "/login"}>
                    <span className={primaryLink.className} style={primaryLink.style}>
                      <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                      Book Now
                    </span>
                  </Link>
                )
              ) : isAuthenticated ? (
                <Link href={platformLoginUrl ? `${platformLoginUrl.replace(/\/$/, "")}/dashboard` : "/dashboard"}>
                  <span className={primaryLink.className} style={primaryLink.style}>
                    <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                    Dashboard
                  </span>
                </Link>
              ) : isCustomDomain ? null : (
                <Link href="/login">
                  <span className={primaryLink.className} style={primaryLink.style}>
                    <LogIn className="h-4 w-4" strokeWidth={2} />
                    Login
                  </span>
                </Link>
              )}
            </nav>
          ) : (
            <nav className="hidden items-center gap-3 md:flex">
              {isCustomDomain && !isAuthenticated && (
                <a href={adminLoginHref} className={primaryLink.className} style={primaryLink.style}>
                  <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                  Admin login
                </a>
              )}
              {showListYourProperty && (
                <Link href="/register-hotel">
                  <span className={primaryLink.className} style={primaryLink.style}>
                    <Building2 className="h-4 w-4" strokeWidth={2.5} />
                    List your property
                  </span>
                </Link>
              )}
              {isTenantSite ? (
                tenantSlug ? (
                  <Link href={`/hotels/${tenantSlug}/book`}>
                    <span className={primaryLink.className} style={primaryLink.style}>
                      <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                      Book Now
                    </span>
                  </Link>
                ) : isAuthenticated && onBookNowClick ? (
                  <button type="button" onClick={onBookNowClick} className={primaryLink.className} style={primaryLink.style}>
                    <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                    Book Now
                  </button>
                ) : (
                  <Link href={bookNowReturnTo ? `/login?redirect=${encodeURIComponent(bookNowReturnTo)}` : "/login"}>
                    <span className={primaryLink.className} style={primaryLink.style}>
                      <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                      Book Now
                    </span>
                  </Link>
                )
              ) : isAuthenticated ? (
                <>
                  {user?.role === "customer" && (
                    <Link href={platformLoginUrl ? `${platformLoginUrl.replace(/\/$/, "")}/my-bookings` : "/my-bookings"}>
                      <span className={secondaryLink.className} style={secondaryLink.style}>
                        <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                        My Bookings
                      </span>
                    </Link>
                  )}
                  <Link href={platformLoginUrl ? `${platformLoginUrl.replace(/\/$/, "")}/dashboard` : "/dashboard"}>
                    <span className={primaryLink.className} style={primaryLink.style}>
                      <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                      Dashboard
                    </span>
                  </Link>
                </>
              ) : !isCustomDomain ? (
                <>
                  <Link href="/register">
                    <span className={secondaryLink.className} style={secondaryLink.style}>
                      <UserPlus className="h-4 w-4" strokeWidth={2} />
                      Sign up
                    </span>
                  </Link>
                  <Link href="/login">
                    <span className={primaryLink.className} style={primaryLink.style}>
                      <LogIn className="h-4 w-4" strokeWidth={2} />
                      Login
                    </span>
                  </Link>
                </>
              ) : null}
            </nav>
          )}
          <button
            type="button"
            onClick={() => (mobileOpen ? closeMobileMenu() : (setMobileOpen(true), setMenuEntering(true)))}
            className={menuButtonClass}
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={2.5} /> : <Menu className="h-5 w-5" strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay and panel: smooth enter/exit transitions */}
      {(mobileOpen || menuClosing) && (
        <>
          <div
            className={cn(
              "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ease-out md:hidden",
              (menuEntering || menuClosing) ? "opacity-0" : "opacity-100"
            )}
            aria-hidden
            onClick={closeMobileMenu}
          />
          <div
            className={cn(
              "absolute left-0 right-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain shadow-lg transition-[transform,opacity] duration-200 ease-out md:hidden",
              (menuEntering || menuClosing) ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100"
            )}
            style={
              isDarkBar
                ? {
                    backgroundColor: `${t.primaryColor ?? "#5a189a"}12`,
                    borderTop: `3px solid ${t.primaryColor ?? "#5a189a"}`,
                    boxShadow: `0 12px 48px ${t.primaryColor ?? "#5a189a"}30`,
                  }
                : {
                    backgroundColor: "white",
                    boxShadow: "0 12px 48px rgba(36, 0, 70, 0.14)",
                  }
            }
          >
            <nav className="flex flex-col gap-0.5 px-4 py-4 sm:px-6 sm:py-5">
              {isTenantSite && tenantSlug && (
                <>
                  <Link href={`/hotels/${tenantSlug}#rooms`} onClick={closeMobileMenu} className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", secondaryLink.className)} style={secondaryLink.style}>
                    Rooms
                  </Link>
                  <Link href={`/hotels/${tenantSlug}#event-halls`} onClick={closeMobileMenu} className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", secondaryLink.className)} style={secondaryLink.style}>
                    Event Hall
                  </Link>
                  <Link href={`/hotels/${tenantSlug}#contact`} onClick={closeMobileMenu} className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", secondaryLink.className)} style={secondaryLink.style}>
                    Contact
                  </Link>
                </>
              )}
              {isCustomDomain && !isAuthenticated && (
                <a
                  href={adminLoginHref}
                  onClick={closeMobileMenu}
                  className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", primaryLink.className)}
                  style={primaryLink.style}
                >
                  <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                  Admin login
                </a>
              )}
              {showListYourProperty && (
                <Link href="/register-hotel" onClick={closeMobileMenu}>
                  <span className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", primaryLink.className)} style={primaryLink.style}>
                    <Building2 className="h-4 w-4" strokeWidth={2} />
                    List your property
                  </span>
                </Link>
              )}
              {isTenantSite ? (
                tenantSlug ? (
                  <Link
                    href={`/hotels/${tenantSlug}/book`}
                    onClick={closeMobileMenu}
                    className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", primaryLink.className)}
                    style={primaryLink.style}
                  >
                    <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                    Book Now
                  </Link>
                ) : isAuthenticated && onBookNowClick ? (
                  <button
                    type="button"
                    onClick={() => { closeMobileMenu(); onBookNowClick(); }}
                    className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", primaryLink.className)}
                    style={primaryLink.style}
                  >
                    <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                    Book Now
                  </button>
                ) : (
                  <Link
                    href={bookNowReturnTo ? `/login?redirect=${encodeURIComponent(bookNowReturnTo)}` : "/login"}
                    onClick={closeMobileMenu}
                    className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", primaryLink.className)}
                    style={primaryLink.style}
                  >
                    <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                    Book Now
                  </Link>
                )
              ) : isAuthenticated ? (
                <>
                  {user?.role === "customer" && (
                    <Link
                      href={platformLoginUrl ? `${platformLoginUrl.replace(/\/$/, "")}/my-bookings` : "/my-bookings"}
                      onClick={closeMobileMenu}
                      className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", secondaryLink.className)}
                      style={secondaryLink.style}
                    >
                      <CalendarCheck className="h-4 w-4" strokeWidth={2} />
                      My Bookings
                    </Link>
                  )}
                  <Link
                    href={platformLoginUrl ? `${platformLoginUrl.replace(/\/$/, "")}/dashboard` : "/dashboard"}
                    onClick={closeMobileMenu}
                    className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", primaryLink.className)}
                    style={primaryLink.style}
                  >
                    <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
                    Dashboard
                  </Link>
                </>
              ) : !isCustomDomain ? (
                <>
                  <Link
                    href="/register"
                    onClick={closeMobileMenu}
                    className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", secondaryLink.className)}
                    style={secondaryLink.style}
                  >
                    <UserPlus className="h-4 w-4" strokeWidth={2} />
                    Sign up
                  </Link>
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className={cn("flex items-center gap-3 rounded-lg py-3.5 px-3 touch-manipulation", primaryLink.className)}
                    style={primaryLink.style}
                  >
                    <LogIn className="h-4 w-4" strokeWidth={2} />
                    Login
                  </Link>
                </>
              ) : null}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
