"use client";

import Link from "next/link";
import { PlatformNav } from "@/components/layout/platform-nav";

const PRIMARY = "#ec5b13";
const BG_LIGHT = "#f8f6f6";
const BG_DARK = "#221610";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB1QW-drtaHYZ2m60ilvzZ738y66jn5pw5RWXSeW_1oj0psK0bGOCVhp0XdaViuwNpTSD5Vs6nW0Ng2q-rSycTZSy_QXsb3aOR1JtgqdhI65UZuQJCvGbiErztWiTngruU0r6gNDCEprruIy-_HG3ichRxgSnHvONrNmkAzLE1lFzIEkXT2CinQxt0Ro5a50PwV3aX7ND7vl7xvQjF2bkeRH02qaDZotuuzuIEl1kS59qrlOzJMnx62mbZqEZifOargtE5loRj6KpFj";

const BOOKING_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ5u-h-q3o0opWkn8nQ5xgq6noMoUu3KphSRNj09_hRbD9Hj6cu33z2qkYTWF6RJLnSeqTSte3_-9ROa-CfneAqsTZd27gnbayHwKVnC5_sE55q3Twp3PyP5EvA_mzg6yX6-CdMOwWUiDA9uWkB7-QlPtNDVclux7m6mbYZS-vc534YMnUDE9-JIzWHKuHobiD2etLCUTf3owuRCyiNa4l5ndbIkDS-Uwxu7sUkC6WBoN7V98ybwy12Q05ix4O0IwU2SBKQG0oj6SG";

const ANALYTICS_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBzWv034VafLPnTZrXAXk6a2UqTXCVxzxj1kvIuZngnxE_vBRaCa1_yiHB_ZBtk7b83KyBxuHMDenOe3B9iKqjJNbMSOCTB18ePOhtcLPgRGjBGwTmgBPwWoPjYxybYoRjOolUW2-75bu36Cnldh1lBX2M2oHXYmpw122KvgDQ3oJ4wXGhZf4xCd6wwaNkgNr7NekQNTv9CsCF7TobZj_eGd7A1INuQ95VkN-I9_LWJYEIGsApMefBUy_1LOGWvM6cdKjAe9AGkU2Wp";

const GUEST_CRM_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCYU_hZm3jRNI_c_D7sq5bUC9Vfn61zyWX2m8ZOsJAQ4hDOa088WNd6mJLUpvFxLeu4cHWr-rOIbzzf80q04wo_WJXBxsSY0stXfczrFxZBe3I0rXT-s0j4Ic3eLovfxQLAgoZixOGkP_XTtOLXZ71QV2ljq_6tdyiORBsUaSwQ-K8vtYk7_9g9Hv4ViwTyldKs7pKtaNk5AN8ybywIVjq8zQs0GEVbLje5B3fjw0MSpLlyPacIn4WI_YRY1Wu4i6Dz-j3BaTigkUI4";

const DASHBOARD_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDkR_3QtqrOp2wHYbLvciPG1k2ugEPKnfxysoOZJsTEz8sgo2lsRssYxxxyY7VqUZNY_MWKpB2gHVnmgU8r2cfylkqgguX-0oeYjuPsS2e3Zks-BTBaEDWiGLgHBBdjotyrQcz_Y0nCHb4IynxfIVWjEjpf2-8O0hhGjm6MoxlAdzgexvsKBhwUZC4jquX8T-FxaKQhm0_LxUz4sNv-6mE2mDeKnUZ0xrJApEG1Hkf5-tLu1v3VKVnRke-8yyLjJh0OCkC7DjIjHrX8";

const AVATARS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC9ZxzzBnViGpzGcPQkpqch_mC5yK3rckWxa2Il_JqNbPNgSXRMe49eE82yWA3aDr-8p9Le4P55WV6a1LjCkeblIu82I8vuLrsdi-ejzUH8QWlsAjXgmLUBGuRHIPT7iFuoasq9L4D8wpm_Ft0Cn2EPEUW4p5BUjtGfW9jYoBHZ3yIR1CABiFUxzy9co2KZ6quhVF9VO5igsV-vWVFEqDN2O5ImDGAaC6ArRHTE8g5M4hDC3c-3pOAmGf_oCOkamOgo65CPfhOCNJXW",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCkbSO2XyQyjwDrNqLq4HrzPNif4LIYFfuFcDX8i4L9rouSVurwtZ2e7eQIwoEz2Hpb4Gi-cymBtyRuFrx5Rkf2J9lAGbRwUYued8iMRFrS1vO4jNqyulBlbTXRgqi26XfGqNdKK0eLvYWOSVTFVkB6vqk-6JNtpjV4TW__Psnudij31l75JRcpbotzYDHWp6HvrgjTXQqd5DxbH5NezzeU3dy0P6bJ8zgi3lPMCEludnrEPziDaSUeqC60oMOSqcBoS0B1FGr54vKM",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAd7NLn1iSZxvpDXmo3mgpR35U1t0mMUu3FUu6dGVtKgIl0LcRmlR4gkMHQ6uUtN0H_F_sHt8gA0QokqFoBxySJBm49IqRh8Vb-FyWn6BhIQwTqkEyw6QzVNLTisxEdoXRYk4Y4xjOMzdbcjxPGyOSwC7ru1w5RAwmnx5RlIvIdEpxZLHk2YCl2gtKRPfyOwhQNrkoFMT6ZWHj6HxDrDBfh-oeqfx0DL2rQIrHksF2gneie1uxiFyzZ385OF1vhngPiwZr2HneYkiRj",
];

const TESTIMONIALS = [
  {
    quote:
      '"Bookgh transformed our front desk operations. We\'ve seen a 30% increase in direct bookings since we switched."',
    name: "Marcus Thorne",
    role: "GM, Grand Palace Hotel",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuADZaMEZHYsGmggvkMTskkwLHRhgYXgmh7nSpTMCVyvGpRzdiljk6YlA4R_cTTyut2vHnG4xfP_zVy-iWYBg-su6097vrRQW0xLhlfG6t6nAht6oINM7GeL1B7jSdeyfQZ9rFNiubqcwSAYlwr5WudSK04YwtYF3USr2g90zzggXEhIwwGGU6U3K5xmAFe-v-c7hTy9XSlNEhcWjLS6ZHQ11pExmJLdBZM1ko9OYM19STXqx8kyzsmUcdlA8tpU0enbmA_AdThNpvb5",
  },
  {
    quote:
      '"The guest profile features are incredible. Our staff now knows exactly how to surprise and delight our repeat visitors."',
    name: "Elena Rodriguez",
    role: "Founder, Boutique Stays",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCV63ZyIj8E9yq49ai3uVJNNk91grieaYBPEQUlO-gXeSdRwIRfBJJpKE31Q5nNEzcHG_GpW1tM5njiVUZfKak4syqvG4R8lYhUTCF06xlQaPuNc6FLSfB7yMxtVNogH8MbIgOeEH9pr1DVLhUvnzJRZ_VQvgpcP9swlExHKGYfGowff5XDOMDyuwu3Wk38qlFG5cUA8T30AMO__TxPTry4LOvzon8taPQ241d5Z7bFr-jKA4uNtNJ9O0McFnD74meTMQdS0zwQiI-S",
  },
  {
    quote:
      '"Finally, a hotel management system that doesn\'t look like it was built in 1995. Clean, fast, and powerful."',
    name: "James Wilson",
    role: "CEO, Skyline Resorts",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDd0f4OFeUAA6_ncZ404kOOGbR8YeogRfsnFFqUp1HeDfCC4R-91LHcXie0IpmSfbxG8xq-Yaia_iRPTIdra3HHjI1UCvBeRkkEYWE-AGKq9a3wXFihQhSEx2bIPiBZAk_7UT2M38oIkZbNyDiKyd34vWy4xjcPDheCr6NgNJlYdTWZ6lJNc4lul5AMWOraR9KvTnStE1ztuC3SQNChYfyP7ROV7JXAetTlIFfo5RHQemNrQJE1yHUc2CH3HGlhyaXqBSDwGTi7GL9_",
  },
];

export default function PlatformLandingPage() {
  return (
    <div
      className="platform-landing min-h-screen bg-[#f8f6f6] text-slate-900 antialiased"
      style={{ fontFamily: "'Public Sans', sans-serif" }}
    >
      <PlatformNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-24 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="flex flex-col space-y-8">
              <div
                className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5"
                style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  Next-Gen Hospitality Tech
                </span>
              </div>
              <h1 className="text-5xl font-black leading-tight text-slate-900 lg:text-7xl">
                Elevate Every{" "}
                <span style={{ color: PRIMARY }}>Guest Journey.</span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-slate-600 lg:text-xl">
                The world&apos;s most intuitive all-in-one management system for luxury
                hotels. Streamline operations, automate bookings, and maximize your
                revenue effortlessly.
              </p>
              <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                <Link
                  href="/register-hotel"
                  className="group flex items-center justify-center gap-2 rounded-xl px-10 py-4 text-lg font-bold text-white transition-all hover:opacity-95"
                  style={{
                    background: `linear-gradient(135deg, ${PRIMARY} 0%, #ff8c42 100%)`,
                  }}
                >
                  Start Free Trial
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
                <a
                  href="#demo"
                  className="rounded-xl bg-slate-200 px-10 py-4 text-lg font-bold text-slate-900 transition-colors hover:bg-slate-300"
                >
                  Watch Demo
                </a>
              </div>
              <div className="flex items-center gap-6 pt-6">
                <div className="flex -space-x-3">
                  {AVATARS.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="h-12 w-12 rounded-full border-4 border-[#f8f6f6] object-cover"
                    />
                  ))}
                </div>
                <p className="text-sm font-medium text-slate-500">
                  Trusted by{" "}
                  <span className="font-bold text-slate-900">500+ Luxury Hotels</span>{" "}
                  worldwide
                </p>
              </div>
            </div>
            <div className="relative">
              <div
                className="absolute -right-10 -top-10 h-64 w-64 rounded-full blur-3xl opacity-30"
                style={{ backgroundColor: PRIMARY }}
              />
              <div
                className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full blur-3xl opacity-20"
                style={{ backgroundColor: PRIMARY }}
              />
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HERO_IMAGE}
                  alt="Luxury hotel lobby and dashboard interface"
                  className="h-auto w-full"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-8">
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-bold text-white">Real-time Occupancy</span>
                      <span
                        className="font-black"
                        style={{ color: PRIMARY }}
                      >
                        94.2%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full"
                        style={{ width: "94%", backgroundColor: PRIMARY }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="solutions" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-20 max-w-3xl space-y-4 text-center">
            <h2
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: PRIMARY }}
            >
              The LuxeStay Advantage
            </h2>
            <h3 className="text-4xl font-black text-slate-900 lg:text-5xl">
              Built for perfectionists.
            </h3>
            <p className="text-lg text-slate-600">
              We&apos;ve reimagined hotel management from the ground up, focusing on
              speed, elegance, and conversion.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="group rounded-3xl border border-transparent p-8 transition-all hover:border-[rgba(236,91,19,0.3)] hover:shadow-2xl"
              style={{
                backgroundColor: BG_LIGHT,
                boxShadow: "0 25px 50px rgba(236, 91, 19, 0.05)",
              }}
            >
              <div
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, #ff8c42 100%)`,
                  boxShadow: "0 10px 30px rgba(236, 91, 19, 0.25)",
                }}
              >
                <span className="material-symbols-outlined text-3xl">calendar_month</span>
              </div>
              <h4 className="mb-4 text-2xl font-bold text-slate-900">Smart Booking</h4>
              <p className="mb-6 leading-relaxed text-slate-600">
                A frictionless reservation system that converts visitors into guests
                with a 3-step checkout process.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BOOKING_IMG}
                alt="Booking interface preview"
                className="h-40 w-full rounded-xl object-cover grayscale transition-all group-hover:grayscale-0"
              />
            </div>
            <div className="group rounded-3xl border border-transparent p-8 transition-all hover:border-[rgba(236,91,19,0.3)] hover:shadow-2xl"
              style={{
                backgroundColor: BG_LIGHT,
                boxShadow: "0 25px 50px rgba(236, 91, 19, 0.05)",
              }}
            >
              <div
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, #ff8c42 100%)`,
                  boxShadow: "0 10px 30px rgba(236, 91, 19, 0.25)",
                }}
              >
                <span className="material-symbols-outlined text-3xl">analytics</span>
              </div>
              <h4 className="mb-4 text-2xl font-bold text-slate-900">Live Analytics</h4>
              <p className="mb-6 leading-relaxed text-slate-600">
                Track RevPAR, ADR, and occupancy rates in real-time with automated
                professional reporting.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ANALYTICS_IMG}
                alt="Analytics dashboard"
                className="h-40 w-full rounded-xl object-cover grayscale transition-all group-hover:grayscale-0"
              />
            </div>
            <div className="group rounded-3xl border border-transparent p-8 transition-all hover:border-[rgba(236,91,19,0.3)] hover:shadow-2xl"
              style={{
                backgroundColor: BG_LIGHT,
                boxShadow: "0 25px 50px rgba(236, 91, 19, 0.05)",
              }}
            >
              <div
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, #ff8c42 100%)`,
                  boxShadow: "0 10px 30px rgba(236, 91, 19, 0.25)",
                }}
              >
                <span className="material-symbols-outlined text-3xl">group</span>
              </div>
              <h4 className="mb-4 text-2xl font-bold text-slate-900">Guest CRM</h4>
              <p className="mb-6 leading-relaxed text-slate-600">
                Personalize guest experiences with detailed profiles, preferences, and
                automated loyalty tracking.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={GUEST_CRM_IMG}
                alt="Guest profile management"
                className="h-40 w-full rounded-xl object-cover grayscale transition-all group-hover:grayscale-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="overflow-hidden bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-16 lg:flex-row">
            <div className="space-y-8 lg:w-1/3">
              <h3 className="text-4xl font-black leading-tight">
                Master your operations with{" "}
                <span style={{ color: PRIMARY }}>one dashboard.</span>
              </h3>
              <ul className="space-y-6">
                {[
                  {
                    title: "Interactive Calendar",
                    desc: "Drag-and-drop bookings with ease.",
                  },
                  {
                    title: "Instant Billing",
                    desc: "Automated invoices and payment processing.",
                  },
                  {
                    title: "Multi-property Support",
                    desc: "Manage all your locations from a single login.",
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${PRIMARY}33`, color: PRIMARY }}
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                    </div>
                    <div>
                      <h5 className="text-lg font-bold">{item.title}</h5>
                      <p className="text-slate-400">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative lg:w-2/3">
              <div className="scale-110 translate-x-12 rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-2xl">
                <div className="mb-6 flex items-center gap-4 px-4">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="h-6 w-1/2 rounded-md bg-slate-700" />
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={DASHBOARD_IMG}
                  alt="Analytics dashboard UI"
                  className="w-full rounded-xl shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h3 className="mb-4 text-4xl font-black text-slate-900">
              Loved by Hoteliers
            </h3>
            <p className="text-slate-600">
              Hear from the people who keep the luxury world moving.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className="mb-6 flex gap-1"
                  style={{ color: PRIMARY }}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="material-symbols-outlined">
                      star
                    </span>
                  ))}
                </div>
                <p className="mb-8 text-lg italic leading-relaxed text-slate-700">
                  {t.quote}
                </p>
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.img}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <h5 className="font-bold text-slate-900">{t.name}</h5>
                    <p className="text-xs font-bold uppercase tracking-tight text-slate-500">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-12 lg:p-24">
            <div
              className="absolute inset-0 opacity-50"
              style={{ backgroundColor: `${PRIMARY}1A` }}
            />
            <div className="relative z-10 mx-auto max-w-2xl space-y-8">
              <h2 className="text-4xl font-black text-white lg:text-6xl">
                Ready to elevate your hotel?
              </h2>
              <p className="text-xl text-slate-400">
                Join hundreds of luxury hotels optimizing their performance today. No
                credit card required.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href="/register-hotel"
                  className="rounded-2xl px-12 py-5 text-xl font-bold text-white shadow-xl transition-all hover:opacity-95"
                  style={{
                    background: `linear-gradient(135deg, ${PRIMARY} 0%, #ff8c42 100%)`,
                    boxShadow: "0 20px 40px rgba(236, 91, 19, 0.25)",
                  }}
                >
                  Get Started Now
                </Link>
                <a
                  href="#demo"
                  className="rounded-2xl bg-white px-12 py-5 text-xl font-bold text-slate-900 transition-colors hover:bg-slate-100"
                >
                  Request Demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="resources"
        className="border-t border-slate-200 pt-24 pb-12"
        style={{ backgroundColor: BG_LIGHT }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 grid grid-cols-2 gap-12 md:grid-cols-4 lg:grid-cols-6">
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center rounded-lg p-2 text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <span className="material-symbols-outlined">domain</span>
                </div>
                <span className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                  LuxeStay
                </span>
              </div>
              <p className="max-w-xs text-slate-500">
                Empowering the world&apos;s most prestigious hotels with intelligent
                management software.
              </p>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-all hover:bg-primary hover:text-white"
                  aria-label="Web"
                >
                  <span className="material-symbols-outlined text-sm">public</span>
                </a>
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-all hover:bg-primary hover:text-white"
                  aria-label="Email"
                >
                  <span className="material-symbols-outlined text-sm">alternate_email</span>
                </a>
              </div>
            </div>
            <div>
              <h6 className="mb-6 font-bold text-slate-900">Product</h6>
              <ul className="space-y-4 text-sm text-slate-500">
                <li>
                  <a href="#solutions" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Features</a>
                </li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Integrations</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Direct Booking</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h6 className="mb-6 font-bold text-slate-900">Solutions</h6>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Boutique Hotels</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Luxury Resorts</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Aparthotels</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Hotel Chains</a></li>
              </ul>
            </div>
            <div>
              <h6 className="mb-6 font-bold text-slate-900">Company</h6>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>About Us</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Careers</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Contact</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Press</a></li>
              </ul>
            </div>
            <div>
              <h6 className="mb-6 font-bold text-slate-900">Resources</h6>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Blog</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Help Center</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>Community</a></li>
                <li><a href="#" className="transition-colors hover:opacity-80" style={{ color: "inherit" }}>API Docs</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6 border-t border-slate-200 pt-12 md:flex-row md:items-center">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} LuxeStay Technologies Inc. All rights reserved.
            </p>
            <div className="flex gap-8 text-xs text-slate-500">
              <a href="#" className="transition-colors hover:opacity-80">Privacy Policy</a>
              <a href="#" className="transition-colors hover:opacity-80">Terms of Service</a>
              <a href="#" className="transition-colors hover:opacity-80">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
