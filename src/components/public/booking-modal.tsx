"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  CreditCard,
  Loader2,
  CheckCircle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useHotelAvailability,
  usePublicBooking,
  useInitializePayment,
} from "@/hooks/api";
import { useAppSelector } from "@/store/hooks";
import toast from "react-hot-toast";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  hotelSlug: string;
  hotelName: string;
  acceptsOnlinePayment?: boolean;
  contactPhone?: string;
  contactEmail?: string;
  preselectedCategory?: {
    _id: string;
    name: string;
    basePrice: number;
    maxOccupancy: number;
  };
  categories: {
    _id: string;
    name: string;
    basePrice: number;
    maxOccupancy: number;
  }[];
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialNumberOfGuests?: number;
  primaryColor?: string;
  overlayImageUrl?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(n);

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getDayAfterTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split("T")[0];
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function formatDateRange(checkIn: string, checkOut: string, nights: number) {
  const from = new Date(checkIn + "Z").toLocaleDateString("en-GB", { month: "long", day: "numeric", year: "numeric" });
  const to = new Date(checkOut + "Z").toLocaleDateString("en-GB", { month: "long", day: "numeric", year: "numeric" });
  return `${from} - ${to} (${nights} night${nights > 1 ? "s" : ""})`;
}

function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const cells: ({ type: "empty" } | { type: "day"; date: string; day: number })[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ type: "empty" });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ type: "day", date: date.toISOString().split("T")[0], day: d });
  }
  return cells;
}

export function BookingModal({
  open,
  onClose,
  hotelSlug,
  hotelName,
  acceptsOnlinePayment = true,
  contactPhone,
  contactEmail,
  preselectedCategory,
  categories,
  initialCheckIn,
  initialCheckOut,
  initialNumberOfGuests,
  primaryColor = "#144bb8",
  overlayImageUrl,
}: BookingModalProps) {
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const [step, setStep] = useState<
    "dates" | "guest" | "confirm" | "paying" | "success"
  >("dates");
  const [bookingForSelf, setBookingForSelf] = useState(true);

  const [form, setForm] = useState({
    checkIn: getTomorrow(),
    checkOut: getDayAfterTomorrow(),
    roomCategoryId: preselectedCategory?._id ?? "",
    numberOfGuests: 1,
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: "",
    specialRequests: "",
  });

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  useEffect(() => {
    if (open && (initialCheckIn ?? initialCheckOut ?? initialNumberOfGuests != null)) {
      setForm((prev) => ({
        ...prev,
        ...(initialCheckIn && { checkIn: initialCheckIn }),
        ...(initialCheckOut && { checkOut: initialCheckOut }),
        ...(initialNumberOfGuests != null && initialNumberOfGuests > 0 && { numberOfGuests: initialNumberOfGuests }),
      }));
    }
  }, [open, initialCheckIn, initialCheckOut, initialNumberOfGuests]);

  const [bookingResult, setBookingResult] = useState<any>(null);

  const datesValid =
    form.checkIn && form.checkOut && form.checkIn < form.checkOut;

  const { data: availData, isLoading: availLoading } = useHotelAvailability(
    hotelSlug,
    {
      checkIn: datesValid ? form.checkIn : "",
      checkOut: datesValid ? form.checkOut : "",
    }
  );

  const bookMutation = usePublicBooking();
  const payMutation = useInitializePayment();
  const availability = availData?.data ?? [];

  const selectedCat = useMemo(
    () => availability.find((a: any) => a._id === form.roomCategoryId),
    [availability, form.roomCategoryId]
  );

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const diff =
      new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [form.checkIn, form.checkOut]);

  const totalPrice = selectedCat ? selectedCat.basePrice * nights : 0;

  const calendarDays = useMemo(
    () => getCalendarDays(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );

  const handleDayClick = useCallback(
    (dateStr: string) => {
      const today = getToday();
      if (dateStr < today) return;
      setForm((prev) => {
        if (!prev.checkIn || (prev.checkIn && prev.checkOut)) {
          return { ...prev, checkIn: dateStr, checkOut: "" };
        }
        if (dateStr > prev.checkIn) {
          return { ...prev, checkOut: dateStr };
        }
        return { ...prev, checkIn: dateStr, checkOut: "" };
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    setStep("dates");
    setBookingResult(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, handleClose]);

  const handleBook = async () => {
    try {
      const res = await bookMutation.mutateAsync({
        hotelId: hotelSlug,
        roomCategoryId: form.roomCategoryId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        numberOfGuests: form.numberOfGuests,
        specialRequests: form.specialRequests || undefined,
        guest: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
        },
      });

      const bookingData = res.data;
      setBookingResult(bookingData);

      if (bookingData.requiresPayment) {
        setStep("paying");
        try {
          const payRes = await payMutation.mutateAsync({
            hotelId: hotelSlug,
            bookingReference: bookingData.bookingReference,
            email: form.email.trim(),
            callbackUrl: `${window.location.origin}/booking/callback?hotel=${hotelSlug}`,
          });

          if (payRes.data?.authorizationUrl) {
            window.location.href = payRes.data.authorizationUrl;
          } else {
            toast.error("Failed to initialize payment. Please try again.");
            setStep("confirm");
          }
        } catch (payErr: any) {
          toast.error(
            payErr?.response?.data?.error?.message ??
              "Payment initialization failed"
          );
          setStep("confirm");
        }
      } else {
        setStep("success");
        toast.success("Booking confirmed!");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ??
          "Booking failed. Please try again."
      );
    }
  };

  if (!open) return null;

  const overlayStyle = overlayImageUrl
    ? { background: `linear-gradient(rgba(17,22,33,0.7), rgba(17,22,33,0.7)), url(${overlayImageUrl}) center/cover` }
    : { backgroundColor: "rgba(17, 22, 33, 0.6)" };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={handleClose}
    >
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden my-8" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl" style={{ color: primaryColor }}>hotel</span>
            <h2 id="booking-modal-title" className="text-slate-900 text-lg font-bold tracking-tight">{hotelName}</h2>
          </div>
          <button type="button" onClick={handleClose} className="flex items-center justify-center rounded-lg h-10 w-10 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="p-6 md:p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-80px)]">
          {step === "dates" && (
            <>
              <div className="space-y-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-slate-900">Book Your Stay</h1>
                <p className="text-slate-500">Select your dates, guests, and room to continue.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">Select Dates</label>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between p-2 border border-slate-200 rounded-lg bg-white">
                      <button type="button" onClick={() => setViewMonth((m) => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n; })} className="p-1 hover:opacity-80 rounded" style={{ color: primaryColor }}><span className="material-symbols-outlined text-xl">chevron_left</span></button>
                      <span className="font-bold text-sm text-slate-900">{viewMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
                      <button type="button" onClick={() => setViewMonth((m) => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n; })} className="p-1 hover:opacity-80 rounded" style={{ color: primaryColor }}><span className="material-symbols-outlined text-xl">chevron_right</span></button>
                    </div>
                    <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mt-2">{["S","M","T","W","T","F","S"].map((w) => <span key={w}>{w}</span>)}</div>
                    <div className="grid grid-cols-7 gap-1 mt-1">
                      {calendarDays.map((cell, i) =>
                        cell.type === "empty" ? <div key={`e-${i}`} className="h-8" /> : (
                          <button key={cell.date} type="button" onClick={() => handleDayClick(cell.date)} disabled={cell.date < getToday()}
                            className={`h-8 w-full flex items-center justify-center text-xs font-medium rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              cell.date === form.checkIn ? "rounded-l-full text-white" : cell.date === form.checkOut ? "rounded-r-full text-white" : form.checkIn && form.checkOut && cell.date > form.checkIn && cell.date < form.checkOut ? "text-slate-900" : "text-slate-900 hover:bg-slate-200"
                            }`}
                            style={cell.date === form.checkIn || cell.date === form.checkOut ? { backgroundColor: primaryColor } : form.checkIn && form.checkOut && cell.date > form.checkIn && cell.date < form.checkOut ? { backgroundColor: `${primaryColor}20` } : undefined}
                          >{cell.day}</button>
                        )
                      )}
                    </div>
                    {datesValid && nights > 0 && <p className="text-center text-xs font-medium italic mt-3" style={{ color: primaryColor }}>{nights} night{nights > 1 ? "s" : ""} stay</p>}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Number of Guests</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">group</span>
                      <input type="number" min={1} max={selectedCat?.maxOccupancy ?? 10} value={form.numberOfGuests} onChange={(e) => setForm((f) => ({ ...f, numberOfGuests: Math.max(1, parseInt(e.target.value, 10) || 1) }))} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:border-transparent outline-none text-slate-900" style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties} placeholder="How many guests?" />
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: `${primaryColor}0D`, borderColor: `${primaryColor}20` }}>
                    <div className="flex items-center gap-2" style={{ color: primaryColor }}>
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span className="text-xs font-medium">Free cancellation until 24h before check-in.</span>
                    </div>
                  </div>
                </div>
              </div>
              {availLoading && datesValid && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
              <span className="ml-2 text-sm text-slate-500">
                Checking availability...
              </span>
            </div>
          )}

          {!availLoading && datesValid && availability.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: primaryColor }}>bed</span>
                Select Room Type
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availability.map((cat: any) => {
                const checked = form.roomCategoryId === cat._id;
                const disabled = cat.available === 0;
                return (
                <label key={cat._id} className="relative cursor-pointer group">
                  <input type="radio" name="room" className="peer sr-only" checked={checked} onChange={() => !disabled && setForm((f) => ({ ...f, roomCategoryId: cat._id }))} disabled={disabled} />
                  <div className={`flex flex-col h-full border-2 rounded-xl overflow-hidden bg-white transition-all peer-checked:ring-1 ${disabled ? "opacity-60 cursor-not-allowed border-slate-200" : "border-slate-100 peer-checked:border-[var(--bm-primary)] peer-checked:ring-[var(--bm-primary)]"}`} style={{ ["--bm-primary" as string]: primaryColor } as React.CSSProperties}>
                    <div className="h-32 bg-slate-200">
                      <img src={cat.image || "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400"} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900">{cat.name}</h4>
                        {cat.available > 0 ? <span className="text-[10px] uppercase tracking-widest bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{cat.available} room{cat.available > 1 ? "s" : ""} left</span> : <span className="text-[10px] uppercase tracking-widest bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Sold out</span>}
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-xs mb-4">
                        <span className="material-symbols-outlined text-sm">person</span>
                        Up to {cat.maxOccupancy} guest{cat.maxOccupancy > 1 ? "s" : ""}
                      </div>
                      <div className="mt-auto">
                        <p className="text-xs text-slate-400">{fmt(cat.basePrice)} / night</p>
                        <p className="text-lg font-bold" style={{ color: primaryColor }}>{fmt(cat.totalPrice)} total</p>
                      </div>
                    </div>
                    {checked && !disabled && <div className="absolute top-2 right-2"><span className="material-symbols-outlined text-white rounded-full p-1 text-sm" style={{ backgroundColor: primaryColor }}>check</span></div>}
                  </div>
                </label>
              );
              })}
              </div>
            </div>
          )}

          {!availLoading && datesValid && availability.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              No rooms available for these dates. Try different dates.
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={!form.roomCategoryId || !datesValid || !selectedCat?.available}
              onClick={() => setStep("guest")}
              className="w-full font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}33` }}
            >
              Confirm Booking
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest">Secure transaction</p>
          </div>
              </>
            )}

      {/* Step 2: Guest Details */}
      {step === "guest" && (
        <>
          {/* Progress bar */}
          <div className="pt-6 pb-2">
            <div className="flex gap-6 justify-between mb-2">
              <p className="text-slate-900 text-sm font-semibold">Step 2 of 3</p>
              <p className="text-slate-900 text-sm font-medium">66%</p>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: "66%", backgroundColor: primaryColor }} />
            </div>
            <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider font-bold">Guest Details</p>
          </div>

          <div className="overflow-y-auto max-h-[70vh] pb-6">
            {/* Selected room summary */}
            <div className="mt-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-4 items-center">
              <div
                className="h-20 w-24 flex-shrink-0 bg-center bg-cover rounded-lg"
                style={{ backgroundImage: `url("${(selectedCat as any)?.image || "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400"}")` }}
              />
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Selected Room</p>
                    <p className="text-slate-900 font-bold">{selectedCat?.name}</p>
                    <p className="text-slate-500 text-xs">{formatDateRange(form.checkIn, form.checkOut, nights)}</p>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-bold shrink-0" style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}>
                    {fmt(totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Who are you booking for? */}
            <div className="mt-8">
              <h3 className="text-slate-900 font-bold mb-4">Who are you booking for?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 rounded-lg p-4 cursor-pointer transition-all ${
                    bookingForSelf ? "border-2 bg-opacity-30" : "border border-slate-200 hover:border-slate-300"
                  }`}
                  style={bookingForSelf ? { borderColor: primaryColor, backgroundColor: `${primaryColor}0D` } : undefined}
                >
                  <input
                    type="radio"
                    name="booking_for"
                    checked={bookingForSelf}
                    onChange={() => {
                      setBookingForSelf(true);
                      setForm((f) => ({ ...f, firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", email: user?.email ?? "" }));
                    }}
                    className="h-5 w-5 border-slate-300 focus:ring-0"
                    style={{ accentColor: primaryColor }}
                  />
                  <span className="text-slate-900 text-sm font-semibold">Booking for myself</span>
                </label>
                <label
                  className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                    !bookingForSelf ? "border-2 bg-opacity-30" : "border-slate-200 hover:border-slate-300"
                  }`}
                  style={!bookingForSelf ? { borderColor: primaryColor, backgroundColor: `${primaryColor}0D` } : undefined}
                >
                  <input
                    type="radio"
                    name="booking_for"
                    checked={!bookingForSelf}
                    onChange={() => {
                      setBookingForSelf(false);
                      setForm((f) => ({ ...f, firstName: "", lastName: "", email: "", phone: "" }));
                    }}
                    className="h-5 w-5 border-slate-300 focus:ring-0"
                    style={{ accentColor: primaryColor }}
                  />
                  <span className="text-slate-900 text-sm font-medium">Booking for someone else</span>
                </label>
              </div>
            </div>

            {/* Form fields */}
            <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">First Name <span style={{ color: primaryColor }}>*</span></label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="John"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 py-2.5 px-3 focus:outline-none focus:ring-2 transition-all"
                    style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Last Name <span style={{ color: primaryColor }}>*</span></label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Doe"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 py-2.5 px-3 focus:outline-none focus:ring-2 transition-all"
                    style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Email Address <span style={{ color: primaryColor }}>*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="john.doe@example.com"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 py-2.5 px-3 focus:outline-none focus:ring-2 transition-all"
                    style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+233 00 000 0000"
                    className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 py-2.5 px-3 focus:outline-none focus:ring-2 transition-all"
                    style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Special requests</label>
                <textarea
                  value={form.specialRequests}
                  onChange={(e) => setForm((f) => ({ ...f, specialRequests: e.target.value }))}
                  placeholder="Let us know if you have any preferences or requirements..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 py-2.5 px-3 focus:outline-none focus:ring-2 transition-all resize-none"
                  style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties}
                />
              </div>
            </form>

            
          </div>

          {/* Footer buttons */}
          <footer className="border-t border-slate-100 px-6 md:px-8 py-6 flex items-center justify-between gap-4 bg-white -mx-6 md:-mx-8 -mb-6 md:-mb-8 mt-0">
            <button
              type="button"
              onClick={() => setStep("dates")}
              className="flex items-center justify-center rounded-lg h-12 px-6 font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!form.firstName || !form.lastName || !form.email}
              onClick={() => setStep("confirm")}
              className="flex-1 flex items-center justify-center rounded-lg h-12 px-8 text-white font-bold text-base hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
              style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}33` }}
            >
              Review booking
            </button>
          </footer>
        </>
      )}

      {/* Step 3: Confirm */}
      {step === "confirm" && (
        <div className="flex flex-col gap-8">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Booking Summary</h1>
            <p className="text-slate-500 text-sm">Please review your reservation details below.</p>
          </div>

          {/* Summary grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left: Stay Details + Guest Information */}
            <div className="flex flex-col gap-8">
              <section>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-xl" style={{ color: primaryColor }}>calendar_today</span>
                  <h3 className="text-lg font-bold text-slate-900">Stay Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Hotel</span>
                    <span className="text-sm font-medium text-slate-900">{hotelName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Room Category</span>
                    <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}>{selectedCat?.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                    <span className="text-slate-500 text-sm">Check-in</span>
                    <span className="text-sm font-medium text-slate-900">{form.checkIn ? new Date(form.checkIn + "Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Check-out</span>
                    <span className="text-sm font-medium text-slate-900">{form.checkOut ? new Date(form.checkOut + "Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Duration</span>
                    <span className="text-sm font-medium text-slate-900">{nights} night{nights > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Guests</span>
                    <span className="text-sm font-medium text-slate-900">{form.numberOfGuests} Guest{form.numberOfGuests !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-xl" style={{ color: primaryColor }}>person</span>
                  <h3 className="text-lg font-bold text-slate-900">Guest Information</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Primary Guest</span>
                    <span className="text-sm font-medium text-slate-900">{form.firstName} {form.lastName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Email Address</span>
                    <span className="text-sm font-medium text-slate-900">{form.email}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Right: Price Summary + Notice + Contact */}
            <div className="flex flex-col gap-8">
              <section className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-xl" style={{ color: primaryColor }}>payments</span>
                  <h3 className="text-lg font-bold text-slate-900">Price Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Rate per night</span>
                    <span className="text-sm font-medium text-slate-900">{fmt(selectedCat?.basePrice ?? 0)}</span>
                  </div>
                  <div className="border-t border-slate-200 my-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-900 font-bold">Total Amount</span>
                      <span className="text-xl font-bold" style={{ color: primaryColor }}>{fmt(totalPrice)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {acceptsOnlinePayment ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                  <Shield className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800 leading-relaxed">
                    Your payment is processed securely via Paystack. Money goes directly to the hotel.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                    <span className="material-symbols-outlined text-amber-600 shrink-0">info</span>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Payment Notice</p>
                      <p className="text-sm text-amber-900 leading-relaxed">
                        Online payment not available. This hotel hasn&apos;t set up online payments yet. Please contact them directly to complete your reservation.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 p-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact Support</p>
                    <div className="flex flex-col gap-1">
                      {contactPhone && (
                        <a href={`tel:${contactPhone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                          <span className="material-symbols-outlined text-base">call</span>
                          <span>{contactPhone}</span>
                        </a>
                      )}
                      {contactEmail && (
                        <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                          <span className="material-symbols-outlined text-base">mail</span>
                          <span>{contactEmail}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-8 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStep("guest")}
              className="w-full sm:w-auto px-8 py-3 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back
            </button>
            <div className="flex flex-col items-end w-full sm:w-auto">
              <button
                type="button"
                onClick={acceptsOnlinePayment ? handleBook : undefined}
                disabled={!acceptsOnlinePayment || bookMutation.isPending || payMutation.isPending}
                className={`w-full sm:w-auto px-10 py-3 rounded-lg text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${
                  !acceptsOnlinePayment ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
                }`}
                style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}40` }}
              >
                {bookMutation.isPending || payMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : acceptsOnlinePayment ? (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay {fmt(totalPrice)}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">lock</span>
                    Pay {fmt(totalPrice)}
                  </>
                )}
              </button>
              {!acceptsOnlinePayment && (
                <span className="text-[10px] text-slate-400 mt-2 uppercase tracking-tighter">Payments currently disabled for this merchant</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3.5: Redirecting to Payment */}
      {step === "paying" && (
        <div className="space-y-5 py-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Redirecting to Paystack...
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              You&apos;ll be redirected to complete your payment securely.
              <br />
              Booking ref:{" "}
              <strong className="font-mono">
                {bookingResult?.bookingReference}
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Success (for hotels without Paystack) */}
      {step === "success" && bookingResult && (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              Booking Confirmed!
            </h3>
            <p className="mt-1 text-slate-600">
              Your reservation has been successfully created.
            </p>
          </div>

          <div className="mx-auto max-w-sm rounded-lg bg-slate-50 border border-slate-200 p-5 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Reference</span>
              <span className="font-mono font-bold text-blue-600">
                {bookingResult.bookingReference}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Room</span>
              <span className="font-medium">{bookingResult.roomCategory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Check-in</span>
              <span className="font-medium">
                {new Date(bookingResult.checkInDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Check-out</span>
              <span className="font-medium">
                {new Date(bookingResult.checkOutDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nights</span>
              <span className="font-medium">
                {bookingResult.numberOfNights}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-blue-600">
                {fmt(bookingResult.totalAmount)}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            A confirmation has been sent to{" "}
            <strong>{bookingResult.guestEmail}</strong>
          </p>

          <Button onClick={handleClose} className="mx-auto">
            Done
          </Button>
        </div>
      )}
        </div>
      </div>
    </div>,
    document.body
  );
}
