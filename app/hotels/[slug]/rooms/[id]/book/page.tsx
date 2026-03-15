"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHotelDetail } from "@/hooks/api";
import { usePublicBooking, useInitializePayment } from "@/hooks/api";
import { useAppSelector } from "@/store/hooks";
import { StayDatePicker } from "@/components/public/stay-date-picker";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";
import toast from "react-hot-toast";

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
function getDayAfterTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split("T")[0];
}

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

type RoomCategory = {
  _id: string;
  name: string;
  basePrice: number;
  maxOccupancy: number;
  images?: { url: string; caption?: string }[];
};

function CheckoutFonts() {
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

export default function RoomBookPage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; adults?: string; children?: string }>;
}) {
  const { slug, id } = use(params);
  const searchParams = use(searchParamsPromise ?? Promise.resolve({}));
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const room = hotel?.roomCategories?.find(
    (c: { _id: string }) => String(c._id) === String(id)
  ) as RoomCategory | undefined;

  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "Hotel";
  const branchName = hotel?.name ?? hotelName;

  const [stayDates, setStayDates] = useState<{ checkIn: string; checkOut: string }>(() => ({
    checkIn: searchParams.checkIn ?? getTomorrow(),
    checkOut: searchParams.checkOut ?? getDayAfterTomorrow(),
  }));
  const [stayGuests, setStayGuests] = useState({ adults: Math.max(1, parseInt(searchParams.adults ?? "2", 10) || 2), children: Math.max(0, parseInt(searchParams.children ?? "0", 10) || 0) });

  useEffect(() => {
    setStayDates({
      checkIn: searchParams.checkIn ?? getTomorrow(),
      checkOut: searchParams.checkOut ?? getDayAfterTomorrow(),
    });
    setStayGuests({
      adults: Math.max(1, parseInt(searchParams.adults ?? "2", 10) || 2),
      children: Math.max(0, parseInt(searchParams.children ?? "0", 10) || 0),
    });
  }, [searchParams.checkIn, searchParams.checkOut, searchParams.adults, searchParams.children]);

  const checkIn = stayDates.checkIn;
  const checkOut = stayDates.checkOut;
  const adults = stayGuests.adults;
  const children = stayGuests.children;

  const nights = !checkIn || !checkOut ? 0 : Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
  const roomRate = (room?.basePrice ?? 0) * nights;
  const serviceFee = Math.round(roomRate * 0.05);
  const taxes = Math.round(roomRate * 0.1);
  const totalPrice = roomRate + serviceFee + taxes;

  const [guest, setGuest] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bookMutation = usePublicBooking();
  const payMutation = useInitializePayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !hotel) return;
    if (!guest.firstName.trim() || !guest.lastName.trim() || !guest.email.trim()) {
      toast.error("Please fill in all required guest details.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await bookMutation.mutateAsync({
        hotelId: slug,
        roomCategoryId: room._id,
        checkIn,
        checkOut,
        numberOfGuests: adults + children,
        specialRequests: undefined,
        guest: {
          firstName: guest.firstName.trim(),
          lastName: guest.lastName.trim(),
          email: guest.email.trim(),
          phone: guest.phone.trim() || undefined,
        },
      });
      const bookingData = res.data;
      if (bookingData.requiresPayment && hotel.acceptsOnlinePayment) {
        const payRes = await payMutation.mutateAsync({
          hotelId: slug,
          bookingReference: bookingData.bookingReference,
          email: guest.email.trim(),
          callbackUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/booking/callback?hotel=${slug}`,
        });
        if (payRes.data?.authorizationUrl) {
          window.location.href = payRes.data.authorizationUrl;
          return;
        }
        toast.error("Payment could not be started. Please contact support.");
      } else {
        toast.success("Booking confirmed!");
        router.push(`/hotels/${slug}?booked=1`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Booking failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const guestLabel = children > 0 ? `${adults} Adults, ${children} Child${children !== 1 ? "ren" : ""}` : `${adults} Guest${adults !== 1 ? "s" : ""}`;
  const freeCancelDate = new Date(checkIn);
  freeCancelDate.setDate(freeCancelDate.getDate() - 2);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900" style={FONT_WORK_SANS}>
        <CheckoutFonts />
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:px-20">
          <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:py-12">
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
            </div>
            <div className="h-96 animate-pulse rounded-xl bg-slate-200" />
          </div>
        </main>
      </div>
    );
  }

  if (isError || !hotel || !room) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900 flex items-center justify-center" style={FONT_WORK_SANS}>
        <CheckoutFonts />
        <div className="text-center px-6">
          <span className="material-symbols-outlined text-6xl text-slate-400">bed</span>
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Room or hotel not found</h2>
          <Link href={`/hotels/${slug}`} className="mt-6 inline-block text-sm font-bold" style={{ color: primaryColor }}>
            Back to hotel
          </Link>
        </div>
      </div>
    );
  }

  const roomImage = room.images?.[0]?.url || "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800";
  const acceptsPaystack = Boolean(hotel?.acceptsOnlinePayment);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f6f8] text-slate-900 font-display" style={{ ...FONT_WORK_SANS, ["--primary" as string]: primaryColor } as React.CSSProperties}>
      <CheckoutFonts />
      <style jsx global>{`
        .material-symbols-outlined { font-size: 20px; }
        .checkout-input:focus { outline: none; box-shadow: 0 0 0 2px var(--primary); border-color: var(--primary); }
      `}</style>

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:py-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-8 text-sm flex-wrap">
          <Link href={`/hotels/${slug}`} className="font-medium hover:opacity-80" style={{ color: primaryColor }}>Search</Link>
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          <Link href={`/hotels/${slug}/rooms`} className="font-medium hover:opacity-80" style={{ color: primaryColor }}>Room Selection</Link>
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          <span className="font-bold text-slate-900">Checkout</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Forms */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h1 className="text-3xl font-bold mb-2 text-slate-900">Complete your booking</h1>
              <p className="text-slate-500">Please enter your details and payment information to confirm your stay.</p>
            </section>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Dates & guests */}
              <section className="bg-white p-6 rounded-xl border shadow-sm" style={{ borderColor: `${primaryColor}1a` }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined" style={{ color: primaryColor }}>calendar_month</span>
                  <h3 className="text-xl font-bold text-slate-900">Dates &amp; Guests</h3>
                </div>
                <StayDatePicker
                  value={stayDates}
                  onChange={setStayDates}
                  primaryColor={primaryColor}
                  guests={stayGuests}
                  onGuestsChange={setStayGuests}
                  variant="default"
                />
              </section>

              {/* Guest Details */}
              <section className="bg-white p-6 rounded-xl border shadow-sm" style={{ borderColor: `${primaryColor}1a` }}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined" style={{ color: primaryColor }}>person_outline</span>
                  <h3 className="text-xl font-bold text-slate-900">Guest Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-900">First Name</label>
                    <input
                      type="text"
                      placeholder="John"
                      value={guest.firstName}
                      onChange={(e) => setGuest((g) => ({ ...g, firstName: e.target.value }))}
                      className="rounded-lg border bg-[#f6f6f8] px-3 py-2.5 text-slate-900 placeholder-slate-400 checkout-input"
                      style={{ borderColor: `${primaryColor}33` }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-900">Last Name</label>
                    <input
                      type="text"
                      placeholder="Doe"
                      value={guest.lastName}
                      onChange={(e) => setGuest((g) => ({ ...g, lastName: e.target.value }))}
                      className="rounded-lg border bg-[#f6f6f8] px-3 py-2.5 text-slate-900 placeholder-slate-400 checkout-input"
                      style={{ borderColor: `${primaryColor}33` }}
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-900">Email Address</label>
                    <input
                      type="email"
                      placeholder="john.doe@example.com"
                      value={guest.email}
                      onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
                      className="rounded-lg border bg-[#f6f6f8] px-3 py-2.5 text-slate-900 placeholder-slate-400 checkout-input"
                      style={{ borderColor: `${primaryColor}33` }}
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-900">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={guest.phone}
                      onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))}
                      className="rounded-lg border bg-[#f6f6f8] px-3 py-2.5 text-slate-900 placeholder-slate-400 checkout-input"
                      style={{ borderColor: `${primaryColor}33` }}
                    />
                  </div>
                </div>
              </section>

              {/* Payment Information — Paystack */}
              <section className="bg-white p-6 rounded-xl border shadow-sm" style={{ borderColor: `${primaryColor}1a` }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined" style={{ color: primaryColor }}>payments</span>
                  <h3 className="text-xl font-bold text-slate-900">Payment Information</h3>
                </div>
                {acceptsPaystack ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 flex gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                      <span className="material-symbols-outlined text-2xl" style={{ color: primaryColor }}>lock</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">Pay securely with Paystack</p>
                      <p className="text-sm text-slate-600 mt-1">
                        When you click &quot;Confirm and Pay&quot;, you&apos;ll be redirected to Paystack to complete your payment. Card and mobile money options are available. Your details are never stored on our site.
                      </p>
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">verified</span>
                        Secured by Paystack
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 flex gap-3">
                    <span className="material-symbols-outlined text-amber-600 shrink-0">info</span>
                    <div>
                      <p className="font-semibold text-amber-900">Online payment not available</p>
                      <p className="text-sm text-amber-800 mt-1">
                        This property hasn&apos;t enabled online payments. Your booking can be confirmed and you&apos;ll pay at the property. We&apos;ll send your confirmation to your email.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white font-bold py-4 rounded-xl transition-all shadow-lg disabled:opacity-70"
                style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}33` }}
              >
                {isSubmitting ? "Processing…" : `Confirm and Pay ${fmt(totalPrice)}`}
              </button>
              <p className="text-center text-xs text-slate-400">By clicking the button, you agree to our Terms of Service and Cancellation Policy.</p>
            </form>
          </div>

          {/* Right: Summary */}
          <div className="space-y-6">
            <section className="bg-white rounded-xl border shadow-sm overflow-hidden sticky top-8" style={{ borderColor: `${primaryColor}1a` }}>
              <div
                className="aspect-video w-full bg-slate-200 bg-center bg-cover"
                style={{ backgroundImage: `url('${roomImage}')` }}
                aria-label={`${room.name} room`}
              />
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: primaryColor }}>Stay Summary</p>
                    <h3 className="text-lg font-bold text-slate-900">{room.name}</h3>
                    <p className="text-sm text-slate-500">{branchName}</p>
                  </div>
                  <div className="flex items-center text-yellow-500">
                    <span className="material-symbols-outlined text-sm fill-current">star</span>
                    <span className="text-sm font-bold ml-1 text-slate-900">4.9</span>
                  </div>
                </div>
                <hr className="my-4" style={{ borderColor: `${primaryColor}0d` }} />
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">calendar_today</span>
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">Dates</p>
                      <p className="text-slate-500">
                        {new Date(checkIn).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} - {new Date(checkOut).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ({nights} Night{nights !== 1 ? "s" : ""})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">group</span>
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">Guests</p>
                      <p className="text-slate-500">{guestLabel}</p>
                    </div>
                  </div>
                </div>
                <hr className="my-6" style={{ borderColor: `${primaryColor}0d` }} />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Room rate ({nights} nights)</span>
                    <span className="text-slate-900">{fmt(roomRate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Service fee</span>
                    <span className="text-slate-900">{fmt(serviceFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Occupancy taxes</span>
                    <span className="text-slate-900">{fmt(taxes)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-4 border-t border-dashed mt-4" style={{ borderColor: `${primaryColor}33` }}>
                    <span className="text-slate-900">Total Price</span>
                    <span style={{ color: primaryColor }}>{fmt(totalPrice)}</span>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: `${primaryColor}0d` }}>
                  <span className="material-symbols-outlined shrink-0" style={{ color: primaryColor }}>info</span>
                  <p className="text-xs leading-relaxed text-slate-600">
                    Free cancellation until {freeCancelDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. Non-refundable after this date.
                  </p>
                </div>
              </div>
            </section>
            <div className="flex flex-wrap justify-center gap-4 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
              <span className="material-symbols-outlined text-slate-500">verified_user</span>
              <span className="material-symbols-outlined text-slate-500">security</span>
              <span className="material-symbols-outlined text-slate-500">lock</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-10 border-t text-center" style={{ borderColor: `${primaryColor}1a` }}>
        <p className="text-slate-400 text-sm">© {new Date().getFullYear()} {hotelName}. All rights reserved.</p>
      </footer>
    </div>
  );
}
