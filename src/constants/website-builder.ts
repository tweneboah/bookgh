/**
 * Website builder: color palettes, templates, fonts, and selectable icons.
 * Used by the platform tenant website-builder UI.
 */

export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  accent: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  { id: "hub", name: "Bookgh", primary: "#5a189a", accent: "#ff6d00" },
  { id: "ocean", name: "Ocean", primary: "#0c4a6e", accent: "#0ea5e9" },
  { id: "forest", name: "Forest", primary: "#14532d", accent: "#22c55e" },
  { id: "sunset", name: "Sunset", primary: "#7c2d12", accent: "#f97316" },
  { id: "slate", name: "Slate", primary: "#1e293b", accent: "#64748b" },
  { id: "rose", name: "Rose", primary: "#881337", accent: "#f43f5e" },
  { id: "violet", name: "Violet", primary: "#4c1d95", accent: "#a78bfa" },
  { id: "teal", name: "Teal", primary: "#134e4a", accent: "#2dd4bf" },
];

export interface TemplateStyle {
  id: string;
  name: string;
  description: string;
  heroStyle: "gallery" | "fullwidth" | "minimal";
  heroCtaStyle: HeroCtaStyleId;
  navbarStyle: "default" | "transparent" | "minimal";
  logoPosition: "left" | "center";
  linkStyle: NavbarLinkStyleId;
}

export const TEMPLATE_STYLES: TemplateStyle[] = [
  { id: "modern", name: "Modern", description: "Gallery hero, text CTA", heroStyle: "gallery", heroCtaStyle: "text", navbarStyle: "default", logoPosition: "left", linkStyle: "solid" },
  { id: "classic", name: "Classic", description: "Full-width hero, underline CTA", heroStyle: "fullwidth", heroCtaStyle: "underline", navbarStyle: "default", logoPosition: "center", linkStyle: "outline" },
  { id: "minimal", name: "Minimal", description: "Clean hero, text links", heroStyle: "minimal", heroCtaStyle: "text", navbarStyle: "minimal", logoPosition: "left", linkStyle: "text" },
  { id: "luxury", name: "Luxury", description: "Transparent navbar, underline CTA", heroStyle: "fullwidth", heroCtaStyle: "underline", navbarStyle: "transparent", logoPosition: "left", linkStyle: "outline" },
];

/** Hero section style variants for the website builder. */
export type HeroStyleId =
  | "gallery"
  | "fullwidth"
  | "minimal"
  | "split"
  | "split_right"
  | "overlay_center"
  | "overlay_bottom"
  | "card"
  | "tall"
  | "compact"
  | "layered";

/** Hero CTA (Book now) button style. */
export type HeroCtaStyleId =
  | "pill-filled"
  | "pill-outline"
  | "text"
  | "underline"
  | "ghost"
  | "soft-pill"
  | "caps"
  | "minimal";

export interface HeroStyleOption {
  id: string;
  name: string;
  description: string;
  style: HeroStyleId;
  ctaStyle: HeroCtaStyleId;
}

export const HERO_STYLES: HeroStyleOption[] = [
  { id: "gallery-filled", name: "Gallery", description: "Carousel, filled button", style: "gallery", ctaStyle: "pill-filled" },
  { id: "gallery-outline", name: "Gallery outline", description: "Carousel, outline button", style: "gallery", ctaStyle: "pill-outline" },
  { id: "gallery-soft", name: "Gallery soft", description: "Carousel, soft pill button", style: "gallery", ctaStyle: "soft-pill" },
  { id: "gallery-text", name: "Gallery text", description: "Carousel, text link", style: "gallery", ctaStyle: "text" },
  { id: "fullwidth-filled", name: "Full width", description: "Wide image, filled button", style: "fullwidth", ctaStyle: "pill-filled" },
  { id: "fullwidth-outline", name: "Full width outline", description: "Wide image, outline button", style: "fullwidth", ctaStyle: "pill-outline" },
  { id: "fullwidth-soft", name: "Full width soft", description: "Wide image, soft pill", style: "fullwidth", ctaStyle: "soft-pill" },
  { id: "minimal-filled", name: "Minimal", description: "Rounded image, filled button", style: "minimal", ctaStyle: "pill-filled" },
  { id: "minimal-outline", name: "Minimal outline", description: "Rounded image, outline button", style: "minimal", ctaStyle: "pill-outline" },
  { id: "minimal-text", name: "Minimal text", description: "Rounded image, text link", style: "minimal", ctaStyle: "text" },
  { id: "split-filled", name: "Split left", description: "Image left, filled button", style: "split", ctaStyle: "pill-filled" },
  { id: "split-outline", name: "Split left outline", description: "Image left, outline button", style: "split", ctaStyle: "pill-outline" },
  { id: "split-right-filled", name: "Split right", description: "Image right, filled button", style: "split_right", ctaStyle: "pill-filled" },
  { id: "split-right-soft", name: "Split right soft", description: "Image right, soft pill", style: "split_right", ctaStyle: "soft-pill" },
  { id: "overlay-center-filled", name: "Overlay center", description: "Centered on image, filled button", style: "overlay_center", ctaStyle: "pill-filled" },
  { id: "overlay-center-outline", name: "Overlay center outline", description: "Centered on image, outline button", style: "overlay_center", ctaStyle: "pill-outline" },
  { id: "overlay-center-ghost", name: "Overlay center ghost", description: "Centered on image, ghost button", style: "overlay_center", ctaStyle: "ghost" },
  { id: "overlay-bottom-filled", name: "Overlay bottom", description: "Title at bottom, filled button", style: "overlay_bottom", ctaStyle: "pill-filled" },
  { id: "overlay-bottom-outline", name: "Overlay bottom outline", description: "Title at bottom, outline button", style: "overlay_bottom", ctaStyle: "pill-outline" },
  { id: "card-filled", name: "Card overlay", description: "Floating card, filled button", style: "card", ctaStyle: "pill-filled" },
  { id: "card-outline", name: "Card outline", description: "Floating card, outline button", style: "card", ctaStyle: "pill-outline" },
  { id: "card-soft", name: "Card soft", description: "Floating card, soft pill", style: "card", ctaStyle: "soft-pill" },
  { id: "tall-filled", name: "Tall", description: "Tall hero, filled button", style: "tall", ctaStyle: "pill-filled" },
  { id: "tall-outline", name: "Tall outline", description: "Tall hero, outline button", style: "tall", ctaStyle: "pill-outline" },
  { id: "compact-filled", name: "Compact", description: "Single row, filled button", style: "compact", ctaStyle: "pill-filled" },
  { id: "compact-caps", name: "Compact caps", description: "Single row, caps link", style: "compact", ctaStyle: "caps" },
  { id: "compact-soft", name: "Compact soft", description: "Single row, soft pill", style: "compact", ctaStyle: "soft-pill" },
  { id: "layered-filled", name: "Layered", description: "Gradient overlay, filled button", style: "layered", ctaStyle: "pill-filled" },
  { id: "layered-outline", name: "Layered outline", description: "Gradient overlay, outline button", style: "layered", ctaStyle: "pill-outline" },
  { id: "layered-ghost", name: "Layered ghost", description: "Gradient overlay, ghost button", style: "layered", ctaStyle: "ghost" },
];

/** Navbar style variants for the website builder. */
export type NavbarStyleId =
  | "default"
  | "transparent"
  | "minimal"
  | "bold"
  | "floating"
  | "compact"
  | "centered"
  | "dark"
  | "accent-strip-only";

/** Modern nav link/CTA styles (no pills): solid = rectangular button, outline = bordered, text/underline/ghost/caps/minimal. */
export type NavbarLinkStyleId =
  | "solid"
  | "outline"
  | "text"
  | "underline"
  | "ghost"
  | "caps"
  | "minimal";

/** Layout: default = logo + links in one row; split = logo left, links center, CTA right. */
export type NavbarLayoutId = "default" | "split";

export interface NavbarStyleOption {
  id: string;
  name: string;
  description: string;
  style: NavbarStyleId;
  logoPosition: "left" | "center";
  layout: NavbarLayoutId;
  linkStyle: NavbarLinkStyleId;
}

export const NAVBAR_STYLES: NavbarStyleOption[] = [
  { id: "modern-split", name: "Modern", description: "Logo left, links center, Book right", style: "default", logoPosition: "left", layout: "split", linkStyle: "solid" },
  { id: "modern-split-outline", name: "Modern outline", description: "Logo left, links center, outline CTA", style: "default", logoPosition: "left", layout: "split", linkStyle: "outline" },
  { id: "modern-minimal-split", name: "Modern minimal", description: "Clean bar, links center, solid CTA", style: "minimal", logoPosition: "left", layout: "split", linkStyle: "solid" },
  { id: "modern-transparent", name: "Modern transparent", description: "Glass over hero, links center, Book right", style: "transparent", logoPosition: "left", layout: "split", linkStyle: "outline" },
  { id: "modern-dark", name: "Modern dark", description: "Dark bar, links center, CTA right", style: "dark", logoPosition: "left", layout: "split", linkStyle: "solid" },
  { id: "modern-dark-ghost", name: "Modern dark ghost", description: "Dark bar, ghost CTA right", style: "dark", logoPosition: "left", layout: "split", linkStyle: "ghost" },
  { id: "modern-floating", name: "Modern floating", description: "Floating card, links center, Book right", style: "floating", logoPosition: "left", layout: "split", linkStyle: "solid" },
  { id: "modern-compact", name: "Modern compact", description: "Shorter bar, links center, caps style", style: "compact", logoPosition: "left", layout: "split", linkStyle: "caps" },
  { id: "default-text", name: "Default text", description: "White bar, text links", style: "default", logoPosition: "left", layout: "default", linkStyle: "text" },
  { id: "default-underline", name: "Default underline", description: "White bar, underline on hover", style: "default", logoPosition: "left", layout: "default", linkStyle: "underline" },
  { id: "default-solid", name: "Default solid", description: "White bar, solid CTA", style: "default", logoPosition: "left", layout: "default", linkStyle: "solid" },
  { id: "transparent-text", name: "Transparent text", description: "Glass over hero, text links", style: "transparent", logoPosition: "left", layout: "default", linkStyle: "text" },
  { id: "minimal-underline", name: "Minimal underline", description: "Thin border, underline links", style: "minimal", logoPosition: "left", layout: "default", linkStyle: "underline" },
  { id: "centered-split", name: "Centered logo", description: "Logo center, links left/right", style: "centered", logoPosition: "center", layout: "split", linkStyle: "solid" },
  { id: "accent-split", name: "Accent strip", description: "Accent strip, links center, Book right", style: "accent-strip-only", logoPosition: "left", layout: "split", linkStyle: "minimal" },
];

export interface FontOption {
  value: string;
  label: string;
  fontFamily: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { value: "inter", label: "Inter", fontFamily: "Inter, system-ui, sans-serif" },
  { value: "poppins", label: "Poppins", fontFamily: "'Poppins', system-ui, sans-serif" },
  { value: "playfair", label: "Playfair Display", fontFamily: "'Playfair Display', Georgia, serif" },
  { value: "lora", label: "Lora", fontFamily: "'Lora', Georgia, serif" },
  { value: "open-sans", label: "Open Sans", fontFamily: "'Open Sans', system-ui, sans-serif" },
  { value: "montserrat", label: "Montserrat", fontFamily: "'Montserrat', system-ui, sans-serif" },
];

export const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Small", basePx: 14 },
  { value: "medium", label: "Medium", basePx: 16 },
  { value: "large", label: "Large", basePx: 18 },
] as const;

/** Lucide icon names that can be used in blocks (e.g. CTA, text). */
export const SELECTABLE_ICONS = [
  "Sparkles",
  "Calendar",
  "BedDouble",
  "Star",
  "Heart",
  "Zap",
  "ArrowRight",
  "ChevronRight",
  "BookOpen",
  "MapPin",
  "Phone",
  "Mail",
  "Gift",
] as const;

export type SelectableIconName = (typeof SELECTABLE_ICONS)[number];

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export const PREVIEW_VIEWPORTS: Record<PreviewDevice, { width: number; height: number }> = {
  desktop: { width: 1200, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

/** Build inline style for theme (font family + base font size). Use on public site and builder preview. */
export function getThemeStyle(theme?: { fontFamily?: string; fontSize?: string }): { fontFamily: string; fontSize: number } {
  const fontOption = theme?.fontFamily ? FONT_OPTIONS.find((f) => f.value === theme.fontFamily) : null;
  const sizeOption = theme?.fontSize ? FONT_SIZE_OPTIONS.find((f) => f.value === theme.fontSize) : null;
  return {
    fontFamily: fontOption?.fontFamily ?? "Inter, system-ui, sans-serif",
    fontSize: sizeOption?.basePx ?? 16,
  };
}
