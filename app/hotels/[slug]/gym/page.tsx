"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotelDetail } from "@/hooks/api";
import { useAppSelector } from "@/store/hooks";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

// Black African representation – hero and section imagery (diverse fitness/hotel)
const HERO_IMAGE = "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1920";
const STRENGTH_IMG = "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=800";
const CARDIO_IMG = "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800";
const STUDIO_IMG = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800";
const EQUIPMENT_IMG = "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=800";
const FOOTER_BG_IMG = "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1920";

function GymFonts() {
  useEffect(() => {
    const links = [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700;800;900&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" },
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

export default function GymPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "The Royal Palace";
  // Always use Black African imagery on gym page (do not override with hotel image)
  const heroBg = HERO_IMAGE;

  const openBooking = () => {
    if (!isAuthenticated) {
      router.push(`/hotels/${slug}/login?redirect=${encodeURIComponent(`/hotels/${slug}/gym`)}`);
      return;
    }
    router.push(`/hotels/${slug}/rooms`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900" style={FONT_WORK_SANS}>
        <GymFonts />
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 md:px-20 py-4 sticky top-0 z-50">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        </header>
        <main className="flex-1 px-6 md:px-20 py-8">
          <div className="min-h-[600px] rounded-2xl bg-slate-200 animate-pulse" />
        </main>
      </div>
    );
  }

  if (isError || !hotel) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-900" style={FONT_WORK_SANS}>
        <GymFonts />
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-6xl text-slate-400">fitness_center</span>
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
      <GymFonts />
      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} onBookNow={openBooking} />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative w-full h-[600px] md:h-[700px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Black athlete in luxury hotel gym – fitness and strength training"
              className="w-full h-full object-cover"
              src={heroBg}
            />
          </div>
          <div className="relative z-20 text-center max-w-4xl px-6">
            <h1 className="text-white text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
              Train hard.
              <br />
              Recover well.
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-normal leading-relaxed mb-10 max-w-2xl mx-auto">
              A fully equipped gym, open 24/7 for guests. Strength, cardio, and studio—everything you need to stay on track.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#hours"
                className="min-w-[180px] h-14 rounded-lg text-white font-bold text-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center"
                style={{ backgroundColor: primaryColor, boxShadow: `0 25px 50px -12px ${primaryColor}4D` }}
              >
                View hours
              </a>
              <Link
                href={`/hotels/${slug}/contact`}
                className="min-w-[180px] h-14 rounded-lg bg-white/20 backdrop-blur-md text-white border border-white/30 font-bold text-lg hover:bg-white/30 transition-all active:scale-95 flex items-center justify-center"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>

        {/* Introduction */}
        <section className="py-20 px-6 md:px-20 bg-white text-center border-b border-slate-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-slate-900 text-2xl md:text-4xl font-bold leading-tight">
              No matter your goal—build strength, boost cardio, or find your flow—our space is yours.
            </h2>
          </div>
        </section>

        {/* Workout Zones Section */}
        <section className="py-24 px-6 md:px-20 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <h2 className="text-slate-900 text-3xl md:text-5xl font-extrabold mb-4">What&apos;s inside</h2>
              <p className="text-slate-600 text-lg">Three zones designed for every kind of workout.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-300">
                <div className="h-64 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Strength Zone"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src={STRENGTH_IMG}
                  />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-3 text-slate-900">Build your power</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Free weights, machines, and functional equipment for full-body strength training.
                  </p>
                  <div className="mt-6 flex items-center font-bold gap-2" style={{ color: primaryColor }}>
                    Strength Zone <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>
              </div>
              <div className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-300">
                <div className="h-64 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Cardio Deck"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src={CARDIO_IMG}
                  />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-3 text-slate-900">Keep the heart strong</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Treadmills, bikes, rowers, and ellipticals with panoramic views. Stay motivated.
                  </p>
                  <div className="mt-6 flex items-center font-bold gap-2" style={{ color: primaryColor }}>
                    Cardio Deck <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>
              </div>
              <div className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-300">
                <div className="h-64 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Studio"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src={STUDIO_IMG}
                  />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-3 text-slate-900">Move together</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Yoga, HIIT, and stretching in our dedicated studio. Complimentary for guests.
                  </p>
                  <div className="mt-6 flex items-center font-bold gap-2" style={{ color: primaryColor }}>
                    Studio & Classes <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Facilities Section */}
        <section className="py-24 px-6 md:px-20 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <div>
                <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight text-slate-900">
                  Premium equipment.
                  <br />
                  No crowds.
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Our gym is reserved for hotel guests so you can focus on your session. From cable machines and dumbbells to kettlebells and resistance bands—we&apos;ve got the gear. Towels and water are complimentary.
                </p>
              </div>
              <ul className="space-y-4">
                {[
                  "24/7 access for in-house guests",
                  "Complimentary towels & water",
                  "Personal training on request",
                  "Lockers and changing rooms",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined p-2 rounded-full shrink-0"
                      style={{ color: primaryColor, backgroundColor: `${primaryColor}1A` }}
                    >
                      check_circle
                    </span>
                    <span className="font-medium text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Equipment detail"
                  className="w-full h-auto"
                  src={EQUIPMENT_IMG}
                />
              </div>
              <div
                className="absolute -bottom-6 -left-6 text-white p-6 rounded-xl shadow-xl hidden md:block"
                style={{ backgroundColor: primaryColor }}
              >
                <p className="text-2xl font-black">100%</p>
                <p className="text-sm opacity-80">Guest Exclusive</p>
              </div>
            </div>
          </div>
        </section>

        {/* Availability Section */}
        <section id="hours" className="py-24 px-6 md:px-20 bg-slate-50">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex flex-wrap gap-4 justify-center mb-8">
              <span
                className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
              >
                24 hours, 7 days
              </span>
              <span className="px-4 py-1.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                Guest access only
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-slate-900">
              Open 24/7. Ready when you are.
            </h2>
            <p className="text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Early riser or night owl—the gym is always open for hotel guests. No booking required. Just swipe your key and get moving. We keep the space clean, airy, and stocked so every session feels like a win.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              {[
                { icon: "schedule", title: "No Booking", desc: "Walk in anytime with your keycard." },
                { icon: "sanitizer", title: "Pristine Space", desc: "Hourly cleaning and sanitizing." },
                { icon: "air", title: "Fresh Air", desc: "Advanced climate & air filtration." },
                { icon: "local_drink", title: "Fully Stocked", desc: "Water and towels always ready." },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-white p-6 rounded-xl border border-slate-100"
                >
                  <span className="material-symbols-outlined mb-4 block" style={{ color: primaryColor }}>{icon}</span>
                  <h4 className="font-bold mb-2 text-slate-900">{title}</h4>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="relative py-24 px-6 md:px-20 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Footer Background"
            className="absolute inset-0 w-full h-full object-cover"
            src={FOOTER_BG_IMG}
          />
          <div
            className="absolute inset-0 z-10 mix-blend-multiply"
            style={{ backgroundColor: primaryColor, opacity: 0.95 }}
          />
          <div className="relative z-20 max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-6xl font-black mb-6">Stay fit while you stay</h2>
            <p className="text-xl md:text-2xl text-white/80 mb-12">
              Book your room and enjoy full access to our gym, pool, and wellness facilities. No extra charge for in-house guests.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button
                type="button"
                onClick={openBooking}
                className="px-10 h-16 rounded-xl bg-white font-bold text-xl hover:bg-slate-100 transition-all shadow-xl active:scale-95"
                style={{ color: primaryColor }}
              >
                Book a stay
              </button>
              <Link
                href={`/hotels/${slug}/contact`}
                className="px-10 h-16 rounded-xl bg-transparent border-2 border-white/40 text-white font-bold text-xl hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center"
              >
                Contact us
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white py-12 px-6 md:px-20 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-slate-900 text-xl font-bold">{hotelName} Fitness</h2>
            <p className="text-slate-500 text-sm">© {new Date().getFullYear()} {hotelName}. All rights reserved.</p>
          </div>
          <div className="flex gap-8">
            <Link className="text-slate-500 hover:opacity-80 transition-colors" href="#" style={{ color: primaryColor }}>Privacy</Link>
            <Link className="text-slate-500 hover:opacity-80 transition-colors" href="#">Terms</Link>
            <Link className="text-slate-500 hover:opacity-80 transition-colors" href={`/hotels/${slug}/contact`} style={{ color: primaryColor }}>Contact</Link>
          </div>
          <div className="flex gap-4">
            <a
              href="#"
              className="size-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:opacity-90 transition-all"
              style={{ color: primaryColor }}
              aria-label="Share"
            >
              <span className="material-symbols-outlined">share</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
