/**
 * Website builder: block types and prop shapes for the public hotel page.
 * Used by the builder UI and the public page renderer.
 */

export const BLOCK_TYPES = [
  { value: "hero", label: "Hero", description: "Headline, subheadline and main image" },
  { value: "text", label: "Text", description: "Heading and paragraph" },
  { value: "image", label: "Image", description: "Single image with optional caption" },
  { value: "gallery", label: "Image gallery", description: "Multiple images (or use branch photos)" },
  { value: "about", label: "About", description: "About section (tenant description)" },
  { value: "amenities", label: "Amenities", description: "List of amenities" },
  { value: "rooms", label: "Rooms", description: "Room categories with prices" },
  { value: "event_halls", label: "Event halls", description: "Event spaces" },
  { value: "contact", label: "Contact & hours", description: "Contact info and check-in/out" },
  { value: "cta", label: "Call to action", description: "Button to book or contact" },
  { value: "footer", label: "Footer", description: "Footer text and links" },
  { value: "nearby", label: "Nearby hotels", description: "Other properties nearby" },
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number]["value"];

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface HeroBlock extends BaseBlock {
  type: "hero";
  props: {
    style?: "gallery" | "fullwidth" | "minimal";
    headline?: string;
    subheadline?: string;
    imageUrl?: string;
  };
}

export interface TextBlock extends BaseBlock {
  type: "text";
  props: {
    heading?: string;
    body?: string;
    align?: "left" | "center" | "right";
  };
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  props: {
    imageUrl?: string;
    caption?: string;
    alt?: string;
  };
}

export interface GalleryBlock extends BaseBlock {
  type: "gallery";
  props: {
    /** If set, use these URLs instead of branch images */
    imageUrls?: string[];
  };
}

export interface AboutBlock extends BaseBlock {
  type: "about";
  props: Record<string, never>;
}

export interface AmenitiesBlock extends BaseBlock {
  type: "amenities";
  props: Record<string, never>;
}

export interface RoomsBlock extends BaseBlock {
  type: "rooms";
  props: Record<string, never>;
}

export interface EventHallsBlock extends BaseBlock {
  type: "event_halls";
  props: Record<string, never>;
}

export interface ContactBlock extends BaseBlock {
  type: "contact";
  props: Record<string, never>;
}

export interface CtaBlock extends BaseBlock {
  type: "cta";
  props: {
    heading?: string;
    buttonText?: string;
    /** "book" = scroll/open booking, "contact" = link to contact */
    action?: "book" | "contact";
  };
}

export interface FooterBlock extends BaseBlock {
  type: "footer";
  props: {
    text?: string;
    links?: { label: string; url: string }[];
    showSocial?: boolean;
  };
}

export interface NearbyBlock extends BaseBlock {
  type: "nearby";
  props: Record<string, never>;
}

export type WebsiteBlock =
  | HeroBlock
  | TextBlock
  | ImageBlock
  | GalleryBlock
  | AboutBlock
  | AmenitiesBlock
  | RoomsBlock
  | EventHallsBlock
  | ContactBlock
  | CtaBlock
  | FooterBlock
  | NearbyBlock;

export function createDefaultProps(type: BlockType): WebsiteBlock["props"] {
  switch (type) {
    case "hero":
      return { style: "gallery", headline: "", subheadline: "", imageUrl: "" };
    case "text":
      return { heading: "", body: "", align: "left" };
    case "image":
      return { imageUrl: "", caption: "", alt: "" };
    case "gallery":
      return { imageUrls: [] };
    case "about":
    case "amenities":
    case "rooms":
    case "event_halls":
    case "contact":
    case "nearby":
      return {};
    case "cta":
      return { heading: "Ready to book?", buttonText: "Book now", action: "book" };
    case "footer":
      return { text: "", links: [], showSocial: true };
    default:
      return {};
  }
}

export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
