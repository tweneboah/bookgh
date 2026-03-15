"use client";

import { use, useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useHotelDetail } from "@/hooks/api";
import { useAppSelector } from "@/store/hooks";
import { BookingModal } from "@/components/public/booking-modal";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

function getToday() {
  return new Date().toISOString().split("T")[0];
}
function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
function getDayAfterTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getCalendarDays(year: number, month: number): ({ type: "empty" } | { type: "day"; date: string; day: number })[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const cells: ({ type: "empty" } | { type: "day"; date: string; day: number })[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ type: "empty" });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ type: "day", date: date.toISOString().split("T")[0], day: d });
  }
  return cells;
}

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

/** Injects Work Sans + Material Symbols for this page only */
function HotelHomepageFonts() {
  useEffect(() => {
    const links = [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700;800;900&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0",
      },
    ];
    const els: HTMLLinkElement[] = [];
    links.forEach(({ rel, href }) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      document.head.appendChild(link);
      els.push(link);
    });
    return () => els.forEach((el) => el.remove());
  }, []);
  return null;
}

type RoomCategory = {
  _id: string;
  name: string;
  description?: string;
  basePrice: number;
  maxOccupancy: number;
  images?: { url: string; caption?: string }[];
  bedType?: string;
  roomSize?: number;
};

const AMENITY_CARDS = [
  {
    title: "Zen Wellness Spa",
    subtitle: "Holistic treatments & thermal baths",
    icon: "spa",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800",
  },
  {
    title: "Skyline Infinity Pool",
    subtitle: "Heated pool with 360° city views",
    icon: "pool",
    image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800",
  },
  {
    title: "Fine Dining",
    subtitle: "Exceptional culinary experiences",
    icon: "restaurant",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
  },
];

export default function HotelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "Hotel";
  const branchName = hotel?.name ?? hotelName;

  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectedCategory, setPreselectedCategory] = useState<RoomCategory | null>(null);

  const [heroCheckIn, setHeroCheckIn] = useState(getTomorrow());
  const [heroCheckOut, setHeroCheckOut] = useState(getDayAfterTomorrow());
  const [heroAdults, setHeroAdults] = useState(2);
  const [heroChildren, setHeroChildren] = useState(0);
  const [heroDatePopoverOpen, setHeroDatePopoverOpen] = useState(false);
  const [heroViewMonth, setHeroViewMonth] = useState(() => {
    const d = new Date(heroCheckIn || getTomorrow());
    d.setDate(1);
    return d;
  });
  const heroDatePopoverRef = useRef<HTMLDivElement>(null);
  const heroDateTriggerRef = useRef<HTMLButtonElement>(null);
  const heroCalendarPortalRef = useRef<HTMLDivElement>(null);
  const [heroCalendarPosition, setHeroCalendarPosition] = useState<{ top: number; left: number } | null>(null);

  const heroCalendarDays = getCalendarDays(heroViewMonth.getFullYear(), heroViewMonth.getMonth());
  const heroHandleDayClick = useCallback((dateStr: string) => {
    const today = getToday();
    if (dateStr < today) return;
    setHeroCheckIn((prevIn) => {
      setHeroCheckOut((prevOut) => {
        if (!prevIn || prevOut) return "";
        if (dateStr > prevIn) return dateStr;
        return "";
      });
      return dateStr;
    });
  }, []);
  useLayoutEffect(() => {
    if (!heroDatePopoverOpen || !heroDateTriggerRef.current) {
      setHeroCalendarPosition(null);
      return;
    }
    const rect = heroDateTriggerRef.current.getBoundingClientRect();
    const w = 320;
    let left = rect.left;
    if (left + w > window.innerWidth - 16) left = Math.max(16, window.innerWidth - w - 16);
    setHeroCalendarPosition({ top: rect.bottom + 8, left: left });
  }, [heroDatePopoverOpen]);

  useEffect(() => {
    if (!heroDatePopoverOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = heroDatePopoverRef.current?.contains(target);
      const inCalendar = heroCalendarPortalRef.current?.contains(target);
      if (!inTrigger && !inCalendar) setHeroDatePopoverOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [heroDatePopoverOpen]);
  useEffect(() => {
    const d = new Date((heroCheckIn || getTomorrow()) + "Z");
    d.setDate(1);
    setHeroViewMonth(d);
  }, [heroCheckIn]);

  useEffect(() => {
    const qCheckIn = searchParams?.get("checkIn");
    const qCheckOut = searchParams?.get("checkOut");
    const qAdults = searchParams?.get("adults");
    const qChildren = searchParams?.get("children");
    if (qCheckIn) setHeroCheckIn(qCheckIn);
    if (qCheckOut) setHeroCheckOut(qCheckOut);
    if (qAdults) setHeroAdults(Math.max(1, parseInt(qAdults, 10) || 1));
    if (qChildren) setHeroChildren(Math.max(0, parseInt(qChildren, 10) || 0));
  }, [searchParams]);

  const openBooking = (category?: RoomCategory | null, hash?: string) => {
    if (!isAuthenticated) {
      const params = new URLSearchParams({ checkIn: heroCheckIn, checkOut: heroCheckOut, adults: String(heroAdults), children: String(heroChildren), fromSearch: "1" });
      const returnUrl = `/hotels/${slug}${hash || ""}?${params.toString()}`;
      router.push(`/hotels/${slug}/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    setPreselectedCategory(category ?? null);
    setBookingOpen(true);
  };

  useEffect(() => {
    if (!isAuthenticated || !hotel) return;
    const qCheckIn = searchParams?.get("checkIn");
    const qCheckOut = searchParams?.get("checkOut");
    if (qCheckIn && qCheckOut && searchParams?.get("fromSearch") === "1") {
      setHeroCheckIn(qCheckIn);
      setHeroCheckOut(qCheckOut);
      const a = searchParams?.get("adults");
      const c = searchParams?.get("children");
      if (a) setHeroAdults(Math.max(1, parseInt(a, 10) || 1));
      if (c) setHeroChildren(Math.max(0, parseInt(c, 10) || 0));
      setBookingOpen(true);
    }
  }, [isAuthenticated, hotel, searchParams]);

  const publicSiteConfig = hotel?.tenant?.publicSiteConfig as {
    hero?: { imageUrl?: string; headline?: string; subheadline?: string };
  } | undefined;
  const heroImage =
    publicSiteConfig?.hero?.imageUrl?.trim() ||
    hotel?.images?.[0]?.url ||
    "https://images.unsplash.com/photo-1566073771259-6a0e3b9d7f8c?w=1920";
  const heroHeadline =
    publicSiteConfig?.hero?.headline?.trim() || hotelName;
  const heroSubheadline =
    publicSiteConfig?.hero?.subheadline?.trim() ||
    "Discover a world of elegance and comfort in the heart of the city.";

  const storyImage =
    hotel?.images?.[1]?.url ||
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800";

  const locationParts = [
    hotel?.address?.street,
    hotel?.city ?? hotel?.address?.city,
    hotel?.region ?? hotel?.address?.region,
    hotel?.country ?? hotel?.address?.country,
  ].filter(Boolean);
  const contactAddress = locationParts.length ? locationParts.join(", ") : "Central location";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900" style={FONT_WORK_SANS}>
        <HotelHomepageFonts />
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-[#f6f6f8]/80 backdrop-blur-md px-6 md:px-10 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="h-8 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        </header>
        <main className="flex-1">
          <section className="relative w-full aspect-[16/9] min-h-[400px] flex items-center justify-center overflow-hidden bg-slate-200 animate-pulse" />
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="h-12 w-3/4 max-w-md mx-auto animate-pulse rounded bg-slate-200" />
          </div>
        </main>
      </div>
    );
  }

  if (isError || !hotel) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900 flex items-center justify-center" style={FONT_WORK_SANS}>
        <HotelHomepageFonts />
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-6xl text-slate-400">apartment</span>
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Hotel not found</h2>
          <p className="mt-2 text-slate-500">This hotel may no longer be available.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            Browse hotels
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>
      </div>
    );
  }

  const featuredRooms = (hotel.roomCategories ?? []).slice(0, 2) as RoomCategory[];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f6f8] text-slate-900" style={FONT_WORK_SANS}>
      <HotelHomepageFonts />
      <style jsx global>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .room-book-btn:hover { background-color: var(--primary); border-color: var(--primary); color: white; }
      `}</style>

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} logo={hotel?.tenant?.logo} onBookNow={() => openBooking()} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative w-full aspect-[16/9] min-h-[600px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage}
              alt="Luxury hotel with panoramic view"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-900/40" />
          </div>
          <div className="relative z-10 w-full max-w-4xl px-6 text-center text-white">
            <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight mb-4">
              {heroHeadline}
            </h1>
            <p className="text-lg md:text-xl font-light mb-10 opacity-90">
              {heroSubheadline}
            </p>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl mx-auto overflow-visible">
              {/* Mobile: stacked. Desktop: single row, three equal columns */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] sm:items-center gap-0">
                {/* Dates */}
                <div className="min-w-0 border-b sm:border-b-0 sm:border-r border-slate-200/80" ref={heroDatePopoverRef}>
                  <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
                    <span className="material-symbols-outlined text-2xl shrink-0" style={{ color: primaryColor }} aria-hidden>calendar_month</span>
                    <button
                      ref={heroDateTriggerRef}
                      type="button"
                      onClick={() => setHeroDatePopoverOpen((o) => !o)}
                      className="flex-1 flex items-center justify-between gap-2 min-h-[44px] text-left rounded-lg hover:bg-slate-50 transition-colors px-2 -mx-2"
                    >
                      <div className="min-w-0 flex flex-col">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Dates</span>
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {formatDateLabel(heroCheckIn)} → {formatDateLabel(heroCheckOut)}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 shrink-0 text-xl" aria-hidden>{heroDatePopoverOpen ? "expand_less" : "expand_more"}</span>
                    </button>
                  </div>
                </div>

                {/* Guests */}
                <div className="min-w-0 border-b sm:border-b-0 sm:border-r border-slate-200/80">
                  <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
                    <span className="material-symbols-outlined text-2xl shrink-0" style={{ color: primaryColor }} aria-hidden>group</span>
                    <div className="flex-1 flex items-center gap-4 sm:gap-6">
                      <label className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-slate-600 shrink-0">Adults</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={heroAdults}
                          onChange={(e) => setHeroAdults(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-14 h-10 rounded-lg border border-slate-200 bg-slate-50/80 text-center text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent shrink-0"
                          style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties}
                        />
                      </label>
                      <label className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-slate-600 shrink-0">Children</span>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={heroChildren}
                          onChange={(e) => setHeroChildren(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-14 h-10 rounded-lg border border-slate-200 bg-slate-50/80 text-center text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent shrink-0"
                          style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() => openBooking()}
                    className="w-full sm:w-auto sm:min-w-[160px] h-12 rounded-xl px-6 sm:px-8 font-bold text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg"
                    style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}40` }}
                  >
                    <span className="material-symbols-outlined text-xl">search</span>
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar dropdown: portaled so it always appears on top */}
            {heroDatePopoverOpen && heroCalendarPosition && typeof document !== "undefined" && createPortal(
              <div
                ref={heroCalendarPortalRef}
                className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 p-4 min-w-[300px] w-[320px]"
                style={{ top: heroCalendarPosition.top, left: heroCalendarPosition.left }}
              >
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setHeroViewMonth((m) => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n; })}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    style={{ color: primaryColor }}
                    aria-label="Previous month"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <span className="text-sm font-bold text-slate-900">
                    {heroViewMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHeroViewMonth((m) => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n; })}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    style={{ color: primaryColor }}
                    aria-label="Next month"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
                  {["S", "M", "T", "W", "T", "F", "S"].map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {heroCalendarDays.map((cell, i) =>
                    cell.type === "empty" ? (
                      <div key={`e-${i}`} className="h-9 w-9" />
                    ) : (
                      <button
                        key={cell.date}
                        type="button"
                        onClick={() => heroHandleDayClick(cell.date)}
                        disabled={cell.date < getToday()}
                        className={`h-9 w-9 flex items-center justify-center text-sm font-medium rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                          cell.date === heroCheckIn
                            ? "rounded-l-lg text-white"
                            : cell.date === heroCheckOut
                            ? "rounded-r-lg text-white"
                            : heroCheckIn && heroCheckOut && cell.date > heroCheckIn && cell.date < heroCheckOut
                            ? "text-slate-900"
                            : "text-slate-900 hover:bg-slate-100"
                        }`}
                        style={
                          cell.date === heroCheckIn || cell.date === heroCheckOut
                            ? { backgroundColor: primaryColor }
                            : heroCheckIn && heroCheckOut && cell.date > heroCheckIn && cell.date < heroCheckOut
                            ? { backgroundColor: `${primaryColor}20` }
                            : undefined
                        }
                      >
                        {cell.day}
                      </button>
                    )
                  )}
                </div>
                <p className="text-center text-xs font-medium mt-2" style={{ color: primaryColor }}>
                  {heroCheckIn && heroCheckOut && heroCheckIn < heroCheckOut
                    ? `${Math.ceil((new Date(heroCheckOut).getTime() - new Date(heroCheckIn).getTime()) / (1000 * 60 * 60 * 24))} nights`
                    : "Select check-in, then check-out"}
                </p>
              </div>,
              document.body
            )}
          </div>
        </section>

        {/* Our Story */}
        <section className="py-20 px-6 max-w-7xl mx-auto" id="story">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative group">
              <div className="absolute -inset-4 rounded-xl -rotate-2 group-hover:rotate-0 transition-transform" style={{ backgroundColor: `${primaryColor}1a` }} />
              <img
                src={storyImage}
                alt="Hotel facade and architecture"
                className="relative rounded-xl shadow-xl w-full h-[400px] object-cover"
              />
            </div>
            <div className="space-y-6">
              <div className="inline-block px-3 py-1 rounded text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}>
                Our Heritage
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                A Legacy of Excellence
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                {hotel.tenant?.description || `With decades of excellence, ${hotelName} defines the art of hospitality. What began as a boutique family-run guest house has evolved into a symbol of sophistication and world-class service.`}
              </p>
              <p className="text-slate-600 text-lg leading-relaxed">
                Every corner of our hotel tells a story of meticulous design and a passion for creating unforgettable guest experiences.
              </p>
              <button
                type="button"
                onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 font-bold group"
                style={{ color: primaryColor }}
              >
                Read Our Full Story
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>

        {/* Featured Rooms */}
        <section className="py-20 bg-slate-100 px-6" id="rooms">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900">Featured Rooms</h2>
                <p className="text-slate-500 mt-2">Meticulously designed for your ultimate comfort</p>
              </div>
              <Link
                href={`/hotels/${slug}/rooms`}
                className="hidden md:block text-sm font-bold border-b-2 pb-1"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                View All Rooms
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredRooms.length > 0 ? (
                featuredRooms.map((room, idx) => (
                  <div
                    key={room._id}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow group"
                  >
                    <div className="h-80 overflow-hidden relative">
                      <img
                        src={room.images?.[0]?.url || "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"}
                        alt={room.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {idx === 0 && (
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-xs font-bold shadow-sm" style={{ color: primaryColor }}>
                          MOST POPULAR
                        </div>
                      )}
                    </div>
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-2xl font-bold text-slate-900">{room.name}</h3>
                        <p className="text-xl font-black" style={{ color: primaryColor }}>
                          {fmt(room.basePrice)}
                          <span className="text-xs font-normal text-slate-400">/night</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-4 mb-6 text-slate-500 text-sm">
                        {room.roomSize != null && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">square_foot</span>
                            {room.roomSize} sqft
                          </span>
                        )}
                        {room.bedType && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">king_bed</span>
                            {room.bedType}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          City View
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <Link
                          href={`/hotels/${slug}/rooms/${room._id}`}
                          className="flex-1 text-center border-2 border-slate-200 py-3 rounded-lg font-bold text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-all"
                        >
                          View details
                        </Link>
                        <Link
                          href={`/hotels/${slug}/rooms/${room._id}/book`}
                          className="flex-1 border-2 border-slate-200 py-3 rounded-lg font-bold text-slate-900 transition-all room-book-btn text-center"
                          style={{ ["--primary" as string]: primaryColor } as React.CSSProperties}
                        >
                          Book This Room
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                    <div className="h-80 bg-slate-200 flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-slate-400">bed</span>
                    </div>
                    <div className="p-8">
                      <h3 className="text-2xl font-bold text-slate-900">Rooms</h3>
                      <p className="text-slate-500 mt-2">Room categories will appear here when added.</p>
                      <button
                        type="button"
                        onClick={() => openBooking()}
                        className="mt-4 w-full py-3 rounded-lg font-bold text-white hover:opacity-90 transition-all"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto">
                    <div className="h-80 bg-slate-100" />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Amenities */}
        <section className="py-20 px-6 max-w-7xl mx-auto" id="amenities">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">World Class Amenities</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Elevate your stay with our premium facilities designed to rejuvenate your body and soul.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {AMENITY_CARDS.map((item) => (
              <div key={item.icon} className="group cursor-pointer">
                <div className="aspect-[4/5] rounded-xl overflow-hidden relative mb-4">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex flex-col justify-end p-6">
                    <span className="material-symbols-outlined text-white text-4xl mb-2">{item.icon}</span>
                    <h3 className="text-white text-xl font-bold">{item.title}</h3>
                    <p className="text-white/80 text-sm">{item.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-20 px-6" style={{ backgroundColor: `${primaryColor}0d` }}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-6">Join Our Exclusive Newsletter</h2>
            <p className="text-slate-600 mb-8">
              Receive early access to seasonal offers, new property openings, and luxury travel inspiration.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{ ["--tw-ring-color" as string]: primaryColor }}
              />
              <button
                type="submit"
                className="rounded-lg px-8 py-3 font-bold text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Subscribe
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#f6f6f8] border-t border-slate-200 pt-16 pb-8 px-6 md:px-10" id="contact">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6" style={{ color: primaryColor }}>
                <span className="material-symbols-outlined text-3xl">apartment</span>
                <h2 className="text-slate-900 text-xl font-bold tracking-tight">{hotelName}</h2>
              </div>
              <p className="text-slate-500 max-w-sm mb-6 leading-relaxed">
                {hotel.tenant?.description || `Redefining luxury hospitality with attention to detail, personalized service, and exceptional environments.`}
              </p>
              <div className="flex gap-4">
                {(hotel.tenant as { socialLinks?: { facebook?: string; instagram?: string; twitter?: string } })?.socialLinks?.facebook && (
                  <a
                    href={(hotel.tenant as { socialLinks?: { facebook?: string } }).socialLinks?.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white hover:border-slate-300 transition-all"
                    style={{ color: primaryColor }}
                    aria-label="Facebook"
                  >
                    <span className="material-symbols-outlined text-xl">share</span>
                  </a>
                )}
                {(hotel.tenant as { socialLinks?: { instagram?: string } })?.socialLinks?.instagram && (
                  <a
                    href={(hotel.tenant as { socialLinks?: { instagram?: string } }).socialLinks?.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white transition-all"
                    style={{ color: primaryColor }}
                    aria-label="Instagram"
                  >
                    <span className="material-symbols-outlined text-xl">camera</span>
                  </a>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Quick Links</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><Link href={`/hotels/${slug}/story`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>About Us</Link></li>
                <li><Link href={`/hotels/${slug}/rooms`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Our Rooms</Link></li>
                <li><Link href={`/hotels/${slug}/offers`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Offers</Link></li>
                <li><a href="#amenities" className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Amenities</a></li>
                <li><Link href={`/hotels/${slug}/contact`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><Link href={`/hotels/${slug}/contact`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Help Center</Link></li>
                <li><a href="#" className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Privacy Policy</a></li>
                <li><a href="#" className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Terms of Service</a></li>
                <li><Link href={`/hotels/${slug}/contact`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Contact Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Contact</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                {contactAddress && (
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined shrink-0" style={{ color: primaryColor }}>location_on</span>
                    <span>{contactAddress}</span>
                  </li>
                )}
                {hotel.contactPhone && (
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined shrink-0" style={{ color: primaryColor }}>phone</span>
                    <a href={`tel:${hotel.contactPhone}`} className="hover:opacity-80">{hotel.contactPhone}</a>
                  </li>
                )}
                {hotel.contactEmail && (
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined shrink-0" style={{ color: primaryColor }}>mail</span>
                    <a href={`mailto:${hotel.contactEmail}`} className="hover:opacity-80">{hotel.contactEmail}</a>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-medium">
            <p>© {new Date().getFullYear()} {hotelName}. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Sitemap</a>
              <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>

      <BookingModal
        open={bookingOpen}
        onClose={() => {
          setBookingOpen(false);
          setPreselectedCategory(null);
        }}
        hotelSlug={slug}
        hotelName={hotel.tenant?.name ? `${hotel.tenant.name} — ${hotel.name}` : hotel.name}
        acceptsOnlinePayment={hotel.acceptsOnlinePayment}
        contactPhone={hotel.contactPhone}
        contactEmail={hotel.contactEmail}
        preselectedCategory={preselectedCategory ? { _id: preselectedCategory._id, name: preselectedCategory.name, basePrice: preselectedCategory.basePrice, maxOccupancy: preselectedCategory.maxOccupancy } : undefined}
        categories={(hotel.roomCategories ?? []).map((c: RoomCategory) => ({ _id: c._id, name: c.name, basePrice: c.basePrice, maxOccupancy: c.maxOccupancy }))}
        initialCheckIn={bookingOpen ? heroCheckIn : undefined}
        initialCheckOut={bookingOpen ? heroCheckOut : undefined}
        initialNumberOfGuests={bookingOpen ? heroAdults + heroChildren : undefined}
        primaryColor={primaryColor}
        overlayImageUrl={heroImage}
      />
    </div>
  );
}
