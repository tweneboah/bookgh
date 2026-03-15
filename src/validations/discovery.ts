import { z } from "zod";
import { BadRequestError } from "@/lib/errors";

function parseNum(val: string | null, fallback: number): number {
  const n = val ? Number(val) : NaN;
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Discovery query params. When lat or lng is provided, both are required and validated.
 * sort: name | rating | -rating | distance (distance only when lat/lng provided).
 */
export const discoveryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  q: z.string().trim().optional(),
  lat: z.string().optional().transform((s) => (s ? parseNum(s, NaN) : undefined)),
  lng: z.string().optional().transform((s) => (s ? parseNum(s, NaN) : undefined)),
  radius: z.coerce.number().positive().max(500).default(50),
  excludeTenantId: z.string().trim().optional(),
  country: z.string().trim().optional(),
  region: z.string().trim().optional(),
  city: z.string().trim().optional(),
  starRating: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.enum(["name", "rating", "-rating", "distance"]).default("name"),
  publishedOnly: z
    .string()
    .optional()
    .transform((s) => s !== "false"),
});

export type DiscoveryQueryInput = z.infer<typeof discoveryQuerySchema>;

/**
 * Parse and validate discovery query from URLSearchParams.
 * Does not validate lat/lng ranges here; caller should throw BadRequestError when using geo and invalid.
 */
export function parseDiscoveryQuery(sp: URLSearchParams): DiscoveryQueryInput {
  const raw = {
    page: sp.get("page") ?? "1",
    limit: sp.get("limit") ?? "12",
    q: sp.get("q") ?? undefined,
    lat: sp.get("lat") ?? undefined,
    lng: sp.get("lng") ?? undefined,
  radius: sp.get("radius") ?? "50",
  excludeTenantId: sp.get("excludeTenantId") ?? undefined,
  country: sp.get("country") ?? undefined,
    region: sp.get("region") ?? undefined,
    city: sp.get("city") ?? undefined,
    starRating: sp.get("starRating") ?? undefined,
    sort: sp.get("sort") ?? "name",
    publishedOnly: sp.get("publishedOnly") ?? undefined,
  };
  return discoveryQuerySchema.parse(raw);
}

/** Call after parseDiscoveryQuery when using geo: ensures lat/lng valid. Throws BadRequestError if not. */
export function requireValidGeo(
  parsed: DiscoveryQueryInput
): { lat: number; lng: number; radius: number } {
  const lat = parsed.lat;
  const lng = parsed.lng;
  if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new BadRequestError("Valid lat and lng are required for location-based search.");
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new BadRequestError("lat must be between -90 and 90, lng between -180 and 180.");
  }
  return { lat, lng, radius: parsed.radius };
}
