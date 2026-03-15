import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import Branch from "@/models/branch/Branch";
import Tenant from "@/models/tenant/Tenant";
import RoomCategory from "@/models/room/RoomCategory";
import { TENANT_STATUS } from "@/constants";
import {
  parseDiscoveryQuery,
  requireValidGeo,
  type DiscoveryQueryInput,
} from "@/validations/discovery";

/**
 * Public hotel discovery — search by hotel (tenant) name and hotel location.
 * No auth required. Returns hotels (tenants) that have at least one published branch.
 *
 * When lat/lng provided: uses $geoNear, returns distanceKm per hotel, validates lat/lng.
 * When no results in radius: fallback to non-geo list with distanceKm: null.
 *
 * Query params: q, lat, lng, radius, country, region, city, starRating, sort (name|rating|-rating|distance), page, limit
 */
export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  let parsed: DiscoveryQueryInput;
  try {
    parsed = parseDiscoveryQuery(sp);
  } catch (e) {
    const { BadRequestError } = await import("@/lib/errors");
    throw new BadRequestError(
      e instanceof Error ? e.message : "Invalid discovery query parameters"
    );
  }

  const {
    page,
    limit,
    q,
    country,
    region,
    city,
    starRating,
    sort: sortParam,
    publishedOnly,
    excludeTenantId,
  } = parsed;
  const skip = (page - 1) * limit;

  const branchFilter: Record<string, unknown> = {
    status: "active",
  };
  if (publishedOnly !== false) {
    (branchFilter as Record<string, unknown>).isPublished = true;
  }
  const tenantIdsWithBranch = await Branch.find(branchFilter as any)
    .distinct("tenantId")
    .lean();

  const baseMatch = {
    _id: excludeTenantId
      ? { $in: tenantIdsWithBranch, $nin: [excludeTenantId as any] }
      : { $in: tenantIdsWithBranch },
    status: TENANT_STATUS.ACTIVE,
  } as Record<string, unknown>;

  const locAnd: Record<string, unknown>[] = [];
  if (country) {
    locAnd.push({
      $or: [
        { country: { $regex: new RegExp(country, "i") } },
        { "address.country": { $regex: new RegExp(country, "i") } },
      ],
    });
  }
  if (region) {
    locAnd.push({
      $or: [
        { region: { $regex: new RegExp(region, "i") } },
        { "address.region": { $regex: new RegExp(region, "i") } },
      ],
    });
  }
  if (city) {
    locAnd.push({
      $or: [
        { city: { $regex: new RegExp(city, "i") } },
        { "address.city": { $regex: new RegExp(city, "i") } },
      ],
    });
  }
  if (q) (baseMatch as any).name = { $regex: q, $options: "i" };
  if (starRating != null) (baseMatch as any).starRating = { $gte: starRating };
  if (locAnd.length) (baseMatch as any).$and = locAnd;

  const selectFields = {
    name: 1,
    slug: 1,
    logo: 1,
    starRating: 1,
    country: 1,
    region: 1,
    city: 1,
    address: 1,
    location: 1,
  };

  const useGeo = parsed.lat !== undefined && parsed.lng !== undefined;
  let tenants: any[];
  let total: number;

  if (useGeo) {
    const geo = requireValidGeo(parsed);
    const { lat, lng, radius } = geo;
    const radiusMeters = radius * 1000;

    const geoMatchQuery = { ...baseMatch, location: { $exists: true, $ne: null } };

    const sortStage: Record<string, 1 | -1> =
      sortParam === "distance"
        ? { distanceKm: 1 }
        : sortParam === "rating"
          ? { starRating: -1 }
          : sortParam === "-rating"
            ? { starRating: 1 }
            : { name: 1 };

    const pipeline: any[] = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          maxDistance: radiusMeters,
          spherical: true,
          query: geoMatchQuery,
        },
      },
      {
        $addFields: {
          distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] },
        },
      },
      { $sort: sortStage },
      {
        $facet: {
          results: [
            { $skip: skip },
            { $limit: limit },
            { $project: { ...selectFields, distanceKm: 1 } },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [facetResult] = await Tenant.aggregate(pipeline);
    tenants = facetResult?.results ?? [];
    total = facetResult?.totalCount?.[0]?.count ?? 0;

    // Fallback: no hotels with location in radius — return non-geo list with distanceKm: null
    if (tenants.length === 0 && total === 0) {
      const nonGeoFilter = { ...baseMatch } as any;
      const sortObj: Record<string, 1 | -1> =
        sortParam === "rating"
          ? { starRating: -1 }
          : sortParam === "-rating"
            ? { starRating: 1 }
            : { name: 1 };
      const [fallbackList, fallbackTotal] = await Promise.all([
        Tenant.find(nonGeoFilter)
          .select(selectFields)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .lean(),
        Tenant.countDocuments(nonGeoFilter),
      ]);
      tenants = fallbackList.map((t) => ({ ...t, distanceKm: null }));
      total = fallbackTotal;
    }
  } else {
    const sortObj: Record<string, 1 | -1> =
      sortParam === "rating"
        ? { starRating: -1 }
        : sortParam === "-rating"
          ? { starRating: 1 }
          : { name: 1 };
    const [list, count] = await Promise.all([
      Tenant.find(baseMatch as any)
        .select(selectFields)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Tenant.countDocuments(baseMatch as any),
    ]);
    tenants = list.map((t) => ({ ...t, distanceKm: null }));
    total = count;
  }

  const tenantIds = tenants.map((t) => t._id);
  const branches = await Branch.find({
    tenantId: { $in: tenantIds },
    status: "active",
    ...(publishedOnly !== false ? { isPublished: true } : {}),
  } as any)
    .select("tenantId slug images rating amenities accommodationPolicies")
    .sort({ name: 1 })
    .lean();

  const branchByTenant = new Map<string, (typeof branches)[0]>();
  for (const b of branches) {
    const tid = (b.tenantId as any)?.toString?.() ?? b.tenantId;
    if (!branchByTenant.has(tid)) branchByTenant.set(tid, b);
  }

  const branchIds = branches.map((b) => (b as any)._id);
  const priceRanges = await RoomCategory.aggregate([
    { $match: { branchId: { $in: branchIds } } },
    { $group: { _id: "$branchId", minPrice: { $min: "$basePrice" }, maxPrice: { $max: "$basePrice" } } },
  ]);
  const priceByBranchId = new Map<string, { minPrice: number; maxPrice: number }>();
  for (const pr of priceRanges) {
    const id = (pr._id as any)?.toString?.() ?? pr._id;
    if (id) priceByBranchId.set(id, { minPrice: pr.minPrice, maxPrice: pr.maxPrice });
  }

  const results = tenants.map((t) => {
    const tid = (t as any)._id.toString();
    const primaryBranch = branchByTenant.get(tid) as any;
    if (!primaryBranch) {
      return { ...t, primaryBranch: null };
    }
    const branchIdStr = primaryBranch._id?.toString?.() ?? primaryBranch._id;
    const prices = branchIdStr ? priceByBranchId.get(branchIdStr) : null;
    const policies = primaryBranch.accommodationPolicies ?? {};
    const freeCancellation =
      policies.cancellationChargeType === "none" ||
      (typeof policies.cancellationFreeUntilHours === "number" && policies.cancellationFreeUntilHours > 0);
    return {
      ...t,
      primaryBranch: {
        slug: primaryBranch.slug,
        images: primaryBranch.images,
        rating: primaryBranch.rating,
        amenities: Array.isArray(primaryBranch.amenities) ? primaryBranch.amenities : [],
        minPrice: prices?.minPrice ?? null,
        maxPrice: prices?.maxPrice ?? null,
        freeCancellation,
      },
    };
  });

  const totalPages = Math.ceil(total / limit);

  return successResponse(results, 200, {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
});
