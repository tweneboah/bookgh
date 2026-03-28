"use client";

import { useState } from "react";
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
} from "@/hooks/api";
import {
  Button,
  Modal,
  Input,
  Select,
  Badge,
  ImageUpload,
  ColorPicker,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { extractColorsFromFile } from "@/lib/extract-image-colors";
import { Plus, Pencil, Ban, Layout, Palette, Globe, Building2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { TENANT_STATUS } from "@/constants";

const STATUS_OPTIONS = Object.entries(TENANT_STATUS).map(([k, v]) => ({
  value: v,
  label: k.replace(/([A-Z])/g, " $1").trim(),
}));

const STATUS_BADGE: Record<string, "success" | "danger" | "warning"> = {
  active: "success",
  suspended: "danger",
  pending: "warning",
};

type PublicSiteConfig = {
  hero?: { style?: string; headline?: string; subheadline?: string; imageUrl?: string };
  navbar?: { style?: string; logoPosition?: string };
  footer?: { show?: boolean; text?: string; links?: { label: string; url: string }[]; showSocial?: boolean };
  sections?: {
    showAbout?: boolean;
    showAmenities?: boolean;
    showRooms?: boolean;
    showEventHalls?: boolean;
    showContact?: boolean;
    showNearby?: boolean;
  };
};

type TenantRow = {
  _id: string;
  name?: string;
  slug?: string;
  contactEmail?: string;
  status?: string;
  starRating?: number;
  currency?: string;
  createdAt?: string;
  customDomain?: string;
  logo?: string;
  primaryColor?: string;
  accentColor?: string;
  publicSiteConfig?: PublicSiteConfig;
};

export default function PlatformTenantsPage() {
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<TenantRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSuspend, setShowSuspend] = useState<string | null>(null);

  const params = { page: String(page), limit: "20" };

  const { data, isLoading } = useTenants(params);
  const createMut = useCreateTenant();
  const updateMut = useUpdateTenant();

  const rawList = data?.data ?? data;
  const items: TenantRow[] = Array.isArray(rawList) ? rawList : [];
  const pagination = (data?.meta as { pagination?: { page: number; limit: number; total: number } })?.pagination;

  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    contactEmail: "",
    contactPhone: "",
    description: "",
    currency: "GHS",
    timezone: "Africa/Accra",
    starRating: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    contactEmail: "",
    contactPhone: "",
    description: "",
    currency: "GHS",
    timezone: "Africa/Accra",
    starRating: "",
    customDomain: "",
    logoUrl: "",
    primaryColor: "#5a189a",
    accentColor: "#ff6d00",
    heroHeadline: "",
    heroSubheadline: "",
    heroImageUrl: "",
    navbarStyle: "default",
    logoPosition: "left",
    footerShow: false,
    footerText: "",
    footerShowSocial: true,
    showAbout: true,
    showAmenities: true,
    showRooms: true,
    showEventHalls: true,
    showContact: true,
    showNearby: true,
  });

  /** Colors extracted from the current logo (for swatches in color picker). */
  const [logoSwatches, setLogoSwatches] = useState<string[]>([]);
  const [extractingColors, setExtractingColors] = useState(false);

  const openCreate = () => {
    setCreateForm({
      name: "",
      slug: "",
      contactEmail: "",
      contactPhone: "",
      description: "",
      currency: "GHS",
      timezone: "Africa/Accra",
      starRating: "",
    });
    setShowCreate(true);
  };

  const openEdit = (item: TenantRow) => {
    setEditItem(item);
    setLogoSwatches([]);
    const cfg = (item as TenantRow).publicSiteConfig;
    setEditForm({
      name: item.name ?? "",
      slug: item.slug ?? "",
      contactEmail: item.contactEmail ?? "",
      contactPhone: (item as { contactPhone?: string }).contactPhone ?? "",
      description: (item as { description?: string }).description ?? "",
      currency: item.currency ?? "GHS",
      timezone: (item as { timezone?: string }).timezone ?? "Africa/Accra",
      starRating: item.starRating != null ? String(item.starRating) : "",
      customDomain: (item as TenantRow).customDomain ?? "",
      logoUrl: (item as TenantRow).logo ?? "",
      primaryColor: (item as TenantRow).primaryColor ?? "#5a189a",
      accentColor: (item as TenantRow).accentColor ?? "#ff6d00",
      heroHeadline: cfg?.hero?.headline ?? "",
      heroSubheadline: cfg?.hero?.subheadline ?? "",
      heroImageUrl: cfg?.hero?.imageUrl ?? "",
      navbarStyle: cfg?.navbar?.style ?? "default",
      logoPosition: cfg?.navbar?.logoPosition ?? "left",
      footerShow: cfg?.footer?.show ?? false,
      footerText: cfg?.footer?.text ?? "",
      footerShowSocial: cfg?.footer?.showSocial ?? true,
      showAbout: cfg?.sections?.showAbout ?? true,
      showAmenities: cfg?.sections?.showAmenities ?? true,
      showRooms: cfg?.sections?.showRooms ?? true,
      showEventHalls: cfg?.sections?.showEventHalls ?? true,
      showContact: cfg?.sections?.showContact ?? true,
      showNearby: cfg?.sections?.showNearby ?? true,
    });
    setShowEdit(true);
  };

  const handleLogoFilesSelected = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setExtractingColors(true);
    try {
      const palette = await extractColorsFromFile(file);
      setLogoSwatches(palette);
      if (palette.length >= 1) {
        setEditForm((f) => ({ ...f, primaryColor: palette[0] }));
      }
      if (palette.length >= 2) {
        setEditForm((f) => ({ ...f, accentColor: palette[1] }));
      }
      if (palette.length >= 1 && palette.length < 2) {
        setEditForm((f) => ({ ...f, accentColor: palette[0] }));
      }
    } catch {
      toast.error("Could not extract colors from logo");
    } finally {
      setExtractingColors(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: createForm.name.trim(),
      slug: createForm.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      contactEmail: createForm.contactEmail.trim(),
      contactPhone: createForm.contactPhone.trim() || undefined,
      description: createForm.description.trim() || undefined,
      currency: createForm.currency,
      timezone: createForm.timezone,
      starRating: createForm.starRating ? parseInt(createForm.starRating, 10) : undefined,
    };
    try {
      await createMut.mutateAsync(payload);
      toast.success("Tenant created");
      setShowCreate(false);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to create tenant");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const payload = {
      name: editForm.name.trim(),
      slug: editForm.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      contactEmail: editForm.contactEmail.trim(),
      contactPhone: editForm.contactPhone.trim() || undefined,
      description: editForm.description.trim() || undefined,
      currency: editForm.currency,
      timezone: editForm.timezone,
      starRating: editForm.starRating ? parseInt(editForm.starRating, 10) : undefined,
      customDomain: editForm.customDomain.trim() || undefined,
      logo: editForm.logoUrl.trim() || undefined,
      primaryColor: editForm.primaryColor.trim() || undefined,
      accentColor: editForm.accentColor.trim() || undefined,
      publicSiteConfig: {
        hero: {
          headline: editForm.heroHeadline.trim(),
          subheadline: editForm.heroSubheadline.trim(),
          imageUrl: editForm.heroImageUrl.trim() || undefined,
        },
        navbar: {
          style: editForm.navbarStyle as "default" | "transparent" | "minimal",
          logoPosition: editForm.logoPosition as "left" | "center",
        },
        footer: {
          show: editForm.footerShow,
          text: editForm.footerText.trim() || undefined,
          showSocial: editForm.footerShowSocial,
        },
        sections: {
          showAbout: editForm.showAbout,
          showAmenities: editForm.showAmenities,
          showRooms: editForm.showRooms,
          showEventHalls: editForm.showEventHalls,
          showContact: editForm.showContact,
          showNearby: editForm.showNearby,
        },
      },
    };
    try {
      await updateMut.mutateAsync({ id: editItem._id, ...payload });
      toast.success("Tenant updated");
      setShowEdit(false);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: { message?: string } }; status?: number } };
      console.error("[TenantUpdate] API error", {
        status: axErr?.response?.status,
        data: axErr?.response?.data,
        fullError: err,
      });
      toast.error(axErr?.response?.data?.error?.message ?? "Failed to update tenant");
    }
  };

  const handleSuspend = async () => {
    if (!showSuspend) return;
    try {
      await updateMut.mutateAsync({ id: showSuspend, status: TENANT_STATUS.SUSPENDED });
      toast.success("Tenant suspended");
      setShowSuspend(null);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to suspend tenant");
    }
  };

  const totalTenants = pagination?.total ?? items.length;
  const activeCount = items.filter((r) => r.status === "active").length;

  return (
    <div className="min-h-screen bg-white">
      {/* Page header — white background */}
      <header className="border-b border-slate-100 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl" style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
              Tenants
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Manage hotel properties and their public sites
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] text-white shadow-md hover:opacity-95 focus:ring-2 focus:ring-[#ff8500]/50"
          >
            <Plus className="h-4 w-4" />
            Add Tenant
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats strip */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/60">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#5a189a]/10">
                <Building2 className="h-6 w-6 text-[#5a189a]" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total tenants</p>
                <p className="text-2xl font-bold text-slate-900">{isLoading ? "—" : totalTenants}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/60">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ff6d00]/10">
                <Layout className="h-6 w-6 text-[#ff6d00]" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Active</p>
                <p className="text-2xl font-bold text-slate-900">{isLoading ? "—" : activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/60 sm:col-span-2 lg:col-span-1">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a189a]/20 to-[#ff6d00]/20">
                <Palette className="h-6 w-6 text-[#7b2cbf]" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Branding</p>
                <p className="text-sm font-medium text-slate-700">Logo & colors per tenant</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenant cards grid — fresh layout */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200/60">
                  <CardContent className="p-0">
                    <div className="h-28 animate-pulse bg-slate-100" />
                    <div className="space-y-3 p-5">
                      <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                      <div className="flex gap-2 pt-2">
                        <div className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
                        <div className="h-8 w-16 animate-pulse rounded-md bg-slate-100" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/60">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">No tenants yet</h2>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Add your first tenant to get started. Each tenant can have its own branding and public site.
                </p>
                <Button
                  onClick={openCreate}
                  className="mt-6 bg-gradient-to-r from-[#ff6d00] to-[#ff9e00] text-white hover:opacity-95"
                >
                  <Plus className="h-4 w-4" />
                  Add Tenant
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((row) => (
                  <Card
                    key={row._id}
                    className="overflow-hidden border-0 bg-white shadow-sm transition-shadow hover:shadow-md ring-1 ring-slate-200/60"
                  >
                    <div className="flex h-24 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/80" style={row.primaryColor ? { background: `linear-gradient(135deg, ${row.primaryColor}12, ${row.accentColor || row.primaryColor}08)` } : undefined}>
                      {row.logo ? (
                        <img src={row.logo} alt="" className="max-h-16 max-w-[180px] object-contain" />
                      ) : (
                        <Building2 className="h-10 w-10 text-slate-300" />
                      )}
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-slate-900">{row.name ?? "—"}</h3>
                          <p className="mt-0.5 text-sm text-slate-500">{row.slug ?? "—"}</p>
                        </div>
                        <Badge variant={STATUS_BADGE[row.status ?? ""] ?? "default"} className="shrink-0">
                          {row.status ?? "—"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {row.starRating != null && <span>{row.starRating}★</span>}
                        {row.currency && <span>{row.currency}</span>}
                        {row.contactEmail && <span className="truncate max-w-[140px]" title={row.contactEmail}>{row.contactEmail}</span>}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Link href={`/platform/tenants/${row._id}/website-builder`} title="Customize site">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#5a189a]/30 text-[#5a189a] hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
                          >
                            <Layout className="h-3.5 w-3.5" />
                            Customize
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => openEdit(row)} aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        {row.status !== TENANT_STATUS.SUSPENDED && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSuspend(row._id)}
                            aria-label="Suspend"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {pagination && pagination.total > pagination.limit && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm text-slate-600">
                    Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page <= 1}
                      className="border-slate-200"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                      className="border-slate-200"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Tenant" size="lg">
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-4 space-y-4">
            <Input
              label="Name"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Hotel name"
            />
            <Input
              label="Slug"
              value={createForm.slug}
              onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
              required
              placeholder="hotel-slug"
            />
            <Input
              label="Contact Email"
              type="email"
              value={createForm.contactEmail}
              onChange={(e) => setCreateForm((f) => ({ ...f, contactEmail: e.target.value }))}
              required
            />
            <Input
              label="Contact Phone"
              value={createForm.contactPhone}
              onChange={(e) => setCreateForm((f) => ({ ...f, contactPhone: e.target.value }))}
              placeholder="Optional"
            />
            <Input
              label="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Currency"
              value={createForm.currency}
              onChange={(e) => setCreateForm((f) => ({ ...f, currency: e.target.value }))}
              placeholder="GHS"
            />
            <Input
              label="Timezone"
              value={createForm.timezone}
              onChange={(e) => setCreateForm((f) => ({ ...f, timezone: e.target.value }))}
              placeholder="Africa/Accra"
            />
          </div>
          <Input
            label="Star Rating (1–5)"
            type="number"
            min={1}
            max={5}
            value={createForm.starRating}
            onChange={(e) => setCreateForm((f) => ({ ...f, starRating: e.target.value }))}
            placeholder="Optional"
          />
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="border-slate-200">
              Cancel
            </Button>
            <Button type="submit" loading={createMut.isPending} className="bg-gradient-to-r from-[#5a189a] to-[#7b2cbf] text-white hover:opacity-95">
              Create tenant
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Tenant" size="2xl" className="max-h-[90vh]">
        <form onSubmit={handleEditSubmit} className="space-y-6 pb-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#5a189a]/10 p-1.5">
                    <Building2 className="h-4 w-4 text-[#5a189a]" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900">Basic info</CardTitle>
                </div>
                <CardDescription>Name, contact and locale settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <Input
                  label="Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Hotel name"
                />
                <Input
                  label="Slug"
                  value={editForm.slug}
                  onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                  required
                  placeholder="hotel-slug"
                />
                <Input
                  label="Contact Email"
                  type="email"
                  value={editForm.contactEmail}
                  onChange={(e) => setEditForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  required
                />
                <Input
                  label="Contact Phone"
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  placeholder="Optional"
                />
                <Input
                  label="Description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Currency"
                    value={editForm.currency}
                    onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))}
                  />
                  <Input
                    label="Timezone"
                    value={editForm.timezone}
                    onChange={(e) => setEditForm((f) => ({ ...f, timezone: e.target.value }))}
                  />
                </div>
                <Input
                  label="Star Rating (1–5)"
                  type="number"
                  min={1}
                  max={5}
                  value={editForm.starRating}
                  onChange={(e) => setEditForm((f) => ({ ...f, starRating: e.target.value }))}
                  placeholder="Optional"
                />
                <Input
                  label="Custom domain"
                  value={editForm.customDomain}
                  onChange={(e) => setEditForm((f) => ({ ...f, customDomain: e.target.value.trim().toLowerCase() }))}
                  placeholder="e.g. www.royalpalace.com"
                />
                <p className="text-xs text-slate-500">
                  Optional — set after deployment. Until then: yourplatform.com/hotels/[branch-slug]
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#ff6d00]/10 p-1.5">
                    <Palette className="h-4 w-4 text-[#ff6d00]" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900">Branding</CardTitle>
                </div>
                <CardDescription>Logo and brand colors for the public site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <ImageUpload
                    label="Logo"
                    folder="logos"
                    single
                    tenantId={editItem?._id}
                    value={editForm.logoUrl ? [{ url: editForm.logoUrl }] : []}
                    onChange={(imgs) => setEditForm((f) => ({ ...f, logoUrl: imgs[0]?.url ?? "" }))}
                    onFilesSelected={handleLogoFilesSelected}
                  />
                  {extractingColors && (
                    <p className="mt-1 text-xs text-[#5a189a]">Extracting colors from logo…</p>
                  )}
                  <Input
                    label="Or paste logo URL"
                    type="url"
                    value={editForm.logoUrl}
                    onChange={(e) => setEditForm((f) => ({ ...f, logoUrl: e.target.value }))}
                    placeholder="https://…"
                    className="mt-2"
                  />
                </div>
                <ColorPicker
                  label="Primary color"
                  value={editForm.primaryColor}
                  onChange={(hex) => setEditForm((f) => ({ ...f, primaryColor: hex }))}
                  swatches={logoSwatches}
                  hint="Used for headings and primary UI."
                />
                <ColorPicker
                  label="Accent color"
                  value={editForm.accentColor}
                  onChange={(hex) => setEditForm((f) => ({ ...f, accentColor: hex }))}
                  swatches={logoSwatches}
                  hint="Used for buttons and highlights."
                />
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#7b2cbf]/10 p-1.5">
                  <Globe className="h-4 w-4 text-[#7b2cbf]" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-900">Public site layout</CardTitle>
              </div>
              <CardDescription>Hero, navbar, footer and which sections to show on the public hotel page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Input
                label="Hero headline (overrides hotel name)"
                value={editForm.heroHeadline}
                onChange={(e) => setEditForm((f) => ({ ...f, heroHeadline: e.target.value }))}
                placeholder="Leave empty to use hotel name"
              />
              <Input
                label="Hero subheadline"
                value={editForm.heroSubheadline}
                onChange={(e) => setEditForm((f) => ({ ...f, heroSubheadline: e.target.value }))}
                placeholder="Optional tagline"
              />
              <div>
                <ImageUpload
                  label="Hero image"
                  folder="tenant-hero"
                  single
                  tenantId={editItem?._id}
                  value={editForm.heroImageUrl ? [{ url: editForm.heroImageUrl }] : []}
                  onChange={(imgs) => setEditForm((f) => ({ ...f, heroImageUrl: imgs[0]?.url ?? "" }))}
                />
                <Input
                  label="Or paste hero image URL"
                  type="url"
                  value={editForm.heroImageUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, heroImageUrl: e.target.value }))}
                  placeholder="https://… (optional)"
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Select
                  label="Navbar style"
                  value={editForm.navbarStyle}
                  onChange={(e) => setEditForm((f) => ({ ...f, navbarStyle: e.target.value }))}
                  options={[
                    { value: "default", label: "Default" },
                    { value: "transparent", label: "Transparent" },
                    { value: "minimal", label: "Minimal" },
                  ]}
                />
                <Select
                  label="Logo position"
                  value={editForm.logoPosition}
                  onChange={(e) => setEditForm((f) => ({ ...f, logoPosition: e.target.value }))}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                  ]}
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                <input
                  type="checkbox"
                  id="footerShow"
                  checked={editForm.footerShow}
                  onChange={(e) => setEditForm((f) => ({ ...f, footerShow: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]"
                />
                <label htmlFor="footerShow" className="text-sm font-medium text-slate-700">Show footer on public page</label>
              </div>
              {editForm.footerShow && (
                <div className="space-y-4 pl-1">
                  <Input
                    label="Footer text"
                    value={editForm.footerText}
                    onChange={(e) => setEditForm((f) => ({ ...f, footerText: e.target.value }))}
                    placeholder="Copyright or short text"
                  />
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                    <input
                      type="checkbox"
                      id="footerShowSocial"
                      checked={editForm.footerShowSocial}
                      onChange={(e) => setEditForm((f) => ({ ...f, footerShowSocial: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]"
                    />
                    <label htmlFor="footerShowSocial" className="text-sm font-medium text-slate-700">Show social links in footer</label>
                  </div>
                </div>
              )}
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Sections to show</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { key: "showAbout", label: "About" },
                    { key: "showAmenities", label: "Amenities" },
                    { key: "showRooms", label: "Rooms" },
                    { key: "showEventHalls", label: "Event halls" },
                    { key: "showContact", label: "Contact" },
                    { key: "showNearby", label: "Nearby hotels" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2 rounded-md border border-slate-200/80 bg-white px-2.5 py-1.5">
                      <input
                        type="checkbox"
                        id={key}
                        checked={editForm[key as keyof typeof editForm] as boolean}
                        onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-[#5a189a] focus:ring-[#5a189a]"
                      />
                      <label htmlFor={key} className="text-sm text-slate-700">{label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMut.isPending} className="bg-gradient-to-r from-[#5a189a] to-[#7b2cbf] text-white hover:opacity-90">
              Update tenant
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showSuspend}
        onClose={() => setShowSuspend(null)}
        title="Suspend Tenant"
      >
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-4">
          <p className="text-sm font-medium text-slate-700">
            Are you sure you want to suspend this tenant? They will not be able to
            access the platform until reactivated.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowSuspend(null)} className="border-slate-200">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSuspend}
            loading={updateMut.isPending}
          >
            Suspend
          </Button>
        </div>
      </Modal>
    </div>
  );
}
