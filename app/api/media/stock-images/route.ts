import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";

function requireQuery(q: string | null): string {
  const v = (q ?? "").trim();
  if (!v) throw new BadRequestError("Query is required");
  return v;
}

function clampInt(raw: string | null, def: number, min: number, max: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export const GET = withHandler(async (req) => {
  const q = requireQuery(req.nextUrl.searchParams.get("q"));
  const page = clampInt(req.nextUrl.searchParams.get("page"), 1, 1, 50);
  const perPage = clampInt(req.nextUrl.searchParams.get("perPage"), 18, 6, 30);

  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) throw new BadRequestError("Missing PIXABAY_API_KEY");
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("safesearch", "true");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new BadRequestError(
      `Pixabay error (${res.status}): ${text || "Request failed"}`
    );
  }
  const data = (await res.json()) as any;
  const hits = Array.isArray(data?.hits) ? data.hits : [];
  return successResponse({
    provider: "pixabay",
    page,
    perPage,
    totalResults: Number(data?.totalHits ?? 0),
    results: hits.map((h: any) => ({
      id: String(h?.id ?? ""),
      alt: String(h?.tags ?? ""),
      photographer: String(h?.user ?? ""),
      photographerUrl: String(h?.pageURL ?? ""),
      sourcePage: String(h?.pageURL ?? ""),
      thumb: String(h?.webformatURL ?? h?.previewURL ?? ""),
      full: String(h?.largeImageURL ?? h?.webformatURL ?? ""),
    })),
  });
});

