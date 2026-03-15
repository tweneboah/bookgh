"use client";

import { useState } from "react";
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
} from "@/hooks/api";
import {
  Button,
  DataTable,
  Modal,
  Input,
  Select,
  Badge,
  ImageUpload,
} from "@/components/ui";
import { Plus, Pencil, Ban, Layout } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";
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

  const items = (data?.data ?? data) as TenantRow[];
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
    // [TenantUpdate] Debug: what we send
    console.log("[TenantUpdate] editForm (raw)", {
      primaryColor: editForm.primaryColor,
      accentColor: editForm.accentColor,
    });
    console.log("[TenantUpdate] payload (sent to API)", {
      primaryColor: payload.primaryColor,
      accentColor: payload.accentColor,
      tenantId: editItem._id,
    });
    try {
      const result = await updateMut.mutateAsync({ id: editItem._id, ...payload });
      console.log("[TenantUpdate] API success – response data", (result as { data?: unknown })?.data);
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

  const columns = [
    { key: "name", header: "Hotel Name", render: (row: TenantRow) => row.name ?? "-" },
    { key: "slug", header: "Slug", render: (row: TenantRow) => row.slug ?? "-" },
    { key: "contactEmail", header: "Contact Email", render: (row: TenantRow) => row.contactEmail ?? "-" },
    { key: "customDomain", header: "Custom Domain", render: (row: TenantRow) => row.customDomain ?? "-" },
    {
      key: "status",
      header: "Status",
      render: (row: TenantRow) => (
        <Badge variant={STATUS_BADGE[row.status ?? ""] ?? "default"}>
          {row.status ?? "-"}
        </Badge>
      ),
    },
    {
      key: "starRating",
      header: "Star Rating",
      render: (row: TenantRow) => row.starRating ?? "-",
    },
    { key: "currency", header: "Currency", render: (row: TenantRow) => row.currency ?? "-" },
    {
      key: "createdAt",
      header: "Created",
      render: (row: TenantRow) =>
        row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy") : "-",
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: TenantRow) => (
        <div className="flex items-center gap-2">
          <Link href={`/platform/tenants/${row._id}/website-builder`} title="Customize site">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Customize site"
              className="text-[#5a189a] hover:bg-[#5a189a]/10 hover:text-[#5a189a]"
            >
              <Layout className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row)}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {row.status !== TENANT_STATUS.SUSPENDED && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuspend(row._id)}
              aria-label="Suspend"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tenants</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        getRowKey={(row) => row._id}
        loading={isLoading}
        pagination={
          pagination
            ? {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                onPageChange: setPage,
              }
            : undefined
        }
        emptyTitle="No tenants"
        emptyDescription="Add your first tenant to get started."
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Tenant" size="lg">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
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
            label="Star Rating (1-5)"
            type="number"
            min={1}
            max={5}
            value={createForm.starRating}
            onChange={(e) => setCreateForm((f) => ({ ...f, starRating: e.target.value }))}
            placeholder="Optional"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMut.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Tenant" size="lg">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Name"
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Slug"
            value={editForm.slug}
            onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
            required
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
          />
          <Input
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
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
            label="Star Rating (1-5)"
            type="number"
            min={1}
            max={5}
            value={editForm.starRating}
            onChange={(e) => setEditForm((f) => ({ ...f, starRating: e.target.value }))}
          />
          <Input
            label="Custom domain"
            value={editForm.customDomain}
            onChange={(e) => setEditForm((f) => ({ ...f, customDomain: e.target.value.trim().toLowerCase() }))}
            placeholder="e.g. www.royalpalace.com"
          />
          <p className="-mt-2 text-xs text-slate-500">
            Optional — set after deployment when connecting tenant DNS. Until then, tenants use: yourplatform.com/hotels/[branch-slug]
          </p>
          <div>
            <ImageUpload
              label="Logo"
              folder="logos"
              single
              tenantId={editItem?._id}
              value={editForm.logoUrl ? [{ url: editForm.logoUrl }] : []}
              onChange={(imgs) => setEditForm((f) => ({ ...f, logoUrl: imgs[0]?.url ?? "" }))}
            />
            <Input
              label="Or paste logo URL"
              type="url"
              value={editForm.logoUrl}
              onChange={(e) => setEditForm((f) => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://…"
              className="mt-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Primary color"
              type="text"
              value={editForm.primaryColor}
              onChange={(e) => setEditForm((f) => ({ ...f, primaryColor: e.target.value }))}
              placeholder="#5a189a"
            />
            <Input
              label="Accent color"
              type="text"
              value={editForm.accentColor}
              onChange={(e) => setEditForm((f) => ({ ...f, accentColor: e.target.value }))}
              placeholder="#ff6d00"
            />
          </div>
          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Public site layout</h3>
            <p className="mb-4 text-xs text-slate-500">
              Hero, navbar, footer and which sections to show on the public hotel page.
            </p>
            <div className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="footerShow"
                  checked={editForm.footerShow}
                  onChange={(e) => setEditForm((f) => ({ ...f, footerShow: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="footerShow" className="text-sm font-medium text-slate-700">Show footer on public page</label>
              </div>
              {editForm.footerShow && (
                <>
                  <Input
                    label="Footer text"
                    value={editForm.footerText}
                    onChange={(e) => setEditForm((f) => ({ ...f, footerText: e.target.value }))}
                    placeholder="Copyright or short text"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="footerShowSocial"
                      checked={editForm.footerShowSocial}
                      onChange={(e) => setEditForm((f) => ({ ...f, footerShowSocial: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <label htmlFor="footerShowSocial" className="text-sm font-medium text-slate-700">Show social links in footer</label>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { key: "showAbout", label: "About" },
                  { key: "showAmenities", label: "Amenities" },
                  { key: "showRooms", label: "Rooms" },
                  { key: "showEventHalls", label: "Event halls" },
                  { key: "showContact", label: "Contact" },
                  { key: "showNearby", label: "Nearby hotels" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={key}
                      checked={editForm[key as keyof typeof editForm] as boolean}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <label htmlFor={key} className="text-sm text-slate-700">{label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMut.isPending}>
              Update
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showSuspend}
        onClose={() => setShowSuspend(null)}
        title="Suspend Tenant"
      >
        <p className="text-slate-600">
          Are you sure you want to suspend this tenant? They will not be able to
          access the platform until reactivated.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowSuspend(null)}>
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
