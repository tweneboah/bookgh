"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IoMailOutline,
  IoLockClosedOutline,
  IoPersonOutline,
  IoCallOutline,
} from "react-icons/io5";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { register, clearError } from "@/store/auth-slice";
import { PlatformNav } from "@/components/layout/platform-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { error, isLoading } = useAppSelector((s) => s.auth);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (name: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const tFirst = firstName.trim();
    if (!tFirst) errors.firstName = "First name is required";
    else if (tFirst.length > 100) errors.firstName = "First name must be 100 characters or less";

    const tLast = lastName.trim();
    if (!tLast) errors.lastName = "Last name is required";
    else if (tLast.length > 100) errors.lastName = "Last name must be 100 characters or less";

    const tEmail = email.trim().toLowerCase();
    if (!tEmail) errors.email = "Email is required";
    else if (!emailRegex.test(tEmail)) errors.email = "Please enter a valid email address";

    const tPhone = phone.trim();
    if (!tPhone) errors.phone = "Phone number is required";

    if (!password) errors.password = "Password is required";
    else if (password.length < 8) errors.password = "Password must be at least 8 characters";

    if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    setFieldErrors({});

    if (!validateForm()) return;

    const result = await dispatch(
      register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
      })
    );
    if (register.fulfilled.match(result)) {
      router.push("/dashboard");
    }
  };

  const displayError = error;
  const inputErrorClass =
    "border-red-400 focus:border-red-500 focus:ring-red-500/20 aria-invalid:border-red-500";
  const inputBaseClass =
    "h-12 w-full rounded-xl border bg-white py-3 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 transition-colors sm:h-14 sm:pl-14 focus:outline-none focus:ring-2";
  const inputValidClass =
    "border-slate-200 focus:border-[#5a189a] focus:ring-[#5a189a]/20";

  return (
    <div className="flex min-h-screen w-full flex-col font-sans">
      <PlatformNav />

      {/* Main: subtle gradient wash + centered content */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #faf8ff 50%, #ffffff 100%)",
        }}
      >
        <div className="mx-auto w-full max-w-[480px] sm:max-w-[520px]">
          {/* Card with top accent */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_8px_32px_-8px_rgba(90,24,154,0.12)] sm:rounded-3xl sm:p-10">
            <div
              className="absolute left-0 right-0 top-0 h-1"
              style={{
                background: "linear-gradient(90deg, #5a189a 0%, #7b2cbf 50%, #ff8500 100%)",
              }}
              aria-hidden
            />
            <div className="mb-8 border-l-4 border-[#5a189a] pl-5">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Create an account
              </h1>
              <p className="mt-2 text-base text-slate-500">
                Enter your details to get started
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {displayError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3.5 text-sm font-medium text-red-700"
                >
                  {displayError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-first" className="mb-2 block text-sm font-semibold text-slate-700">
                    First name
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <IoPersonOutline className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                    </span>
                    <input
                      id="reg-first"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        clearFieldError("firstName");
                      }}
                      autoComplete="given-name"
                      aria-invalid={!!fieldErrors.firstName}
                      aria-describedby={fieldErrors.firstName ? "reg-first-error" : undefined}
                      className={cn(
                        inputBaseClass,
                        fieldErrors.firstName ? inputErrorClass : inputValidClass
                      )}
                    />
                  </div>
                  {fieldErrors.firstName && (
                    <p id="reg-first-error" className="mt-1.5 text-sm text-red-600" role="alert">
                      {fieldErrors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="reg-last" className="mb-2 block text-sm font-semibold text-slate-700">
                    Last name
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <IoPersonOutline className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                    </span>
                    <input
                      id="reg-last"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        clearFieldError("lastName");
                      }}
                      autoComplete="family-name"
                      aria-invalid={!!fieldErrors.lastName}
                      aria-describedby={fieldErrors.lastName ? "reg-last-error" : undefined}
                      className={cn(
                        inputBaseClass,
                        fieldErrors.lastName ? inputErrorClass : inputValidClass
                      )}
                    />
                  </div>
                  {fieldErrors.lastName && (
                    <p id="reg-last-error" className="mt-1.5 text-sm text-red-600" role="alert">
                      {fieldErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <IoMailOutline className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                  </span>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    autoComplete="email"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "reg-email-error" : undefined}
                    className={cn(
                      inputBaseClass,
                      fieldErrors.email ? inputErrorClass : inputValidClass
                    )}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="reg-email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reg-phone" className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <IoCallOutline className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                  </span>
                  <input
                    id="reg-phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearFieldError("phone");
                    }}
                    autoComplete="tel"
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={fieldErrors.phone ? "reg-phone-error" : undefined}
                    className={cn(
                      inputBaseClass,
                      fieldErrors.phone ? inputErrorClass : inputValidClass
                    )}
                  />
                </div>
                {fieldErrors.phone && (
                  <p id="reg-phone-error" className="mt-1.5 text-sm text-red-600" role="alert">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reg-password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <IoLockClosedOutline className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                  </span>
                  <input
                    id="reg-password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError("password");
                      if (confirmPassword) clearFieldError("confirmPassword");
                    }}
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "reg-password-error" : undefined}
                    className={cn(
                      inputBaseClass,
                      fieldErrors.password ? inputErrorClass : inputValidClass
                    )}
                  />
                </div>
                {fieldErrors.password && (
                  <p id="reg-password-error" className="mt-1.5 text-sm text-red-600" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reg-confirm" className="mb-2 block text-sm font-semibold text-slate-700">
                  Confirm password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <IoLockClosedOutline className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                  </span>
                  <input
                    id="reg-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFieldError("confirmPassword");
                    }}
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? "reg-confirm-error" : undefined}
                    className={cn(
                      inputBaseClass,
                      fieldErrors.confirmPassword ? inputErrorClass : inputValidClass
                    )}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p id="reg-confirm-error" className="mt-1.5 text-sm text-red-600" role="alert">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="h-14 w-full rounded-xl border-0 text-base font-semibold text-white shadow-[0_4px_14px_-2px_rgba(90,24,154,0.4)] transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#5a189a]/40 sm:text-lg"
                style={{
                  background: "linear-gradient(135deg, #5a189a 0%, #7b2cbf 100%)",
                }}
                loading={isLoading}
                disabled={isLoading}
              >
                Create account
              </Button>
            </form>

            <div className="mt-10 space-y-4 border-t border-slate-100 pt-8">
              <p className="text-center text-sm text-slate-600 sm:text-base">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#5a189a] hover:text-[#7b2cbf] hover:underline"
                >
                  Sign in
                </Link>
              </p>
              <p className="text-center text-sm text-slate-500 sm:text-base">
                Want to list your hotel?{" "}
                <Link
                  href="/register-hotel"
                  className="font-semibold text-[#ff8500] hover:text-[#ff6d00] hover:underline"
                >
                  Register your property
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
