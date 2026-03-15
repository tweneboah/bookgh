"use client";

import { use } from "react";
import Link from "next/link";
import { Users, Clock, Building2, ChevronLeft, Sparkles } from "lucide-react";
import { useHotelDetail } from "@/hooks/api";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { getThemeStyle } from "@/constants/website-builder";

const FONT_INTER = { fontFamily: "Inter, system-ui, sans-serif" };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export default function HotelPlaygroundDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const area = hotel?.playgroundAreas?.find(
    (a: { _id: string }) => String(a._id) === String(id)
  ) as
    | {
        _id: string;
        name: string;
        description?: string;
        type?: string;
        capacity?: number;
        openingTime?: string;
        closingTime?: string;
        hourlyRate?: number;
        dailyRate?: number;
        amenities?: string[];
        images?: { url: string; caption?: string }[];
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

  if (isError || !hotel || !area) {
    return (
      <div className="min-h-screen bg-white" style={FONT_INTER}>
        <PublicNavbar isTenantSite tenantSlug={slug} />
        <main className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <Sparkles className="mx-auto h-14 w-14 text-slate-300" strokeWidth={1.25} />
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Playground not found</h2>
          <p className="mt-2 text-slate-500">This area may no longer be available.</p>
          <Link
            href={`/hotels/${slug}#playgrounds`}
            className="mt-6 inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)` }}
          >
            View all playgrounds
          </Link>
        </main>
      </div>
    );
  }

  const images = area.images?.length ? area.images : [];

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
          href={`/hotels/${slug}#playgrounds`}
          className="inline-flex items-center gap-1 text-sm font-medium hover:text-slate-900"
          style={{ color: primaryColor }}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to playgrounds
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {area.name}
        </h1>
        {area.type && (
          <p className="mt-1 text-sm font-medium capitalize text-slate-500">{area.type}</p>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
          {images[0]?.url ? (
            <img
              src={images[0].url}
              alt={area.name}
              className="aspect-[16/10] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center">
              <Sparkles className="h-20 w-20 text-slate-300" strokeWidth={1.25} />
            </div>
          )}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {images.slice(1, 6).map((img: { url: string; caption?: string }, i: number) => (
                <img
                  key={i}
                  src={img.url}
                  alt={img.caption || `${area.name} ${i + 2}`}
                  className="h-20 w-28 shrink-0 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {area.capacity != null && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" style={{ color: primaryColor }} strokeWidth={2} />
                  Up to {area.capacity} guests
                </span>
              )}
              {(area.openingTime || area.closingTime) && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" style={{ color: primaryColor }} strokeWidth={2} />
                  {area.openingTime && area.closingTime
                    ? `${area.openingTime} – ${area.closingTime}`
                    : area.openingTime || area.closingTime || ""}
                </span>
              )}
            </div>
            {area.description && (
              <p className="mt-4 text-slate-600 leading-relaxed">{area.description}</p>
            )}
            {area.amenities && area.amenities.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Amenities</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {area.amenities.map((a) => (
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
              {(area.hourlyRate != null && area.hourlyRate > 0) || (area.dailyRate != null && area.dailyRate > 0) ? (
                <div className="space-y-1">
                  {area.hourlyRate != null && area.hourlyRate > 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold" style={{ color: accentColor }}>
                        {fmt(area.hourlyRate)}
                      </span>
                      <span className="text-slate-500">/ hour</span>
                    </div>
                  )}
                  {area.dailyRate != null && area.dailyRate > 0 && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold" style={{ color: accentColor }}>
                        {fmt(area.dailyRate)}
                      </span>
                      <span className="text-slate-500">/ day</span>
                    </div>
                  )}
                </div>
              ) : null}
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
