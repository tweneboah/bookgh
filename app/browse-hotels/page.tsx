"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlatformNav } from "@/components/layout/platform-nav";
import { Building2, MapPin, Star, ExternalLink } from "lucide-react";

const PRIMARY = "#5a189a";
const ACCENT = "#ff6d00";

interface DiscoveryHotel {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  starRating?: number;
  country?: string;
  region?: string;
  city?: string;
  address?: { city?: string; region?: string; country?: string };
  primaryBranch?: {
    slug: string;
    images?: string[];
    rating?: number;
    minPrice?: number | null;
    maxPrice?: number | null;
  } | null;
}

interface DiscoveryResponse {
  data?: DiscoveryHotel[];
  meta?: { pagination?: { total?: number; page?: number; totalPages?: number } };
}

export default function BrowseHotelsPage() {
  const [hotels, setHotels] = useState<DiscoveryHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    total: number;
    totalPages: number;
  } | null>(null);

  useEffect(() => {
    async function fetchHotels() {
      try {
        const res = await fetch("/api/discovery?limit=24&page=1&sort=name");
        const json: DiscoveryResponse = await res.json();
        if (!res.ok) {
          setError("Unable to load hotels. Please try again.");
          return;
        }
        const list = Array.isArray(json?.data) ? json.data : [];
        setHotels(list);
        const pag = json?.meta?.pagination;
        if (pag) {
          setPagination({
            page: pag.page ?? 1,
            total: pag.total ?? list.length,
            totalPages: pag.totalPages ?? 1,
          });
        }
      } catch {
        setError("Unable to load hotels. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchHotels();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PlatformNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Browse Hotels
          </h1>
          <p className="mt-2 text-slate-600">
            Discover hotels and venues. Visit their official site to book rooms, events, and more.
          </p>
        </div>

        {loading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#5a189a]" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && hotels.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 font-medium text-slate-700">No hotels to show yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Check back later or list your property to appear here.
            </p>
          </div>
        )}

        {!loading && !error && hotels.length > 0 && (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {hotels.map((hotel) => {
                const href = `/hotels/${hotel.slug}`;
                const location = [
                  hotel.city ?? hotel.address?.city,
                  hotel.region ?? hotel.address?.region,
                  hotel.country ?? hotel.address?.country,
                ]
                  .filter(Boolean)
                  .join(", ");
                const image =
                  hotel.primaryBranch?.images?.[0]?.url ?? hotel.logo ?? null;

                return (
                  <li key={hotel._id}>
                    <Link
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="aspect-4/3 w-full overflow-hidden bg-slate-100">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-300">
                            <Building2 className="h-16 w-16" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-semibold text-slate-900 group-hover:text-[#5a189a]">
                            {hotel.name}
                          </h2>
                          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            <ExternalLink className="inline h-3 w-3" /> Visit site
                          </span>
                        </div>
                        {typeof hotel.starRating === "number" && hotel.starRating > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-amber-600">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="text-sm font-medium">{hotel.starRating}</span>
                          </div>
                        )}
                        {location && (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{location}</span>
                          </p>
                        )}
                        {hotel.primaryBranch?.minPrice != null && (
                          <p className="mt-2 text-sm font-medium text-slate-700">
                            From{" "}
                            {new Intl.NumberFormat("en-GH", {
                              style: "currency",
                              currency: "GHS",
                              maximumFractionDigits: 0,
                            }).format(hotel.primaryBranch.minPrice)}{" "}
                            / night
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {pagination && pagination.totalPages > 1 && (
              <p className="mt-6 text-center text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} hotels
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
