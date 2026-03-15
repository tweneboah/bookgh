"use client";

import { use } from "react";
import Link from "next/link";
import { Calendar, Users, Building2, ChevronLeft } from "lucide-react";
import { useHotelDetail } from "@/hooks/api";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { getThemeStyle } from "@/constants/website-builder";

const FONT_INTER = { fontFamily: "Inter, system-ui, sans-serif" };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export default function HotelEventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const hall = hotel?.eventHalls?.find(
    (h: { _id: string }) => String(h._id) === String(id)
  ) as
    | {
        _id: string;
        name: string;
        description?: string;
        capacity?: number;
        hourlyRate?: number;
        images?: { url: string }[];
        amenities?: string[];
        layoutTypes?: string[];
      }
    | undefined;

  const primaryColor = hotel?.tenant?.primaryColor ?? "#5a189a";
  const accentColor = hotel?.tenant?.accentColor ?? "#ff6d00";
  const publicSiteConfig = hotel?.tenant?.publicSiteConfig as { theme?: { fontFamily?: string; fontSize?: string } } | undefined;
  const siteThemeStyle = getThemeStyle(publicSiteConfig?.theme);
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "Hotel";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white" style={FONT_INTER}>
        <PublicNavbar isTenantSite tenantSlug={slug} />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-6 h-8 w-2/3 animate-pulse rounded bg-slate-100" />
        </main>
      </div>
    );
  }

  if (isError || !hotel || !hall) {
    return (
      <div className="min-h-screen bg-white" style={FONT_INTER}>
        <PublicNavbar isTenantSite tenantSlug={slug} />
        <main className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <Calendar className="mx-auto h-14 w-14 text-slate-300" strokeWidth={1.25} />
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Event space not found</h2>
          <p className="mt-2 text-slate-500">This venue may no longer be available.</p>
          <Link
            href={`/hotels/${slug}#event-halls`}
            className="mt-6 inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)` }}
          >
            View all event spaces
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={siteThemeStyle}>
      <PublicNavbar
        isTenantSite
        tenantSlug={slug}
        tenantName={hotelName}
        tenantLogo={hotel?.tenant?.logo}
        theme={{ primaryColor, accentColor }}
        platformLoginUrl={process.env.NEXT_PUBLIC_APP_URL ?? undefined}
        bookNowReturnTo={`/hotels/${slug}`}
      />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        <Link
          href={`/hotels/${slug}#event-halls`}
          className="inline-flex items-center gap-1 text-sm font-medium hover:text-slate-900"
          style={{ color: primaryColor }}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to event spaces
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {hall.name}
        </h1>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
          {hall.images?.[0]?.url ? (
            <img
              src={hall.images[0].url}
              alt={hall.name}
              className="aspect-[16/10] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center">
              <Calendar className="h-20 w-20 text-slate-300" strokeWidth={1.25} />
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {hall.capacity != null && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" style={{ color: primaryColor }} strokeWidth={2} />
                  Up to {hall.capacity} guests
                </span>
              )}
              {hall.hourlyRate != null && (
                <span className="flex items-center gap-1.5">
                  {fmt(hall.hourlyRate)}/hr
                </span>
              )}
            </div>
            {hall.description && (
              <p className="mt-4 text-slate-600 leading-relaxed">{hall.description}</p>
            )}
            {hall.layoutTypes && hall.layoutTypes.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Layout options</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {hall.layoutTypes.map((t) => (
                    <span
                      key={t}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-1.5 text-sm font-medium text-slate-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {hall.amenities && hall.amenities.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Amenities</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {hall.amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-1.5 text-sm font-medium text-slate-600"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 sm:w-56">
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              {hall.hourlyRate != null && (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold" style={{ color: accentColor }}>
                    {fmt(hall.hourlyRate)}
                  </span>
                  <span className="text-slate-500">/ hour</span>
                </div>
              )}
              <Link href={`/hotels/${slug}#contact`}>
                <span
                  className="mt-4 flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`,
                    boxShadow: `0 2px 8px ${accentColor}40`,
                  }}
                >
                  Enquire / Book
                </span>
              </Link>
              <p className="mt-2 text-center text-xs text-slate-500">
                Contact us for availability and booking
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
