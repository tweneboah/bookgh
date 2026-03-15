"use client";

import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useUpdateUser,
  useChangePassword,
  useBranches,
  useKdsConfig,
  useUpdateKdsConfig,
  useTenantProfile,
  useUpdateTenantProfile,
} from "@/hooks/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  AppReactSelect,
  ImageUpload,
} from "@/components/ui";
import type { UploadedImage } from "@/components/ui/image-upload";
import toast from "react-hot-toast";
import { User, Lock, SlidersHorizontal, Mail, Shield, Palette } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAppSelector((s) => s.auth);
  const updateMut = useUpdateUser();
  const changePasswordMut = useChangePassword();
  const saveKdsMut = useUpdateKdsConfig();
  const role = user?.role ?? "";
  const canManageKdsSla = ["tenantAdmin", "branchManager", "restaurantManager"].includes(role);
  const canChooseBranch = role === "tenantAdmin";
  const canEditBranding = role === "tenantAdmin";

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    avatar: [] as UploadedImage[],
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [kdsSlaMinutes, setKdsSlaMinutes] = useState("20");
  const [brandingForm, setBrandingForm] = useState({
    name: "",
    logo: "",
    description: "",
    primaryColor: "#5a189a",
    accentColor: "#ff6d00",
    website: "",
  });

  const { data: branchesData } = useBranches({ limit: "200" });
  const branches = branchesData?.data ?? [];
  const { data: tenantProfileData } = useTenantProfile({ enabled: canEditBranding });
  const updateTenantProfileMut = useUpdateTenantProfile();
  const tenantProfile = tenantProfileData?.data;
  const effectiveBranchId = canChooseBranch
    ? selectedBranchId
    : (user as { branchId?: string })?.branchId ?? "";
  const { data: kdsConfigData } = useKdsConfig(
    effectiveBranchId || undefined,
    !canChooseBranch || !!effectiveBranchId
  );

  useEffect(() => {
    if (user) {
      const avatarUrl = (user as { avatar?: string }).avatar;
      setProfileForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        phone: (user as { phone?: string }).phone ?? "",
        avatar: avatarUrl ? [{ url: avatarUrl }] : [],
      });
    }
  }, [user]);

  useEffect(() => {
    if (canChooseBranch && branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(String(branches[0]._id));
    }
  }, [canChooseBranch, branches, selectedBranchId]);

  useEffect(() => {
    const value = kdsConfigData?.data?.slaMinutes;
    if (value != null) {
      setKdsSlaMinutes(String(value));
    }
  }, [kdsConfigData?.data?.slaMinutes]);

  useEffect(() => {
    if (tenantProfile) {
      const t = tenantProfile as Record<string, unknown>;
      setBrandingForm({
        name: (t.name as string) ?? "",
        logo: (t.logo as string) ?? "",
        description: (t.description as string) ?? "",
        primaryColor: (t.primaryColor as string) ?? "#5a189a",
        accentColor: (t.accentColor as string) ?? "#ff6d00",
        website: (t.website as string) ?? "",
      });
    }
  }, [tenantProfile]);

  const userId = (user as { _id?: string })?._id ?? (user as { id?: string })?.id;

  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTenantProfileMut.mutateAsync({
        name: brandingForm.name.trim() || undefined,
        logo: brandingForm.logo.trim() || undefined,
        description: brandingForm.description.trim() || undefined,
        primaryColor: brandingForm.primaryColor.trim() || undefined,
        accentColor: brandingForm.accentColor.trim() || undefined,
        website: brandingForm.website.trim() || undefined,
      });
      toast.success("Public site branding updated");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to update branding");
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("User not found");
      return;
    }
    try {
      await updateMut.mutateAsync({
        id: userId,
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim() || undefined,
        avatar: profileForm.avatar[0]?.url || undefined,
      });
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to update profile");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!userId) {
      toast.error("User not found");
      return;
    }
    try {
      await changePasswordMut.mutateAsync({
        id: userId,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password changed");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to change password");
    }
  };

  const handleKdsSlaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(kdsSlaMinutes);
    if (!Number.isFinite(num) || num < 5 || num > 180) {
      toast.error("SLA must be between 5 and 180 minutes");
      return;
    }
    try {
      await saveKdsMut.mutateAsync({
        branchId: effectiveBranchId || undefined,
        slaMinutes: num,
      });
      toast.success("KDS SLA updated");
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response
          ?.data?.error?.message ?? "Failed to update KDS SLA"
      );
    }
  };

  const branchOptions = branches.map((branch: { _id: string; name?: string }) => ({
    value: String(branch._id),
    label: branch.name ?? String(branch._id),
  }));

  return (
    <div
      className="min-h-full bg-white font-sans"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Header: white, gradient accent */}
      <header className="bg-white">
        <div className="border-b border-slate-100 pb-6 pt-2">
          <div
            className="mb-2 h-1 w-16 rounded-full"
            style={{
              background: "linear-gradient(90deg, #ff6d00 0%, #9d4edd 100%)",
            }}
            aria-hidden
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm font-normal text-slate-600 sm:text-base">
            Manage your account, security, and preferences in one place.
          </p>
        </div>
      </header>

      <div className="mt-8 space-y-8 sm:space-y-10">
        {/* Profile */}
        <section className="overflow-visible">
          <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div
              className="absolute left-0 top-0 h-full w-1 shrink-0 rounded-l-2xl"
              style={{
                background: "linear-gradient(180deg, #ff6d00 0%, #ff9e00 100%)",
              }}
              aria-hidden
            />
            <CardHeader className="border-b border-slate-100 bg-white px-4 py-5 sm:px-6 sm:py-6">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                  }}
                >
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="m-0 text-lg font-semibold text-slate-900 sm:text-xl">
                    Profile
                  </CardTitle>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Update your personal information
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 sm:pl-7">
              <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="font-medium text-slate-700">Email:</span>{" "}
                  <span className="text-slate-800">{user?.email ?? "—"}</span>
                </p>
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <Shield className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="font-medium text-slate-700">Role:</span>{" "}
                  <span className="text-slate-800">{user?.role ?? "—"}</span>
                </p>
              </div>
              <form onSubmit={handleProfileSubmit} className="max-w-md space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="First Name"
                    value={profileForm.firstName}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    required
                    className="rounded-xl border-slate-200 focus-visible:border-[#ff8500] focus-visible:ring-[#ff8500]"
                  />
                  <Input
                    label="Last Name"
                    value={profileForm.lastName}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    required
                    className="rounded-xl border-slate-200 focus-visible:border-[#ff8500] focus-visible:ring-[#ff8500]"
                  />
                </div>
                <Input
                  label="Phone"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="Optional"
                  className="rounded-xl border-slate-200 focus-visible:border-[#ff8500] focus-visible:ring-[#ff8500]"
                />
                <ImageUpload
                  label="Avatar"
                  value={profileForm.avatar}
                  onChange={(avatar) => setProfileForm((f) => ({ ...f, avatar }))}
                  folder="avatars"
                  single
                />
                <Button
                  type="submit"
                  loading={updateMut.isPending}
                  className="min-h-[44px] rounded-xl border-0 px-6 font-semibold text-white shadow-md transition-shadow hover:opacity-95"
                  style={{
                    background: "linear-gradient(135deg, #ff6d00 0%, #ff9e00 100%)",
                    boxShadow: "0 4px 14px rgba(255, 109, 0, 0.25)",
                  }}
                >
                  Save profile
                </Button>
              </form>
            </CardContent>
          </article>
        </section>

        {/* Password */}
        <section className="overflow-visible">
          <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div
              className="absolute left-0 top-0 h-full w-1 shrink-0 rounded-l-2xl"
              style={{
                background: "linear-gradient(180deg, #5a189a 0%, #9d4edd 100%)",
              }}
              aria-hidden
            />
            <CardHeader className="border-b border-slate-100 bg-white px-4 py-5 sm:px-6 sm:py-6">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 100%)",
                  }}
                >
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="m-0 text-lg font-semibold text-slate-900 sm:text-xl">
                    Change Password
                  </CardTitle>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Update your password to keep your account secure
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 sm:pl-7">
              <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-5">
                <Input
                  label="Current password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({
                      ...f,
                      currentPassword: e.target.value,
                    }))
                  }
                  required
                  autoComplete="current-password"
                  className="rounded-xl border-slate-200 focus-visible:border-[#5a189a] focus-visible:ring-[#5a189a]"
                />
                <Input
                  label="New password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="rounded-xl border-slate-200 focus-visible:border-[#5a189a] focus-visible:ring-[#5a189a]"
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({
                      ...f,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="rounded-xl border-slate-200 focus-visible:border-[#5a189a] focus-visible:ring-[#5a189a]"
                />
                <Button
                  type="submit"
                  loading={changePasswordMut.isPending}
                  disabled={!userId}
                  className="min-h-[44px] rounded-xl border-0 px-6 font-semibold text-white shadow-md transition-shadow hover:opacity-95"
                  style={{
                    background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 100%)",
                    boxShadow: "0 4px 14px rgba(90, 24, 154, 0.25)",
                  }}
                >
                  Change password
                </Button>
              </form>
            </CardContent>
          </article>
        </section>

        {/* Public site branding — tenant admin only */}
        {canEditBranding && (
          <section className="overflow-visible">
            <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div
                className="absolute left-0 top-0 h-full w-1 shrink-0 rounded-l-2xl"
                style={{
                  background: "linear-gradient(180deg, #5a189a 0%, #9d4edd 100%)",
                }}
                aria-hidden
              />
              <CardHeader className="border-b border-slate-100 bg-white px-4 py-5 sm:px-6 sm:py-6">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{
                      background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 100%)",
                    }}
                  >
                    <Palette className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="m-0 text-lg font-semibold text-slate-900 sm:text-xl">
                      Public site branding
                    </CardTitle>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Name, logo, and colors for your hotel’s public page
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 sm:pl-7">
                <form onSubmit={handleBrandingSubmit} className="max-w-md space-y-5">
                  <Input
                    label="Hotel name"
                    value={brandingForm.name}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your hotel or group name"
                  />
                  <Input
                    label="Logo URL"
                    value={brandingForm.logo}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, logo: e.target.value }))}
                    placeholder="https://..."
                  />
                  <Input
                    label="Description"
                    value={brandingForm.description}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Short text for the About section"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Primary color"
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      placeholder="#5a189a"
                    />
                    <Input
                      label="Accent color"
                      value={brandingForm.accentColor}
                      onChange={(e) => setBrandingForm((f) => ({ ...f, accentColor: e.target.value }))}
                      placeholder="#ff6d00"
                    />
                  </div>
                  <Input
                    label="Website URL"
                    value={brandingForm.website}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://..."
                  />
                  <Button
                    type="submit"
                    loading={updateTenantProfileMut.isPending}
                    className="min-h-[44px] rounded-xl border-0 px-6 font-semibold text-white shadow-md transition-shadow hover:opacity-95"
                    style={{
                      background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 100%)",
                      boxShadow: "0 4px 14px rgba(90, 24, 154, 0.25)",
                    }}
                  >
                    Save branding
                  </Button>
                </form>
              </CardContent>
            </article>
          </section>
        )}

        {canManageKdsSla && (
          <section className="overflow-visible">
            <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div
                className="absolute left-0 top-0 h-full w-1 shrink-0 rounded-l-2xl"
                style={{
                  background: "linear-gradient(180deg, #ff6d00 0%, #5a189a 100%)",
                }}
                aria-hidden
              />
              <CardHeader className="border-b border-slate-100 bg-white px-4 py-5 sm:px-6 sm:py-6">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{
                      background: "linear-gradient(135deg, #ff8500 0%, #5a189a 100%)",
                    }}
                  >
                    <SlidersHorizontal className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="m-0 text-lg font-semibold text-slate-900 sm:text-xl">
                      Restaurant KDS SLA
                    </CardTitle>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Prep-time SLA threshold for overdue alerts on the KDS board
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 sm:pl-7">
                <form onSubmit={handleKdsSlaSubmit} className="max-w-md space-y-5">
                  {canChooseBranch && (
                    <AppReactSelect
                      label="Branch"
                      options={branchOptions}
                      value={selectedBranchId}
                      onChange={setSelectedBranchId}
                      placeholder="Select branch"
                    />
                  )}
                  <Input
                    label="SLA (minutes)"
                    type="number"
                    min="5"
                    max="180"
                    step="1"
                    value={kdsSlaMinutes}
                    onChange={(e) => setKdsSlaMinutes(e.target.value)}
                    className="rounded-xl border-slate-200 focus-visible:border-[#ff8500] focus-visible:ring-[#ff8500]"
                  />
                  <Button
                    type="submit"
                    loading={saveKdsMut.isPending}
                    className="min-h-[44px] rounded-xl border-0 px-6 font-semibold text-white shadow-md transition-shadow hover:opacity-95"
                    style={{
                      background: "linear-gradient(135deg, #ff6d00 0%, #7b2cbf 100%)",
                      boxShadow: "0 4px 14px rgba(255, 109, 0, 0.2)",
                    }}
                  >
                    Save KDS SLA
                  </Button>
                </form>
              </CardContent>
            </article>
          </section>
        )}
      </div>
    </div>
  );
}