"use client";

import { use } from "react";
import Link from "next/link";
import {
  BedDouble,
  Calendar,
  UtensilsCrossed,
  Phone,
  Building2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useHotelDetail } from "@/hooks/api";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { Card, CardContent } from "@/components/ui/card";
import { getThemeStyle } from "@/constants/website-builder";

const FONT_INTER = { fontFamily: "Inter, system-ui, sans-serif" };

export default function HotelBookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const primaryColor = hotel?.tenant?.primaryColor ?? "#5a189a";
  const accentColor = hotel?.tenant?.accentColor ?? "#ff6d00";
  const publicSiteConfig = hotel?.tenant?.publicSiteConfig as { theme?: { fontFamily?: string; fontSize?: string } } | undefined;
  const siteThemeStyle = getThemeStyle(publicSiteConfig?.theme);
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "Hotel";

  const hasRooms = (hotel?.roomCategories?.length ?? 0) > 0;
  const hasEventHalls = (hotel?.eventHalls?.length ?? 0) > 0;
  const hasPlaygrounds = (hotel?.playgroundAreas?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white" style={FONT_INTER}>
        <PublicNavbar isTenantSite tenantSlug={slug} />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="h-8 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (isError || !hotel) {
    return (
      <div className="min-h-screen bg-white" style={FONT_INTER}>
        <PublicNavbar isTenantSite tenantSlug={slug} />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <Building2 className="mx-auto h-14 w-14 text-slate-300" strokeWidth={1.25} />
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Hotel not found</h2>
          <p className="mt-2 text-slate-500">This hotel may no longer be available.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`,
            }}
          >
            Browse hotels
          </Link>
        </main>
      </div>
    );
  }

  const baseUrl = `/hotels/${slug}`;
  const services: { id: string; title: string; description: string; href: string; icon: React.ReactNode }[] = [];

  if (hasRooms) {
    services.push({
      id: "rooms",
      title: "Room Booking",
      description: "Choose a room and book your stay in a few steps.",
      href: `${baseUrl}#rooms`,
      icon: <BedDouble className="h-6 w-6" strokeWidth={2} />,
    });
  }
  if (hasEventHalls) {
    services.push({
      id: "event-halls",
      title: "Event Hall",
      description: "Venues for meetings, conferences, and events.",
      href: `${baseUrl}#event-halls`,
      icon: <Calendar className="h-6 w-6" strokeWidth={2} />,
    });
  }
  if (hasPlaygrounds) {
    services.push({
      id: "playgrounds",
      title: "Playgrounds",
      description: "Family-friendly areas for kids and activities.",
      href: `${baseUrl}#playgrounds`,
      icon: <Sparkles className="h-6 w-6" strokeWidth={2} />,
    });
  }
  services.push({
    id: "restaurant",
    title: "Restaurant & Dining",
    description: "Dine with us. Reservations and walk-ins welcome.",
    href: baseUrl,
    icon: <UtensilsCrossed className="h-6 w-6" strokeWidth={2} />,
  });
  services.push({
    id: "contact",
    title: "Contact",
    description: "Get in touch — phone, email, and address.",
    href: `${baseUrl}#contact`,
    icon: <Phone className="h-6 w-6" strokeWidth={2} />,
  });

  return (
    <div className="min-h-screen bg-white" style={siteThemeStyle}>
      <PublicNavbar
        isTenantSite
        tenantSlug={slug}
        tenantName={hotel.tenant?.name}
        tenantLogo={hotel.tenant?.logo}
        theme={{ primaryColor, accentColor }}
        platformLoginUrl={process.env.NEXT_PUBLIC_APP_URL ?? undefined}
        bookNowReturnTo={`/hotels/${slug}`}
      />

      <main className="mx-auto max-w-3xl px-4 py-10 pb-24 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Book our services
        </h1>
        <p className="mt-2 text-slate-600">
          Select a service to view options and book on our website.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <Link key={service.id} href={service.href}>
              <Card
                className="h-full border-slate-100 bg-white transition hover:border-slate-200 hover:shadow-md"
                style={{
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(36, 0, 70, 0.04)",
                }}
              >
                <CardContent className="flex flex-col p-5 sm:p-6">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`,
                      boxShadow: `0 2px 8px ${accentColor}40`,
                    }}
                  >
                    {service.icon}
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-slate-900">
                    {service.title}
                  </h2>
                  <p className="mt-1 flex-1 text-sm text-slate-600">
                    {service.description}
                  </p>
                  <span
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold"
                    style={{ color: primaryColor }}
                  >
                    View & book
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          All links open on this hotel&apos;s website. Need help?{" "}
          <Link href={`${baseUrl}#contact`} className="font-medium underline" style={{ color: primaryColor }}>
            Contact us
          </Link>
        </p>
      </main>
    </div>
  );
}
