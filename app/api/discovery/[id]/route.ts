import { withHandler } from "@/lib/with-handler";
import { successResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import RoomCategory from "@/models/room/RoomCategory";
import EventHall from "@/models/event/EventHall";
import PlaygroundArea from "@/models/playground/PlaygroundArea";
import PoolArea from "@/models/pool/PoolArea";
import { POOL_AREA_STATUS } from "@/models/pool/PoolArea";
import { resolveBranchForDiscoveryId } from "../resolve-branch";

/**
 * Resolve by hotel (tenant) slug or by branch slug/id.
 * When id is a tenant slug, returns the hotel's first published branch (same payload shape).
 */
export const GET = withHandler(async (_req, { params }) => {
  const { id } = params;

  const resolved = await resolveBranchForDiscoveryId(id);
  if (!resolved) throw new NotFoundError("Hotel");
  const branch = resolved.branch;
  const tenant = resolved.tenant;

  const [roomCategories, eventHalls, playgroundAreas, poolAreas] = await Promise.all([
    RoomCategory.find({
      branchId: branch._id,
      isActive: true,
      _bypassTenantCheck: true,
    } as any)
      .select("name description basePrice maxOccupancy amenities images bedType roomSize")
      .sort({ basePrice: 1 })
      .lean(),
    EventHall.find({
      branchId: branch._id,
      _bypassTenantCheck: true,
    } as any)
      .select("name description capacity hourlyRate amenities images layoutTypes")
      .lean(),
    PlaygroundArea.find({
      branchId: branch._id,
      isActive: true,
      status: "open",
      _bypassTenantCheck: true,
    } as any)
      .select("name description type capacity openingTime closingTime hourlyRate dailyRate amenities images")
      .sort({ name: 1 })
      .lean(),
    PoolArea.find({
      branchId: branch._id,
      isActive: true,
      status: POOL_AREA_STATUS.OPEN,
      _bypassTenantCheck: true,
    } as any)
      .select("name description type capacity openingTime closingTime hourlyRate dailyRate amenities images")
      .sort({ name: 1 })
      .lean(),
  ]);

  const hasPaystack = !!(branch as any).paystackConfig?.publicKey &&
    !!(branch as any).paystackConfig?.secretKeyEncrypted;

  const { paystackConfig, __v, ...branchData } = branch as any;

  return successResponse({
    ...branchData,
    acceptsOnlinePayment: hasPaystack,
    tenant: tenant
      ? {
          _id: (tenant as any)._id?.toString?.(),
          name: tenant.name,
          logo: (tenant as any).logo,
          description: (tenant as any).description,
          starRating: (tenant as any).starRating,
          website: (tenant as any).website,
          location: (tenant as any).location,
          customDomain: (tenant as any).customDomain,
          primaryColor: (tenant as any).primaryColor ?? "#5a189a",
          accentColor: (tenant as any).accentColor ?? "#ff6d00",
          publicSiteConfig: (tenant as any).publicSiteConfig ?? undefined,
          socialLinks: (tenant as any).socialLinks ?? undefined,
        }
      : null,
    roomCategories,
    eventHalls: eventHalls.length > 0 ? eventHalls : undefined,
    playgroundAreas: playgroundAreas.length > 0 ? playgroundAreas : undefined,
    poolAreas: poolAreas.length > 0 ? poolAreas : undefined,
  });
});
