"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, Loader2, ArrowRight } from "lucide-react";
import { useVerifyPayment, useHotelDetail } from "@/hooks/api";
import { useAppSelector } from "@/store/hooks";
import { PlatformNav } from "@/components/layout/platform-nav";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(n);

const formatChannel = (channel: string) => {
  if (!channel) return "—";
  const s = String(channel).toLowerCase();
  if (s.includes("mobile") || s === "mobile_money") return "Mobile Money";
  if (s.includes("card")) return "Card";
  if (s.includes("bank")) return "Bank";
  return channel;
};

const slugToTitle = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="group flex items-center justify-between rounded-xl border border-transparent p-4 transition-all duration-300 hover:border-slate-100 hover:bg-white">
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#144bb8]/5 text-[#144bb8] transition-colors group-hover:bg-[#144bb8] group-hover:text-white">
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="font-medium text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function CallbackContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const hotelSlug = searchParams.get("hotel") ?? "";
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const verifyMutation = useVerifyPayment();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference || !hotelSlug) {
      setError("Missing payment reference or hotel information.");
      return;
    }

    verifyMutation
      .mutateAsync({ hotelId: hotelSlug, reference })
      .then((res) => {
        setResult(res.data);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.error?.message ??
            "Failed to verify payment. Please contact the hotel."
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, hotelSlug]);

  const hotelTitle = hotelSlug ? slugToTitle(hotelSlug) : "Hotel";

  if (!reference || !hotelSlug) {
    return (
      <div className="flex max-w-[640px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
        <div className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
          <div className="flex size-24 items-center justify-center rounded-full bg-red-100">
            <XCircle className="size-12 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Invalid Payment Link
            </h1>
            <p className="mt-2 text-slate-500">
              This payment link is missing required information.
            </p>
          </div>
          <Link
            href="/browse-hotels"
            className="inline-flex items-center justify-center rounded-lg bg-[#144bb8] px-6 py-3 font-bold text-white shadow-lg transition hover:opacity-90"
          >
            Browse Hotels
          </Link>
        </div>
      </div>
    );
  }

  if (verifyMutation.isPending || (!result && !error)) {
    return (
      <div className="flex max-w-[640px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
        <div className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
          <Loader2 className="size-16 animate-spin text-[#144bb8]" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Verifying Payment...
            </h1>
            <p className="mt-2 text-slate-500">
              Please wait while we confirm your payment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex max-w-[640px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
        <div className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
          <div className="flex size-24 items-center justify-center rounded-full bg-red-100">
            <XCircle className="size-12 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Payment Verification Failed
            </h1>
            <p className="mt-2 text-slate-500">{error}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/hotels/${hotelSlug}`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Hotel
            </Link>
            <Link
              href="/browse-hotels"
              className="inline-flex items-center justify-center rounded-lg bg-[#144bb8] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              Browse Hotels
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (result && !result.verified) {
    return (
      <div className="flex max-w-[640px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
        <div className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
          <div className="flex size-24 items-center justify-center rounded-full bg-amber-100">
            <XCircle className="size-12 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              Payment Not Completed
            </h1>
            <p className="mt-2 text-slate-500">
              {result.message || "Your payment was not completed."}
            </p>
            {result.status && (
              <p className="mt-1 text-sm text-slate-400">Status: {result.status}</p>
            )}
          </div>
          <Link
            href={`/hotels/${hotelSlug}`}
            className="inline-flex items-center justify-center rounded-lg bg-[#144bb8] px-6 py-3 font-bold text-white transition hover:opacity-90"
          >
            Back to Hotel
          </Link>
        </div>
      </div>
    );
  }

  const paidAtFormatted =
    result.paidAt &&
    new Date(result.paidAt).toLocaleString("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
    });

  return (
    <div className="flex max-w-[640px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl shadow-[#144bb8]/5">
      {/* Success hero */}
      <div className="relative flex flex-col items-center gap-6 bg-linear-to-b from-[#144bb8]/5 to-transparent p-8 text-center md:gap-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,75,184,0.12),transparent_70%)]" aria-hidden />
        <div className="absolute left-10 top-10 animate-bounce opacity-20">
          <span className="material-symbols-outlined text-3xl text-[#144bb8]">
            sparkles
          </span>
        </div>
        <div className="absolute bottom-10 right-10 animate-pulse opacity-20">
          <span className="material-symbols-outlined text-3xl text-[#144bb8]">
            celebration
          </span>
        </div>
        <div className="relative">
          <div className="absolute inset-0 scale-150 animate-ping rounded-full bg-green-500/20 opacity-20" />
          <div className="relative z-10 flex size-24 items-center justify-center rounded-full bg-linear-to-tr from-green-500 to-emerald-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            <span className="material-symbols-outlined text-6xl">
              check_circle
            </span>
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-3">
          <h1 className="bg-linear-to-b from-slate-900 to-slate-700 bg-clip-text text-4xl font-black leading-tight tracking-tight text-transparent md:text-5xl">
            Payment Successful!
          </h1>
          <p className="mx-auto max-w-md text-lg font-medium text-slate-500">
            Your stay at{" "}
            <span className="font-bold text-[#144bb8]">{hotelTitle}</span> is
            secured.
          </p>
        </div>
      </div>

      {/* Booking summary */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-6 md:px-12">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 opacity-60">
            Booking Summary
          </h3>
          <span className="rounded-full border border-green-200 bg-green-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-700">
            Verified
          </span>
        </div>
        <div className="grid gap-1">
          <SummaryRow
            icon="receipt_long"
            label="Reference"
            value={
              <span className="font-mono font-bold">
                {result.bookingReference}
              </span>
            }
          />
          <SummaryRow
            icon="payments"
            label="Amount Paid"
            value={
              <span className="text-lg font-bold">
                {fmt(result.amountPaid)}
              </span>
            }
          />
          {paidAtFormatted && (
            <SummaryRow
              icon="event_available"
              label="Date & Time"
              value={paidAtFormatted}
            />
          )}
          <SummaryRow
            icon="account_balance_wallet"
            label="Method"
            value={formatChannel(result.channel)}
          />
        </div>
      </div>

      {/* Info + CTAs */}
      <div className="p-8 md:p-12">
        <div className="mb-8 rounded-lg border border-[#144bb8]/10 bg-[#144bb8]/5 p-4">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-[#144bb8]">
              info
            </span>
            <p className="text-sm leading-relaxed text-slate-600">
              A confirmation email will be sent to you shortly. Please save your
              booking reference for check-in at our front desk.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {isAuthenticated && (
            <Link
              href="/my-bookings"
              className="group flex h-14 w-full items-center justify-center rounded-lg bg-[#144bb8] px-6 text-base font-bold text-white shadow-lg shadow-[#144bb8]/20 transition hover:opacity-90"
            >
              <span className="truncate">My Bookings</span>
              <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/hotels/${hotelSlug}`}
              className="flex h-12 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-200"
            >
              <span className="truncate">Back to Hotel</span>
            </Link>
            <Link
              href="/browse-hotels"
              className="flex h-12 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <span className="truncate">Browse More</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className="h-1.5 w-full overflow-hidden bg-[#144bb8]/20">
        <div className="booking-callback-shimmer h-full w-1/3 bg-[#144bb8]" />
      </div>
    </div>
  );
}

function CallbackNav() {
  const searchParams = useSearchParams();
  const hotelSlug = searchParams.get("hotel") ?? "";
  const { data: hotelData } = useHotelDetail(hotelSlug);
  const hotel = hotelData?.data;
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? (hotelSlug ? slugToTitle(hotelSlug) : "Hotel");
  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";

  if (hotelSlug) {
    return <HotelPublicNav slug={hotelSlug} hotelName={hotelName} primaryColor={primaryColor} logo={hotel?.tenant?.logo} />;
  }
  return <PlatformNav />;
}

export default function BookingCallbackPage() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f6f8] text-slate-900 antialiased">
      <Suspense fallback={<PlatformNav />}>
        <CallbackNav />
      </Suspense>

      <main className="flex flex-1 justify-center px-4 py-12 md:px-0">
        <Suspense
          fallback={
            <div className="flex max-w-[640px] flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
              <Loader2 className="size-16 animate-spin text-[#144bb8]" />
              <p className="mt-4 text-slate-500">Loading...</p>
            </div>
          }
        >
          <CallbackContent />
        </Suspense>
      </main>

      <footer className="py-8 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Bookgh. All rights reserved.</p>
      </footer>
    </div>
  );
}
