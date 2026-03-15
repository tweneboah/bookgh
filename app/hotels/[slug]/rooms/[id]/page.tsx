"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useHotelDetail, useHotelAvailability } from "@/hooks/api";
import { BookingModal } from "@/components/public/booking-modal";
import { StayDatePicker } from "@/components/public/stay-date-picker";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";
import { getThemeStyle } from "@/constants/website-builder";

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
  description?: string;
  basePrice: number;
  maxOccupancy: number;
  amenities?: string[];
  images?: { url: string; caption?: string }[];
  bedType?: string;
  roomSize?: number;
};

/** Injects Work Sans + Material Symbols for this page only */
function RoomDetailFonts() {
  useEffect(() => {
    const links = [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700;900&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0",
      },
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
    return () => {
      els.forEach((el) => el.remove());
    };
  }, []);
  return null;
}

export default function HotelRoomDetailPage({
  params,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; adults?: string; children?: string }>;
}) {
  const { slug, id } = use(params);
  const searchParams = use(searchParamsPromise ?? Promise.resolve({}));
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const room = hotel?.roomCategories?.find(
    (c: { _id: string }) => String(c._id) === String(id)
  ) as RoomCategory | undefined;

  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const publicSiteConfig = hotel?.tenant?.publicSiteConfig as { theme?: { fontFamily?: string; fontSize?: string } } | undefined;
  const siteThemeStyle = getThemeStyle(publicSiteConfig?.theme);
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "Hotel";
  const branchName = hotel?.name ?? hotelName;

  const [stayDates, setStayDates] = useState<{ checkIn: string; checkOut: string }>(() => ({
    checkIn: searchParams.checkIn ?? getTomorrow(),
    checkOut: searchParams.checkOut ?? getDayAfterTomorrow(),
  }));
  const [guests, setGuests] = useState({ adults: Math.max(1, parseInt(searchParams.adults ?? "2", 10) || 2), children: Math.max(0, parseInt(searchParams.children ?? "0", 10) || 0) });

  useEffect(() => {
    setStayDates({
      checkIn: searchParams.checkIn ?? getTomorrow(),
      checkOut: searchParams.checkOut ?? getDayAfterTomorrow(),
    });
    setGuests({
      adults: Math.max(1, parseInt(searchParams.adults ?? "2", 10) || 2),
      children: Math.max(0, parseInt(searchParams.children ?? "0", 10) || 0),
    });
  }, [searchParams.checkIn, searchParams.checkOut, searchParams.adults, searchParams.children]);

  const checkIn = stayDates.checkIn;
  const checkOut = stayDates.checkOut;
  const adults = guests.adults;
  const children = guests.children;

  const datesValid = checkIn && checkOut && checkIn < checkOut;
  useHotelAvailability(slug, datesValid ? { checkIn, checkOut, roomCategoryId: id } : { checkIn: "", checkOut: "" });

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  const pricePerNight = room?.basePrice ?? 0;
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round(subtotal * 0.05);
  const totalCost = subtotal + serviceFee;

  const [bookingOpen, setBookingOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900" style={{ ...FONT_WORK_SANS, ...siteThemeStyle }}>
        <RoomDetailFonts />
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 md:px-10 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto w-full px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-3 h-[500px] mb-8">
            <div className="md:col-span-2 md:row-span-2 rounded-xl bg-slate-200 animate-pulse" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl bg-slate-200 animate-pulse" />
            ))}
          </div>
          <div className="h-12 w-3/4 animate-pulse rounded bg-slate-200" />
        </main>
      </div>
    );
  }

  if (isError || !hotel || !room) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900" style={{ ...FONT_WORK_SANS, ...siteThemeStyle }}>
        <RoomDetailFonts />
        <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} />
        <main className="max-w-7xl mx-auto w-full px-4 py-16 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-400">bed</span>
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Room not found</h2>
          <p className="mt-2 text-slate-500">This room may no longer be available.</p>
          <Link
            href={`/hotels/${slug}/rooms`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            View all rooms
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </main>
      </div>
    );
  }

  const images = room.images?.length ? room.images : [{ url: "", caption: room.name }];
  const hasImages = images.some((i) => i.url);
  const displayImages = hasImages ? images : [
    { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800", caption: room.name },
    { url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800", caption: "" },
    { url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800", caption: "" },
    { url: "https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800", caption: "" },
    { url: "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800", caption: "" },
  ];
  const placeholderImg = { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800", caption: room.name };
  const gallerySlots = [
    { span: "md:col-span-2 md:row-span-2", img: displayImages[0] ?? placeholderImg, label: "Main" },
    { span: "", img: displayImages[1] ?? placeholderImg, label: null },
    { span: "", img: displayImages[2] ?? placeholderImg, label: null },
    { span: "", img: displayImages[3] ?? placeholderImg, label: null },
    { span: "", img: displayImages[4] ?? placeholderImg, label: null, viewAll: true },
  ];

  const locationParts = [
    hotel.address?.street,
    hotel.city ?? hotel.address?.city,
    hotel.region ?? hotel.address?.region,
    hotel.country ?? hotel.address?.country,
  ].filter(Boolean);
  const locationText = locationParts.length ? locationParts.join(", ") : "Central location";

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f6f8] text-slate-900" style={{ ...FONT_WORK_SANS, ...siteThemeStyle }}>
      <RoomDetailFonts />
      <style jsx global>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .material-symbols-outlined.fill-1 { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      `}</style>

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Hero Gallery */}
        <div id="hero-gallery" className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-3 h-[320px] sm:h-[420px] md:h-[500px] mb-8">
          {gallerySlots.map((slot, idx) => (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-xl bg-slate-200 ${slot.span} ${slot.viewAll ? "group" : ""}`}
            >
              {slot.img?.url ? (
                <img
                  src={slot.img.url}
                  alt={slot.img.caption || room.name}
                  className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500 group-hover:opacity-60"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-slate-400">image</span>
                </div>
              )}
              {slot.label && (
                <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                  {slot.label === "Main" ? room.name : slot.label}
                </div>
              )}
              {slot.viewAll && (
                <a
                  href="#hero-gallery"
                  className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold cursor-pointer hover:bg-black/50 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined">grid_view</span> View All
                  </span>
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Room Details */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                  Editor&apos;s Choice
                </span>
                <div className="flex" style={{ color: primaryColor }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="material-symbols-outlined text-sm shrink-0">star</span>
                  ))}
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4">{room.name}</h1>
              <p className="text-slate-600 text-lg leading-relaxed max-w-2xl">
                {room.description || `Experience comfort and style in our ${room.name}. This room offers modern amenities and a relaxing atmosphere for your stay.`}
              </p>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-100 rounded-xl">
              <div className="flex flex-col items-center text-center gap-1">
                <span className="material-symbols-outlined" style={{ color: primaryColor }}>aspect_ratio</span>
                <span className="text-xs uppercase font-bold text-slate-500">Space</span>
                <span className="font-semibold">{room.roomSize ? `${room.roomSize} sqm` : "—"}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <span className="material-symbols-outlined" style={{ color: primaryColor }}>person</span>
                <span className="text-xs uppercase font-bold text-slate-500">Guests</span>
                <span className="font-semibold">Up to {room.maxOccupancy}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <span className="material-symbols-outlined" style={{ color: primaryColor }}>bed</span>
                <span className="text-xs uppercase font-bold text-slate-500">Beds</span>
                <span className="font-semibold">{room.bedType || "—"}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <span className="material-symbols-outlined" style={{ color: primaryColor }}>visibility</span>
                <span className="text-xs uppercase font-bold text-slate-500">View</span>
                <span className="font-semibold">City View</span>
              </div>
            </div>

            {/* Amenities */}
            {room.amenities && room.amenities.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ color: primaryColor }}>spa</span>
                  Suite Amenities
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                  {room.amenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="material-symbols-outlined opacity-70" style={{ color: primaryColor }}>check_circle</span>
                      <span className="text-sm font-medium">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Summary (placeholder – can be wired to real data later) */}
            <div className="pt-8 border-t border-slate-200">
              <div className="flex flex-wrap gap-8">
                <div className="flex flex-col gap-2">
                  <p className="text-slate-900 text-4xl font-black leading-tight tracking-tight">4.9</p>
                  <div className="flex gap-0.5" style={{ color: primaryColor }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="material-symbols-outlined fill-1">star</span>
                    ))}
                  </div>
                  <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Guest reviews</p>
                </div>
                <div className="flex-1 min-w-[280px] max-w-md space-y-2">
                  {[5, 4, 3, 2].map((star, i) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-4">{star}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: i === 0 ? "92%" : i === 1 ? "6%" : i === 2 ? "2%" : "0%", backgroundColor: primaryColor }} />
                      </div>
                      <span className="text-xs font-medium text-slate-500 w-8 text-right">{i === 0 ? "92%" : i === 1 ? "6%" : i === 2 ? "2%" : "0%"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 border border-slate-200 bg-white rounded-2xl shadow-xl p-8 space-y-6">
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-3xl font-black text-slate-900">{fmt(pricePerNight)}</span>
                  <span className="text-slate-500 text-sm font-medium"> / night</span>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>BEST VALUE</span>
              </div>
              <StayDatePicker
                value={stayDates}
                onChange={setStayDates}
                primaryColor={primaryColor}
                guests={guests}
                onGuestsChange={setGuests}
                variant="compact"
              />
              <div className="pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{nights} Night{nights !== 1 ? "s" : ""} x {fmt(pricePerNight)}</span>
                  <span className="font-bold">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cleaning &amp; Service Fee</span>
                  <span className="font-bold">{fmt(serviceFee)}</span>
                </div>
                <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between">
                  <span className="text-lg font-bold">Total Cost</span>
                  <span className="text-lg font-black" style={{ color: primaryColor }}>{fmt(totalCost)}</span>
                </div>
              </div>
              <Link
                href={`/hotels/${slug}/rooms/${id}/book?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`}
                className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:opacity-95"
                style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}40` }}
              >
                <span>Book Now</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <p className="text-center text-xs text-slate-500 font-medium italic">No immediate charges. Free cancellation until 48h before.</p>
            </div>
          </div>
        </div>

        {/* Map Section — OpenStreetMap (free, no API key) */}
        <div className="mt-16 bg-white rounded-2xl overflow-hidden border border-slate-200">
          <div className="p-8">
            <h3 className="text-2xl font-bold mb-2">Location</h3>
            <p className="text-slate-500 text-sm font-medium mb-6">{locationText}</p>
            <div className="relative h-64 md:h-80 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              {(() => {
                const coords = (hotel as { location?: { type: string; coordinates?: [number, number] } })?.location?.coordinates;
                const [lng, lat] = coords ?? [];
                const hasCoords = typeof lng === "number" && typeof lat === "number";
                const delta = 0.008;
                const bbox = hasCoords
                  ? `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
                  : null;
                const osmEmbedUrl = bbox
                  ? `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`
                  : null;
                const osmSearchUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(locationText)}`;
                const osmViewUrl = hasCoords
                  ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
                  : osmSearchUrl;
                if (osmEmbedUrl) {
                  return (
                    <>
                      <iframe
                        title="Location map"
                        src={osmEmbedUrl}
                        className="w-full h-full border-0"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                      <div className="mt-2 text-right">
                        <a
                          href={osmViewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                          style={{ color: primaryColor }}
                        >
                          <span className="material-symbols-outlined text-lg">open_in_new</span>
                          Open in OpenStreetMap
                        </a>
                      </div>
                    </>
                  );
                }
                return (
                  <>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                      <div className="p-3 rounded-full text-white shadow-lg" style={{ backgroundColor: primaryColor }}>
                        <span className="material-symbols-outlined text-3xl">location_on</span>
                      </div>
                      <p className="text-slate-600 text-sm text-center">Map coordinates not set for this property.</p>
                      <a
                        href={osmSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold hover:underline inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 bg-white"
                        style={{ color: primaryColor }}
                      >
                        <span className="material-symbols-outlined text-lg">map</span>
                        Search address on OpenStreetMap
                      </a>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 bg-slate-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6" style={{ color: primaryColor }}>
              <span className="material-symbols-outlined text-3xl font-bold">corporate_fare</span>
              <h2 className="text-white text-xl font-black leading-tight tracking-tight">{hotelName}</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {hotel.tenant?.description || `Welcome to ${hotelName}. Book your stay and enjoy our services.`}
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest">Navigation</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><Link href={`/hotels/${slug}/rooms`} className="hover:opacity-80 transition-opacity" style={{ color: "inherit" }}>Find a Room</Link></li>
              <li><Link href={`/hotels/${slug}#amenities`} className="hover:opacity-80 transition-opacity" style={{ color: "inherit" }}>Our Amenities</Link></li>
              <li><Link href={`/hotels/${slug}#contact`} className="hover:opacity-80 transition-opacity" style={{ color: "inherit" }}>Contact</Link></li>
              <li><Link href={`/hotels/${slug}`} className="hover:opacity-80 transition-opacity" style={{ color: "inherit" }}>About {branchName}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest">Connect</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              {hotel.contactEmail && (
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">mail</span>
                  <a href={`mailto:${hotel.contactEmail}`} className="hover:text-white transition-colors">{hotel.contactEmail}</a>
                </li>
              )}
              {hotel.contactPhone && (
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">call</span>
                  <a href={`tel:${hotel.contactPhone}`} className="hover:text-white transition-colors">{hotel.contactPhone}</a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest">Newsletter</h4>
            <div className="flex">
              <input
                type="email"
                placeholder="Email"
                className="bg-slate-800 border-none rounded-l-lg px-4 py-2 text-sm w-full focus:ring-1 focus:outline-none text-white placeholder-slate-500"
                style={{ ["--tw-ring-color" as string]: primaryColor }}
              />
              <button type="button" className="px-4 rounded-r-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: primaryColor }}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {hotelName}. All rights reserved.
        </div>
      </footer>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        hotelSlug={slug}
        hotelName={hotel.tenant?.name ? `${hotel.tenant.name} — ${hotel.name}` : hotel.name}
        acceptsOnlinePayment={hotel.acceptsOnlinePayment}
        contactPhone={hotel.contactPhone}
        contactEmail={hotel.contactEmail}
        preselectedCategory={{ _id: room._id, name: room.name, basePrice: room.basePrice, maxOccupancy: room.maxOccupancy }}
        categories={hotel.roomCategories?.map((c: RoomCategory) => ({ _id: c._id, name: c.name, basePrice: c.basePrice, maxOccupancy: c.maxOccupancy })) ?? []}
      />
    </div>
  );
}
