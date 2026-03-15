"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BedDouble,
  MapPin,
  Star,
  Users,
  Phone,
  Mail,
  Clock,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Maximize2,
  CreditCard,
  Sparkles,
  ExternalLink,
  Heart,
  Zap,
  ArrowRight,
  BookOpen,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WebsiteBlock } from "@/types/website-builder";

const FONT_INTER = { fontFamily: "Inter, system-ui, sans-serif" };

const CTA_ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Sparkles,
  Calendar,
  BedDouble,
  Star,
  Heart,
  Zap,
  ArrowRight,
  ChevronRight,
  BookOpen,
  MapPin,
  Phone,
  Mail,
  Gift,
};

type HeroCtaStyle = "pill-filled" | "pill-outline" | "text" | "underline" | "ghost" | "soft-pill" | "caps" | "minimal";

function getHeroCtaProps(
  ctaStyle: HeroCtaStyle,
  primary: string,
  accent: string,
  isOnDark: boolean,
  size: "lg" | "sm" = "lg"
): { className: string; style: React.CSSProperties } {
  const pad = size === "sm" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5 text-base";
  const base = `inline-flex items-center justify-center gap-2 font-semibold transition rounded-xl ${pad}`;
  if (ctaStyle === "pill-filled") {
    return {
      className: base + " text-white shadow-md hover:opacity-95 hover:shadow-lg",
      style: {
        background: `linear-gradient(135deg, ${accent} 0%, ${primary} 100%)`,
        boxShadow: `0 4px 14px ${primary}59`,
        border: "none",
      },
    };
  }
  if (ctaStyle === "pill-outline") {
    return {
      className: base + " bg-transparent hover:opacity-90",
      style: isOnDark
        ? { border: "2px solid rgba(255,255,255,0.9)", color: "#fff" }
        : { border: `2px solid ${primary}`, color: primary },
    };
  }
  if (ctaStyle === "text") {
    return {
      className: base + " bg-transparent hover:opacity-80",
      style: isOnDark ? { color: "#fff" } : { color: primary },
    };
  }
  if (ctaStyle === "underline") {
    return {
      className: base + " bg-transparent border-b-2 border-transparent hover:border-current",
      style: isOnDark ? { color: "#fff" } : { color: primary },
    };
  }
  if (ctaStyle === "ghost") {
    return {
      className: base + " bg-transparent " + (isOnDark ? "hover:bg-white/15" : "hover:bg-slate-100"),
      style: isOnDark ? { color: "#fff" } : { color: primary },
    };
  }
  if (ctaStyle === "soft-pill") {
    return {
      className: base + " hover:opacity-90",
      style: {
        backgroundColor: isOnDark ? "rgba(255,255,255,0.2)" : `${primary}18`,
        color: isOnDark ? "#fff" : primary,
        border: "none",
      },
    };
  }
  if (ctaStyle === "caps") {
    return {
      className: base + " text-xs uppercase tracking-wider bg-transparent hover:opacity-80",
      style: isOnDark ? { color: "#fff" } : { color: primary },
    };
  }
  // minimal
  return {
    className: base + " text-sm bg-transparent hover:opacity-80",
    style: isOnDark ? { color: "rgba(255,255,255,0.95)" } : { color: primary },
  };
}

export interface HotelBlockContext {
  hotel: Record<string, any>;
  primaryColor: string;
  accentColor: string;
  slug: string;
  openBooking: (category?: any) => void;
  fmt: (n: number) => string;
  location: string;
  hotelName: string;
  minPrice: number | null;
  nearbyHotels: any[];
}

function ImageGalleryBlock({
  images,
  accentColor,
}: {
  images: { url: string; caption?: string }[];
  accentColor: string;
}) {
  const [current, setCurrent] = useState(0);
  if (!images?.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-slate-100 sm:h-72 lg:h-[380px]" style={FONT_INTER}>
        <BedDouble className="h-16 w-16 text-slate-300" strokeWidth={1.25} />
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-2xl" style={FONT_INTER}>
      <div className="relative aspect-[16/10] min-h-[220px] sm:min-h-[280px] lg:min-h-[380px]">
        <img src={images[current].url} alt={images[current].caption || "Hotel"} className="h-full w-full object-cover" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(36, 0, 70, 0.75) 0%, transparent 50%)" }} />
        {images[current].caption && (
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3 text-sm text-white/95">{images[current].caption}</div>
        )}
      </div>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2.5 shadow-lg hover:bg-white" aria-label="Previous">
            <ChevronLeft className="h-5 w-5 text-slate-700" />
          </button>
          <button type="button" onClick={() => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2.5 shadow-lg hover:bg-white" aria-label="Next">
            <ChevronRight className="h-5 w-5 text-slate-700" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button key={i} type="button" onClick={() => setCurrent(i)} className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/80"}`} aria-label={`Image ${i + 1}`} />
            ))}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button key={i} type="button" onClick={() => setCurrent(i)} className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${i === current ? "ring-2" : "border-transparent opacity-70 hover:opacity-100"}`} style={i === current ? { borderColor: accentColor, boxShadow: `0 0 0 2px ${accentColor}33` } : undefined}>
                <img src={img.url} alt={img.caption || `Image ${i + 1}`} className="h-14 w-20 object-cover sm:h-16 sm:w-24" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function HotelBlockRenderer({
  block,
  ctx,
  fullWidthContainer = false,
}: {
  block: WebsiteBlock;
  ctx: HotelBlockContext;
  /** When true, hero image is full viewport width (no negative margins); content below is wrapped in max-w-5xl */
  fullWidthContainer?: boolean;
}) {
  const { hotel, primaryColor, accentColor, slug, openBooking, fmt, location, hotelName, minPrice, nearbyHotels } = ctx;
  const p = block.props ?? {};
  const sectionClass = "mt-10";

  switch (block.type) {
    case "hero": {
      type HeroStyle = "gallery" | "fullwidth" | "minimal" | "split" | "split_right" | "overlay_center" | "overlay_bottom" | "card" | "tall" | "compact" | "layered";
      const heroStyle = (p.style as HeroStyle) || "gallery";
      const heroCtaStyle = (p.ctaStyle as HeroCtaStyle) || "pill-filled";
      const images = (p.imageUrl as string)?.trim() ? [{ url: (p.imageUrl as string).trim(), caption: undefined }] : hotel.images;
      const imageList = images ?? [];
      const firstImage = imageList[0]?.url;
      const headline = (p.headline as string)?.trim() || hotelName;
      const subheadline = (p.subheadline as string)?.trim();

      const ctaPropsLight = getHeroCtaProps(heroCtaStyle, primaryColor, accentColor, false, "lg");
      const ctaPropsDark = getHeroCtaProps(heroCtaStyle, primaryColor, accentColor, true, "lg");
      const ctaPropsCompact = getHeroCtaProps(heroCtaStyle, primaryColor, accentColor, false, "sm");

      const wrapContent = (node: React.ReactNode) =>
        fullWidthContainer ? <div className="mx-auto max-w-5xl px-4 sm:px-6">{node}</div> : node;
      const img = (aspect: string, minH: string) =>
        fullWidthContainer
          ? `relative w-full ${aspect} ${minH} overflow-hidden`
          : `relative -mx-4 ${aspect} ${minH} overflow-hidden sm:-mx-6 lg:-mx-8`;

      const contentBlock = (
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{headline}</h1>
            {subheadline && <p className="mt-2 text-slate-600">{subheadline}</p>}
            {location && (
              <p className="mt-2 flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} style={{ color: primaryColor }} />
                {location}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {hotel.rating != null && hotel.rating > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-amber-800" style={{ backgroundColor: "rgba(251, 191, 36, 0.2)" }}>
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  {Number(hotel.rating).toFixed(1)}
                </span>
              )}
              {hotel.tenant?.starRating && <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{hotel.tenant.starRating}-star hotel</span>}
              {hotel.breakfastIncluded && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"><UtensilsCrossed className="h-3.5 w-3.5" /> Breakfast included</span>}
              {hotel.refundableBooking && <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Free cancellation</span>}
              {hotel.acceptsOnlinePayment && <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"><CreditCard className="h-3.5 w-3.5" /> Pay online</span>}
            </div>
          </div>
          {minPrice != null && (
            <div className="shrink-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">From</p>
              <p className="text-2xl font-bold sm:text-3xl" style={{ color: accentColor }}>{fmt(minPrice)}</p>
              <p className="text-sm text-slate-500">per night</p>
              <button type="button" onClick={() => openBooking()} className={`mt-3 w-full sm:w-auto ${ctaPropsLight.className}`} style={ctaPropsLight.style}>
                <Sparkles className="h-4 w-4" strokeWidth={2} /> Book now
              </button>
            </div>
          )}
        </div>
      );

      const heroImageArea = (className: string, overlay?: React.ReactNode) => (
        <div className={className}>
          {firstImage ? (
            <img src={firstImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-200">
              <BedDouble className="h-16 w-16 text-slate-400" strokeWidth={1.25} />
            </div>
          )}
          {overlay}
        </div>
      );

      if (heroStyle === "fullwidth" || heroStyle === "overlay_bottom") {
        return (
          <section className="hero hero-fullwidth">
            {heroImageArea(
              img("aspect-[21/9]", "min-h-[200px]"),
              <>
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white sm:p-6">
                  <h1 className="text-2xl font-bold tracking-tight drop-shadow sm:text-3xl">{headline}</h1>
                  {subheadline && <p className="mt-1 text-sm text-white/90 sm:text-base">{subheadline}</p>}
                </div>
              </>
            )}
            {wrapContent(contentBlock)}
          </section>
        );
      }

      if (heroStyle === "overlay_center") {
        return (
          <section className="hero hero-overlay-center">
            {heroImageArea(
              img("aspect-[21/9]", "min-h-[220px]"),
              <>
                <div className="absolute inset-0 pointer-events-none bg-black/50" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                  <h1 className="text-2xl font-bold tracking-tight drop-shadow-md sm:text-4xl">{headline}</h1>
                  {subheadline && <p className="mt-2 text-sm text-white/90 sm:text-lg">{subheadline}</p>}
                  {minPrice != null && (
                    <div className="mt-4">
                      <span className="text-2xl font-bold sm:text-3xl">{fmt(minPrice)}</span>
                      <span className="ml-1 text-white/80">/ night</span>
                    </div>
                  )}
                  <button type="button" onClick={() => openBooking()} className={`mt-4 ${ctaPropsDark.className}`} style={ctaPropsDark.style}>
                    Book now
                  </button>
                </div>
              </>
            )}
            {wrapContent(
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-slate-600">
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" style={{ color: primaryColor }} /> {location}
                  </span>
                )}
              </div>
            )}
          </section>
        );
      }

      if (heroStyle === "layered") {
        return (
          <section className="hero hero-layered">
            {heroImageArea(
              img("aspect-[2/1]", "min-h-[280px]"),
              <>
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${primaryColor}e6 0%, ${primaryColor}99 50%, transparent 100%)` }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                  <h1 className="text-3xl font-bold tracking-tight drop-shadow-lg sm:text-5xl">{headline}</h1>
                  {subheadline && <p className="mt-3 max-w-xl text-base text-white/95 sm:text-lg">{subheadline}</p>}
                  <button type="button" onClick={() => openBooking()} className={`mt-6 ${ctaPropsDark.className}`} style={ctaPropsDark.style}>
                    Book now
                  </button>
                </div>
              </>
            )}
            {wrapContent(contentBlock)}
          </section>
        );
      }

      if (heroStyle === "tall") {
        return (
          <section className="hero hero-tall">
            {heroImageArea(
              img("aspect-[5/2]", "min-h-[260px]"),
              <>
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{headline}</h1>
                  {subheadline && <p className="mt-2 text-white/90">{subheadline}</p>}
                </div>
              </>
            )}
            {wrapContent(contentBlock)}
          </section>
        );
      }

      if (heroStyle === "card") {
        const cardWrapperClass = fullWidthContainer
          ? "relative w-full min-h-[320px] overflow-hidden rounded-none sm:rounded-2xl"
          : "relative -mx-4 min-h-[320px] overflow-hidden rounded-2xl sm:-mx-6 lg:-mx-8";
        return (
          <section className="hero hero-card">
            <div className={cardWrapperClass}>
              {heroImageArea("relative aspect-[21/10] min-h-[240px] w-full", null)}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:left-6 sm:right-auto sm:bottom-6 sm:max-w-md sm:rounded-2xl sm:bg-white sm:p-6 sm:shadow-xl">
                <h1 className="text-xl font-bold tracking-tight text-white drop-shadow sm:text-2xl sm:text-slate-900">{headline}</h1>
                {subheadline && <p className="mt-1 text-sm text-white/90 sm:text-slate-600">{subheadline}</p>}
                {minPrice != null && (
                  <p className="mt-2 text-white sm:text-slate-900">
                    <span className="text-lg font-bold sm:text-xl" style={{ color: accentColor }}>{fmt(minPrice)}</span>
                    <span className="text-sm opacity-90">/ night</span>
                  </p>
                )}
                <button type="button" onClick={() => openBooking()} className={`mt-3 w-full sm:w-auto ${ctaPropsLight.className}`} style={ctaPropsLight.style}>
                  Book now
                </button>
              </div>
            </div>
            {wrapContent(
              <div className="mt-4 flex flex-wrap gap-2">
                {location && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-4 w-4" style={{ color: primaryColor }} /> {location}
                  </span>
                )}
              </div>
            )}
          </section>
        );
      }

      if (heroStyle === "split" || heroStyle === "split_right") {
        const imageFirst = heroStyle === "split";
        return (
          <section className="hero hero-split">
            <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:gap-0">
              {imageFirst && (
                <div className="relative h-56 w-full shrink-0 overflow-hidden rounded-2xl md:h-auto md:w-1/2">
                  {firstImage ? <img src={firstImage} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-slate-200"><BedDouble className="h-14 w-14 text-slate-400" /></div>}
                </div>
              )}
              <div className="flex flex-1 flex-col justify-center py-4 md:py-8 md:px-10">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{headline}</h1>
                {subheadline && <p className="mt-2 text-slate-600">{subheadline}</p>}
                {location && (
                  <p className="mt-2 flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} style={{ color: primaryColor }} />
                    {location}
                  </p>
                )}
                {minPrice != null && (
                  <div className="mt-4">
                    <p className="text-2xl font-bold" style={{ color: accentColor }}>{fmt(minPrice)} <span className="text-sm font-normal text-slate-500">/ night</span></p>
                    <button type="button" onClick={() => openBooking()} className={`mt-3 ${ctaPropsLight.className}`} style={ctaPropsLight.style}>
                      Book now
                    </button>
                  </div>
                )}
              </div>
              {!imageFirst && (
                <div className="relative h-56 w-full shrink-0 overflow-hidden rounded-2xl md:h-auto md:w-1/2">
                  {firstImage ? <img src={firstImage} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-slate-200"><BedDouble className="h-14 w-14 text-slate-400" /></div>}
                </div>
              )}
            </div>
          </section>
        );
      }

      if (heroStyle === "compact") {
        return (
          <section className="hero hero-compact">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
              <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-48">
                {firstImage ? <img src={firstImage} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-slate-200"><BedDouble className="h-10 w-10 text-slate-400" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{headline}</h1>
                {subheadline && <p className="mt-1 text-sm text-slate-600">{subheadline}</p>}
                {location && <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" style={{ color: primaryColor }} /> {location}</p>}
              </div>
              {minPrice != null && (
                <div className="shrink-0">
                  <p className="text-lg font-bold" style={{ color: accentColor }}>{fmt(minPrice)}</p>
                  <p className="text-xs text-slate-500">/ night</p>
                  <button type="button" onClick={() => openBooking()} className={`mt-2 ${ctaPropsCompact.className}`} style={ctaPropsCompact.style}>
                    Book
                  </button>
                </div>
              )}
            </div>
          </section>
        );
      }

      if (heroStyle === "minimal") {
        return (
          <section className="hero hero-minimal">
            <div className="relative overflow-hidden rounded-2xl aspect-[3/1] min-h-[160px] bg-slate-100">
              {firstImage ? <img src={firstImage} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><BedDouble className="h-12 w-12 text-slate-400" strokeWidth={1.25} /></div>}
            </div>
            {contentBlock}
          </section>
        );
      }

      return (
        <section className="hero hero-gallery">
          <ImageGalleryBlock images={imageList} accentColor={accentColor} />
          {contentBlock}
        </section>
      );
    }
    case "text": {
      const align = (p.align as string) || "left";
      return (
        <section className={sectionClass}>
          <div style={{ textAlign: align === "center" ? "center" : align === "right" ? "right" : "left" }}>
            {(p.heading as string) && <h2 className="text-lg font-semibold text-slate-900">{p.heading}</h2>}
            {(p.body as string) && <p className="mt-3 leading-relaxed text-slate-600 whitespace-pre-wrap">{p.body}</p>}
          </div>
        </section>
      );
    }
    case "image":
      if (!(p.imageUrl as string)?.trim()) return null;
      return (
        <section className={sectionClass}>
          <figure className="overflow-hidden rounded-2xl">
            <img src={(p.imageUrl as string).trim()} alt={(p.alt as string) || ""} className="h-full w-full object-cover" />
            {(p.caption as string) && <figcaption className="mt-2 text-sm text-slate-500">{(p.caption as string)}</figcaption>}
          </figure>
        </section>
      );
    case "gallery": {
      const urls = (p.imageUrls as string[])?.filter(Boolean) ?? [];
      const images = urls.length > 0 ? urls.map((url) => ({ url, caption: undefined })) : hotel.images ?? [];
      return (
        <section className={sectionClass}>
          <ImageGalleryBlock images={images} accentColor={accentColor} />
        </section>
      );
    }
    case "about":
      if (!hotel.tenant?.description) return null;
      return (
        <section className={sectionClass}>
          <Card className="overflow-hidden border-slate-100 bg-white shadow-sm" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(36, 0, 70, 0.04)" }}>
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-slate-900">About</h2>
              <p className="mt-3 leading-relaxed text-slate-600">{hotel.tenant.description}</p>
            </CardContent>
          </Card>
        </section>
      );
    case "amenities":
      if (!hotel.amenities?.length) return null;
      return (
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900">Amenities</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(hotel.amenities as string[]).map((a: string) => (
              <span key={a} className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-sm font-medium text-slate-700" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <Sparkles className="h-4 w-4" strokeWidth={2} style={{ color: primaryColor }} /> {a}
              </span>
            ))}
          </div>
        </section>
      );
    case "rooms":
      if (!hotel.roomCategories?.length) return null;
      return (
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900">Rooms</h2>
          <p className="mt-1 text-sm text-slate-500">Choose a room and book in a few steps</p>
          <div className="mt-4 space-y-6">
            {(hotel.roomCategories as any[]).map((cat: any) => (
              <Card key={cat._id} className="overflow-hidden border-slate-100 bg-white transition hover:shadow-md" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(36, 0, 70, 0.04)" }}>
                <div className="flex flex-col sm:flex-row">
                  {cat.images?.[0]?.url ? (
                    <div className="h-52 w-full shrink-0 sm:h-auto sm:w-64">
                      <img src={cat.images[0].url} alt={cat.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-52 w-full items-center justify-center bg-slate-50 sm:h-auto sm:w-64">
                      <BedDouble className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                  <CardContent className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                    <div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">{cat.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold" style={{ color: accentColor }}>{fmt(cat.basePrice)}</span>
                          <span className="text-sm text-slate-500">/ night</span>
                        </div>
                      </div>
                      {cat.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{cat.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                        <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-[#5a189a]" strokeWidth={2} /> Up to {cat.maxOccupancy} guests</span>
                        {cat.bedType && <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-[#5a189a]" strokeWidth={2} /> {cat.bedType}</span>}
                        {cat.roomSize != null && <span className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4 text-[#5a189a]" strokeWidth={2} /> {cat.roomSize} sq ft</span>}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Link href={`/hotels/${slug}/rooms/${cat._id}`} className="text-sm font-semibold hover:underline" style={{ color: primaryColor }}>View details</Link>
                        <Button className="font-semibold" onClick={() => openBooking(cat)} style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`, color: "white", border: "none", boxShadow: `0 2px 8px ${accentColor}40` }}>
                          Book this room
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </section>
      );
    case "event_halls":
      if (!hotel.eventHalls?.length) return null;
      return (
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900">Event spaces</h2>
          <p className="mt-1 text-sm text-slate-500">Venues for meetings and events</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(hotel.eventHalls as any[]).map((hall: any) => (
              <Card key={hall._id} className="overflow-hidden border-slate-100 bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(36, 0, 70, 0.04)" }}>
                {hall.images?.[0]?.url ? <img src={hall.images[0].url} alt={hall.name} className="h-40 w-full object-cover" /> : <div className="flex h-40 items-center justify-center bg-slate-50"><Calendar className="h-10 w-10 text-slate-300" /></div>}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900">{hall.name}</h3>
                  {hall.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{hall.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                    {hall.capacity != null && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-[#5a189a]" /> {hall.capacity} guests</span>}
                    {hall.hourlyRate != null && <span>{fmt(hall.hourlyRate)}/hr</span>}
                  </div>
                  <Link href={`/hotels/${slug}/events/${hall._id}`} className="mt-3 inline-block text-sm font-semibold hover:underline" style={{ color: primaryColor }}>View details</Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );
    case "playgrounds":
      if (!hotel.playgroundAreas?.length) return null;
      return (
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900">Playgrounds</h2>
          <p className="mt-1 text-sm text-slate-500">Family-friendly areas for kids and activities</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(hotel.playgroundAreas as any[]).map((area: any) => (
              <Card key={area._id} className="overflow-hidden border-slate-100 bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(36, 0, 70, 0.04)" }}>
                {area.images?.[0]?.url ? <img src={area.images[0].url} alt={area.name} className="h-40 w-full object-cover" /> : <div className="flex h-40 items-center justify-center bg-slate-50"><Sparkles className="h-10 w-10 text-slate-300" /></div>}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900">{area.name}</h3>
                  {area.type && <p className="mt-0.5 text-xs font-medium capitalize text-slate-500">{area.type}</p>}
                  {area.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{area.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                    {area.capacity != null && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-[#5a189a]" /> {area.capacity} guests</span>}
                    {area.hourlyRate != null && area.hourlyRate > 0 && <span>{fmt(area.hourlyRate)}/hr</span>}
                    {area.dailyRate != null && area.dailyRate > 0 && <span>{fmt(area.dailyRate)}/day</span>}
                  </div>
                  <Link href={`/hotels/${slug}/playgrounds/${area._id}`} className="mt-3 inline-block text-sm font-semibold hover:underline" style={{ color: primaryColor }}>View details</Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );
    case "contact":
      return (
        <section className={sectionClass}>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="border-slate-100 bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(36, 0, 70, 0.04)" }}>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900">Contact</h3>
                <div className="mt-4 space-y-3">
                  {hotel.contactPhone && <a href={`tel:${hotel.contactPhone}`} className="flex items-center gap-3 text-sm font-medium text-slate-600 hover:text-[#5a189a]"><Phone className="h-4 w-4 shrink-0 text-[#5a189a]" /> {hotel.contactPhone}</a>}
                  {hotel.contactEmail && <a href={`mailto:${hotel.contactEmail}`} className="flex items-center gap-3 text-sm font-medium text-slate-600 hover:text-[#5a189a]"><Mail className="h-4 w-4 shrink-0 text-[#5a189a]" /> {hotel.contactEmail}</a>}
                  {hotel.address?.street && <p className="flex items-start gap-3 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#5a189a]" /> {[hotel.address.street, hotel.address.city, hotel.address.region, hotel.address.country].filter(Boolean).join(", ")}</p>}
                  {hotel.tenant?.website && <a href={hotel.tenant.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "#5a189a" }}><ExternalLink className="h-4 w-4" /> Visit website</a>}
                </div>
              </CardContent>
            </Card>
            {hotel.operatingHours?.checkIn && (
              <Card className="border-slate-100 bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(36, 0, 70, 0.04)" }}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900">Hours</h3>
                  <div className="mt-4 space-y-3">
                    {hotel.operatingHours.checkIn && <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><Clock className="h-4 w-4 text-[#5a189a]" /> Check-in</span><span className="font-medium text-slate-900">{hotel.operatingHours.checkIn}</span></div>}
                    {hotel.operatingHours.checkOut && <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-600"><Clock className="h-4 w-4 text-[#5a189a]" /> Check-out</span><span className="font-medium text-slate-900">{hotel.operatingHours.checkOut}</span></div>}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      );
    case "cta": {
      const heading = (p.heading as string) || "Ready to book?";
      const buttonText = (p.buttonText as string) || "Book now";
      const action = (p.action as string) || "book";
      const iconName = (p.icon as string) || "Sparkles";
      const CtaIcon = CTA_ICON_MAP[iconName as keyof typeof CTA_ICON_MAP] ?? Sparkles;
      return (
        <section className={sectionClass}>
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(36, 0, 70, 0.04)" }}>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{heading}</h2>
            <Button className="mt-4 font-semibold gap-2" size="lg" onClick={() => (action === "book" ? openBooking() : document.getElementById("contact-section")?.scrollIntoView({ behavior: "smooth" }))} style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`, color: "white", border: "none", boxShadow: `0 4px 14px ${accentColor}59` }}>
              <CtaIcon className="h-4 w-4" strokeWidth={2} />
              {buttonText}
            </Button>
          </div>
        </section>
      );
    }
    case "footer": {
      const text = (p.text as string)?.trim();
      const links = (p.links as { label: string; url: string }[]) ?? [];
      const showSocial = p.showSocial !== false;
      const socialLinks = hotel.tenant?.socialLinks;
      return (
        <footer id="contact-section" className="mt-14 border-t border-slate-100 py-10" style={{ boxShadow: "0 -1px 0 rgba(0,0,0,0.06)" }}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {text && <p className="max-w-md text-sm leading-relaxed text-slate-600">{text}</p>}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              {links.length > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {links.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium transition hover:opacity-80" style={{ color: primaryColor }}>{link.label}</a>
                  ))}
                </div>
              )}
              {showSocial && socialLinks && (
                <div className="flex gap-3">
                  {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:opacity-80" aria-label="Facebook"><ExternalLink className="h-4 w-4" /></a>}
                  {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:opacity-80" aria-label="Instagram"><ExternalLink className="h-4 w-4" /></a>}
                  {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:opacity-80" aria-label="Twitter"><ExternalLink className="h-4 w-4" /></a>}
                </div>
              )}
            </div>
          </div>
        </footer>
      );
    }
    case "nearby":
      if (!nearbyHotels?.length) return null;
      return (
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold text-slate-900">Hotels nearby</h2>
          <p className="mt-1 text-sm text-slate-500">Other properties within 10 km</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {nearbyHotels.slice(0, 4).map((h: any) => (
              <Link key={h._id} href={`/hotels/${h.slug || h._id}`} className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3 transition hover:border-[#9d4edd]/30 hover:shadow-md" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                {h.primaryBranch?.images?.[0]?.url ? <img src={h.primaryBranch.images[0].url} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" /> : <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100"><BedDouble className="h-8 w-8 text-slate-300" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{h.name ?? "Hotel"}</p>
                  {typeof h.distanceKm === "number" && <p className="mt-0.5 text-xs text-slate-500">{h.distanceKm} km away</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      );
    default:
      return null;
  }
}
