"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login, clearError } from "@/store/auth-slice";
import { useHotelDetail } from "@/hooks/api";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

const LuxeLogo = ({ className = "size-8" }: { className?: string }) => (
  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fillRule="evenodd" />
    <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fillRule="evenodd" />
  </svg>
);

function LoginFonts() {
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

const LOGIN_HERO_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a0e3b9d7f8c?w=800";

export default function HotelLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get("redirect") || `/hotels/${slug}`;
  const dispatch = useAppDispatch();
  const { error, isLoading } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const { data } = useHotelDetail(slug);
  const hotel = data?.data;
  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "LuxeStay";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(login({ email: email.trim().toLowerCase(), password }));
    if (login.fulfilled.match(result)) {
      router.push(redirectUrl);
    }
  };

  const inputClass = "w-full pl-12 pr-4 h-14 rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 text-slate-900 outline-none transition-all focus:ring-2 focus:border-transparent login-input";

  return (
    <div className="font-display bg-[#f6f6f8] text-slate-900 min-h-screen flex flex-col" style={{ ...FONT_WORK_SANS, ["--primary" as string]: primaryColor } as React.CSSProperties}>
      <LoginFonts />
      <style jsx global>{`
        .login-input:focus { --tw-ring-color: var(--primary); }
        .material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24; }
        .footer-link:hover { color: var(--primary); }
      `}</style>

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} />

      <main className="flex-grow flex flex-col lg:flex-row">
        {/* Hero Image Section (Left side on large screens) */}
        <div className="hidden lg:block lg:w-1/2 relative min-h-[280px] lg:min-h-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${hotel?.images?.[0]?.url || LOGIN_HERO_IMAGE}')` }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111621]/80 via-transparent to-transparent" />
          <div className="absolute bottom-12 left-12 max-w-md">
            <h2 className="text-white text-5xl font-black leading-tight mb-4">Unrivaled Elegance</h2>
            <p className="text-white/80 text-lg">Step into a world of refined luxury where every detail is tailored to your perfection.</p>
          </div>
        </div>

        {/* Login Form Section (Right side) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-20">
          <div className="w-full max-w-[440px] flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Welcome Back</h2>
              <p className="text-slate-500">Please enter your details to access your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                  <input
                    className={inputClass}
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                  <input
                    className={inputClass}
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 h-4 w-4 focus:ring-primary bg-white"
                    style={{ accentColor: primaryColor }}
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
                </label>
                <Link href={`/hotels/${slug}/forgot-password`} className="text-sm font-semibold hover:underline underline-offset-4" style={{ color: primaryColor }}>Forgot password?</Link>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-xl font-bold text-white hover:opacity-90 transition-all shadow-lg active:scale-[0.98] disabled:opacity-70"
                style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}33` }}
              >
                {isLoading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-4 text-sm text-slate-400 uppercase tracking-widest font-medium">or continue with</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-700 text-sm font-semibold" disabled>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Google</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-700 text-sm font-semibold" disabled>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.96.95-2.04 1.81-3.15 1.81-1.12 0-1.46-.71-2.76-.71-1.3 0-1.68.68-2.74.71-1.07.03-2.12-.87-3.08-1.81-1.94-1.92-3.41-5.4-3.41-8.62 0-3.32 2.06-5.07 4.02-5.07 1.03 0 2 .72 2.63.72.64 0 1.63-.72 2.76-.72 1.16 0 2.25.56 2.94 1.5-2.39 1.4-2.01 4.75.46 5.92-1.07 2.65-2.2 5.31-3.67 6.27zm-1.84-15.86c.64-.81 1.08-1.93.96-3.05-1.04.04-2.3.69-3.05 1.56-.67.76-1.26 1.91-1.1 3.01 1.16.09 2.33-.59 3.19-1.52z" />
                </svg>
                <span>Apple</span>
              </button>
            </div>

            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link href={`/hotels/${slug}/register?redirect=${encodeURIComponent(redirectUrl)}`} className="font-bold hover:underline underline-offset-4 ml-1" style={{ color: primaryColor }}>
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 bg-white border-t border-slate-200 md:px-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} {hotelName}. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="footer-link text-sm text-slate-500 transition-colors">Privacy Policy</a>
            <a href="#" className="footer-link text-sm text-slate-500 transition-colors">Terms of Service</a>
            <Link href={`/hotels/${slug}/contact`} className="footer-link text-sm text-slate-500 transition-colors">Help Center</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
