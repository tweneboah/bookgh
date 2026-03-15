import mongoose, { Schema, Document, Model } from "mongoose";
import { enumValues, TENANT_STATUS, type TenantStatus } from "@/constants";

export interface ITenantAddress {
  street?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
}

export interface ITenantTaxSettings {
  taxEnabled: boolean;
  taxRate: number;
  taxId?: string;
  taxLabel: string;
}

export interface ITenantPolicies {
  cancellation?: string;
  checkInTime?: string;
  checkOutTime?: string;
  childPolicy?: string;
  petPolicy?: string;
}

export interface ITenant extends Document {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: ITenantAddress;
  /** Top-level location for discovery/search (country, region, city) */
  country?: string;
  region?: string;
  city?: string;
  /** Geo point for nearby / radius search (GeoJSON: [lng, lat]) */
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  taxSettings?: ITenantTaxSettings;
  currency: string;
  timezone: string;
  defaultPolicies?: ITenantPolicies;
  starRating?: number;
  website?: string;
  /** Custom domain for this tenant (e.g. royalpalace.com). Must be unique. */
  customDomain?: string;
  /** Primary brand color (e.g. #5a189a) for tenant-facing pages. */
  primaryColor?: string;
  /** Accent/CTA color (e.g. #ff6d00) for buttons and highlights. */
  accentColor?: string;
  /** Public website layout and content (hero, navbar, footer, section visibility). */
  publicSiteConfig?: {
    hero?: {
      style?: "gallery" | "fullwidth" | "minimal";
      headline?: string;
      subheadline?: string;
      imageUrl?: string;
    };
    navbar?: {
      style?: "default" | "transparent" | "minimal";
      logoPosition?: "left" | "center";
    };
    footer?: {
      show?: boolean;
      text?: string;
      links?: { label: string; url: string }[];
      showSocial?: boolean;
    };
    sections?: {
      showAbout?: boolean;
      showAmenities?: boolean;
      showRooms?: boolean;
      showEventHalls?: boolean;
      showPlaygrounds?: boolean;
      showPools?: boolean;
      showContact?: boolean;
      showNearby?: boolean;
    };
    /** Ordered blocks for the website builder (when set, public page renders from this list). */
    blocks?: { id: string; type: string; props?: Record<string, unknown> }[];
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  status: TenantStatus;
  suspendedAt?: Date;
  suspensionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logo: { type: String },
    description: { type: String },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      region: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },
    country: { type: String },
    region: { type: String },
    city: { type: String },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: { type: [Number] },
    },
    taxSettings: {
      taxEnabled: { type: Boolean, default: false },
      taxRate: { type: Number, default: 0 },
      taxId: { type: String },
      taxLabel: { type: String, default: "Tax" },
    },
    currency: { type: String, default: "GHS" },
    timezone: { type: String, default: "Africa/Accra" },
    defaultPolicies: {
      cancellation: { type: String },
      checkInTime: { type: String },
      checkOutTime: { type: String },
      childPolicy: { type: String },
      petPolicy: { type: String },
    },
    starRating: { type: Number, min: 1, max: 5 },
    website: { type: String },
    customDomain: { type: String, lowercase: true, trim: true },
    primaryColor: { type: String },
    accentColor: { type: String },
    publicSiteConfig: {
      hero: {
        style: { type: String, enum: ["gallery", "fullwidth", "minimal"] },
        headline: { type: String },
        subheadline: { type: String },
        imageUrl: { type: String },
      },
      navbar: {
        style: { type: String, enum: ["default", "transparent", "minimal"] },
        logoPosition: { type: String, enum: ["left", "center"] },
      },
      footer: {
        show: { type: Boolean },
        text: { type: String },
        links: [
          { label: { type: String }, url: { type: String } },
        ],
        showSocial: { type: Boolean },
      },
      sections: {
        showAbout: { type: Boolean },
        showAmenities: { type: Boolean },
        showRooms: { type: Boolean },
        showEventHalls: { type: Boolean },
        showPlaygrounds: { type: Boolean },
        showPools: { type: Boolean },
        showContact: { type: Boolean },
        showNearby: { type: Boolean },
      },
      blocks: [
        {
          id: { type: String, required: true },
          type: { type: String, required: true },
          props: { type: Schema.Types.Mixed },
        },
      ],
    },
    socialLinks: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
    },
    status: {
      type: String,
      enum: enumValues(TENANT_STATUS),
      default: TENANT_STATUS.PENDING,
    },
    suspendedAt: { type: Date },
    suspensionReason: { type: String },
  },
  { timestamps: true }
);

tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ customDomain: 1 }, { unique: true, sparse: true });
tenantSchema.index({ status: 1 });
tenantSchema.index({ name: 1 });
tenantSchema.index({ country: 1, region: 1, city: 1 });
tenantSchema.index({ location: "2dsphere" });

const Tenant: Model<ITenant> =
  mongoose.models.Tenant ||
  mongoose.model<ITenant>("Tenant", tenantSchema);

export default Tenant;
