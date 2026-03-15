"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Users, Clock, ChevronLeft, Waves, CheckCircle } from "lucide-react";
import { useHotelDetail, useDiscoveryPoolAvailability, usePublicPoolBooking } from "@/hooks/api";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { getThemeStyle } from "@/constants/website-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppDatePicker } from "@/components/ui/date-picker";

const FONT_INTER = { fontFamily: "Inter, system-ui, sans-serif" };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

function formatDateForApi(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function HotelPoolDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const { data, isLoading, isError } = useHotelDetail(slug);
  const hotel = data?.data;

  const area = hotel?.poolAreas?.find(
    (a: { _id: string }) => String(a._id) === String(id)
  ) as
    | {
        _id: string;
        name: string;
        description?: string;
        type?: string;
        capacity?: number;
        openingTime?: string;
        closingTime?: string;
        hourlyRate?: number;
        dailyRate?: number;
        amenities?: string[];
        images?: { url: string; caption?: string }[];
      }
    | undefined;

  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const dateStr = bookingDate ? formatDateForApi(bookingDate) : "";
  const { data: availabilityData } = useDiscoveryPoolAvailability(slug, {
    date: dateStr,
    poolAreaId: id,
  });
  const availability = availabilityData?.data;
  const slotsForArea = availability?.availableSlots?.[id] ?? [];

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [guest, setGuest] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<{
    bookingReference: string;
    poolAreaName: string;
    guestName: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    amount: number;
  } | null>(null);

  const poolBooking = usePublicPoolBooking();

  useEffect(() => {
    setStartTime("");
    setEndTime("");
  }, [dateStr]);

  const selectedSlot = slotsForArea.find(
    (s: { start: string; end: string }) => s.start === startTime && s.end === endTime
  );
  const hours =
    startTime && endTime
      ? (() => {
          const [sh, sm] = startTime.split(":").map(Number);
          const [eh, em] = endTime.split(":").map(Number);
          return (eh * 60 + em - (sh * 60 + sm)) / 60;
        })()
      : 0;
  const areaHourly = area?.hourlyRate ?? 0;
  const areaDaily = area?.dailyRate ?? 0;
  const amount =
    areaHourly > 0 ? Math.ceil(hours * 100) / 100 * areaHourly : areaDaily > 0 ? areaDaily : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!bookingDate || !startTime || !endTime || !guest.firstName || !guest.lastName || !guest.email) {
      setSubmitError("Please fill in date, time slot, and guest details.");
      return;
    }
    try {
      const res = await poolBooking.mutateAsync({
        hotelId: slug,
        poolAreaId: id,
        bookingDate: dateStr,
        startTime,
        endTime,
        numberOfGuests: Math.min(Math.max(1, numberOfGuests), area?.capacity ?? 1) || 1,
        guest: {
          firstName: guest.firstName.trim(),
          lastName: guest.lastName.trim(),
          email: guest.email.trim(),
          phone: guest.phone?.trim() || undefined,
        },
        notes: notes.trim() || undefined,
      });
      const d = res?.data ?? res;
      setBookingSuccess({
        bookingReference: d.bookingReference,
        poolAreaName: d.poolAreaName,
        guestName: d.guestName,
        bookingDate: d.bookingDate,
        startTime: d.startTime,
        endTime: d.endTime,
        amount: d.amount,
      });
    } catch (err: any) {
      setSubmitError(err?.message || err?.data?.message || "Booking failed. Please try again.");
    }
  };

  const primaryColor = hotel?.tenant?.primaryColor ?? "#5a189a";
  const accentColor = hotel?.tenant?.accentColor ?? "#ff6d00";
  const publicSiteConfig = hotel?.tenant?.publicSiteConfig as { theme?: { fontFamily?: string; fontSize?: string } } | undefined;
  const siteThemeStyle = getThemeStyle(publicSiteConfig?.theme);
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "Hotel";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white" style={FONT_INTER}>
        <PublicNavbar isTenantSite tenantSlug={slug} />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-6 h-8 w-2/3 animate-pulse rounded bg-slate-100" />
        </main>
      </div>
    );
  }

  if (isError || !hotel || !area) {
    return (
      <div className="min-h-screen bg-white" style={FONT_INTER}>
        <PublicNavbar isTenantSite tenantSlug={slug} />
        <main className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <Waves className="mx-auto h-14 w-14 text-slate-300" strokeWidth={1.25} />
          <h2 className="mt-4 text-xl font-semibold text-slate-800">Pool not found</h2>
          <p className="mt-2 text-slate-500">This pool area may no longer be available.</p>
          <Link href={`/hotels/${slug}#pools`}>
            <Button
              className="mt-6 font-semibold"
              style={{
                background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`,
                color: "white",
                border: "none",
              }}
            >
              View all pools
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const images = area.images?.length ? area.images : [];

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-white" style={siteThemeStyle}>
        <PublicNavbar
          isTenantSite
          tenantSlug={slug}
          tenantName={hotelName}
          tenantLogo={hotel?.tenant?.logo}
          theme={{ primaryColor, accentColor }}
          platformLoginUrl={process.env.NEXT_PUBLIC_APP_URL ?? undefined}
          bookNowReturnTo={`/hotels/${slug}`}
        />
        <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6">
          <Card className="border-emerald-100 bg-emerald-50/50" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <CardContent className="p-8 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-emerald-600" strokeWidth={2} />
              <h1 className="mt-4 text-2xl font-bold text-slate-900">Booking confirmed</h1>
              <p className="mt-2 text-slate-600">
                Your pool booking has been received. Reference: <strong>{bookingSuccess.bookingReference}</strong>
              </p>
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-left">
                <p className="font-medium text-slate-900">{bookingSuccess.poolAreaName}</p>
                <p className="mt-1 text-sm text-slate-600">{bookingSuccess.guestName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {typeof bookingSuccess.bookingDate === "string"
                    ? new Date(bookingSuccess.bookingDate).toLocaleDateString()
                    : String(bookingSuccess.bookingDate)} · {bookingSuccess.startTime} – {bookingSuccess.endTime}
                </p>
                <p className="mt-2 text-lg font-semibold" style={{ color: accentColor }}>
                  {fmt(bookingSuccess.amount)}
                </p>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                The hotel may contact you to confirm. Payment can be arranged with the property.
              </p>
              <Link href={`/hotels/${slug}#pools`}>
                <Button
                  className="mt-6 font-semibold"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`,
                    color: "white",
                    border: "none",
                  }}
                >
                  Back to pools
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={siteThemeStyle}>
      <PublicNavbar
        isTenantSite
        tenantSlug={slug}
        tenantName={hotelName}
        tenantLogo={hotel?.tenant?.logo}
        theme={{ primaryColor, accentColor }}
        platformLoginUrl={process.env.NEXT_PUBLIC_APP_URL ?? undefined}
        bookNowReturnTo={`/hotels/${slug}`}
      />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        <Link
          href={`/hotels/${slug}#pools`}
          className="inline-flex items-center gap-1 text-sm font-medium hover:text-slate-900"
          style={{ color: primaryColor }}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to pools
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {area.name}
        </h1>
        {area.type && (
          <p className="mt-1 text-sm font-medium capitalize text-slate-500">{area.type}</p>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
          {images[0]?.url ? (
            <img
              src={images[0].url}
              alt={area.name}
              className="aspect-[16/10] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center">
              <Waves className="h-20 w-20 text-slate-300" strokeWidth={1.25} />
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {area.capacity != null && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" style={{ color: primaryColor }} strokeWidth={2} />
                  Up to {area.capacity} guests
                </span>
              )}
              {(area.openingTime || area.closingTime) && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" style={{ color: primaryColor }} strokeWidth={2} />
                  {area.openingTime && area.closingTime
                    ? `${area.openingTime} – ${area.closingTime}`
                    : area.openingTime || area.closingTime || ""}
                </span>
              )}
            </div>
            {area.description && (
              <p className="mt-4 text-slate-600 leading-relaxed">{area.description}</p>
            )}
            {area.amenities && area.amenities.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Amenities</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {area.amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-1.5 text-sm font-medium text-slate-600"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Card className="w-full shrink-0 border-slate-100 lg:w-96" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900">Book this pool</h2>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <AppDatePicker
                  label="Date"
                  selected={bookingDate}
                  onChange={setBookingDate}
                  minDate={new Date()}
                  placeholderText="Select date"
                />
                {dateStr && slotsForArea.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Time slot</label>
                    <div className="flex flex-wrap gap-2">
                      {slotsForArea.map((slot: { start: string; end: string; availableCapacity?: number }) => (
                        <button
                          key={`${slot.start}-${slot.end}`}
                          type="button"
                          onClick={() => {
                            setStartTime(slot.start);
                            setEndTime(slot.end);
                          }}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            startTime === slot.start && endTime === slot.end
                              ? "border-transparent text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                          style={
                            startTime === slot.start && endTime === slot.end
                              ? {
                                  background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`,
                                }
                              : undefined
                          }
                        >
                          {slot.start} – {slot.end}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {dateStr && slotsForArea.length === 0 && (
                  <p className="text-sm text-amber-700">No slots available on this date.</p>
                )}
                {(area.capacity ?? 0) > 1 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Number of guests</label>
                    <select
                      value={numberOfGuests}
                      onChange={(e) => setNumberOfGuests(parseInt(e.target.value, 10))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
                    >
                      {Array.from({ length: area.capacity ?? 1 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">First name</label>
                    <input
                      type="text"
                      value={guest.firstName}
                      onChange={(e) => setGuest((g) => ({ ...g, firstName: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Last name</label>
                    <input
                      type="text"
                      value={guest.lastName}
                      onChange={(e) => setGuest((g) => ({ ...g, lastName: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={guest.email}
                    onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone (optional)</label>
                  <input
                    type="tel"
                    value={guest.phone}
                    onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#5a189a]/20 focus:border-[#5a189a]"
                  />
                </div>
                {selectedSlot && amount > 0 && (
                  <p className="text-sm font-semibold text-slate-900">
                    Total: <span style={{ color: accentColor }}>{fmt(amount)}</span>
                  </p>
                )}
                {submitError && (
                  <p className="text-sm text-red-600" role="alert">{submitError}</p>
                )}
                <Button
                  type="submit"
                  className="w-full font-semibold"
                  disabled={poolBooking.isPending || !bookingDate || !startTime || !endTime || !guest.firstName || !guest.lastName || !guest.email}
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`,
                    color: "white",
                    border: "none",
                    boxShadow: `0 2px 8px ${accentColor}40`,
                  }}
                >
                  {poolBooking.isPending ? "Booking…" : "Confirm booking"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
