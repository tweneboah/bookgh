"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Sparkles,
  Clock,
  Wine,
  ChefHat,
  Sun,
  Moon,
  Calendar,
} from "lucide-react";
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

function RestaurantFonts() {
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

const HERO_IMAGE = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920";
const DISH_IMAGE = "https://images.unsplash.com/photo-1544025162-d76694265947?w=800";
const AMBIANCE_IMAGE = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";
const CHEF_IMAGE = "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600";

const EXPERIENCES = [
  {
    icon: Sun,
    title: "Breakfast",
    tagline: "Start the day right",
    description: "Fresh pastries, seasonal fruit, and made-to-order eggs in a sunlit setting.",
    image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600",
  },
  {
    icon: UtensilsCrossed,
    title: "Lunch & Dinner",
    tagline: "Culinary storytelling",
    description: "Seasonal menus crafted from local ingredients. Every plate tells a story.",
    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600",
  },
  {
    icon: Moon,
    title: "Evening Bar",
    tagline: "Sip and unwind",
    description: "Craft cocktails, fine wines, and small plates in an intimate atmosphere.",
    image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600",
  },
];

export default function RestaurantPage({
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
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "LuxeStay";
  const heroBg = hotel?.images?.[0]?.url || HERO_IMAGE;

  const openBooking = () => {
    if (!isAuthenticated) {
      router.push(`/hotels/${slug}/login?redirect=${encodeURIComponent(`/hotels/${slug}/restaurant`)}`);
      return;
    }
    router.push(`/hotels/${slug}/rooms`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900" style={FONT_WORK_SANS}>
        <RestaurantFonts />
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 md:px-20 py-4 sticky top-0 z-50">
          <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
        </header>
        <main className="flex-1 px-6 md:px-20 py-8">
          <div className="min-h-[70vh] rounded-2xl bg-slate-200 animate-pulse" />
        </main>
      </div>
    );
  }

  if (isError || !hotel) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center" style={FONT_WORK_SANS}>
        <RestaurantFonts />
        <div className="text-center px-6">
          <UtensilsCrossed className="mx-auto h-16 w-16 text-slate-400" />
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Hotel not found</h2>
          <Link href="/" className="mt-6 inline-block text-sm font-bold" style={{ color: primaryColor }}>Browse hotels</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white text-slate-900"
      style={{ ...FONT_WORK_SANS, ["--primary" as string]: primaryColor } as React.CSSProperties}
    >
      <RestaurantFonts />
      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} onBookNow={openBooking} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative min-h-[85vh] flex flex-col justify-end overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${heroBg}")` }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)`,
            }}
          />
          <div className="relative z-10 px-6 md:px-20 pb-16 md:pb-24 pt-32">
            <div className="max-w-3xl">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6 bg-white/95 backdrop-blur"
                style={{ color: primaryColor }}
              >
                <Sparkles className="size-4" />
                {hotelName} Restaurant
              </span>
              <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight">
                Where every bite
                <br />
                <span className="italic" style={{ color: primaryColor }}>tells a story</span>
              </h1>
              <p className="text-white/90 mt-6 text-lg md:text-xl max-w-xl font-medium">
                Farm-to-table excellence, crafted by our chefs. Dine in an atmosphere that turns meals into memories.
              </p>
              <div className="flex flex-wrap gap-4 mt-10">
                <a
                  href="#reserve"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg hover:opacity-95 transition-opacity"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Calendar className="size-5" />
                  Reserve a table
                </a>
                <Link
                  href={`/hotels/${slug}/contact`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-white/10 backdrop-blur border border-white/30 text-white hover:bg-white/20 transition-colors"
                >
                  Contact & hours
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Hook line */}
        <section className="px-6 md:px-20 py-12 md:py-16 border-b border-slate-100">
          <p className="text-center text-slate-600 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            From sunrise breakfasts to candlelit dinners—experience the full spectrum of flavour under one roof.
          </p>
        </section>

        {/* Experiences grid */}
        <section className="px-6 md:px-20 py-16 md:py-24">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Dining experiences</h2>
            <p className="text-slate-500 mb-12 max-w-xl">Choose your moment. Each setting is designed for a different kind of magic.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {EXPERIENCES.map(({ icon: Icon, title, tagline, description, image }) => (
                <div
                  key={title}
                  className="group rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300"
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <div
                      className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundImage: `url("${image}")` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                      <div
                        className="p-2.5 rounded-xl bg-white/90 backdrop-blur"
                        style={{ color: primaryColor }}
                      >
                        <Icon className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{title}</h3>
                        <p className="text-white/80 text-sm">{tagline}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Signature & ambiance - two columns */}
        <section className="px-6 md:px-20 py-16 md:py-24 bg-slate-50/80">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <span className="inline-block text-xs font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>
                Signature dishes
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                Ingredients that speak. Plates that sing.
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Our kitchen works with local farmers and fishermen to bring you the freshest flavours. Every dish is a balance of tradition and innovation—elegant, memorable, and unmistakably ours.
              </p>
              <ul className="space-y-3 text-slate-600">
                {["Seasonal tasting menus", "Farm-to-table produce", "House-made breads & pastries", "Curated wine list"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2 relative">
              <div
                className="aspect-[4/5] rounded-2xl bg-cover bg-center shadow-xl"
                style={{ backgroundImage: `url("${DISH_IMAGE}")` }}
              />
              <div
                className="absolute -bottom-6 -right-6 w-1/3 aspect-square rounded-xl bg-cover bg-center border-4 border-white shadow-lg hidden md:block"
                style={{ backgroundImage: `url("${AMBIANCE_IMAGE}")` }}
              />
            </div>
          </div>
        </section>

        {/* Chef / atmosphere strip */}
        <section className="px-6 md:px-20 py-16 md:py-24">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 items-center">
            <div
              className="w-full md:w-80 h-80 md:h-96 rounded-2xl bg-cover bg-center shrink-0 shadow-lg"
              style={{ backgroundImage: `url("${CHEF_IMAGE}")` }}
            />
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 mb-4" style={{ color: primaryColor }}>
                <ChefHat className="size-5" />
                <span className="font-bold tracking-widest uppercase text-sm">Our kitchen</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                Led by passion. Driven by quality.
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                Our culinary team brings together decades of experience from around the world. They believe that great dining is not just about taste—it’s about connection, surprise, and the kind of hospitality that makes you feel at home while feeling anything but ordinary.
              </p>
              <div className="flex items-center gap-6 mt-8 text-slate-500">
                <span className="flex items-center gap-2">
                  <Clock className="size-5" style={{ color: primaryColor }} />
                  Breakfast 6:30 – 10:30
                </span>
                <span className="flex items-center gap-2">
                  <Wine className="size-5" style={{ color: primaryColor }} />
                  Dinner 18:00 – 22:30
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Reserve */}
        <section id="reserve" className="px-6 md:px-20 py-16 md:py-24">
          <div
            className="max-w-4xl mx-auto rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to dine with us?</h2>
              <p className="text-white/90 text-lg mb-8 max-w-xl mx-auto">
                Reserve your table and let us take care of the rest. For groups and private events, get in touch—we’d love to host you.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href={`/hotels/${slug}/contact`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <Calendar className="size-5" />
                  Reserve a table
                </a>
                <Link
                  href={`/hotels/${slug}/contact`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-white/20 backdrop-blur border border-white/40 text-white hover:bg-white/30 transition-colors"
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white px-6 md:px-20 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div style={{ color: primaryColor }}>
              <LuxeLogo className="size-6" />
            </div>
            <span className="font-bold text-slate-100">{hotelName} Restaurant</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-400">
            <Link href={`/hotels/${slug}`} className="hover:text-white transition-colors">Hotel</Link>
            <Link href={`/hotels/${slug}/rooms`} className="hover:text-white transition-colors">Rooms</Link>
            <Link href={`/hotels/${slug}/contact`} className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
        <p className="max-w-6xl mx-auto mt-6 pt-6 border-t border-slate-700 text-xs text-slate-500 text-center">
          © {new Date().getFullYear()} {hotelName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
