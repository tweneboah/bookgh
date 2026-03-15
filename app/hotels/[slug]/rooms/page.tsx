"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useHotelDetail } from "@/hooks/api";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

type RoomCategory = {
  _id: string;
  name: string;
  description?: string;
  basePrice: number;
  maxOccupancy: number;
  amenities: string[];
  images: { url: string; caption?: string }[];
  bedType?: string;
  roomSize?: number;
};

function RoomsFonts() {
  useEffect(() => {
    const links = [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" },
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

const AMENITY_ICONS: Record<string, string> = {
  wifi: "wifi",
  pool: "pool",
  spa: "spa",
  gym: "fitness_center",
  restaurant: "restaurant",
  bar: "local_bar",
  bath: "bathtub",
  tub: "bathtub",
  coffee: "coffee",
  tv: "tv",
  ocean: "waves",
  view: "visibility",
  concierge: "concierge",
  hot_tub: "hot_tub",
  family: "family_restroom",
  kitchen: "kitchen",
};

function getAmenityIcons(amenities: string[]): string[] {
  const out: string[] = [];
  for (const a of amenities) {
    const key = a.toLowerCase().replace(/\s+/g, "_").slice(0, 12);
    const icon = AMENITY_ICONS[key] || Object.values(AMENITY_ICONS).find((v) => key.includes(v)) || "star";
    if (!out.includes(icon)) out.push(icon);
    if (out.length >= 3) break;
  }
  return out.length ? out : ["wifi"];
}

const HERO_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a0e3b9d7f8c?w=1920";

export default function HotelRoomsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [filterRoomType, setFilterRoomType] = useState(false);
  const [filterPrice, setFilterPrice] = useState(false);
  const [filterViews, setFilterViews] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;
  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "LuxeStay";
  const rooms = (hotel?.roomCategories ?? []) as RoomCategory[];
  const heroImage = hotel?.images?.[0]?.url || HERO_IMAGE;

  const locationParts = [
    hotel?.address?.street,
    hotel?.city ?? hotel?.address?.city,
    hotel?.region ?? hotel?.address?.region,
    hotel?.country ?? hotel?.address?.country,
  ].filter(Boolean);
  const contactAddress = locationParts.length ? locationParts.join(", ") : "—";
  const contactPhone = hotel?.contactPhone ?? hotel?.tenant?.contactPhone ?? "—";
  const contactEmail = hotel?.contactEmail ?? hotel?.tenant?.contactEmail ?? "—";

  const minPriceRoom = rooms.length ? rooms.reduce((a, b) => (a.basePrice < b.basePrice ? a : b)) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900" style={FONT_WORK_SANS}>
        <RoomsFonts />
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-[#f6f6f8]/80 backdrop-blur-md h-20" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-[400px] rounded-xl bg-slate-200 animate-pulse mb-10" />
          <div className="h-16 rounded-xl bg-slate-200 animate-pulse mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (isError || !hotel) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={FONT_WORK_SANS}>
        <RoomsFonts />
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-6xl text-slate-400">apartment</span>
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Hotel not found</h2>
          <Link href="/" className="mt-6 inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
            Browse hotels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f6f6f8] font-display text-slate-900 min-h-screen flex flex-col" style={{ ...FONT_WORK_SANS, ["--primary" as string]: primaryColor } as React.CSSProperties}>
      <RoomsFonts />
      <style jsx global>{`
        .material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24; }
        .material-symbols-outlined.fill-star { font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24; }
        .room-card-book:hover { background-color: var(--primary); color: white; }
      `}</style>

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Hero */}
        <div className="relative w-full mb-12 rounded-xl overflow-hidden min-h-[400px] flex items-end">
          <div className="absolute inset-0 z-0">
            <img src={heroImage} alt="Luxury hotel lobby" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
          </div>
          <div className="relative z-10 p-8 md:p-12 w-full">
            <span className="inline-block px-3 py-1 rounded backdrop-blur-md text-xs font-bold uppercase tracking-widest mb-4" style={{ backgroundColor: `${primaryColor}33`, color: primaryColor }}>
              Exquisite Comfort
            </span>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">Our Accommodations</h2>
            <p className="max-w-2xl text-slate-200 text-lg">
              Discover a sanctuary of sophistication where timeless elegance meets modern luxury. Each room is designed to be your private haven.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-10 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <button type="button" onClick={() => setFilterRoomType((v) => !v)} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer hover:border-primary transition-colors group">
            <span className="text-sm font-medium">Room Type</span>
            <span className="material-symbols-outlined text-slate-400 group-hover:opacity-80 transition-colors" style={{ color: primaryColor }}>expand_more</span>
          </button>
          <button type="button" onClick={() => setFilterPrice((v) => !v)} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer hover:border-primary transition-colors group">
            <span className="text-sm font-medium">Price Range</span>
            <span className="material-symbols-outlined text-slate-400 group-hover:opacity-80 transition-colors" style={{ color: primaryColor }}>expand_more</span>
          </button>
          <button type="button" onClick={() => setFilterViews((v) => !v)} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer hover:border-primary transition-colors group">
            <span className="text-sm font-medium">Views</span>
            <span className="material-symbols-outlined text-slate-400 group-hover:opacity-80 transition-colors" style={{ color: primaryColor }}>expand_more</span>
          </button>
          <Link href={`/hotels/${slug}`} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer hover:border-primary transition-colors group">
            <span className="text-sm font-medium">Availability</span>
            <span className="material-symbols-outlined text-slate-400 group-hover:opacity-80" style={{ color: primaryColor }}>calendar_today</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setViewMode("grid")} className={`p-2 rounded ${viewMode === "grid" ? "bg-slate-100" : "hover:bg-slate-100"} transition-colors`} style={{ color: viewMode === "grid" ? primaryColor : undefined }}>
              <span className="material-symbols-outlined">grid_view</span>
            </button>
            <button type="button" onClick={() => setViewMode("list")} className={`p-2 rounded ${viewMode === "list" ? "bg-slate-100" : "hover:bg-slate-100"} transition-colors text-slate-400`}>
              <span className="material-symbols-outlined">view_list</span>
            </button>
          </div>
        </div>

        {/* Room Grid */}
        <div className={`grid gap-8 mb-20 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
          {rooms.length === 0 ? (
            <div className="col-span-full text-center py-16 text-slate-500">
              <span className="material-symbols-outlined text-5xl mb-4 block">bed</span>
              <p>No accommodations available at the moment.</p>
              <Link href={`/hotels/${slug}`} className="mt-4 inline-block text-sm font-semibold hover:underline" style={{ color: primaryColor }}>Back to home</Link>
            </div>
          ) : (
            rooms.map((room, idx) => {
              const isMostPopular = idx === 0;
              const isBestValue = minPriceRoom?._id === room._id && rooms.length > 1;
              const badge = isMostPopular ? "Most Popular" : isBestValue ? "Best Value" : null;
              const icons = getAmenityIcons(room.amenities ?? []);
              const specParts = [
                room.roomSize != null ? `${room.roomSize} sqft` : null,
                room.bedType ?? "King Bed",
                "City View",
              ].filter(Boolean);
              return (
                <div key={room._id} className="group flex flex-col bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={room.images?.[0]?.url || "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"}
                      alt={room.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {badge && (
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-xs font-bold uppercase" style={{ color: primaryColor }}>
                        {badge}
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex flex-col grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-slate-900">{room.name}</h3>
                      <div className="flex items-center text-amber-500">
                        <span className="material-symbols-outlined fill-star text-sm">star</span>
                        <span className="text-xs font-bold ml-1">4.9</span>
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm mb-4">{specParts.join(" • ")}</p>
                    <div className="flex items-center gap-4 mb-6">
                      {icons.map((icon) => (
                        <div key={icon} className="flex items-center gap-1 text-slate-400">
                          <span className="material-symbols-outlined text-lg">{icon}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                        <span className="text-2xl font-bold" style={{ color: primaryColor }}>{fmt(room.basePrice)}</span>
                        <span className="text-slate-500 text-sm">/night</span>
                      </div>
                      <Link
                        href={`/hotels/${slug}/rooms/${room._id}/book`}
                        className="room-card-book px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-transparent"
                        style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Featured Amenities */}
        <div className="rounded-2xl p-8 md:p-16 mb-20 text-center" style={{ backgroundColor: `${primaryColor}0D` }}>
          <h2 className="text-3xl font-bold mb-4 text-slate-900">The {hotelName} Experience</h2>
          <p className="max-w-2xl mx-auto text-slate-600 mb-12">
            Beyond exquisite rooms, we provide a full suite of premium amenities designed to make your stay unforgettable.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: "pool", label: "Infinity Pool" },
              { icon: "spa", label: "Luxury Spa" },
              { icon: "restaurant", label: "Michelin Dining" },
              { icon: "fitness_center", label: "24/7 Fitness" },
            ].map(({ icon, label }) => (
              <div key={icon} className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm" style={{ color: primaryColor }}>
                  <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>
                <span className="font-medium text-slate-900">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-3xl" style={{ color: primaryColor }}>travel_explore</span>
                <h2 className="text-xl font-bold text-white">{hotelName}</h2>
              </div>
              <p className="text-sm leading-relaxed mb-6">
                {hotel?.tenant?.description || "Redefining luxury hospitality with a focus on personalized service and exceptional comfort."}
              </p>
              <div className="flex gap-4">
                {["share", "chat", "mail"].map((icon) => (
                  <a key={icon} href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:opacity-90 transition-colors" style={{ backgroundColor: "rgb(30 41 59)" }}>
                    <span className="material-symbols-outlined text-sm text-white">{icon}</span>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold mb-6">Quick Links</h3>
              <ul className="space-y-4 text-sm">
                <li><Link href={`/hotels/${slug}/rooms`} className="hover:opacity-90 transition-colors" style={{ color: primaryColor }}>All Rooms</Link></li>
                <li><Link href={`/hotels/${slug}#amenities`} className="hover:opacity-90 transition-colors" style={{ color: primaryColor }}>Hotel Amenities</Link></li>
                <li><Link href={`/hotels/${slug}/offers`} className="hover:opacity-90 transition-colors" style={{ color: primaryColor }}>Special Offers</Link></li>
                <li><a href="#" className="hover:opacity-90 transition-colors" style={{ color: primaryColor }}>Gift Cards</a></li>
                <li><a href="#" className="hover:opacity-90 transition-colors" style={{ color: primaryColor }}>Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-6">Support</h3>
              <ul className="space-y-4 text-sm">
                <li><Link href={`/hotels/${slug}/contact`} className="hover:opacity-90 transition-colors" style={{ color: primaryColor }}>Help Center</Link></li>
                <li><Link href={`/hotels/${slug}/contact`} className="hover:opacity-90 transition-colors" style={{ color: primaryColor }}>Contact Us</Link></li>
                <li><a href="#" className="hover:opacity-90 transition-colors" style={{ color: primaryColor }}>Privacy Policy</a></li>
                <li><a href="#" className="hover:opacity-90 transition-colors" style={{ color: primaryColor }}>Terms of Service</a></li>
                <li><a href="#" className="hover:opacity-90 transition-colors" style={{ color: primaryColor }}>Refund Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-6">Contact Info</h3>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined shrink-0" style={{ color: primaryColor }}>location_on</span>
                  <span>{contactAddress}</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined shrink-0" style={{ color: primaryColor }}>call</span>
                  <span>{contactPhone}</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined shrink-0" style={{ color: primaryColor }}>mail</span>
                  <span>{contactEmail}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} {hotelName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
