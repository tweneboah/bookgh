"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useHotelDetail } from "@/hooks/api";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

function ForgotPasswordFonts() {
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

export default function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data } = useHotelDetail(slug);
  const hotel = data?.data;
  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "Bookgh";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: wire to password-reset API when available
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const inputClass = "flex w-full rounded-lg text-slate-900 border border-slate-300 bg-white placeholder:text-slate-400 h-14 pl-12 pr-4 text-base transition-all focus:outline-none focus:ring-2 focus:border-transparent fp-input";

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f6f8] font-display text-slate-900 antialiased" style={{ ...FONT_WORK_SANS, ["--primary" as string]: primaryColor } as React.CSSProperties}>
      <ForgotPasswordFonts />
      <style jsx global>{`
        .fp-input:focus { --tw-ring-color: color-mix(in srgb, var(--primary) 50%, transparent); border-color: var(--primary); }
        .material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24; }
        .material-symbols-outlined.fill-1 { font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24; }
      `}</style>

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} />

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[480px] flex flex-col gap-8 bg-white p-8 md:p-12 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col gap-3 text-center md:text-left">
            <div className="flex justify-center md:justify-start">
              <div className="p-3 rounded-full inline-flex items-center justify-center" style={{ backgroundColor: `${primaryColor}1A` }}>
                <span className="material-symbols-outlined text-3xl" style={{ color: primaryColor }}>lock_reset</span>
              </div>
            </div>
            <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tight">Forgot Password?</h1>
            <p className="text-slate-600 text-base font-normal leading-relaxed">
              {submitted
                ? "If an account exists for that email, we've sent a secure link to reset your password. Please check your inbox."
                : "Enter the email address associated with your account and we'll send you a secure link to reset your password."}
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-slate-900 text-sm font-semibold uppercase tracking-wider" htmlFor="fp-email">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-xl">mail</span>
                  </div>
                  <input
                    id="fp-email"
                    className={inputClass}
                    placeholder="guest@luxestay.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-5 text-white text-base font-bold transition-all shadow-md disabled:opacity-70 hover:opacity-90"
                style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}33` }}
              >
                <span className="truncate">{isSubmitting ? "Sending…" : "Send Reset Link"}</span>
              </button>
            </form>
          ) : (
            <Link
              href={`/hotels/${slug}/login`}
              className="flex w-full items-center justify-center rounded-lg h-14 px-5 text-white text-base font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Back to login
            </Link>
          )}

          {!submitted && (
            <div className="flex flex-col items-center gap-4">
              <Link href={`/hotels/${slug}/login`} className="flex items-center gap-2 text-sm font-semibold transition-colors group hover:opacity-80" style={{ color: primaryColor }}>
                <span className="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-1">arrow_back</span>
                Back to login
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 text-center border-t border-slate-200 md:px-20">
        <p className="text-slate-500 text-xs">
          © {new Date().getFullYear()} {hotelName}. All rights reserved.
          <br className="md:hidden" />
          <span className="hidden md:inline mx-2">|</span>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <span className="mx-1">·</span>
          <a href="#" className="hover:underline">Terms of Service</a>
        </p>
      </footer>

      {/* Decorative elements */}
      <div className="fixed top-0 right-0 -z-10 w-1/3 h-full pointer-events-none rounded-none" style={{ background: `linear-gradient(to left, ${primaryColor}0D, transparent)` }} aria-hidden />
      <div className="fixed bottom-0 left-0 -z-10 w-1/4 h-1/2 pointer-events-none rounded-tr-full" style={{ background: `linear-gradient(to top right, ${primaryColor}0D, transparent)` }} aria-hidden />
    </div>
  );
}
