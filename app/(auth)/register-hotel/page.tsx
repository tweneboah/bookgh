"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  registerHotel,
  clearError,
  type RegisterHotelPayload,
} from "@/store/auth-slice";
import { PlatformNav } from "@/components/layout/platform-nav";
import { TwoStepAddressPicker, type AddressResult } from "@/components/location/TwoStepAddressPicker";
import { cn } from "@/lib/cn";

const PRIMARY = "#ec5b13";
const BG_LIGHT = "#f8f6f6";

const CURRENCY_OPTIONS = [
  { value: "GHS", label: "GHS - Ghana Cedi" },
  { value: "NGN", label: "NGN - Naira" },
  { value: "KES", label: "KES - Kenya Shilling" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
];

const STAR_OPTIONS = [
  { value: "", label: "Select stars" },
  { value: "1", label: "1 Star" },
  { value: "2", label: "2 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "5", label: "5 Stars" },
  { value: "unrated", label: "Unrated / Boutique" },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLACEHOLDER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCPINqNm3bE4syzTagB5ydu9NNx91qvKjL3Q5D3E5xyP44vXChENlpPeqTMnG2dQjNMfdvZWH6Je9KotIiaxMtoDSH017R9Dc0rJVI5hdQGZFe3okhkxHcgMIknr3I6pWCKclvP0xI_gtv_RJJrOxhQclmwOl-m3Mi2sStpNnYAfhgYyw8w5Ak1SQtBJduNPtKIFJ7gkC0HnF-K82XGWI4RCSzrPnHZOwTkFIc5n1fiVeS0U62Oc2xk86hHZVYOVBMCctYB-0HnJ1Rj";

export default function RegisterHotelPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { error, isLoading } = useAppSelector((s) => s.auth);
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [owner, setOwner] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  const [hotel, setHotel] = useState({
    name: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    currency: "GHS",
    timezone: "Africa/Accra",
    starRating: "",
  });

  const [branch, setBranch] = useState({
    name: "",
    street: "",
    city: "",
    region: "",
    country: "Ghana",
    contactEmail: "",
    contactPhone: "",
  });
  const [branchAddressResult, setBranchAddressResult] = useState<AddressResult | null>(null);

  const clearFieldError = (name: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  function validateStep(): boolean {
    setFieldErrors({});
    const errors: Record<string, string> = {};

    if (step === 0) {
      if (!owner.firstName.trim()) errors.owner_firstName = "First name is required";
      if (!owner.lastName.trim()) errors.owner_lastName = "Last name is required";
      const tEmail = owner.email.trim().toLowerCase();
      if (!tEmail) errors.owner_email = "Email is required";
      else if (!emailRegex.test(tEmail)) errors.owner_email = "Please enter a valid email";
      if (!owner.password) errors.owner_password = "Password is required";
      else if (owner.password.length < 8) errors.owner_password = "Password must be at least 8 characters";
      if (!owner.confirmPassword) errors.owner_confirmPassword = "Please confirm your password";
      else if (owner.password !== owner.confirmPassword) errors.owner_confirmPassword = "Passwords do not match";
    }

    if (step === 1) {
      if (!hotel.name.trim()) errors.hotel_name = "Hotel name is required";
      const tEmail = hotel.contactEmail.trim().toLowerCase();
      if (!tEmail) errors.hotel_contactEmail = "Contact email is required";
      else if (!emailRegex.test(tEmail)) errors.hotel_contactEmail = "Please enter a valid email";
    }

    if (step === 2) {
      if (!branch.name.trim()) errors.branch_name = "Branch name is required";
      const hasMapAddress = !!branchAddressResult?.address;
      const hasManualAddress = !!(branch.street?.trim() && branch.city?.trim());
      if (!hasMapAddress && !hasManualAddress) {
        errors.branch_address = "Select an address from the map search or enter street and city";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function next() {
    if (validateStep()) setStep((s) => Math.min(s + 1, 2));
  }

  function back() {
    setFieldErrors({});
    dispatch(clearError());
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep()) return;
    dispatch(clearError());
    setFieldErrors({});

    const r = branchAddressResult;
    const branchPayload: RegisterHotelPayload["branch"] = {
      name: branch.name.trim(),
      city: r ? r.city : branch.city.trim() || undefined,
      region: r ? r.state : branch.region.trim() || undefined,
      country: r ? r.country : branch.country.trim() || undefined,
      address: {
        street: r ? r.address : branch.street.trim() || undefined,
        city: r ? r.city : branch.city.trim() || undefined,
        region: r ? r.state : branch.region.trim() || undefined,
        country: r ? r.country : branch.country.trim() || undefined,
      },
      ...(r && { location: { lat: r.lat, lng: r.lng }, googlePlaceId: r.placeId }),
      contactEmail: branch.contactEmail.trim() || undefined,
      contactPhone: branch.contactPhone.trim() || undefined,
    };

    const payload: RegisterHotelPayload = {
      owner: {
        firstName: owner.firstName.trim(),
        lastName: owner.lastName.trim(),
        email: owner.email.trim().toLowerCase(),
        password: owner.password,
        phone: owner.phone.trim() || undefined,
      },
      hotel: {
        name: hotel.name.trim(),
        description: hotel.description.trim() || undefined,
        contactEmail: hotel.contactEmail.trim().toLowerCase(),
        contactPhone: hotel.contactPhone.trim() || undefined,
        currency: hotel.currency,
        timezone: hotel.timezone,
        starRating: hotel.starRating && hotel.starRating !== "unrated" ? Number(hotel.starRating) : undefined,
      },
      branch: branchPayload,
    };

    const result = await dispatch(registerHotel(payload));
    if (registerHotel.fulfilled.match(result)) {
      router.push("/dashboard");
    }
  }

  const displayError = error;
  const progressPct = step === 0 ? 33 : step === 1 ? 66 : 100;
  const inputCls = (err: boolean) =>
    cn(
      "flex w-full rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 p-4 text-base transition-shadow h-14 focus:outline-none focus:ring-1",
      err
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-300 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
    );
  const labelCls = "text-slate-900 text-sm font-semibold pb-2";
  const selectCls = (err?: boolean) =>
    cn(
      "w-full rounded-xl border bg-white text-slate-900 p-4 text-base h-14 focus:outline-none focus:ring-1",
      err
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-200 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
    );

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden"
      style={{ backgroundColor: BG_LIGHT, fontFamily: "'Public Sans', sans-serif" }}
    >
      <PlatformNav />

      <div className="layout-container flex min-h-screen grow flex-col">
        <div className="mx-auto flex w-full max-w-[1200px] flex-1 justify-center px-4 py-5 md:px-10 lg:px-40">
          <div
            className={cn(
              "layout-content-container flex flex-1 flex-col",
              step === 0 && "max-w-[560px]",
              step === 1 && "max-w-[640px]",
              step === 2 && "max-w-3xl w-full"
            )}
          >
            <main className="flex flex-1 flex-col py-10 px-4">
              {/* Progress */}
              <div className="mb-8 flex flex-col gap-3">
                <div className="flex items-end justify-between gap-6">
                  <p
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: PRIMARY }}
                  >
                    Step {step + 1} of 3
                  </p>
                  <p className="text-sm font-medium text-slate-500">
                    {progressPct}% Complete
                  </p>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full"
                    style={{ width: `${progressPct}%`, backgroundColor: PRIMARY }}
                  />
                </div>
                {step === 1 && (
                  <p className="text-sm font-medium text-slate-500">
                    Next: First branch
                  </p>
                )}
                {step === 2 && (
                  <p className="text-sm text-slate-600">
                    Set up your hotel in 3 quick steps •{" "}
                    <span className="font-semibold" style={{ color: PRIMARY }}>
                      First branch
                    </span>
                  </p>
                )}
              </div>

              {/* Page title */}
              <div className="mb-8 flex flex-col gap-2">
                <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900">
                  List your property
                </h1>
                <p className="text-lg font-normal text-slate-600">
                  {step === 0
                    ? "Set up your hotel in 3 quick steps. Let's start with your details."
                    : "Set up your hotel in 3 quick steps"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {displayError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3.5 text-sm font-medium text-red-700"
                  >
                    {displayError}
                  </div>
                )}

                {/* Step 0: Owner */}
                {step === 0 && (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="flex flex-1 flex-col">
                        <p className={labelCls}>First name</p>
                        <input
                          type="text"
                          placeholder="e.g. John"
                          value={owner.firstName}
                          onChange={(e) => {
                            setOwner((o) => ({ ...o, firstName: e.target.value }));
                            clearFieldError("owner_firstName");
                          }}
                          autoComplete="given-name"
                          aria-invalid={!!fieldErrors.owner_firstName}
                          className={inputCls(!!fieldErrors.owner_firstName)}
                        />
                        {fieldErrors.owner_firstName && (
                          <p className="mt-1.5 text-sm text-red-600" role="alert">
                            {fieldErrors.owner_firstName}
                          </p>
                        )}
                      </label>
                      <label className="flex flex-1 flex-col">
                        <p className={labelCls}>Last name</p>
                        <input
                          type="text"
                          placeholder="e.g. Smith"
                          value={owner.lastName}
                          onChange={(e) => {
                            setOwner((o) => ({ ...o, lastName: e.target.value }));
                            clearFieldError("owner_lastName");
                          }}
                          autoComplete="family-name"
                          aria-invalid={!!fieldErrors.owner_lastName}
                          className={inputCls(!!fieldErrors.owner_lastName)}
                        />
                        {fieldErrors.owner_lastName && (
                          <p className="mt-1.5 text-sm text-red-600" role="alert">
                            {fieldErrors.owner_lastName}
                          </p>
                        )}
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="flex flex-1 flex-col">
                        <p className={labelCls}>Email address</p>
                        <input
                          type="email"
                          placeholder="name@hotel.com"
                          value={owner.email}
                          onChange={(e) => {
                            setOwner((o) => ({ ...o, email: e.target.value }));
                            clearFieldError("owner_email");
                          }}
                          autoComplete="email"
                          aria-invalid={!!fieldErrors.owner_email}
                          className={inputCls(!!fieldErrors.owner_email)}
                        />
                        {fieldErrors.owner_email && (
                          <p className="mt-1.5 text-sm text-red-600" role="alert">
                            {fieldErrors.owner_email}
                          </p>
                        )}
                      </label>
                      <label className="flex flex-1 flex-col">
                        <p className={labelCls}>Phone number</p>
                        <input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={owner.phone}
                          onChange={(e) => setOwner((o) => ({ ...o, phone: e.target.value }))}
                          autoComplete="tel"
                          className={inputCls(false)}
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="flex flex-1 flex-col">
                        <p className={labelCls}>Password</p>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={owner.password}
                          onChange={(e) => {
                            setOwner((o) => ({ ...o, password: e.target.value }));
                            clearFieldError("owner_password");
                            if (owner.confirmPassword) clearFieldError("owner_confirmPassword");
                          }}
                          autoComplete="new-password"
                          aria-invalid={!!fieldErrors.owner_password}
                          className={inputCls(!!fieldErrors.owner_password)}
                        />
                        {fieldErrors.owner_password && (
                          <p className="mt-1.5 text-sm text-red-600" role="alert">
                            {fieldErrors.owner_password}
                          </p>
                        )}
                      </label>
                      <label className="flex flex-1 flex-col">
                        <p className={labelCls}>Confirm password</p>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={owner.confirmPassword}
                          onChange={(e) => {
                            setOwner((o) => ({ ...o, confirmPassword: e.target.value }));
                            clearFieldError("owner_confirmPassword");
                          }}
                          autoComplete="new-password"
                          aria-invalid={!!fieldErrors.owner_confirmPassword}
                          className={inputCls(!!fieldErrors.owner_confirmPassword)}
                        />
                        {fieldErrors.owner_confirmPassword && (
                          <p className="mt-1.5 text-sm text-red-600" role="alert">
                            {fieldErrors.owner_confirmPassword}
                          </p>
                        )}
                      </label>
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={next}
                        className="flex h-14 w-full items-center justify-center rounded-xl text-base font-bold text-white shadow-lg transition-all active:scale-[0.98]"
                        style={{
                          backgroundColor: PRIMARY,
                          boxShadow: "0 10px 30px rgba(236, 91, 19, 0.25)",
                        }}
                      >
                        Next
                        <span className="material-symbols-outlined ml-2">arrow_forward</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Step 1: Hotel */}
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-1 gap-6">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-800">Hotel Name</span>
                        <input
                          type="text"
                          placeholder="e.g. The Grand Savanna"
                          value={hotel.name}
                          onChange={(e) => {
                            setHotel((h) => ({ ...h, name: e.target.value }));
                            clearFieldError("hotel_name");
                          }}
                          aria-invalid={!!fieldErrors.hotel_name}
                          className={cn(
                            "w-full rounded-xl border bg-white p-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-[#ec5b13] focus:ring-[#ec5b13]",
                            fieldErrors.hotel_name ? "border-red-400" : "border-slate-200"
                          )}
                        />
                        {fieldErrors.hotel_name && (
                          <p className="text-sm text-red-600" role="alert">
                            {fieldErrors.hotel_name}
                          </p>
                        )}
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-800">Description</span>
                        <textarea
                          placeholder="Briefly describe what makes your hotel unique..."
                          value={hotel.description}
                          onChange={(e) => setHotel((h) => ({ ...h, description: e.target.value }))}
                          rows={4}
                          className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-white p-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-slate-800">Contact Email</span>
                          <input
                            type="email"
                            placeholder="hello@hotel.com"
                            value={hotel.contactEmail}
                            onChange={(e) => {
                              setHotel((h) => ({ ...h, contactEmail: e.target.value }));
                              clearFieldError("hotel_contactEmail");
                            }}
                            aria-invalid={!!fieldErrors.hotel_contactEmail}
                            className={cn(
                              "w-full rounded-xl border bg-white p-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-[#ec5b13] focus:ring-[#ec5b13]",
                              fieldErrors.hotel_contactEmail ? "border-red-400" : "border-slate-200"
                            )}
                          />
                          {fieldErrors.hotel_contactEmail && (
                            <p className="text-sm text-red-600" role="alert">
                              {fieldErrors.hotel_contactEmail}
                            </p>
                          )}
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-slate-800">Contact Phone</span>
                          <input
                            type="tel"
                            placeholder="+233 20 000 0000"
                            value={hotel.contactPhone}
                            onChange={(e) => setHotel((h) => ({ ...h, contactPhone: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-slate-800">Default Currency</span>
                          <select
                            value={hotel.currency}
                            onChange={(e) => setHotel((h) => ({ ...h, currency: e.target.value }))}
                            className={selectCls()}
                          >
                            {CURRENCY_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-slate-800">Star Rating</span>
                          <select
                            value={hotel.starRating}
                            onChange={(e) => setHotel((h) => ({ ...h, starRating: e.target.value }))}
                            className={selectCls()}
                          >
                            {STAR_OPTIONS.map((o) => (
                              <option key={o.value || "empty"} value={o.value} disabled={o.value === ""}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                    <div className="mt-8 flex flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
                      <button
                        type="button"
                        onClick={back}
                        className="rounded-xl px-8 py-4 font-bold text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={next}
                        className="rounded-xl px-10 py-4 font-bold text-white shadow-lg transition-all active:scale-95"
                        style={{
                          backgroundColor: PRIMARY,
                          boxShadow: "0 10px 30px rgba(236, 91, 19, 0.25)",
                        }}
                      >
                        Next Step
                      </button>
                    </div>
                  </>
                )}

                {/* Step 2: Branch */}
                {step === 2 && (
                  <>
                    <div className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm lg:p-8">
                      <div className="space-y-8">
                        <section className="space-y-4">
                          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <span className="material-symbols-outlined" style={{ color: PRIMARY }}>
                              info
                            </span>
                            Branch Details
                          </h3>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="col-span-full flex flex-col gap-2">
                              <span className="text-sm font-semibold text-slate-700">Branch Name</span>
                              <input
                                type="text"
                                placeholder="e.g. Grand Plaza Downtown"
                                value={branch.name}
                                onChange={(e) => {
                                  setBranch((b) => ({ ...b, name: e.target.value }));
                                  clearFieldError("branch_name");
                                }}
                                aria-invalid={!!fieldErrors.branch_name}
                                className={cn(
                                  "rounded-lg border bg-[#f8f6f6] h-12 px-4 text-slate-900 focus:outline-none focus:ring-1",
                                  fieldErrors.branch_name
                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                                    : "border-primary/20 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                                )}
                              />
                              {fieldErrors.branch_name && (
                                <p className="text-sm text-red-600" role="alert">
                                  {fieldErrors.branch_name}
                                </p>
                              )}
                            </label>
                            <label className="flex flex-col gap-2">
                              <span className="text-sm font-semibold text-slate-700">Branch Email</span>
                              <input
                                type="email"
                                placeholder="branch@hotel.com"
                                value={branch.contactEmail}
                                onChange={(e) => setBranch((b) => ({ ...b, contactEmail: e.target.value }))}
                                className="rounded-lg border border-primary/20 bg-[#f8f6f6] h-12 px-4 text-slate-900 focus:outline-none focus:ring-1 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                              />
                            </label>
                            <label className="flex flex-col gap-2">
                              <span className="text-sm font-semibold text-slate-700">Branch Phone</span>
                              <input
                                type="tel"
                                placeholder="+1 (555) 000-0000"
                                value={branch.contactPhone}
                                onChange={(e) => setBranch((b) => ({ ...b, contactPhone: e.target.value }))}
                                className="rounded-lg border border-primary/20 bg-[#f8f6f6] h-12 px-4 text-slate-900 focus:outline-none focus:ring-1 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                              />
                            </label>
                          </div>
                        </section>

                        <section className="space-y-4 border-t border-primary/10 pt-4">
                          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <span className="material-symbols-outlined" style={{ color: PRIMARY }}>
                              location_on
                            </span>
                            Branch Location
                          </h3>
                          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                            <p className="mb-3 text-sm font-semibold text-slate-700">
                              Branch address (search on map for discovery)
                            </p>
                            <TwoStepAddressPicker
                              onSelect={(result) => {
                                setBranchAddressResult(result);
                                clearFieldError("branch_address");
                              }}
                              country="gh"
                              initialResult={branchAddressResult}
                            />
                            {fieldErrors.branch_address && (
                              <p className="mt-2 text-sm text-red-600" role="alert">
                                {fieldErrors.branch_address}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">Or enter manually below:</p>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="col-span-full flex flex-col gap-2">
                              <span className="text-sm font-semibold text-slate-700">Street Address</span>
                              <input
                                type="text"
                                placeholder="123 Luxury Ave"
                                value={branch.street}
                                onChange={(e) => {
                                  setBranch((b) => ({ ...b, street: e.target.value }));
                                  if (branch.street || branch.city) clearFieldError("branch_address");
                                }}
                                className="rounded-lg border border-primary/20 bg-[#f8f6f6] h-12 px-4 text-slate-900 focus:outline-none focus:ring-1 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                              />
                            </label>
                            <label className="flex flex-col gap-2">
                              <span className="text-sm font-semibold text-slate-700">City</span>
                              <input
                                type="text"
                                placeholder="Accra"
                                value={branch.city}
                                onChange={(e) => {
                                  setBranch((b) => ({ ...b, city: e.target.value }));
                                  if (branch.street?.trim() && e.target.value.trim()) clearFieldError("branch_address");
                                }}
                                className="rounded-lg border border-primary/20 bg-[#f8f6f6] h-12 px-4 text-slate-900 focus:outline-none focus:ring-1 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                              />
                            </label>
                            <label className="flex flex-col gap-2">
                              <span className="text-sm font-semibold text-slate-700">Region / State</span>
                              <input
                                type="text"
                                placeholder="Greater Accra"
                                value={branch.region}
                                onChange={(e) => setBranch((b) => ({ ...b, region: e.target.value }))}
                                className="rounded-lg border border-primary/20 bg-[#f8f6f6] h-12 px-4 text-slate-900 focus:outline-none focus:ring-1 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                              />
                            </label>
                            <label className="col-span-full flex flex-col gap-2">
                              <span className="text-sm font-semibold text-slate-700">Country</span>
                              <input
                                type="text"
                                placeholder="Ghana"
                                value={branch.country}
                                onChange={(e) => setBranch((b) => ({ ...b, country: e.target.value }))}
                                className="rounded-lg border border-primary/20 bg-[#f8f6f6] h-12 px-4 text-slate-900 focus:outline-none focus:ring-1 focus:border-[#ec5b13] focus:ring-[#ec5b13]"
                              />
                            </label>
                          </div>
                        </section>

                        <div className="flex flex-col gap-3 pt-6 sm:flex-row">
                          <button
                            type="button"
                            onClick={back}
                            className="order-2 h-14 flex-1 rounded-xl border-2 font-bold text-slate-700 transition-all hover:bg-primary/5 sm:order-1"
                            style={{ borderColor: `${PRIMARY}33` }}
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="order-1 flex h-14 flex-1 items-center justify-center gap-2 rounded-xl font-bold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-70 sm:order-2"
                            style={{
                              backgroundColor: PRIMARY,
                              boxShadow: "0 10px 30px rgba(236, 91, 19, 0.25)",
                            }}
                          >
                            {isLoading ? (
                              <span className="text-sm">Creating…</span>
                            ) : (
                              <>
                                Finish
                                <span className="material-symbols-outlined">check_circle</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <footer className="mt-8 text-center">
                      <p className="text-sm text-slate-500">
                        By finishing, you agree to our{" "}
                        <a href="#" className="hover:underline" style={{ color: PRIMARY }}>
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="hover:underline" style={{ color: PRIMARY }}>
                          Privacy Policy
                        </a>
                        .
                      </p>
                    </footer>
                  </>
                )}
              </form>
            </main>

            {/* Footer: Step 1 = Sign in; Step 2 = copyright */}
            {step === 0 && (
              <footer className="mt-10 border-t border-slate-200 py-6 text-center">
                <p className="text-sm text-slate-600">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-bold hover:underline"
                    style={{ color: PRIMARY }}
                  >
                    Sign in
                  </Link>
                </p>
              </footer>
            )}
            {step === 1 && (
              <footer className="mt-20 pb-10 text-center">
                <p className="text-sm text-slate-400">
                  © {new Date().getFullYear()} Hotel Manager Pro. Secure property registration.
                </p>
              </footer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
