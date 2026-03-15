"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotelDetail } from "@/hooks/api";
import { useAppSelector } from "@/store/hooks";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

const LuxeLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fillRule="evenodd" />
    <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fillRule="evenodd" />
  </svg>
);

function StoryFonts() {
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

const HERO_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a0e3b9d7f8c?w=1920";
const LEGACY_IMAGE = "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800";
const MODERN_IMAGE = "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600";
const GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a0e3b9d7f8c?w=600",
  "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
];

export default function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "Bookgh";
  const branchName = hotel?.name ?? hotelName;

  const openBooking = () => {
    if (!isAuthenticated) {
      router.push(`/hotels/${slug}/login?redirect=${encodeURIComponent(`/hotels/${slug}/story`)}`);
      return;
    }
    router.push(`/hotels/${slug}/rooms`);
  };

  const heroBg = hotel?.images?.[0]?.url || HERO_IMAGE;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900" style={FONT_WORK_SANS}>
        <StoryFonts />
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 md:px-20 py-4 sticky top-0 z-50">
          <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
        </header>
        <main className="flex-1 px-6 md:px-20 py-8">
          <div className="min-h-[450px] rounded-xl bg-slate-200 animate-pulse" />
        </main>
      </div>
    );
  }

  if (isError || !hotel) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900 flex items-center justify-center" style={FONT_WORK_SANS}>
        <StoryFonts />
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-6xl text-slate-400">apartment</span>
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Hotel not found</h2>
          <Link href="/" className="mt-6 inline-block text-sm font-bold" style={{ color: primaryColor }}>Browse hotels</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f6f8] text-slate-900" style={{ ...FONT_WORK_SANS, ["--primary" as string]: primaryColor } as React.CSSProperties}>
      <StoryFonts />
      <style jsx global>{`
        .footer-icon-hover:hover { color: var(--primary) !important; }
      `}</style>

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} onBookNow={openBooking} />

      <main className="flex-1">
        {/* Hero */}
        <div className="px-6 md:px-20 py-8">
          <div className="@container">
            <div
              className="relative bg-cover bg-center flex flex-col justify-end overflow-hidden rounded-xl min-h-[450px]"
              style={{ backgroundImage: `linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.2) 50%), url("${heroBg}")` }}
            >
              <div className="p-8 md:p-12">
                <span className="inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-widest mb-4 bg-white/90" style={{ color: primaryColor }}>Since 1974</span>
                <h1 className="text-white text-4xl md:text-6xl font-black leading-tight tracking-tight">Our Story</h1>
                <p className="text-white/80 mt-4 max-w-2xl text-lg">A journey of elegance, service, and unforgettable memories spanning five decades.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Legacy */}
        <div className="px-6 md:px-20 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2" style={{ color: primaryColor }}>
              <span className="material-symbols-outlined">history_edu</span>
              <span className="font-bold tracking-widest uppercase text-sm">Heritage</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-slate-900">A Legacy of Excellence</h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              {hotel.tenant?.description || `Founded in 1974, ${hotelName} began as a singular boutique retreat. Our philosophy was simple yet profound: hospitality is not just about a room, but about creating an environment where time feels suspended.`}
            </p>
            <p className="text-slate-600 text-lg leading-relaxed">
              For nearly 50 years, we have maintained this ethos, blending timeless heritage with modern elegance. Every piece of furniture, every lighting fixture, and every interaction is designed to honor our rich history while embracing the future of luxury.
            </p>
            <div className="flex gap-8 pt-4">
              <div>
                <p className="text-3xl font-black" style={{ color: primaryColor }}>50+</p>
                <p className="text-sm font-medium text-slate-500 uppercase">Years</p>
              </div>
              <div className="border-l border-slate-200 pl-8">
                <p className="text-3xl font-black" style={{ color: primaryColor }}>12</p>
                <p className="text-sm font-medium text-slate-500 uppercase">Global Locations</p>
              </div>
              <div className="border-l border-slate-200 pl-8">
                <p className="text-3xl font-black" style={{ color: primaryColor }}>150k</p>
                <p className="text-sm font-medium text-slate-500 uppercase">Happy Guests</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div
              className="aspect-[4/5] rounded-xl bg-cover bg-center shadow-2xl"
              style={{ backgroundImage: `url("${LEGACY_IMAGE}")` }}
            />
            <div
              className="absolute -bottom-6 -left-6 w-1/2 aspect-square rounded-lg bg-cover bg-center border-8 border-white shadow-xl hidden md:block"
              style={{ backgroundImage: `url("${MODERN_IMAGE}")` }}
            />
          </div>
        </div>

        {/* Commitment */}
        <div className="py-20 px-6 md:px-20" style={{ backgroundColor: `${primaryColor}0d` }}>
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900">Our Commitment to Hospitality</h2>
            <div className="h-1 w-20 mx-auto mb-8" style={{ backgroundColor: primaryColor }} />
            <p className="text-lg text-slate-600">At {hotelName}, we believe true luxury lies in the details—the unspoken understanding of a guest&apos;s needs, the warmth of a genuine smile, and the dedication to flawless service.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-6" style={{ color: primaryColor }}>
                <span className="material-symbols-outlined text-4xl">parking_valet</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Personalized Service</h3>
              <p className="text-slate-500">Our concierge team is dedicated to curating bespoke experiences tailored to your individual preferences.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border-t-4" style={{ borderColor: primaryColor }}>
              <div className="mb-6" style={{ color: primaryColor }}>
                <span className="material-symbols-outlined text-4xl">eco</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Sustainable Luxury</h3>
              <p className="text-slate-500">We are committed to preserving the beauty of our destinations through eco-friendly practices and local community support.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-6" style={{ color: primaryColor }}>
                <span className="material-symbols-outlined text-4xl">restaurant_menu</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Culinary Excellence</h3>
              <p className="text-slate-500">From farm-to-table dining to Michelin-starred experiences, we celebrate the art of fine cuisine.</p>
            </div>
          </div>
        </div>

        {/* Heritage Gallery */}
        <div className="px-6 md:px-20 py-20">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold mb-4 text-slate-900">Our Heritage in Focus</h2>
              <p className="text-slate-600">Glimpses into the moments and architecture that have shaped the {hotelName} identity over the decades.</p>
            </div>
            <button type="button" className="flex items-center gap-2 font-bold hover:gap-3 transition-all" style={{ color: primaryColor }}>
              View Archive <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {GALLERY_IMAGES.map((src, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url("${src}")` }}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 md:px-20 pb-20">
          <div className="bg-slate-900 rounded-2xl p-10 md:p-20 text-center text-white flex flex-col items-center gap-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 50% 50%, ${primaryColor} 0%, transparent 70%)` }} />
            <h2 className="text-3xl md:text-5xl font-bold max-w-2xl relative z-10">Be Part of Our Continuing Story</h2>
            <p className="text-slate-300 max-w-xl relative z-10">We invite you to experience the {hotelName} legacy for yourself. Book your stay and let us create a new chapter of memories with you.</p>
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              <button
                type="button"
                onClick={openBooking}
                className="px-8 py-4 rounded-lg font-bold hover:opacity-90 transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                Reservations
              </button>
              <Link
                href={`/hotels/${slug}/contact`}
                className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 rounded-lg font-bold hover:bg-white/20 transition-colors inline-block text-center"
              >
                Our Locations
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 md:px-20 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div style={{ color: primaryColor }}>
                <LuxeLogo className="size-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{hotelName}</h2>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">Redefining luxury hospitality since 1974. Experience the extraordinary with every stay.</p>
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-slate-400 cursor-pointer transition-colors footer-icon-hover" aria-hidden>public</span>
              <span className="material-symbols-outlined text-slate-400 cursor-pointer transition-colors footer-icon-hover" aria-hidden>share</span>
              <span className="material-symbols-outlined text-slate-400 cursor-pointer transition-colors footer-icon-hover" aria-hidden>thumb_up</span>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-slate-900">Explore</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><Link href={`/hotels/${slug}/story`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Our History</Link></li>
              <li><Link href={`/hotels/${slug}/rooms`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Rooms &amp; Suites</Link></li>
              <li><Link href={`/hotels/${slug}#amenities`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Amenities</Link></li>
              <li><Link href={`/hotels/${slug}`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Special Offers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-slate-900">Services</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><Link href={`/hotels/${slug}#amenities`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Fine Dining</Link></li>
              <li><Link href={`/hotels/${slug}#amenities`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Spa &amp; Wellness</Link></li>
              <li><a href={`/hotels/${slug}/contact`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Weddings</a></li>
              <li><a href={`/hotels/${slug}/contact`} className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Business Meetings</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-slate-900">Contact</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              {hotel.contactPhone && <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">call</span> <a href={`tel:${hotel.contactPhone}`} className="hover:opacity-80" style={{ color: primaryColor }}>{hotel.contactPhone}</a></li>}
              {hotel.contactEmail && <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">mail</span> <a href={`mailto:${hotel.contactEmail}`} className="hover:opacity-80" style={{ color: primaryColor }}>{hotel.contactEmail}</a></li>}
              <li className="flex items-center gap-2"><span className="material-symbols-outlined text-xs">location_on</span> {[hotel.address?.street, hotel.city ?? hotel.address?.city, hotel.country ?? hotel.address?.country].filter(Boolean).join(", ") || "Contact us"}</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 uppercase tracking-widest font-medium">
          <p>© {new Date().getFullYear()} {hotelName}. All Rights Reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Privacy Policy</a>
            <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
