"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/auth-slice";
import { getTenantDisplayLabel } from "@/lib/tenant-display";

const LuxeLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fillRule="evenodd" />
    <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fillRule="evenodd" />
  </svg>
);

export type HotelPublicNavProps = {
  slug: string;
  hotelName: string;
  primaryColor: string;
  /** Logo image URL for tenant branding in navbar. If omitted, shows generic icon. */
  logo?: string;
  /** If provided, "Book Now" is a button that calls this; otherwise it links to the hotel home. */
  onBookNow?: () => void;
};

const AMENITIES_LINKS: { href: (s: string) => string; label: string; icon: string; match: (path: string, slug: string) => boolean }[] = [
  { href: (s) => `/hotels/${s}/restaurant`, label: "Dining", icon: "restaurant", match: (path, slug) => path.startsWith(`/hotels/${slug}/restaurant`) },
  { href: (s) => `/hotels/${s}/gym`, label: "Fitness", icon: "fitness_center", match: (path, slug) => path.startsWith(`/hotels/${slug}/gym`) },
  { href: (s) => `/hotels/${s}/playground`, label: "Playground", icon: "child_care", match: (path, slug) => path.startsWith(`/hotels/${slug}/playground`) },
  { href: (s) => `/hotels/${s}/events`, label: "Events", icon: "event", match: (path, slug) => path.startsWith(`/hotels/${slug}/events`) },
];

const isAmenitiesActive = (path: string, slug: string) =>
  AMENITIES_LINKS.some((l) => l.match(path, slug));

const MORE_LINKS: { href: (s: string) => string; label: string; icon: string; match: (path: string, slug: string) => boolean }[] = [
  { href: (s) => `/hotels/${s}/story`, label: "Our Story", icon: "auto_stories", match: (path, slug) => path.startsWith(`/hotels/${slug}/story`) },
  { href: (s) => `/hotels/${s}/offers`, label: "Offers", icon: "local_offer", match: (path, slug) => path.startsWith(`/hotels/${slug}/offers`) },
  { href: (s) => `/hotels/${s}/contact`, label: "Contact", icon: "contact_mail", match: (path, slug) => path.startsWith(`/hotels/${slug}/contact`) },
];

const isMoreActive = (path: string, slug: string) =>
  MORE_LINKS.some((l) => l.match(path, slug));

const NAV_LINKS: { href: (s: string) => string; label: string; icon: string; match: (path: string, slug: string) => boolean }[] = [
  { href: (s) => `/hotels/${s}`, label: "Home", icon: "home", match: (path, slug) => path === `/hotels/${slug}` || path === `/hotels/${slug}/` },
  { href: (s) => `/hotels/${s}/rooms`, label: "Rooms", icon: "bed", match: (path, slug) => path.startsWith(`/hotels/${slug}/rooms`) },
];

export function HotelPublicNav({ slug, hotelName, primaryColor, logo, onBookNow }: HotelPublicNavProps) {
  const displayLabel = getTenantDisplayLabel(hotelName);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const amenitiesMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(target)) {
        setAvatarMenuOpen(false);
      }
      if (amenitiesMenuRef.current && !amenitiesMenuRef.current.contains(target)) {
        setAmenitiesOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = NAV_LINKS.map(({ href, label, icon, match }) => {
    const isActive = match(pathname ?? "", slug);
    return { href: href(slug), label, icon, isActive };
  });

  const amenitiesLinks = AMENITIES_LINKS.map(({ href, label, icon, match }) => {
    const isActive = match(pathname ?? "", slug);
    return { href: href(slug), label, icon, isActive };
  });

  const moreLinks = MORE_LINKS.map(({ href, label, icon, match }) => {
    const isActive = match(pathname ?? "", slug);
    return { href: href(slug), label, icon, isActive };
  });

  const amenitiesIsActive = isAmenitiesActive(pathname ?? "", slug);
  const moreIsActive = isMoreActive(pathname ?? "", slug);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white backdrop-blur-md overflow-visible">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-20">
        <Link href={`/hotels/${slug}`} className="flex items-center gap-3 shrink-0 min-w-0" style={{ color: primaryColor }}>
          {logo ? (
            <img src={logo} alt="" className="h-11 w-auto max-w-[200px] shrink-0 object-contain object-left sm:h-12 sm:max-w-[240px]" />
          ) : (
            <LuxeLogo className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
          )}
          <h2 className="text-xl font-bold tracking-tight text-slate-900 truncate" title={hotelName}>
            {displayLabel}
          </h2>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label, icon, isActive }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-semibold transition-colors border-b-2 border-transparent -mb-px ${isActive ? "" : "hover:opacity-80"}`}
              style={{
                color: primaryColor,
                ...(isActive ? { borderBottomColor: primaryColor } : {}),
              }}
            >
              <span className="material-symbols-outlined text-[22px] shrink-0" aria-hidden>{icon}</span>
              {label}
            </Link>
          ))}
          <div className="relative" ref={amenitiesMenuRef}>
            <button
              type="button"
              onClick={() => setAmenitiesOpen((o) => !o)}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-semibold transition-colors border-b-2 border-transparent -mb-px ${amenitiesIsActive ? "" : "hover:opacity-80"}`}
              style={{
                color: primaryColor,
                ...(amenitiesIsActive ? { borderBottomColor: primaryColor } : {}),
              }}
              aria-expanded={amenitiesOpen}
              aria-haspopup="true"
              aria-label="Amenities menu"
            >
              <span className="material-symbols-outlined text-[22px] shrink-0" aria-hidden>spa</span>
              Amenities
              <span className="material-symbols-outlined text-lg shrink-0 transition-transform" style={{ transform: amenitiesOpen ? "rotate(180deg)" : undefined }}>expand_more</span>
            </button>
            <div
              className={`absolute left-0 top-full mt-1 min-w-[200px] rounded-lg border border-slate-200 bg-white py-2 z-[100] origin-top-left transition-all duration-200 ${
                amenitiesOpen ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
              }`}
              aria-hidden={!amenitiesOpen}
            >
              {amenitiesLinks.map(({ href, label, icon, isActive }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setAmenitiesOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors border-l-2 border-transparent hover:bg-slate-50/80 ${isActive ? "bg-transparent" : ""}`}
                  style={isActive ? { color: primaryColor, borderLeftColor: primaryColor } : { color: "#334155" }}
                >
                  <span className="material-symbols-outlined text-xl shrink-0" style={isActive ? { color: primaryColor } : { color: "#64748b" }}>{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-semibold transition-colors border-b-2 border-transparent -mb-px ${moreIsActive ? "" : "hover:opacity-80"}`}
              style={{
                color: primaryColor,
                ...(moreIsActive ? { borderBottomColor: primaryColor } : {}),
              }}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              aria-label="More menu"
            >
              <span className="material-symbols-outlined text-[22px] shrink-0" aria-hidden>menu</span>
              More
              <span className="material-symbols-outlined text-lg shrink-0 transition-transform" style={{ transform: moreOpen ? "rotate(180deg)" : undefined }}>expand_more</span>
            </button>
            <div
              className={`absolute right-0 top-full mt-1 min-w-[200px] rounded-lg border border-slate-200 bg-white py-2 z-[100] origin-top-right transition-all duration-200 ${
                moreOpen ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
              }`}
              aria-hidden={!moreOpen}
            >
              {moreLinks.map(({ href, label, icon, isActive }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors border-l-2 border-transparent hover:bg-slate-50/80 ${isActive ? "bg-transparent" : ""}`}
                  style={isActive ? { color: primaryColor, borderLeftColor: primaryColor } : { color: "#334155" }}
                >
                  <span className="material-symbols-outlined text-xl shrink-0" style={isActive ? { color: primaryColor } : { color: "#64748b" }}>{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          {onBookNow ? (
            <button
              type="button"
              onClick={onBookNow}
              className="hidden sm:flex min-w-[120px] items-center justify-center rounded-lg h-10 px-4 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              Book Now
            </button>
          ) : (
            <Link
              href={`/hotels/${slug}`}
              className="hidden sm:flex min-w-[120px] items-center justify-center rounded-lg h-10 px-4 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              Book Now
            </Link>
          )}
          <div className="relative shrink-0" ref={avatarMenuRef}>
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen((o) => !o)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 hover:opacity-80 transition-opacity"
                  style={{ color: primaryColor }}
                  aria-expanded={avatarMenuOpen}
                  aria-haspopup="true"
                  aria-label="Account menu"
                >
                  <span className="material-symbols-outlined text-xl">person</span>
                </button>
                <div
                  className={`absolute right-0 top-full mt-2 w-48 min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 z-[100] origin-top-right transition-all duration-200 ease-out ${
                    avatarMenuOpen ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
                  }`}
                  aria-hidden={!avatarMenuOpen}
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <Link
                    href={`/hotels/${slug}/profile`}
                    onClick={() => setAvatarMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-lg">account_circle</span>
                    Profile
                  </Link>
                  <Link
                    href={`/hotels/${slug}/profile`}
                    onClick={() => setAvatarMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-lg">event_note</span>
                    My Bookings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(logout());
                      setAvatarMenuOpen(false);
                      router.push(`/hotels/${slug}`);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <Link
                href={`/hotels/${slug}/login`}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 hover:opacity-80 transition-opacity"
                style={{ color: primaryColor }}
                aria-label="Sign in"
              >
                <span className="material-symbols-outlined text-xl">person</span>
              </Link>
            )}
          </div>
          {/* Mobile menu button */}
          <div className="md:hidden relative" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50"
              style={{ color: primaryColor }}
              aria-expanded={mobileMenuOpen}
              aria-label="Menu"
            >
              <span className="material-symbols-outlined text-xl">{mobileMenuOpen ? "close" : "menu"}</span>
            </button>
            <div
              className={`absolute right-0 top-full mt-2 w-64 rounded-lg border border-slate-200 bg-white py-2 z-[100] overflow-hidden origin-top-right transition-all duration-200 ease-out ${
                mobileMenuOpen ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
              }`}
              aria-hidden={!mobileMenuOpen}
            >
              {navLinks.map(({ href, label, icon, isActive }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold border-l-2 border-transparent"
                  style={isActive ? { color: primaryColor, borderLeftColor: primaryColor } : { color: "#334155" }}
                >
                  <span className="material-symbols-outlined text-2xl shrink-0 flex items-center justify-center w-8" style={isActive ? { color: primaryColor } : { color: "#64748b" }}>{icon}</span>
                  {label}
                </Link>
              ))}
              <p className="px-4 pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Amenities</p>
              {amenitiesLinks.map(({ href, label, icon, isActive }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 pl-6 text-sm font-semibold border-l-2 border-transparent"
                  style={isActive ? { color: primaryColor, borderLeftColor: primaryColor } : { color: "#334155" }}
                >
                  <span className="material-symbols-outlined text-xl shrink-0" style={isActive ? { color: primaryColor } : { color: "#64748b" }}>{icon}</span>
                  {label}
                </Link>
              ))}
              <p className="px-4 pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">More</p>
              {moreLinks.map(({ href, label, icon, isActive }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 pl-6 text-sm font-semibold border-l-2 border-transparent"
                  style={isActive ? { color: primaryColor, borderLeftColor: primaryColor } : { color: "#334155" }}
                >
                  <span className="material-symbols-outlined text-xl shrink-0" style={isActive ? { color: primaryColor } : { color: "#64748b" }}>{icon}</span>
                  {label}
                </Link>
              ))}
              <div className="border-t border-slate-100 my-2" />
              {onBookNow ? (
                <button
                  type="button"
                  onClick={() => { onBookNow(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Book Now
                </button>
              ) : (
                <Link
                  href={`/hotels/${slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white mx-2 rounded-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  Book Now
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
