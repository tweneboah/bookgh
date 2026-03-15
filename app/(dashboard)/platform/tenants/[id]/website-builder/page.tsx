"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useTenant, useUpdateTenant } from "@/hooks/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";
import toast from "react-hot-toast";
import {
  ChevronUp,
  ChevronDown,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  Layout,
  ExternalLink,
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Palette,
  Type,
  Sparkles,
  Calendar,
  BedDouble,
  Star,
  Heart,
  Zap,
  ArrowRight,
  ChevronRight,
  BookOpen,
  MapPin,
  Phone,
  Mail,
  Gift,
} from "lucide-react";
import Link from "next/link";
import {
  BLOCK_TYPES,
  type BlockType,
  type WebsiteBlock,
  createDefaultProps,
  generateBlockId,
} from "@/types/website-builder";
import {
  COLOR_PALETTES,
  TEMPLATE_STYLES,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  SELECTABLE_ICONS,
  NAVBAR_STYLES,
  HERO_STYLES,
  type PreviewDevice,
  PREVIEW_VIEWPORTS,
} from "@/constants/website-builder";
import { HotelBlockRenderer, type HotelBlockContext } from "@/components/public/hotel-blocks";
import { PublicNavbar } from "@/components/layout/public-navbar";

const FONT_INTER = { fontFamily: "Inter, system-ui, sans-serif" };

type BlockWithMeta = WebsiteBlock & { _index: number };

const ICON_MAP = {
  Sparkles,
  Calendar,
  BedDouble,
  Star,
  Heart,
  Zap,
  ArrowRight,
  ChevronRight,
  BookOpen,
  MapPin,
  Phone,
  Mail,
  Gift,
} as const;

function getBlockLabel(type: BlockType): string {
  return BLOCK_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Mock hotel data for live preview in the builder. */
function getMockHotelContext(tenantName: string, primaryColor: string, accentColor: string): HotelBlockContext {
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  return {
    hotel: {
      name: tenantName,
      slug: "preview",
      images: [
        { url: "https://images.unsplash.com/photo-1566073771259-6a0d3db5d907?w=800", caption: undefined },
      ],
      tenant: {
        name: tenantName,
        description: "A welcoming stay with modern amenities and attentive service.",
        starRating: 4,
        website: "https://example.com",
        socialLinks: { facebook: "#", instagram: "#", twitter: "#" },
      },
      rating: 4.5,
      amenities: ["Free WiFi", "Pool", "Restaurant", "Parking", "Spa"],
      roomCategories: [
        { _id: "1", name: "Standard Room", basePrice: 120, description: "Comfortable and cozy.", images: [{ url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400" }], maxOccupancy: 2, bedType: "Queen", roomSize: 280 },
        { _id: "2", name: "Deluxe Suite", basePrice: 220, description: "Spacious with city view.", images: [{ url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400" }], maxOccupancy: 4, bedType: "King", roomSize: 450 },
      ],
      eventHalls: [{ _id: "1", name: "Grand Ballroom", capacity: 200, description: "Ideal for weddings.", hourlyRate: 150, images: [] }],
      contactPhone: "+1 234 567 890",
      contactEmail: "hello@hotel.com",
      address: { street: "123 Main St", city: "Accra", region: "Greater Accra", country: "Ghana" },
      operatingHours: { checkIn: "3:00 PM", checkOut: "11:00 AM" },
      breakfastIncluded: true,
      refundableBooking: true,
      acceptsOnlinePayment: true,
    },
    primaryColor,
    accentColor,
    slug: "preview",
    openBooking: () => {},
    fmt,
    location: "123 Main St, Accra, Ghana",
    hotelName: tenantName,
    minPrice: 120,
    nearbyHotels: [],
  };
}

export default function PlatformTenantWebsiteBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { user } = useAppSelector((s) => s.auth);
  const role = (user?.role ?? "").toString().toLowerCase();
  const canEdit = role === "superadmin";
  const { data: tenantData, isLoading } = useTenant(id);
  const updateTenant = useUpdateTenant();
  const tenant = (tenantData as { data?: Record<string, unknown> })?.data;
  const existingConfig = tenant?.publicSiteConfig as {
    theme?: { fontFamily?: string; fontSize?: string };
    hero?: { style?: string; headline?: string; subheadline?: string; imageUrl?: string };
    navbar?: { style?: string; logoPosition?: string; layout?: string; linkStyle?: string };
    footer?: { text?: string; links?: { label: string; url: string }[]; showSocial?: boolean };
    blocks?: WebsiteBlock[];
  } | undefined;
  const existingBlocks = existingConfig?.blocks ?? [];
  const tenantPrimary = (tenant?.primaryColor as string) ?? "#5a189a";
  const tenantAccent = (tenant?.accentColor as string) ?? "#ff6d00";

  const [blocks, setBlocks] = useState<WebsiteBlock[]>([]);
  const [saved, setSaved] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<BlockType>("hero");
  const [editBlock, setEditBlock] = useState<BlockWithMeta | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [fontFamily, setFontFamily] = useState<string>(existingConfig?.theme?.fontFamily ?? "inter");
  const [fontSize, setFontSize] = useState<string>(existingConfig?.theme?.fontSize ?? "medium");
  const [localHero, setLocalHero] = useState(existingConfig?.hero ?? {});
  const [localNavbar, setLocalNavbar] = useState(existingConfig?.navbar ?? {});
  /** 'navbar' = Navbar section selected; number = block index selected; null = none */
  const [selectedSection, setSelectedSection] = useState<"navbar" | number | null>(null);
  /** Sidebar tab: Theme (colors + templates) or Sections */
  const [builderTab, setBuilderTab] = useState<"theme" | "sections">("theme");

  // Load Google Font when not Inter
  useEffect(() => {
    if (fontFamily === "inter") return;
    const familyMap: Record<string, string> = {
      poppins: "Poppins:wght@400;500;600;700",
      "playfair": "Playfair+Display:wght@400;500;600;700",
      lora: "Lora:wght@400;500;600;700",
      "open-sans": "Open+Sans:wght@400;500;600;700",
      montserrat: "Montserrat:wght@400;500;600;700",
    };
    const param = familyMap[fontFamily];
    if (!param) return;
    const id = "website-builder-font";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${param}&display=swap`;
    return () => { link?.remove(); };
  }, [fontFamily]);

  useEffect(() => {
    if (existingBlocks.length > 0) setBlocks(existingBlocks as WebsiteBlock[]);
  }, [existingBlocks.length, JSON.stringify(existingBlocks)]);

  useEffect(() => {
    if (existingConfig?.theme?.fontFamily) setFontFamily(existingConfig.theme.fontFamily);
    if (existingConfig?.theme?.fontSize) setFontSize(existingConfig.theme.fontSize);
    if (existingConfig?.hero) setLocalHero(existingConfig.hero);
    if (existingConfig?.navbar) {
      const nav = existingConfig.navbar;
      const linkStyle = nav.linkStyle === "pill-filled" || nav.linkStyle === "soft-pill" ? "solid" : nav.linkStyle === "pill-outline" ? "outline" : nav.linkStyle ?? "solid";
      setLocalNavbar({ ...nav, layout: nav.layout ?? "split", linkStyle });
    }
  }, [existingConfig?.theme?.fontFamily, existingConfig?.theme?.fontSize, existingConfig?.hero, existingConfig?.navbar]);

  const primaryColor = selectedPaletteId
    ? COLOR_PALETTES.find((p) => p.id === selectedPaletteId)?.primary ?? tenantPrimary
    : tenantPrimary;
  const accentColor = selectedPaletteId
    ? COLOR_PALETTES.find((p) => p.id === selectedPaletteId)?.accent ?? tenantAccent
    : tenantAccent;

  const fontOption = FONT_OPTIONS.find((f) => f.value === fontFamily) ?? FONT_OPTIONS[0];
  const fontSizeOption = FONT_SIZE_OPTIONS.find((f) => f.value === fontSize) ?? FONT_SIZE_OPTIONS[1];
  const previewStyle = useMemo(
    () => ({
      fontFamily: fontOption.fontFamily,
      fontSize: fontSizeOption.basePx,
    }),
    [fontOption.fontFamily, fontSizeOption.basePx]
  );

  const move = (index: number, dir: "up" | "down") => {
    const next = [...blocks];
    const j = dir === "up" ? index - 1 : index + 1;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setBlocks(next);
    setSaved(false);
  };

  const remove = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
    setSaved(false);
  };

  const addBlock = () => {
    const blockId = generateBlockId();
    const props = createDefaultProps(addType);
    setBlocks([...blocks, { id: blockId, type: addType, props } as WebsiteBlock]);
    setAddOpen(false);
    setSaved(false);
  };

  const openEdit = (block: WebsiteBlock, index: number) => {
    setEditBlock({ ...block, _index: index });
    setEditForm({ ...(block.props ?? {}) });
  };

  const saveEdit = () => {
    if (editBlock == null) return;
    const next = [...blocks];
    next[editBlock._index] = { ...editBlock, props: { ...editForm } };
    setBlocks(next);
    setEditBlock(null);
    setSaved(false);
  };

  const applyLiveEdit = (key: string, value: unknown) => {
    setEditForm((f) => ({ ...f, [key]: value }));
    if (editBlock == null) return;
    const next = [...blocks];
    next[editBlock._index] = { ...editBlock, props: { ...editForm, [key]: value } };
    setBlocks(next);
  };

  const applyTemplate = (templateId: string) => {
    const t = TEMPLATE_STYLES.find((x) => x.id === templateId);
    if (!t) return;
    setSelectedTemplateId(templateId);
    setLocalHero((h) => ({ ...h, style: t.heroStyle }));
    setLocalNavbar({ style: t.navbarStyle, logoPosition: t.logoPosition, layout: "split", linkStyle: t.linkStyle });
    setBlocks((prev) => {
      const copy = [...prev];
      const heroIndex = copy.findIndex((b) => b.type === "hero");
      if (heroIndex >= 0) {
        copy[heroIndex] = {
          ...copy[heroIndex],
          props: { ...(copy[heroIndex].props ?? {}), style: t.heroStyle, ctaStyle: t.heroCtaStyle },
        };
      }
      return copy;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      const palette = selectedPaletteId ? COLOR_PALETTES.find((p) => p.id === selectedPaletteId) : null;
      await updateTenant.mutateAsync({
        id,
        publicSiteConfig: {
          ...existingConfig,
          theme: { fontFamily, fontSize },
          hero: localHero,
          navbar: localNavbar,
          blocks,
        },
        ...(palette && { primaryColor: palette.primary, accentColor: palette.accent }),
      });
      setSaved(true);
      setSelectedPaletteId(null);
      toast.success("Website saved");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg ?? "Failed to save");
    }
  };

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center" style={FONT_INTER}>
        <p className="text-slate-600">Only platform owners can customize a tenant&apos;s website from here.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/platform/tenants")}>
          Back to Tenants
        </Button>
      </div>
    );
  }

  if (isLoading || !tenant) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6" style={FONT_INTER}>
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-64 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  const tenantName = (tenant.name as string) ?? "Your Hotel";
  const slug = (tenant.slug as string) ?? "";
  const previewUrl = slug ? `/hotels/${slug}` : null;
  const viewport = PREVIEW_VIEWPORTS[device];
  const mockCtx = getMockHotelContext(tenantName, primaryColor, accentColor);

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50" style={FONT_INTER}>
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/platform/tenants"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Website builder</h1>
          <span className="text-sm text-slate-500">{tenantName}</span>
        </div>
        <div className="flex items-center gap-3">
          {previewUrl && (
            <Link href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open live site
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateTenant.isPending || saved}
            className="gap-2 font-semibold"
            style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)", color: "white", border: "none" }}
          >
            {updateTenant.isPending ? "Saving…" : saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
          {/* Tabs: Theme | Sections */}
          <div className="flex shrink-0 border-b border-slate-200 bg-slate-50/80 px-2 pt-2">
            <div className="flex w-full rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setBuilderTab("theme")}
                className={`flex-1 rounded-md py-2.5 text-sm font-medium transition ${
                  builderTab === "theme" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Theme
              </button>
              <button
                type="button"
                onClick={() => setBuilderTab("sections")}
                className={`flex-1 rounded-md py-2.5 text-sm font-medium transition ${
                  builderTab === "sections" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Sections
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {builderTab === "theme" && (
              <>
                {/* Color palettes */}
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Palette className="h-4 w-4" />
                    Color palette
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_PALETTES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPaletteId(selectedPaletteId === p.id ? null : p.id)}
                        title={p.name}
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition ${
                          selectedPaletteId === p.id ? "border-[#5a189a] ring-2 ring-[#5a189a]/30" : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex gap-0.5">
                          <span className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: p.primary }} />
                          <span className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: p.accent }} />
                        </div>
                        <span className="text-xs font-medium text-slate-600">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Templates — under Theme */}
                <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Layout className="h-4 w-4 text-[#5a189a]" />
                    Template
                  </h3>
                  <p className="mb-3 text-xs text-slate-500">
                    Apply a preset (hero + navbar style) to your site.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATE_STYLES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t.id)}
                        className={`rounded-lg border-2 p-3 text-left transition ${
                          selectedTemplateId === t.id
                            ? "border-[#5a189a] bg-white shadow-sm ring-1 ring-[#5a189a]/20"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-slate-900">{t.name}</span>
                        <span className="mt-1 block text-xs leading-snug text-slate-500">{t.description}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Typography */}
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Type className="h-4 w-4" />
                    Typography
                  </h3>
                  <div className="space-y-2">
                    <Select
                      label="Font family"
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
                    />
                    <Select
                      label="Font size"
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      options={FONT_SIZE_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
                    />
                  </div>
                </section>

                {/* Device preview */}
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Preview size</h3>
                  <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                    {(["desktop", "tablet", "mobile"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDevice(d)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition ${
                          device === d ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
                        }`}
                        title={d}
                      >
                        {d === "desktop" && <Monitor className="h-4 w-4" />}
                        {d === "tablet" && <Tablet className="h-4 w-4" />}
                        {d === "mobile" && <Smartphone className="h-4 w-4" />}
                        <span className="hidden sm:inline capitalize">{d}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {builderTab === "sections" && (
              <>
            {/* Sections — Navbar first, then content blocks; click to show options */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Sections</h3>
              <ul className="space-y-1">
                {/* Navbar — always first; click to show navbar templates */}
                <li
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSection((prev) => (prev === "navbar" ? null : "navbar"))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSection((prev) => (prev === "navbar" ? null : "navbar"));
                    }
                  }}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    selectedSection === "navbar"
                      ? "border-[#5a189a] bg-[#5a189a]/10 ring-1 ring-[#5a189a]/30"
                      : "border-slate-100 bg-white hover:bg-slate-50"
                  }`}
                >
                  <Layout className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1 font-medium text-slate-800">Navbar</span>
                </li>
                {blocks.map((block, index) => (
                  <li
                    key={block.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return;
                      setSelectedSection((prev) => (prev === index ? null : index));
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      if ((e.target as HTMLElement).closest("button")) return;
                      setSelectedSection((prev) => (prev === index ? null : index));
                    }}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      selectedSection === index
                        ? "border-[#5a189a] bg-[#5a189a]/10 ring-1 ring-[#5a189a]/30"
                        : "border-slate-100 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => move(index, "up")} disabled={index === 0} className="rounded p-1 hover:bg-slate-200 disabled:opacity-40" aria-label="Move up">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => move(index, "down")} disabled={index === blocks.length - 1} className="rounded p-1 hover:bg-slate-200 disabled:opacity-40" aria-label="Move down">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{getBlockLabel(block.type as BlockType)}</span>
                    <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={(e) => { e.stopPropagation(); openEdit(block, index); }} aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0 text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); remove(index); selectedSection === index && setSelectedSection(null); }} aria-label="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="mt-2 w-full gap-1" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add section
              </Button>
            </section>

            {/* Navbar templates — shown when Navbar section is clicked */}
            {selectedSection === "navbar" && (
              <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Navbar style</h3>
                <p className="mb-3 text-xs text-slate-500">Choose a navbar template.</p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {NAVBAR_STYLES.map((nav) => {
                    const isSelected =
                      (localNavbar?.style ?? "default") === nav.style &&
                      (localNavbar?.logoPosition ?? "left") === nav.logoPosition &&
                      (localNavbar?.layout ?? "split") === nav.layout &&
                      (localNavbar?.linkStyle ?? "solid") === nav.linkStyle;
                    return (
                      <button
                        key={nav.id}
                        type="button"
                        onClick={() => {
                          setLocalNavbar({ style: nav.style, logoPosition: nav.logoPosition, layout: nav.layout, linkStyle: nav.linkStyle });
                          setSaved(false);
                        }}
                        className={`rounded-lg border-2 p-2.5 text-left transition ${
                          isSelected
                            ? "border-[#5a189a] bg-[#5a189a]/5"
                            : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="block text-sm font-medium text-slate-900">{nav.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 line-clamp-2">{nav.description}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Hero style — shown when a hero block is selected (templates are under Theme tab) */}
            {typeof selectedSection === "number" && blocks[selectedSection] && blocks[selectedSection].type === "hero" && (
              <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Hero style</h3>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {HERO_STYLES.map((hero) => {
                    const currentStyle = (blocks[selectedSection].props?.style as string) ?? "gallery";
                    const currentCtaStyle = (blocks[selectedSection].props?.ctaStyle as string) ?? "pill-filled";
                    const isSelected = currentStyle === hero.style && currentCtaStyle === hero.ctaStyle;
                    return (
                      <button
                        key={hero.id}
                        type="button"
                        onClick={() => {
                          const copy = [...blocks];
                          copy[selectedSection] = { ...copy[selectedSection], props: { ...(copy[selectedSection].props ?? {}), style: hero.style, ctaStyle: hero.ctaStyle } };
                          setBlocks(copy);
                          setSaved(false);
                        }}
                        className={`rounded-lg border-2 p-2.5 text-left transition ${
                          isSelected
                            ? "border-[#5a189a] bg-[#5a189a]/5"
                            : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="block text-sm font-medium text-slate-900">{hero.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 line-clamp-2">{hero.description}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
              </>
            )}
          </div>
        </aside>

        {/* Live preview */}
        <div className="flex min-w-0 flex-1 items-start justify-center overflow-auto bg-slate-200/80 p-6">
          <div
            className="shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl transition-[width,height]"
            style={{
              width: Math.min(viewport.width, 1200),
              height: Math.min(viewport.height, 900),
              maxWidth: "100%",
            }}
          >
            <div className="flex h-full flex-col overflow-hidden" style={previewStyle}>
              <PublicNavbar
                isTenantSite
                tenantName={tenantName}
                tenantLogo={tenant?.logo as string | undefined}
                theme={{ primaryColor, accentColor }}
                navbarStyle={(localNavbar?.style as "default" | "transparent" | "minimal" | "bold" | "floating" | "compact" | "centered" | "dark" | "accent-strip-only") ?? "default"}
                logoPosition={(localNavbar?.logoPosition as "left" | "center") ?? "left"}
                layout={(localNavbar?.layout as "default" | "split") ?? "split"}
                linkStyle={(localNavbar?.linkStyle as "solid" | "outline" | "text" | "underline" | "ghost" | "caps" | "minimal") ?? "solid"}
              />
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 sm:pb-12">
                {blocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <Layout className="h-14 w-14 text-slate-300" strokeWidth={1.25} />
                    <p className="mt-4 font-medium text-slate-600">Add sections to see preview</p>
                    <Button size="sm" className="mt-4" variant="outline" onClick={() => setAddOpen(true)}>
                      Add first section
                    </Button>
                  </div>
                ) : (
                  blocks.map((block) => (
                    <HotelBlockRenderer key={block.id} block={block} ctx={mockCtx} />
                  ))
                )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add section" size="md">
        <div className="space-y-4">
          <Select
            label="Section type"
            value={addType}
            onChange={(e) => setAddType(e.target.value as BlockType)}
            options={BLOCK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <p className="text-sm text-slate-500">{BLOCK_TYPES.find((t) => t.value === addType)?.description}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addBlock} style={{ background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 100%)", color: "white", border: "none" }}>
              Add section
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editBlock}
        onClose={() => setEditBlock(null)}
        title={editBlock ? `Edit ${getBlockLabel(editBlock.type as BlockType)}` : ""}
        size="lg"
      >
        {editBlock && (
          <BlockEditForm
            type={editBlock.type as BlockType}
            form={editForm}
            setForm={setEditForm}
            applyLive={applyLiveEdit}
            onSave={saveEdit}
            onCancel={() => setEditBlock(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function BlockEditForm({
  type,
  form,
  setForm,
  applyLive,
  onSave,
  onCancel,
}: {
  type: BlockType;
  form: Record<string, unknown>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  applyLive: (key: string, value: unknown) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
    applyLive(key, value);
  };

  return (
    <div className="space-y-4">
      {type === "hero" && (
        <>
          <Select
            label="Hero style"
            value={(form.style as string) ?? "gallery"}
            onChange={(e) => update("style", e.target.value)}
            options={[
              { value: "gallery", label: "Gallery" },
              { value: "fullwidth", label: "Full width" },
              { value: "minimal", label: "Minimal" },
            ]}
          />
          <Input label="Headline" value={(form.headline as string) ?? ""} onChange={(e) => update("headline", e.target.value)} placeholder="Overrides hotel name" />
          <Input label="Subheadline" value={(form.subheadline as string) ?? ""} onChange={(e) => update("subheadline", e.target.value)} placeholder="Optional tagline" />
          <Input label="Hero image URL" type="url" value={(form.imageUrl as string) ?? ""} onChange={(e) => update("imageUrl", e.target.value)} placeholder="Single image (optional)" />
        </>
      )}
      {type === "text" && (
        <>
          <Input label="Heading" value={(form.heading as string) ?? ""} onChange={(e) => update("heading", e.target.value)} />
          <Textarea label="Body" value={(form.body as string) ?? ""} onChange={(e) => update("body", e.target.value)} rows={4} placeholder="Paragraph text" />
          <Select
            label="Alignment"
            value={(form.align as string) ?? "left"}
            onChange={(e) => update("align", e.target.value)}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Icon (optional)</label>
            <div className="flex flex-wrap gap-2">
              {SELECTABLE_ICONS.map((name) => {
                const Icon = ICON_MAP[name as keyof typeof ICON_MAP];
                if (!Icon) return null;
                const selected = (form.icon as string) === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => update("icon", name)}
                    className={`rounded-lg border-2 p-2 transition ${selected ? "border-[#5a189a] bg-[#5a189a]/10" : "border-slate-200 hover:border-slate-300"}`}
                    title={name}
                  >
                    <Icon className="h-5 w-5 text-slate-700" />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => update("icon", "")}
                className={`rounded-lg border-2 p-2 transition ${!form.icon ? "border-[#5a189a] bg-[#5a189a]/10" : "border-slate-200 hover:border-slate-300"}`}
                title="None"
              >
                <span className="text-xs text-slate-500">None</span>
              </button>
            </div>
          </div>
        </>
      )}
      {type === "image" && (
        <>
          <Input label="Image URL" type="url" value={(form.imageUrl as string) ?? ""} onChange={(e) => update("imageUrl", e.target.value)} required />
          <Input label="Caption" value={(form.caption as string) ?? ""} onChange={(e) => update("caption", e.target.value)} />
          <Input label="Alt text" value={(form.alt as string) ?? ""} onChange={(e) => update("alt", e.target.value)} placeholder="Accessibility" />
        </>
      )}
      {type === "cta" && (
        <>
          <Input label="Heading" value={(form.heading as string) ?? ""} onChange={(e) => update("heading", e.target.value)} placeholder="e.g. Ready to book?" />
          <Input label="Button text" value={(form.buttonText as string) ?? ""} onChange={(e) => update("buttonText", e.target.value)} placeholder="e.g. Book now" />
          <Select
            label="Action"
            value={(form.action as string) ?? "book"}
            onChange={(e) => update("action", e.target.value)}
            options={[
              { value: "book", label: "Open booking" },
              { value: "contact", label: "Scroll to contact" },
            ]}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Button icon</label>
            <div className="flex flex-wrap gap-2">
              {SELECTABLE_ICONS.map((name) => {
                const Icon = ICON_MAP[name as keyof typeof ICON_MAP];
                if (!Icon) return null;
                const selected = (form.icon as string) === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => update("icon", name)}
                    className={`rounded-lg border-2 p-2 transition ${selected ? "border-[#5a189a] bg-[#5a189a]/10" : "border-slate-200 hover:border-slate-300"}`}
                    title={name}
                  >
                    <Icon className="h-5 w-5 text-slate-700" />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => update("icon", "")}
                className={`rounded-lg border-2 p-2 transition ${!form.icon ? "border-[#5a189a] bg-[#5a189a]/10" : "border-slate-200 hover:border-slate-300"}`}
                title="None"
              >
                <span className="text-xs text-slate-500">None</span>
              </button>
            </div>
          </div>
        </>
      )}
      {type === "footer" && (
        <>
          <Textarea label="Footer text" value={(form.text as string) ?? ""} onChange={(e) => update("text", e.target.value)} rows={3} placeholder="Copyright or short text" />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="footerShowSocial"
              checked={!!form.showSocial}
              onChange={(e) => update("showSocial", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="footerShowSocial" className="text-sm font-medium text-slate-700">Show social links</label>
          </div>
        </>
      )}
      {["about", "amenities", "rooms", "event_halls", "contact", "nearby", "gallery"].includes(type) && (
        <p className="text-sm text-slate-500">This section uses the tenant&apos;s data. No extra settings.</p>
      )}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} style={{ background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)", color: "white", border: "none" }}>
          Done
        </Button>
      </div>
    </div>
  );
}
