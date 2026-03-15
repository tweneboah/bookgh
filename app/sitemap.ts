import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hotelhub.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  let hotelSlugs: string[] = [];
  try {
    const res = await fetch(`${BASE_URL}/api/public/sitemap-slugs`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      hotelSlugs = json?.data?.slugs ?? [];
    }
  } catch {
    // If same-origin fetch fails (e.g. at build time), leave hotel slugs empty
  }

  const hotelEntries: MetadataRoute.Sitemap = hotelSlugs.map((slug) => ({
    url: `${BASE_URL}/hotels/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticRoutes, ...hotelEntries];
}
