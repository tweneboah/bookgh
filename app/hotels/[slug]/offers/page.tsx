"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotelDetail } from "@/hooks/api";
import { useAppSelector } from "@/store/hooks";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

function OffersFonts() {
  useEffect(() => {
    const links = [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700;900&display=swap" },
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

type OfferItem = {
  id: string;
  tag: string;
  tagClass: string;
  icon: string;
  label: string;
  title: string;
  description: string;
  price: number;
  image: string;
  originalPrice?: number;
  valueText?: string;
};

const OFFERS: OfferItem[] = [
  {
    id: "early-bird",
    tag: "Save 25%",
    tagClass: "bg-primary",
    icon: "schedule",
    label: "Early Bird Special",
    title: "Planning Ahead Pays Off",
    description: "Book your stay at least 30 days in advance and enjoy our most competitive rates with complimentary breakfast.",
    originalPrice: 265,
    price: 199,
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
  },
  {
    id: "romantic",
    tag: "Package Deal",
    tagClass: "bg-red-600",
    icon: "favorite",
    label: "Romantic Getaway",
    title: "Escape for Two",
    description: "Includes a bottle of champagne on arrival, a 3-course dinner, and a lazy late checkout until 4:00 PM.",
    valueText: "Value of $550",
    price: 420,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
  },
  {
    id: "business",
    tag: "Corporate Rate",
    tagClass: "bg-slate-800",
    icon: "work",
    label: "Business Excellence",
    title: "Work Without Borders",
    description: "Premium lounge access, high-speed dedicated WiFi, and laundry credit for those crucial meetings.",
    originalPrice: 345,
    price: 285,
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
  },
];

export default function OffersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "LuxeStay";

  const [filter, setFilter] = useState<"all" | "seasonal" | "business">("all");

  const openBooking = () => {
    if (!isAuthenticated) {
      router.push(`/hotels/${slug}/login?redirect=${encodeURIComponent(`/hotels/${slug}/offers`)}`);
      return;
    }
    router.push(`/hotels/${slug}/rooms`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900" style={FONT_WORK_SANS}>
        <OffersFonts />
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-32 w-full max-w-2xl animate-pulse rounded bg-slate-200 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (isError || !hotel) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900 flex items-center justify-center" style={FONT_WORK_SANS}>
        <OffersFonts />
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-6xl text-slate-400">corporate_fare</span>
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Hotel not found</h2>
          <Link href="/" className="mt-6 inline-block text-sm font-bold" style={{ color: primaryColor }}>Browse hotels</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f6f8] text-slate-900 transition-colors duration-300" style={FONT_WORK_SANS}>
      <OffersFonts />

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} onBookNow={openBooking} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full mb-4" style={{ color: primaryColor, backgroundColor: `${primaryColor}1a` }}>Limited Time Deals</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4 leading-[1.1]">Special Offers</h1>
              <p className="text-lg text-slate-600">Experience unparalleled luxury with our curated seasonal packages. Tailored for every journey, whether it&apos;s business, romance, or a quick escape.</p>
            </div>
            <div className="flex items-center gap-2 p-1 bg-slate-200/50 rounded-xl">
              <button type="button" onClick={() => setFilter("all")} className={`px-6 py-2 text-sm font-bold rounded-lg shadow-sm transition-all ${filter === "all" ? "bg-white text-slate-900" : "hover:bg-white/50 text-slate-600"}`} style={filter === "all" ? {} : {}}>
                All Deals
              </button>
              <button type="button" onClick={() => setFilter("seasonal")} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${filter === "seasonal" ? "bg-white shadow-sm text-slate-900" : "hover:bg-white/50 text-slate-600"}`}>
                Seasonal
              </button>
              <button type="button" onClick={() => setFilter("business")} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${filter === "business" ? "bg-white shadow-sm text-slate-900" : "hover:bg-white/50 text-slate-600"}`}>
                Business
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {OFFERS.filter((o) => {
            if (filter === "all") return true;
            if (filter === "seasonal") return o.id === "early-bird" || o.id === "romantic";
            return o.id === "business";
          }).map((offer) => (
            <div key={offer.id} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="relative h-64 overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url('${offer.image}')` }} />
                <div
                  className={`absolute top-4 left-4 rounded-lg px-3 py-1 text-xs font-bold text-white shadow-lg ${offer.tagClass === "bg-primary" ? "" : offer.tagClass}`}
                  style={offer.tagClass === "bg-primary" ? { backgroundColor: primaryColor } : undefined}
                >
                  {offer.tag}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-4 flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-sm">{offer.icon}</span>
                  <span className="text-xs font-medium uppercase tracking-widest">{offer.label}</span>
                </div>
                <h3 className="mb-2 text-2xl font-bold leading-tight tracking-tight text-slate-900">{offer.title}</h3>
                <p className="mb-6 flex-1 text-slate-600">{offer.description}</p>
                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                  <div>
                    {offer.originalPrice != null && (
                      <span className="block text-xs font-semibold text-slate-400 line-through">{fmt(offer.originalPrice)}</span>
                    )}
                    {offer.valueText && (
                      <span className="block text-xs font-semibold text-slate-400">{offer.valueText}</span>
                    )}
                    <span className="text-2xl font-black" style={{ color: primaryColor }}>{fmt(offer.price)}<span className="text-sm font-normal text-slate-500">/night</span></span>
                  </div>
                  <button
                    type="button"
                    onClick={openBooking}
                    className="rounded-lg px-6 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-lg active:scale-95"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-20 overflow-hidden rounded-3xl p-8 md:p-12" style={{ backgroundColor: `${primaryColor}0d` }}>
          <div className="flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
            <div className="flex-1">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Exclusive Club Members</h2>
              <p className="mt-4 text-lg text-slate-600">Join our loyalty program to unlock an extra 10% discount on all special offers and earn points towards free nights.</p>
              <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
                <button
                  type="button"
                  onClick={openBooking}
                  className="rounded-xl px-8 py-3 text-sm font-bold text-white shadow-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}33` }}
                >
                  Join the Club
                </button>
                <button type="button" className="rounded-xl bg-white px-8 py-3 text-sm font-bold text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors">
                  Learn More
                </button>
              </div>
            </div>
            <div className="relative w-full max-w-sm shrink-0">
              <div className="aspect-square rounded-full p-1" style={{ background: `linear-gradient(to bottom right, ${primaryColor}, #60a5fa)` }}>
                <div className="h-full w-full rounded-full bg-[#f6f6f8] p-2 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400" alt="Concierge" className="h-full w-full rounded-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2" style={{ color: primaryColor }}>
              <span className="material-symbols-outlined font-bold">corporate_fare</span>
              <span className="text-lg font-black">{hotelName}</span>
            </div>
            <div className="flex gap-8 text-sm font-medium text-slate-500">
              <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Privacy Policy</a>
              <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Terms of Service</a>
              <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Cookie Policy</a>
            </div>
            <p className="text-sm text-slate-400">© {new Date().getFullYear()} {hotelName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
