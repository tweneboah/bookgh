"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useHotelDetail } from "@/hooks/api";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

function ContactFonts() {
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

const LuxeLogo = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fillRule="evenodd" />
    <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fillRule="evenodd" />
  </svg>
);

const HERO_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a0e3b9d7f8c?w=1920";
const MAP_IMAGE = "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800";

const SUBJECT_OPTIONS = ["General Inquiry", "Reservation Support", "Event Planning", "Feedback"];

export default function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "LuxeStay";
  const branchName = hotel?.name ?? hotelName;

  const [form, setForm] = useState({ fullName: "", email: "", subject: "General Inquiry", message: "" });

  const addressLines = [
    hotel?.address?.street,
    hotel?.city ?? hotel?.address?.city,
    hotel?.region ?? hotel?.address?.region,
    hotel?.country ?? hotel?.address?.country,
  ].filter(Boolean);
  const addressText = addressLines.length > 0 ? addressLines.join(", ") : "Contact us for address details";

  const heroBg = hotel?.images?.[0]?.url || HERO_IMAGE;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900" style={FONT_WORK_SANS}>
        <ContactFonts />
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-[#f6f6f8]/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        </header>
        <main className="flex-grow">
          <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden bg-slate-200 animate-pulse" />
        </main>
      </div>
    );
  }

  if (isError || !hotel) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900 flex items-center justify-center" style={FONT_WORK_SANS}>
        <ContactFonts />
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-6xl text-slate-400">location_on</span>
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Hotel not found</h2>
          <Link href="/" className="mt-6 inline-block text-sm font-bold" style={{ color: primaryColor }}>Browse hotels</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#f6f6f8] text-slate-900" style={{ ...FONT_WORK_SANS, ["--primary" as string]: primaryColor } as React.CSSProperties}>
      <ContactFonts />

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} />

      <main className="flex-grow">
        {/* Hero */}
        <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${heroBg}')` }} />
          <div className="relative z-20 flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-white/80">Get in touch</span>
            <h1 className="text-5xl md:text-7xl font-light text-white mb-6">Experience Tranquility</h1>
            <p className="max-w-2xl text-lg text-white/90 leading-relaxed font-light">
              Our dedicated team is here to ensure your journey is seamless. Reach out to us for a personalized stay or any inquiries about our exclusive amenities.
            </p>
          </div>
        </section>

        {/* Contact & Map */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Form */}
            <div className="flex flex-col gap-10">
              <div>
                <h2 className="text-3xl font-medium mb-4 text-slate-900">Send us a Message</h2>
                <p className="text-slate-600">Fill out the form below and our concierge team will get back to you within 24 hours.</p>
              </div>
              <form
                className="space-y-6"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-all contact-input"
                      style={{ ["--primary" as string]: primaryColor } as React.CSSProperties}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-all contact-input"
                      style={{ ["--primary" as string]: primaryColor } as React.CSSProperties}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-1 transition-all contact-input"
                    style={{ ["--primary" as string]: primaryColor } as React.CSSProperties}
                  >
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Message</label>
                  <textarea
                    placeholder="How can we help you?"
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 transition-all contact-input resize-y"
                    style={{ ["--primary" as string]: primaryColor } as React.CSSProperties}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg py-4 text-sm font-bold uppercase tracking-widest text-white hover:opacity-90 transition-colors shadow-lg"
                  style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}33` }}
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* Details & Map */}
            <div className="flex flex-col gap-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-4 p-6 rounded-xl bg-slate-100 border border-slate-200">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full text-primary" style={{ backgroundColor: `${primaryColor}1a` }}>
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900">Our Address</h3>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{addressText.replace(/, /g, ",\n")}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-4 p-6 rounded-xl bg-slate-100 border border-slate-200">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full text-primary" style={{ backgroundColor: `${primaryColor}1a` }}>
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900">Contact Details</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {hotel.contactPhone && <><a href={`tel:${hotel.contactPhone}`} className="hover:opacity-80" style={{ color: primaryColor }}>{hotel.contactPhone}</a><br /></>}
                      {hotel.contactEmail && <><a href={`mailto:${hotel.contactEmail}`} className="hover:opacity-80" style={{ color: primaryColor }}>{hotel.contactEmail}</a><br /></>}
                      {!hotel.contactPhone && !hotel.contactEmail && "Contact us for details"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Map placeholder */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl group border-4 border-white">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url('${MAP_IMAGE}')` }} />
                <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: `${primaryColor}1a` }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <div className="absolute -inset-4 animate-ping rounded-full opacity-30" style={{ backgroundColor: primaryColor }} />
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full text-white shadow-xl" style={{ backgroundColor: primaryColor }}>
                      <span className="material-symbols-outlined">hotel</span>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-lg flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">Location</span>
                    <span className="text-sm font-semibold text-slate-900">{branchName}</span>
                  </div>
                  {hotel.contactPhone && (
                    <a href={`tel:${hotel.contactPhone}`} className="px-4 py-2 text-white text-xs font-bold rounded hover:opacity-90 transition-all" style={{ backgroundColor: primaryColor }}>
                      Get Directions
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 py-16 text-slate-400">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-10 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center" style={{ color: primaryColor }}>
                <LuxeLogo className="h-6 w-6" />
              </div>
              <span className="text-lg font-bold tracking-widest text-white">{hotelName.toUpperCase()}</span>
            </div>
            <div className="flex gap-6">
              {(hotel.tenant as { socialLinks?: { twitter?: string } })?.socialLinks?.twitter && (
                <a href={(hotel.tenant as { socialLinks?: { twitter?: string } }).socialLinks?.twitter} target="_blank" rel="noopener noreferrer" className="h-10 w-10 flex items-center justify-center rounded-full border border-slate-800 hover:border-primary hover:text-primary transition-all" style={{ color: primaryColor }}>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                </a>
              )}
              {(hotel.tenant as { socialLinks?: { instagram?: string } })?.socialLinks?.instagram && (
                <a href={(hotel.tenant as { socialLinks?: { instagram?: string } }).socialLinks?.instagram} target="_blank" rel="noopener noreferrer" className="h-10 w-10 flex items-center justify-center rounded-full border border-slate-800 hover:border-primary hover:text-primary transition-all" style={{ color: primaryColor }}>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.441 1.441 1.441c.795 0 1.439-.645 1.439-1.441s-.644-1.44-1.439-1.44z" /></svg>
                </a>
              )}
              {(hotel.tenant as { socialLinks?: { facebook?: string } })?.socialLinks?.facebook && (
                <a href={(hotel.tenant as { socialLinks?: { facebook?: string } }).socialLinks?.facebook} target="_blank" rel="noopener noreferrer" className="h-10 w-10 flex items-center justify-center rounded-full border border-slate-800 hover:border-primary hover:text-primary transition-all" style={{ color: primaryColor }}>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
                </a>
              )}
            </div>
          </div>
          <div className="mt-10 border-t border-slate-800 pt-8 text-center text-xs uppercase tracking-widest">
            © {new Date().getFullYear()} {hotelName}. All rights reserved.
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .contact-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
      `}</style>
    </div>
  );
}
