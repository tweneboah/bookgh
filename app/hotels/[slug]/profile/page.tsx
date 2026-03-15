"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/auth-slice";
import { useHotelDetail, useMyBookings } from "@/hooks/api";
import toast from "react-hot-toast";
import { HotelPublicNav } from "@/components/public/hotel-public-nav";

const FONT_WORK_SANS = { fontFamily: "'Work Sans', sans-serif" };

function ProfileFonts() {
  useEffect(() => {
    const links = [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" },
    ];
    const els: HTMLLinkElement[] = [];
    links.forEach(({ rel, href }) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      document.head.appendChild(link);
      els.push(link);
    });
    return () => els.forEach((el) => el.remove());
  }, []);
  return null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export default function HotelProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const { data: hotelData } = useHotelDetail(slug);
  const hotel = hotelData?.data;
  const { data: bookingsData } = useMyBookings({ limit: "20" });
  const allBookings = bookingsData?.data ?? [];
  const primaryColor = hotel?.tenant?.primaryColor ?? "#144bb8";
  const hotelName = hotel?.tenant?.name ?? hotel?.name ?? "Hotel";

  const [activeTab, setActiveTab] = useState("overview");
  const [personalForm, setPersonalForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    preferredRoom: "King Suite",
    floorPreference: "high" as "high" | "low",
    dietary: { vegetarian: false, glutenFree: false, vegan: false, nutAllergy: false },
    specialOccasion: "",
  });
  const [savingPersonal, setSavingPersonal] = useState(false);

  const bookingIdParam = searchParams.get("booking");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "personal") setActiveTab("personal");
    if (tab === "history") setActiveTab("history");
    if (bookingIdParam) setActiveTab("history");
  }, [searchParams, bookingIdParam]);

  const [historySubTab, setHistorySubTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 5;

  useEffect(() => {
    if (user) {
      setPersonalForm((f) => ({
        ...f,
        fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "",
        email: user.email || "",
        phone: (user as { phone?: string }).phone || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    if (typeof isAuthenticated !== "undefined" && !isAuthenticated) {
      router.replace(`/hotels/${slug}/login?redirect=${encodeURIComponent(`/hotels/${slug}/profile`)}`);
    }
  }, [isAuthenticated, slug, router]);

  const branchSlug = hotel?.slug ?? slug;
  const todayStr = new Date().toISOString().slice(0, 10);
  const hotelBookings = allBookings.filter((b: any) => b.branchId?.slug === branchSlug);
  const selectedBooking = bookingIdParam
    ? hotelBookings.find((b: any) => String(b._id) === String(bookingIdParam))
    : null;
  const upcomingBookings = hotelBookings.filter(
    (b: any) => b.status !== "cancelled" && b.branchId?.slug === branchSlug
  ).slice(0, 5);
  const anyBookings = hotelBookings;

  const historyUpcoming = hotelBookings.filter(
    (b: any) => b.status !== "cancelled" && (b.checkOutDate?.slice(0, 10) ?? "") >= todayStr
  );
  const historyPast = hotelBookings.filter(
    (b: any) => b.status !== "cancelled" && (b.checkOutDate?.slice(0, 10) ?? "") < todayStr
  );
  const historyCancelled = hotelBookings.filter((b: any) => b.status === "cancelled");
  const historyTabLists = {
    upcoming: historyUpcoming,
    past: historyPast,
    cancelled: historyCancelled,
  };
  const historyList = historyTabLists[historySubTab];
  const historyTotal = historyList.length;
  const historyPaginated = historyList.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );
  const historyPages = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE));

  if (typeof isAuthenticated !== "undefined" && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={FONT_WORK_SANS}>
        <ProfileFonts />
        <p className="text-slate-600">Redirecting to login…</p>
      </div>
    );
  }

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email?.split("@")[0] ?? "Guest";
  const memberSince = (user as { createdAt?: string })?.createdAt
    ? new Date((user as any).createdAt).getFullYear()
    : new Date().getFullYear();
  const personalDisplayName = personalForm.fullName || user?.firstName || user?.email?.split("@")[0] || "Guest";
  const personalMemberSince = (user as { createdAt?: string })?.createdAt
    ? new Date((user as any).createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "2021";

  const handleSavePersonal = async () => {
    setSavingPersonal(true);
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Profile updated");
    setSavingPersonal(false);
  };
  const handleSignOut = () => {
    dispatch(logout());
    router.push(`/hotels/${slug}`);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "personal", label: "Personal Info", icon: "person" },
    { id: "history", label: "Booking History", icon: "history" },
    { id: "loyalty", label: "Loyalty Program", icon: "loyalty" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  return (
    <div className="min-h-screen bg-[#f6f6f8] text-slate-900" style={FONT_WORK_SANS}>
      <ProfileFonts />
      <style jsx global>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      `}</style>

      <HotelPublicNav slug={slug} hotelName={hotelName} primaryColor={primaryColor} logo={hotel?.tenant?.logo} />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div
                className="h-24 w-24 rounded-full bg-slate-200 border-4 bg-center bg-cover shrink-0"
                style={{ borderColor: `${primaryColor}1A` }}
              >
                {user?.email ? (
                  <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: primaryColor }}>
                    {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
                  </div>
                ) : null}
              </div>
              <div className="absolute bottom-0 right-0 rounded-full border-2 border-white p-1 text-white" style={{ backgroundColor: primaryColor }}>
                <span className="material-symbols-outlined text-xs font-bold block">verified</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl md:text-3xl font-bold leading-tight text-slate-900">Welcome back, {user?.firstName ?? displayName}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1 font-semibold text-sm" style={{ color: primaryColor }}>
                  <span className="material-symbols-outlined text-sm">stars</span> Gold Member
                </span>
                <span className="text-slate-500 text-sm">Member since {memberSince}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/hotels/${slug}`}
              className="flex items-center justify-center text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md hover:opacity-90 transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Book New Stay
            </Link>
          </div>
        </div>

        <div className="mb-8 overflow-x-auto">
          <div className="flex border-b border-slate-200 min-w-max">
            {tabs.map((tab) => {
              const content = (
                <>
                  <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                  {tab.label}
                </>
              );
              const active = activeTab === tab.id;
              const className = `flex items-center gap-2 border-b-2 px-4 pb-4 pt-2 text-sm font-medium transition-colors ${
                active ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
              }`;
              const style = active ? { borderColor: primaryColor, color: primaryColor } : undefined;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={className} style={style}>
                  {content}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "history" ? (
          <div className="flex flex-col md:flex-row gap-8 max-w-[1280px] w-full">
            <aside className="w-full md:w-64 flex flex-col gap-6 shrink-0">
              <div className="flex flex-col gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full border-2 flex items-center justify-center text-xl font-bold text-white shrink-0" style={{ borderColor: primaryColor, backgroundColor: primaryColor }}>
                    {(user?.firstName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h1 className="text-base font-bold leading-normal text-slate-900 truncate">{displayName}</h1>
                    <p className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: primaryColor }}>Premium Member</p>
                  </div>
                </div>
                <nav className="flex flex-col gap-1 mt-4">
                  <button type="button" onClick={() => setActiveTab("overview")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-left w-full">
                    <span className="material-symbols-outlined text-[22px]">dashboard</span>
                    <p className="text-sm font-semibold">Dashboard</p>
                  </button>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white shadow-md" style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}33` }}>
                    <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                    <p className="text-sm font-semibold">My Bookings</p>
                  </div>
                  <button type="button" onClick={() => setActiveTab("settings")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-left w-full">
                    <span className="material-symbols-outlined text-[22px]">settings</span>
                    <p className="text-sm font-semibold">Settings</p>
                  </button>
                  <Link href={`/hotels/${slug}/contact`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                    <span className="material-symbols-outlined text-[22px]">help_center</span>
                    <p className="text-sm font-semibold">Help Center</p>
                  </Link>
                </nav>
              </div>
              <div className="p-6 rounded-xl text-white" style={{ backgroundColor: primaryColor }}>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Loyalty Points</p>
                <p className="text-3xl font-black mb-4">12,450</p>
                <button type="button" className="w-full bg-white py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors" style={{ color: primaryColor }}>Redeem Now</button>
              </div>
            </aside>
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-900">Booking History</h2>
                <p className="text-base text-slate-500">Keep track of your luxury escapes and future adventures.</p>
              </div>

              {bookingIdParam && !selectedBooking && hotelBookings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 flex items-center justify-between">
                  <p className="text-amber-800 font-medium">Booking not found or not associated with this property.</p>
                  <Link href={`/hotels/${slug}/profile?tab=history`} className="text-sm font-bold hover:underline" style={{ color: primaryColor }}>Back to list</Link>
                </div>
              )}

              {selectedBooking && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Booking Details</h3>
                    <Link
                      href={`/hotels/${slug}/profile?tab=history`}
                      className="text-sm font-bold hover:underline flex items-center gap-1"
                      style={{ color: primaryColor }}
                    >
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                      Back to list
                    </Link>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Reference</p>
                      <p className="font-mono font-bold text-slate-900">{selectedBooking.bookingReference ?? `#${String(selectedBooking._id).slice(-8).toUpperCase()}`}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</p>
                      <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-full text-xs font-bold ${
                        selectedBooking.status === "confirmed" ? "bg-green-100 text-green-700" :
                        selectedBooking.status === "pending" ? "bg-blue-100 text-blue-700" :
                        selectedBooking.status === "checkedIn" ? "bg-amber-100 text-amber-700" :
                        selectedBooking.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {selectedBooking.status === "confirmed" ? "Confirmed" : selectedBooking.status === "pending" ? "Pending" : selectedBooking.status === "checkedIn" ? "Checked In" : selectedBooking.status === "cancelled" ? "Cancelled" : selectedBooking.status ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Room</p>
                      <p className="font-semibold text-slate-900">{selectedBooking.roomCategoryId?.name ?? "—"}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Property</p>
                      <p className="font-semibold text-slate-900">{selectedBooking.branchId?.name ?? hotelName}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Check-in</p>
                      <p className="text-slate-900">
                        {selectedBooking.checkInDate
                          ? new Date(selectedBooking.checkInDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Check-out</p>
                      <p className="text-slate-900">
                        {selectedBooking.checkOutDate
                          ? new Date(selectedBooking.checkOutDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </p>
                    </div>
                    {selectedBooking.checkInDate && selectedBooking.checkOutDate && (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Nights</p>
                        <p className="text-slate-900">
                          {Math.ceil((new Date(selectedBooking.checkOutDate).getTime() - new Date(selectedBooking.checkInDate).getTime()) / (1000 * 60 * 60 * 24))} night(s)
                        </p>
                      </div>
                    )}
                    {(selectedBooking.roomRate != null || selectedBooking.totalAmount != null) && (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount</p>
                        <p className="font-bold text-slate-900">
                          {selectedBooking.totalAmount != null
                            ? fmt(selectedBooking.totalAmount)
                            : selectedBooking.roomRate != null
                              ? `${fmt(selectedBooking.roomRate)} / night`
                              : "—"}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedBooking.branchId?.city || selectedBooking.branchId?.country ? (
                    <div className="px-6 pb-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Location</p>
                      <p className="text-slate-700">{[selectedBooking.branchId?.city, selectedBooking.branchId?.country].filter(Boolean).join(", ") || "—"}</p>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: `${primaryColor}14` }}>
                <div className="flex border-b border-slate-100 px-6">
                  <button type="button" onClick={() => { setHistorySubTab("upcoming"); setHistoryPage(1); }} className={`flex items-center justify-center border-b-2 px-6 py-4 ${historySubTab === "upcoming" ? "text-white" : "border-transparent text-slate-500 hover:text-slate-700"} transition-colors`} style={historySubTab === "upcoming" ? { borderColor: primaryColor, color: primaryColor } : undefined}>
                    <span className="text-sm font-bold">Upcoming</span>
                  </button>
                  <button type="button" onClick={() => { setHistorySubTab("past"); setHistoryPage(1); }} className={`flex items-center justify-center border-b-2 px-6 py-4 ${historySubTab === "past" ? "" : "border-transparent text-slate-500 hover:text-slate-700"} transition-colors`} style={historySubTab === "past" ? { borderColor: primaryColor, color: primaryColor } : undefined}>
                    <span className="text-sm font-bold">Past</span>
                  </button>
                  <button type="button" onClick={() => { setHistorySubTab("cancelled"); setHistoryPage(1); }} className={`flex items-center justify-center border-b-2 px-6 py-4 ${historySubTab === "cancelled" ? "" : "border-transparent text-slate-500 hover:text-slate-700"} transition-colors`} style={historySubTab === "cancelled" ? { borderColor: primaryColor, color: primaryColor } : undefined}>
                    <span className="text-sm font-bold">Cancelled</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Booking ID</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Room &amp; Location</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Dates</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyPaginated.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            {historySubTab === "upcoming" && "No upcoming bookings."}
                            {historySubTab === "past" && "No past bookings."}
                            {historySubTab === "cancelled" && "No cancelled bookings."}
                          </td>
                        </tr>
                      ) : (
                        historyPaginated.map((booking: any) => {
                          const branch = booking.branchId;
                          const room = booking.roomCategoryId;
                          const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
                          const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
                          const dateStr = checkIn && checkOut
                            ? `${checkIn.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })} - ${checkOut.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}`
                            : "—";
                          const isPast = checkOut && checkOut < new Date();
                          const statusLabel = booking.status === "cancelled" ? "Cancelled" : isPast ? "Completed" : booking.status === "confirmed" ? "Confirmed" : booking.status === "pending" ? "Pending" : booking.status === "checkedIn" ? "Checked In" : "Upcoming";
                          const statusStyle = statusLabel === "Confirmed" ? "bg-green-100 text-green-700" : statusLabel === "Upcoming" || statusLabel === "Pending" ? "bg-blue-100 text-blue-700" : statusLabel === "Completed" ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-700";
                          const shortId = booking._id ? `#${String(booking._id).slice(-6).toUpperCase()}` : "—";
                          return (
                            <tr key={booking._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-slate-900">{shortId}</td>
                              <td className="px-6 py-5">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-900">{room?.name ?? "Room"}</span>
                                  <span className="text-xs text-slate-500">{branch?.name ?? hotelName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600">{dateStr}</td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusStyle}`}>
                                  <span className="size-1.5 rounded-full bg-current opacity-70 mr-2" />
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-right">
                                {booking.status === "cancelled" ? null : isPast ? (
                                  <Link href={`/hotels/${slug}`} className="inline-block px-4 py-1.5 rounded-lg text-sm font-bold hover:opacity-90 transition-colors" style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}>Rebook</Link>
                                ) : (
                                  <Link href={`/hotels/${slug}/profile?booking=${booking._id}`} className="text-sm font-bold hover:underline" style={{ color: primaryColor }}>View Details</Link>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {historyTotal > 0 && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
                    <p className="text-xs text-slate-500 font-medium">Showing {((historyPage - 1) * HISTORY_PAGE_SIZE) + 1}-{Math.min(historyPage * HISTORY_PAGE_SIZE, historyTotal)} of {historyTotal} bookings</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage <= 1} className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors">
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      {Array.from({ length: historyPages }, (_, i) => i + 1).map((p) => (
                        <button key={p} type="button" onClick={() => setHistoryPage(p)} className={`size-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${p === historyPage ? "text-white" : "border border-slate-200 text-slate-600 hover:border-slate-300 hover:opacity-90"}`} style={p === historyPage ? { backgroundColor: primaryColor } : undefined}>{p}</button>
                      ))}
                      <button type="button" onClick={() => setHistoryPage((p) => Math.min(historyPages, p + 1))} disabled={historyPage >= historyPages} className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors">
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border flex gap-4 items-center" style={{ borderColor: `${primaryColor}14` }}>
                  <div className="size-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}>
                    <span className="material-symbols-outlined text-3xl">receipt_long</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Need an invoice?</h3>
                    <p className="text-xs text-slate-500">Download past booking receipts for your records.</p>
                    <button type="button" className="mt-2 text-xs font-bold hover:underline" style={{ color: primaryColor }}>Download Statements</button>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border flex gap-4 items-center" style={{ borderColor: `${primaryColor}14` }}>
                  <div className="size-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}>
                    <span className="material-symbols-outlined text-3xl">star</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Write a review</h3>
                    <p className="text-xs text-slate-500">Share your experience and earn 500 bonus points.</p>
                    <button type="button" className="mt-2 text-xs font-bold hover:underline" style={{ color: primaryColor }}>Rate your Stays</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "personal" ? (
          <div className="flex flex-col md:flex-row gap-8 max-w-[1280px] w-full">
            <aside className="w-full md:w-64 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg" style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}33` }}>
                <span className="material-symbols-outlined">person</span>
                <span className="font-medium">Personal Details</span>
              </div>
              <button type="button" onClick={() => setActiveTab("overview")} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all text-left w-full">
                <span className="material-symbols-outlined" style={{ color: primaryColor }}>calendar_month</span>
                <span className="font-medium">My Stays</span>
              </button>
              <button type="button" onClick={() => setActiveTab("loyalty")} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all text-left w-full">
                <span className="material-symbols-outlined" style={{ color: primaryColor }}>card_giftcard</span>
                <span className="font-medium">Loyalty Rewards</span>
              </button>
              <button type="button" onClick={() => setActiveTab("overview")} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-all text-left w-full">
                <span className="material-symbols-outlined" style={{ color: primaryColor }}>notifications</span>
                <span className="font-medium">Notifications</span>
              </button>
              <hr className="my-4 border-slate-200" />
              <button type="button" onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all text-left w-full">
                <span className="material-symbols-outlined">logout</span>
                <span className="font-medium">Sign Out</span>
              </button>
            </aside>
            <div className="flex-1 flex flex-col gap-8 min-w-0">
              <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative">
                  <div className="size-24 md:size-32 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-4xl font-bold text-white shrink-0" style={{ backgroundColor: primaryColor }}>
                    {(user?.firstName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
                  </div>
                  <button type="button" className="absolute bottom-0 right-0 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform" style={{ backgroundColor: primaryColor }} aria-label="Change photo">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                  </button>
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{personalDisplayName}</h1>
                  <p className="font-semibold flex items-center justify-center md:justify-start gap-1 mt-1" style={{ color: primaryColor }}>
                    <span className="material-symbols-outlined text-lg">workspace_premium</span> Platinum Member
                  </p>
                  <p className="text-slate-500 text-sm mt-1">Member since {personalMemberSince}</p>
                </div>
                <div className="md:ml-auto">
                  <button type="button" onClick={handleSavePersonal} disabled={savingPersonal} className="text-white px-6 py-2.5 rounded-lg font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-70" style={{ backgroundColor: primaryColor }}>
                    {savingPersonal ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
              <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ color: primaryColor }}>contact_page</span> Personal Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700">Full Name</label>
                    <input type="text" value={personalForm.fullName} onChange={(e) => setPersonalForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Enter your full name" className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-3 focus:outline-none focus:ring-2 transition-all" style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                    <input type="email" value={personalForm.email} onChange={(e) => setPersonalForm((f) => ({ ...f, email: e.target.value }))} placeholder="Enter email" className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-3 focus:outline-none focus:ring-2 transition-all" style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                    <input type="tel" value={personalForm.phone} onChange={(e) => setPersonalForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Enter phone number" className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-3 focus:outline-none focus:ring-2 transition-all" style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                    <input type="date" value={personalForm.dateOfBirth} onChange={(e) => setPersonalForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-3 focus:outline-none focus:ring-2 transition-all" style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties} />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Physical Address</label>
                    <textarea value={personalForm.address} onChange={(e) => setPersonalForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street, City, State, ZIP Code" rows={3} className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-3 focus:outline-none focus:ring-2 transition-all resize-none" style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties} />
                  </div>
                </div>
              </section>
              <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ color: primaryColor }}>travel_explore</span> Travel Preferences
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-2">Preferred Room Type</label>
                      <select value={personalForm.preferredRoom} onChange={(e) => setPersonalForm((f) => ({ ...f, preferredRoom: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-3 focus:outline-none focus:ring-2 transition-all" style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties}>
                        <option>King Suite</option><option>Executive Studio</option><option>Deluxe Double</option><option>Penthouse</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-2">Floor Preference</label>
                      <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center p-3 rounded-xl cursor-pointer border-2 transition-all ${personalForm.floorPreference === "high" ? "" : "border-slate-100 bg-slate-50"}`} style={personalForm.floorPreference === "high" ? { borderColor: primaryColor, backgroundColor: `${primaryColor}0D` } : undefined}>
                          <input type="radio" name="floor" checked={personalForm.floorPreference === "high"} onChange={() => setPersonalForm((f) => ({ ...f, floorPreference: "high" }))} className="hidden" />
                          <span className="text-sm font-bold" style={personalForm.floorPreference === "high" ? { color: primaryColor } : { color: "#64748b" }}>High Floor</span>
                        </label>
                        <label className={`flex-1 flex items-center justify-center p-3 rounded-xl cursor-pointer border-2 transition-all ${personalForm.floorPreference === "low" ? "" : "border-slate-100 bg-slate-50"}`} style={personalForm.floorPreference === "low" ? { borderColor: primaryColor, backgroundColor: `${primaryColor}0D` } : undefined}>
                          <input type="radio" name="floor" checked={personalForm.floorPreference === "low"} onChange={() => setPersonalForm((f) => ({ ...f, floorPreference: "low" }))} className="hidden" />
                          <span className="text-sm font-bold" style={personalForm.floorPreference === "low" ? { color: primaryColor } : { color: "#64748b" }}>Low Floor</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-2">Dietary Requirements</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["vegetarian", "glutenFree", "vegan", "nutAllergy"] as const).map((key) => (
                          <label key={key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input type="checkbox" checked={personalForm.dietary[key]} onChange={(e) => setPersonalForm((f) => ({ ...f, dietary: { ...f.dietary, [key]: e.target.checked } }))} className="rounded" style={{ accentColor: primaryColor }} />
                            <span className="text-sm capitalize">{key === "glutenFree" ? "Gluten-Free" : key === "nutAllergy" ? "Nut Allergy" : key}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-2">Special Occasion Alert</label>
                      <input type="text" value={personalForm.specialOccasion} onChange={(e) => setPersonalForm((f) => ({ ...f, specialOccasion: e.target.value }))} placeholder="e.g., Anniversary in June" className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-3 focus:outline-none focus:ring-2 transition-all" style={{ ["--tw-ring-color" as string]: primaryColor } as React.CSSProperties} />
                    </div>
                  </div>
                </div>
              </section>
              <div className="flex justify-end gap-4 mb-10">
                <button type="button" onClick={() => setActiveTab("overview")} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">Cancel</button>
                <button type="button" onClick={handleSavePersonal} disabled={savingPersonal} className="px-8 py-2.5 rounded-lg text-white font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-70" style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px ${primaryColor}40` }}>{savingPersonal ? "Updating…" : "Update Profile"}</button>
              </div>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Upcoming Reservations</h2>
              <Link href={`/hotels/${slug}/profile?tab=history`} className="text-sm font-semibold hover:underline" style={{ color: primaryColor }}>View all</Link>
            </div>

            {upcomingBookings.length === 0 ? (
              <div className="rounded-xl bg-white border border-slate-200 p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">event_busy</span>
                <p className="mt-2 text-slate-600">No upcoming reservations at this property.</p>
                <Link
                  href={`/hotels/${slug}`}
                  className="mt-4 inline-flex items-center justify-center text-white px-6 py-2.5 rounded-lg font-bold text-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  Book a stay
                </Link>
              </div>
            ) : (
              upcomingBookings.map((booking: any) => {
                const branch = booking.branchId;
                const room = booking.roomCategoryId;
                const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
                const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
                const nights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                const dateStr = checkIn && checkOut
                  ? `${checkIn.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} - ${checkOut.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} (${nights} Night${nights !== 1 ? "s" : ""})`
                  : "—";
                const address = [branch?.city, branch?.country].filter(Boolean).join(", ") || "—";
                const img = branch?.images?.[0]?.url || room?.images?.[0]?.url || "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400";
                const status = booking.status === "confirmed" ? "Confirmed" : booking.status === "pending" ? "Pending" : booking.status === "checkedIn" ? "Checked In" : booking.status ?? "—";
                return (
                  <div key={booking._id} className="flex flex-col md:flex-row items-stretch gap-6 rounded-xl bg-white p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-full md:w-48 aspect-[4/3] md:aspect-square bg-slate-200 bg-center bg-cover rounded-lg shrink-0" style={{ backgroundImage: `url(${img})` }} />
                    <div className="flex flex-col justify-between flex-1 py-1">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{status}</p>
                            <h3 className="text-xl font-bold text-slate-900">{branch?.name ?? hotelName}</h3>
                          </div>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}>
                            <span className="material-symbols-outlined">calendar_today</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-slate-700 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">event</span>
                            {dateStr}
                          </p>
                          <p className="text-sm text-slate-700 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">location_on</span>
                            {address}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <Link
                          href={`/hotels/${slug}/profile`}
                          className="flex-1 md:flex-none px-6 py-2 bg-slate-100 text-slate-900 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors text-center"
                        >
                          Manage Stay
                        </Link>
                        <Link
                          href={`/hotels/${slug}/profile?booking=${booking._id}`}
                          className="flex-1 md:flex-none px-6 py-2 border text-sm font-bold rounded-lg text-center hover:opacity-90 transition-all"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Loyalty Status</h2>
            <div className="bg-gradient-to-br text-white p-6 rounded-xl shadow-lg relative overflow-hidden" style={{ background: `linear-gradient(to bottom right, ${primaryColor}, #0e3a96)` }}>
              <div className="absolute top-[-20px] right-[-20px] size-40 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">Current Tier</span>
                  <span className="material-symbols-outlined">military_tech</span>
                </div>
                <h3 className="text-3xl font-bold mb-1">Gold</h3>
                <p className="text-white/90 text-sm mb-6">You&apos;re 1,500 points away from Platinum</p>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Progress</span>
                    <span>85%</span>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: "85%" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                  <div>
                    <p className="text-xs opacity-70">Total Points</p>
                    <p className="text-lg font-bold">12,450</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70">Nights this Year</p>
                    <p className="text-lg font-bold">{anyBookings.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold mb-4 text-slate-900">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <Link href={`/hotels/${slug}/profile#payment`} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined" style={{ color: primaryColor }}>credit_card</span>
                      <span className="text-sm font-medium">Payment Methods</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </Link>
                </li>
                <li>
                  <Link href={`/hotels/${slug}/rooms`} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined" style={{ color: primaryColor }}>favorite</span>
                      <span className="text-sm font-medium">Saved Properties</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </Link>
                </li>
                <li>
                  <Link href={`/hotels/${slug}/contact`} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined" style={{ color: primaryColor }}>support_agent</span>
                      <span className="text-sm font-medium">Customer Support</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        )}
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-8">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="material-symbols-outlined">copyright</span>
            <span className="text-sm">{new Date().getFullYear()} {hotelName}. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link href={`/hotels/${slug}/contact`} className="text-sm text-slate-500 hover:opacity-80 transition-colors" style={{ color: "inherit" }}>Privacy Policy</Link>
            <Link href={`/hotels/${slug}/contact`} className="text-sm text-slate-500 hover:opacity-80 transition-colors" style={{ color: "inherit" }}>Terms of Service</Link>
            <Link href={`/hotels/${slug}/contact`} className="text-sm text-slate-500 hover:opacity-80 transition-colors" style={{ color: "inherit" }}>Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
