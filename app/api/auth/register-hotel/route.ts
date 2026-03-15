import { NextRequest } from "next/server";
import { withHandler } from "@/lib/with-handler";
import { createdResponse } from "@/lib/api-response";
import { ConflictError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { generateBranchSlug } from "@/lib/slug";
import Tenant from "@/models/tenant/Tenant";
import Branch from "@/models/branch/Branch";
import User from "@/models/user/User";
import { z } from "zod";

const registerHotelSchema = z.object({
  owner: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8).max(128),
    phone: z.string().optional(),
  }),
  hotel: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    contactEmail: z.string().email(),
    contactPhone: z.string().optional(),
    currency: z.string().default("GHS"),
    timezone: z.string().default("Africa/Accra"),
    starRating: z.number().min(1).max(5).optional(),
  }),
  branch: z.object({
    name: z.string().min(1).max(200),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
      })
      .optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    /** Geo coordinates from map picker (required for discovery/nearby search). */
    location: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    googlePlaceId: z.string().optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
  }),
});

export const POST = withHandler(async (req: NextRequest) => {
  const body = registerHotelSchema.parse(await req.json());

  const existingUser = await User.findOne({ email: body.owner.email } as any);
  if (existingUser) throw new ConflictError("Email already registered");

  const slug = body.hotel.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const existingTenant = await Tenant.findOne({ slug });
  if (existingTenant) {
    throw new ConflictError(
      "A hotel with a similar name already exists. Please choose a different name."
    );
  }

  // Sequential creates with manual rollback (no replica set required)
  let tenantId: string | null = null;
  let branchId: string | null = null;

  const branchCity = body.branch.city ?? body.branch.address?.city;
  const branchRegion = body.branch.region ?? body.branch.address?.region;
  const branchCountry = body.branch.country ?? body.branch.address?.country;
  const branchLocation = body.branch.location
    ? { type: "Point" as const, coordinates: [body.branch.location.lng, body.branch.location.lat] }
    : undefined;

  try {
    const tenant = await (Tenant.create as any)({
      name: body.hotel.name,
      slug,
      description: body.hotel.description,
      contactEmail: body.hotel.contactEmail,
      contactPhone: body.hotel.contactPhone,
      currency: body.hotel.currency,
      timezone: body.hotel.timezone,
      starRating: body.hotel.starRating,
      status: "active",
      ...(branchCity && { city: branchCity }),
      ...(branchRegion && { region: branchRegion }),
      ...(branchCountry && { country: branchCountry }),
      ...(branchLocation && { location: branchLocation }),
    });
    tenantId = tenant._id.toString();

    const branchSlug = await generateBranchSlug(body.hotel.name, body.branch.name);

    const branch = await (Branch.create as any)({
      tenantId: tenant._id,
      name: body.branch.name,
      slug: branchSlug,
      address: body.branch.address,
      city: branchCity,
      region: branchRegion,
      country: branchCountry,
      location: branchLocation,
      googlePlaceId: body.branch.googlePlaceId,
      contactEmail: body.branch.contactEmail ?? body.hotel.contactEmail,
      contactPhone: body.branch.contactPhone ?? body.hotel.contactPhone,
      status: "active",
      isPublished: false,
    });
    branchId = branch._id.toString();

    const hashedPassword = await hashPassword(body.owner.password);

    const user = await (User.create as any)({
      tenantId: tenant._id,
      branchId: branch._id,
      firstName: body.owner.firstName,
      lastName: body.owner.lastName,
      email: body.owner.email,
      password: hashedPassword,
      phone: body.owner.phone,
      role: "tenantAdmin",
      isActive: true,
    });

    await Branch.findByIdAndUpdate(branch._id, { manager: user._id } as any);

    const tokenPayload = {
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      branchId: branch._id.toString(),
      role: "tenantAdmin",
    };

    return createdResponse({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        tenantId: tenant._id,
        branchId: branch._id,
      },
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
      },
      branch: {
        id: branch._id,
        name: branch.name,
      },
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken({ userId: tokenPayload.userId }),
    });
  } catch (error) {
    if (branchId) await Branch.findByIdAndDelete(branchId).catch(() => {});
    if (tenantId) await Tenant.findByIdAndDelete(tenantId).catch(() => {});
    throw error;
  }
});
