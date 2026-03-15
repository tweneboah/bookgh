import { z } from "zod";

const TENANT_STATUS_VALUES = ["active", "suspended", "pending"] as const;

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
}).optional();

export const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
  address: addressSchema,
  currency: z.string().length(3).default("GHS"),
  timezone: z.string().default("Africa/Accra"),
  starRating: z.number().int().min(1).max(5).optional(),
  website: z.string().url().optional(),
  customDomain: z.string().min(1).max(253).optional().nullable(),
  primaryColor: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null || v === "") return undefined;
      const hex = v.trim().replace(/^#/, "");
      return /^[0-9A-Fa-f]{6}$/.test(hex) ? `#${hex}` : v;
    })
    .refine((v) => v == null || /^#[0-9A-Fa-f]{6}$/.test(v), {
      message: "Primary color must be a valid hex (e.g. #5a189a or 5a189a)",
    }),
  accentColor: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null || v === "") return undefined;
      const hex = v.trim().replace(/^#/, "");
      return /^[0-9A-Fa-f]{6}$/.test(hex) ? `#${hex}` : v;
    })
    .refine((v) => v == null || /^#[0-9A-Fa-f]{6}$/.test(v), {
      message: "Accent color must be a valid hex (e.g. #ff6d00 or ff6d00)",
    }),
});

export const updateTenantSchema = createTenantSchema.partial().extend({
  taxSettings: z.object({
    taxEnabled: z.boolean(),
    taxRate: z.number().min(0).max(100),
    taxId: z.string().optional(),
    taxLabel: z.string().optional(),
  }).optional(),
  defaultPolicies: z.object({
    cancellation: z.string().optional(),
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    childPolicy: z.string().optional(),
    petPolicy: z.string().optional(),
  }).optional(),
  socialLinks: z.object({
    facebook: z.string().url().optional(),
    instagram: z.string().url().optional(),
    twitter: z.string().url().optional(),
  }).optional(),
  status: z.enum(TENANT_STATUS_VALUES).optional(),
  logo: z.union([z.string().url(), z.literal("")]).optional().transform((v) => (v === "" ? undefined : v)),
  customDomain: z.string().min(1).max(253).optional().nullable(),
  primaryColor: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null || v === "") return undefined;
      const hex = v.trim().replace(/^#/, "");
      return /^[0-9A-Fa-f]{6}$/.test(hex) ? `#${hex}` : v;
    })
    .refine((v) => v == null || /^#[0-9A-Fa-f]{6}$/.test(v), {
      message: "Primary color must be a valid hex (e.g. #5a189a or 5a189a)",
    }),
  accentColor: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null || v === "") return undefined;
      const hex = v.trim().replace(/^#/, "");
      return /^[0-9A-Fa-f]{6}$/.test(hex) ? `#${hex}` : v;
    })
    .refine((v) => v == null || /^#[0-9A-Fa-f]{6}$/.test(v), {
      message: "Accent color must be a valid hex (e.g. #ff6d00 or ff6d00)",
    }),
  publicSiteConfig: z
    .object({
      theme: z
        .object({
          fontFamily: z.string().max(100).optional(),
          fontSize: z.enum(["small", "medium", "large"]).optional(),
        })
        .optional(),
      hero: z
        .object({
          style: z.enum(["gallery", "fullwidth", "minimal", "split", "split_right", "overlay_center", "overlay_bottom", "card", "tall", "compact", "layered"]).optional(),
          headline: z.string().max(200).optional(),
          subheadline: z.string().max(500).optional(),
          imageUrl: z.union([z.string().url(), z.literal("")]).optional(),
        })
        .optional(),
      navbar: z
        .object({
          style: z.enum(["default", "transparent", "minimal", "bold", "floating", "compact", "centered", "dark", "accent-strip-only"]).optional(),
          logoPosition: z.enum(["left", "center"]).optional(),
          layout: z.enum(["default", "split"]).optional(),
          linkStyle: z.enum(["solid", "outline", "text", "underline", "ghost", "caps", "minimal"]).optional(),
        })
        .optional(),
      footer: z
        .object({
          show: z.boolean().optional(),
          text: z.string().max(1000).optional(),
          links: z.array(z.object({ label: z.string().max(80), url: z.string().url() })).max(10).optional(),
          showSocial: z.boolean().optional(),
        })
        .optional(),
      sections: z
        .object({
          showAbout: z.boolean().optional(),
          showAmenities: z.boolean().optional(),
          showRooms: z.boolean().optional(),
          showEventHalls: z.boolean().optional(),
          showContact: z.boolean().optional(),
          showNearby: z.boolean().optional(),
        })
        .optional(),
      blocks: z
        .array(
          z.object({
            id: z.string().min(1),
            type: z.string().min(1),
            props: z.record(z.string(), z.unknown()).optional(),
          })
        )
        .max(50)
        .optional(),
    })
    .optional(),
});
