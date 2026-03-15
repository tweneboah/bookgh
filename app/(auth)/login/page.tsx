"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login, clearError } from "@/store/auth-slice";
import { PlatformNav } from "@/components/layout/platform-nav";

const PRIMARY = "#ec5b13";
const BG_LIGHT = "#f8f6f6";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBGxu3qSPZUxe_-aS72TRF4hZQxR7YojtUl5U5NvpjbSk49P1PeeyMD-5KBbLcUL3jubuLTAXHfif-FmGu0SZ6qNQIrVbuPsVDDWiXTX7ibWDiiGx8rLbGMnxRyoJ5dO11XUWFjhTPIbvPZ_ETRy2LRBW7IyKxfM6iPPznWqEuNAydMP_0E0HPeqeR23B2Oe9dT9IkkNif7GYWzEJ_OSNoREK0dWF9j1iZvzLh1euVhVBSryE87JtlEd1gAQMmW3f0e5sgRk1D4-v5P";

const TESTIMONIAL_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC5cZwuaeCXcJljBH7nudwDknwjopx_LlxsvjFQwrmKeLs7RxxUL9iaMG0Z37uqHBPPFrR-W0Bd12ncoUCaukBrC5KINwJZYjrIzzCLgDvmbpo7b6e8D-Os17DSFUyYGwnIWva6abjUrnOgoQhSCR-M9Tt7t0RifU5tBqBjZHHmmfZw5YpfBxKkJZKl05Zx0VtBJHPcvRd19vlrQzitBb0Li8DaV-G1TmWFVJXKFDtV3lULOQZ9uxJRk9UvgLZvzL8c151IOEdc_Mwp";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const dispatch = useAppDispatch();
  const { error, isLoading } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      router.push(redirectUrl || "/dashboard");
    }
  };

  return (
    <div
      className="flex min-h-screen w-full flex-col"
      style={{ backgroundColor: BG_LIGHT, fontFamily: "'Public Sans', sans-serif" }}
    >
      <PlatformNav />

      {/* Main: two-column card */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="grid w-full max-w-[1100px] grid-cols-1 overflow-hidden rounded-xl border border-primary/5 bg-white shadow-2xl lg:grid-cols-2">
          {/* Left: Form */}
          <div className="flex flex-col justify-center p-8 lg:p-16">
            <div className="mb-10">
              <h1 className="mb-3 text-4xl font-black tracking-tight text-slate-900">
                Sign in
              </h1>
              <p className="text-lg text-slate-500">
                Enter your credentials to access your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3.5 text-sm font-medium text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="login-email"
                  className="text-sm font-bold uppercase tracking-wider text-slate-600"
                >
                  Email Address
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#ec5b13]" aria-hidden>
                    mail
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="text-sm font-bold uppercase tracking-wider text-slate-600"
                  >
                    Password
                  </label>
                  <Link
                    href="#"
                    className="text-xs font-semibold hover:underline"
                    style={{ color: PRIMARY }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#ec5b13]" aria-hidden>
                    lock
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#ec5b13] focus:ring-2 focus:ring-[#ec5b13]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "visibility_off" : "visibility"}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 focus:ring-[#ec5b13]"
                  style={{ accentColor: PRIMARY }}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium text-slate-600"
                >
                  Keep me signed in
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
                style={{
                  backgroundColor: PRIMARY,
                  boxShadow: "0 10px 30px rgba(236, 91, 19, 0.25)",
                }}
              >
                {isLoading ? (
                  <span>Signing in…</span>
                ) : (
                  <>
                    <span>Sign in</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 space-y-4 text-center">
              <p className="text-slate-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="ml-1 font-bold hover:underline"
                  style={{ color: PRIMARY }}
                >
                  Register
                </Link>
              </p>
              <div className="border-t border-slate-100 pt-6">
                <p className="mb-2 text-sm text-slate-500">
                  Are you a business owner?
                </p>
                <Link
                  href="/register-hotel"
                  className="inline-flex items-center gap-2 font-bold transition-all hover:gap-3"
                  style={{ color: PRIMARY }}
                >
                  Want to list your hotel? Register your property
                  <span className="material-symbols-outlined text-sm">business_center</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Image + testimonial (hidden on small screens) */}
          <div className="relative hidden overflow-hidden bg-primary/10 lg:block">
            <div
              className="absolute inset-0 z-10 mix-blend-multiply"
              style={{
                background: `linear-gradient(to bottom right, ${PRIMARY}cc, ${PRIMARY})`,
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGE}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute top-12 left-12 z-20 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-4xl">domain</span>
              <span className="text-2xl font-black tracking-tight">Bookgh</span>
            </div>
            <div className="relative z-20 flex h-full flex-col justify-end p-12 text-white">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-md">
                <div className="mb-4 flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined fill-current text-yellow-400"
                    >
                      star
                    </span>
                  ))}
                </div>
                <blockquote className="mb-4 text-2xl font-bold italic leading-tight">
                  &ldquo;The easiest way to manage our property listings and connect
                  with travelers worldwide.&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 overflow-hidden rounded-full bg-white/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={TESTIMONIAL_AVATAR}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Marcus Chen</p>
                    <p className="text-xs text-white/70">Grand Plaza General Manager</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-8 text-center text-sm text-slate-400">
        <p>
          © {new Date().getFullYear()} Bookgh Inc. All rights reserved. |{" "}
          <a href="#" className="transition-colors hover:opacity-80" style={{ color: PRIMARY }}>
            Privacy Policy
          </a>{" "}
          |{" "}
          <a href="#" className="transition-colors hover:opacity-80" style={{ color: PRIMARY }}>
            Terms of Service
          </a>
        </p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f8f6f6]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
