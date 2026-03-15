"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotelDetail } from "@/hooks/api";
import { useAppSelector } from "@/store/hooks";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

// Family & playground imagery
const HERO_IMAGE = "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=1920";
const INDOOR_IMG = "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800";
const OUTDOOR_IMG = "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800";
const PARTY_IMG = "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800";
const SAFE_IMG = "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800";
const FOOTER_BG_IMG = "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=1920";

const FEATURES = [
  {
    title: "Indoor Play Zone",
    tagline: "Rain or shine, play time",
    description: "Climate-controlled space with soft play, climbing frames, and creative corners. Perfect for toddlers to tweens.",
    image: INDOOR_IMG,
    icon: "child_care",
  },
  {
    title: "Outdoor Adventures",
    tagline: "Sun, slides & smiles",
    description: "Safe outdoor play area with slides, swings, and splash fun. Let them run free while you relax nearby.",
    image: OUTDOOR_IMG,
    icon: "park",
  },
  {
    title: "Birthdays & Celebrations",
    tagline: "Make every party magical",
    description: "Host unforgettable birthday parties with dedicated space, activities, and optional catering. We handle the fun.",
    image: PARTY_IMG,
    icon: "cake",
  },
];

function PlaygroundFonts() {
  useEffect(() => {
    const links = [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700;800;900&display=swap" },
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

export default function PlaygroundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "Hotel";
  const heroBg = hotel?.images?.[0]?.url || HERO_IMAGE;

  const openBooking = () => {
    if (!isAuthenticated) {
      router.push(`/hotels/${slug}/login?redirect=${encodeURIComponent(`/hotels/${slug}/playground`)}`);
      return;
    }
    router.push(`/hotels/${slug}/rooms`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900" style={FONT_WORK_SANS}>
        <PlaygroundFonts />
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 md:px-20 py-4 sticky top-0 z-50">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        </header>
        <main className="flex-1 px-6 md:px-20 py-8">
          <div className="min-h-[60vh] rounded-2xl bg-slate-200 animate-pulse" />
        </main>
      </div>
    );
  }

  if (isError || !hotel) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-900" style={FONT_WORK_SANS}>
        <PlaygroundFonts />
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-6xl text-slate-400">child_care</span>
          <h2 className="mt-4 text-xl font-semibold">Hotel not found</h2>
          <Link href="/" className="mt-6 inline-block text-sm font-bold" style={{ color: primaryColor }}>Browse hotels</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f6f8] text-slate-900"
      style={{ ...FONT_WORK_SANS, ["--primary" as string]: primaryColor } as React.CSSProperties}
    >
      <PlaygroundFonts />
      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} onBookNow={openBooking} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative w-full min-h-[75vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-black/35 z-10" />
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Kids playing at hotel playground" className="w-full h-full object-cover" src={heroBg} />
          </div>
          <div className="relative z-20 text-center max-w-4xl px-6 py-20">
            <span
              className="inline-block px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6 bg-white/95 text-slate-800"
              style={{ color: primaryColor }}
            >
              {hotelName} Playground
            </span>
            <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight mb-6">
              Where little ones
              <br />
              <span className="italic" style={{ color: "#fde047" }}>shine.</span>
              <br />
              And parents unwind.
            </h1>
            <p className="text-white/95 text-lg md:text-xl max-w-2xl mx-auto font-medium mb-10">
              A dedicated, safe play space for kids—so you can enjoy your stay knowing they&apos;re having the time of their lives.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={openBooking}
                className="min-w-[180px] h-14 rounded-xl text-white font-bold text-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center mx-auto sm:mx-0"
                style={{ backgroundColor: primaryColor, boxShadow: `0 20px 40px -12px ${primaryColor}50` }}
              >
                Book a family stay
              </button>
              <Link
                href={`/hotels/${slug}/contact`}
                className="min-w-[180px] h-14 rounded-xl bg-white/20 backdrop-blur-md text-white border-2 border-white/40 font-bold text-lg hover:bg-white/30 transition-all active:scale-95 flex items-center justify-center"
              >
                Enquire now
              </Link>
            </div>
          </div>
        </section>

        {/* Hook */}
        <section className="py-16 px-6 md:px-20 bg-white text-center border-b border-slate-100">
          <div className="max-w-4xl mx-auto">
            <p className="text-slate-900 text-2xl md:text-3xl font-bold leading-snug">
              The best family getaways start with happy kids. Our playground is designed so everyone leaves with a smile.
            </p>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-20 md:py-28 px-6 md:px-20 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-slate-900 text-3xl md:text-5xl font-extrabold mb-4">Fun for every age</h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">Three ways we keep the little ones entertained—and you stress-free.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {FEATURES.map(({ title, tagline, description, image, icon }) => (
                <div
                  key={title}
                  className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl border border-slate-100 transition-all duration-300"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={image}
                    />
                  </div>
                  <div className="p-8">
                    <span className="material-symbols-outlined text-3xl mb-3 block" style={{ color: primaryColor }}>{icon}</span>
                    <h3 className="text-xl font-bold mb-1 text-slate-900">{title}</h3>
                    <p className="text-sm font-semibold mb-3" style={{ color: primaryColor }}>{tagline}</p>
                    <p className="text-slate-600 leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why families love us */}
        <section className="py-20 md:py-28 px-6 md:px-20 bg-white">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-slate-900 text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
                Safe, supervised,
                <br />
                and seriously fun.
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Our play areas are designed with safety first—soft surfaces, age-appropriate equipment, and trained staff who love what they do. Parents can relax by the pool or at the café while the kids burn off energy in a secure, engaging environment.
              </p>
              <ul className="space-y-4">
                {[
                  "Trained supervisors during peak hours",
                  "Age zones for toddlers and older kids",
                  "Hygiene stations and clean facilities",
                  "Complimentary for in-house guests",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="material-symbols-outlined p-1.5 rounded-full shrink-0" style={{ color: primaryColor, backgroundColor: `${primaryColor}18` }}>check_circle</span>
                    <span className="font-medium text-slate-800">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-2xl overflow-hidden shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Safe, fun playground" className="w-full h-auto object-cover" src={SAFE_IMG} />
              </div>
            </div>
          </div>
        </section>

        {/* Social proof / stats */}
        <section className="py-16 px-6 md:px-20 bg-slate-50 border-y border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "100%", label: "Guest-focused" },
                { value: "Ages 1–12", label: "Designed for" },
                { value: "Daily", label: "Open" },
                { value: "Free", label: "For hotel guests" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl md:text-3xl font-black mb-1" style={{ color: primaryColor }}>{value}</p>
                  <p className="text-slate-600 text-sm font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 px-6 md:px-20 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="absolute inset-0 w-full h-full object-cover" src={FOOTER_BG_IMG} />
          <div className="absolute inset-0 z-10 mix-blend-multiply" style={{ backgroundColor: primaryColor, opacity: 0.9 }} />
          <div className="relative z-20 max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-5xl font-black mb-6">Give your family a stay they&apos;ll remember</h2>
            <p className="text-xl text-white/90 mb-10">
              Book your room and the playground is on us. More play, less stress—that&apos;s the {hotelName} way.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={openBooking}
                className="px-8 h-14 rounded-xl bg-white font-bold text-lg hover:bg-slate-100 transition-all shadow-xl"
                style={{ color: primaryColor }}
              >
                Book a stay
              </button>
              <Link
                href={`/hotels/${slug}/contact`}
                className="px-8 h-14 rounded-xl bg-white/20 border-2 border-white/50 text-white font-bold text-lg hover:bg-white/30 transition-all flex items-center justify-center"
              >
                Contact us
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white py-12 px-6 md:px-20 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-slate-900 text-lg font-bold">{hotelName} Playground</h2>
            <p className="text-slate-500 text-sm mt-1">© {new Date().getFullYear()} {hotelName}. All rights reserved.</p>
          </div>
          <div className="flex gap-8">
            <Link href={`/hotels/${slug}`} className="text-slate-500 hover:opacity-80 text-sm font-medium" style={{ color: primaryColor }}>Hotel</Link>
            <Link href={`/hotels/${slug}/rooms`} className="text-slate-500 hover:opacity-80 text-sm font-medium" style={{ color: primaryColor }}>Rooms</Link>
            <Link href={`/hotels/${slug}/contact`} className="text-slate-500 hover:opacity-80 text-sm font-medium" style={{ color: primaryColor }}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
