"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { register, clearError } from "@/store/auth-slice";
import { useHotelDetail } from "@/hooks/api";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

function RegisterFonts() {
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

const REGISTER_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a0e3b9d7f8c?w=800";

export default function HotelRegisterPage({
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

  const { data } = useHotelDetail(slug);
  const hotel = data?.data;
  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "LuxeStay";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (name: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmed = fullName.trim();
    if (!trimmed) errors.fullName = "Full name is required";
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) errors.email = "Please enter a valid email";
    if (!password) errors.password = "Password is required";
    else if (password.length < 8) errors.password = "Password must be at least 8 characters";
    if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    if (!agreeTerms) errors.agreeTerms = "You must agree to the Terms & Conditions and Privacy Policy";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    setFieldErrors({});
    if (!validateForm()) return;
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : parts[0] ?? "";
    const result = await dispatch(
      register({
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        password,
        phone: undefined,
      })
    );
    if (register.fulfilled.match(result)) {
      router.push(redirectUrl);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 text-slate-900 outline-none transition-all focus:ring-2 focus:border-transparent reg-input";
  const inputErrorClass = "border-red-400 focus:ring-red-500/20";

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#f6f6f8] text-slate-900 antialiased" style={FONT_WORK_SANS}>
      <RegisterFonts />
      <style jsx global>{`
        .reg-input:focus { --tw-ring-color: var(--primary); outline: none; }
        .group:focus-within .reg-icon { color: var(--primary) !important; }
        .material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24; }
      `}</style>

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12" style={{ ["--primary" as string]: primaryColor } as React.CSSProperties}>
        <div className="flex w-full max-w-5xl bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
          {/* Left: Image */}
          <div className="hidden lg:flex lg:w-1/2 relative">
            <img alt="Luxury Experience" className="absolute inset-0 w-full h-full object-cover" src={hotel?.images?.[0]?.url || REGISTER_IMAGE} />
            <div className="absolute inset-0 backdrop-blur-[2px]" style={{ backgroundColor: `${primaryColor}66` }} />
            <div className="relative z-10 p-12 flex flex-col justify-end h-full text-white">
              <h3 className="text-4xl font-bold mb-4">The Art of Refined Living</h3>
              <p className="text-lg text-white/90">Join our exclusive circle and unlock access to the world&apos;s most prestigious suites and bespoke guest services.</p>
            </div>
          </div>
          {/* Right: Form */}
          <div className="w-full lg:w-1/2 p-8 sm:p-12 overflow-y-auto max-h-[90vh]">
            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Your Account</h1>
              <p className="text-slate-500 mt-2">Begin your journey with {hotelName} today.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <div className="relative group">
                  <span className="material-symbols-outlined reg-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors">person</span>
                  <input
                    type="text"
                    placeholder="Alexander Hamilton"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); clearFieldError("fullName"); }}
                    className={`${inputClass} ${fieldErrors.fullName ? inputErrorClass : ""}`}
                    aria-invalid={!!fieldErrors.fullName}
                  />
                </div>
                {fieldErrors.fullName && <p className="text-sm text-red-600" role="alert">{fieldErrors.fullName}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <div className="relative group">
                  <span className="material-symbols-outlined reg-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors">mail</span>
                  <input
                    type="email"
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                    className={`${inputClass} ${fieldErrors.email ? inputErrorClass : ""}`}
                    aria-invalid={!!fieldErrors.email}
                  />
                </div>
                {fieldErrors.email && <p className="text-sm text-red-600" role="alert">{fieldErrors.email}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined reg-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors">lock</span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); if (confirmPassword) clearFieldError("confirmPassword"); }}
                      className={`${inputClass} ${fieldErrors.password ? inputErrorClass : ""}`}
                      aria-invalid={!!fieldErrors.password}
                    />
                  </div>
                  {fieldErrors.password && <p className="text-sm text-red-600" role="alert">{fieldErrors.password}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined reg-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors">verified_user</span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
                      className={`${inputClass} ${fieldErrors.confirmPassword ? inputErrorClass : ""}`}
                      aria-invalid={!!fieldErrors.confirmPassword}
                    />
                  </div>
                  {fieldErrors.confirmPassword && <p className="text-sm text-red-600" role="alert">{fieldErrors.confirmPassword}</p>}
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => { setAgreeTerms(e.target.checked); clearFieldError("agreeTerms"); }}
                    className="mt-1 rounded border-slate-300 text-primary focus:ring-primary bg-white"
                  />
                  <span className="text-sm text-slate-600">
                    I agree to the <a href="#" className="font-medium hover:underline" style={{ color: primaryColor }}>Terms &amp; Conditions</a> and <a href="#" className="font-medium hover:underline" style={{ color: primaryColor }}>Privacy Policy</a>.
                  </span>
                </label>
                {fieldErrors.agreeTerms && <p className="text-sm text-red-600" role="alert">{fieldErrors.agreeTerms}</p>}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-1 rounded border-slate-300 text-primary focus:ring-primary bg-white" />
                  <span className="text-sm text-slate-600">Keep me updated with exclusive offers and travel inspiration.</span>
                </label>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-lg font-bold text-white shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}4D` }}
              >
                {isLoading ? "Creating…" : "Create Account"}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or sign up with</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 text-sm font-semibold" disabled>
                  <img alt="Google" className="w-5 h-5" src="https://www.google.com/favicon.ico" />
                  Google
                </button>
                <button type="button" className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700 text-sm font-semibold" disabled>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91 1.09.07 2.18.46 3.09 1.17.1.07.19.16.28.24-1.2 1.14-1.06 2.94-.66 4.12.24.71.66 1.44 1.22 2.06-.92.28-1.93.44-2.99.44-1.06 0-2.07-.16-2.99-.44zM15 4.5c1.39-.07 2.61.95 2.62 2.12 0 1.17-1.26 2.12-2.62 2.12-1.37 0-2.59-.95-2.62-2.12-.01-1.17 1.24-2.12 2.62-2.12z"/></svg>
                  Apple
                </button>
              </div>
              <p className="text-center text-slate-600 text-sm mt-8">
                Already have an account?{" "}
                <Link href={`/hotels/${slug}/login?redirect=${encodeURIComponent(redirectUrl)}`} className="font-bold hover:underline" style={{ color: primaryColor }}>Login here</Link>
              </p>
            </form>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 border-t border-slate-200 text-center lg:px-10">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
          © {new Date().getFullYear()} {hotelName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
