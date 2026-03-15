"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNowStrict, differenceInHours, differenceInMinutes, isPast } from "date-fns";
import {
  LogIn,
  LogOut,
  BedDouble,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
  CalendarCheck,
  CalendarClock,
  Timer,
  DoorOpen,
  RefreshCw,
  Phone,
  Sparkles,
  ClipboardList,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useFrontDeskOverview, useAdminVerifyBooking } from "@/hooks/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

function fmt(n: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(n);
}

function guestName(g: any) {
  if (!g) return "Unknown Guest";
  return `${g.firstName || ""} ${g.lastName || ""}`.trim() || g.email || "Guest";
}

function roomLabel(r: any) {
  if (!r) return "—";
  return r.roomNumber || "Unassigned";
}

function TimeRemaining({ date, isOverdue }: { date: string; isOverdue?: boolean }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(date);
  const now = new Date();
  const overdue = isPast(target);
  const hours = Math.abs(differenceInHours(target, now));
  const mins = Math.abs(differenceInMinutes(target, now)) % 60;

  if (isOverdue || overdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
        <AlertTriangle className="h-3 w-3" />
        {hours > 0 ? `${hours}h ${mins}m overdue` : `${mins}m overdue`}
      </span>
    );
  }

  if (hours < 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Timer className="h-3 w-3" />
        {hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`}
      </span>
    );
  }

  if (hours < 6) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600">
        <Clock className="h-3 w-3" />
        {`${hours}h ${mins}m left`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
      <Clock className="h-3 w-3" />
      {formatDistanceToNowStrict(target, { addSuffix: true })}
    </span>
  );
}

function OccupancyGauge({ rate }: { rate: number }) {
  const color =
    rate >= 90
      ? "text-red-500"
      : rate >= 70
        ? "text-amber-500"
        : rate >= 40
          ? "text-emerald-500"
          : "text-blue-500";

  const strokeColor =
    rate >= 90
      ? "#ef4444"
      : rate >= 70
        ? "#f59e0b"
        : rate >= 40
          ? "#10b981"
          : "#3b82f6";

  const circumference = 2 * Math.PI * 45;
  const filled = (rate / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-28">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>{rate}%</span>
        </div>
      </div>
      <span className="mt-2 text-xs font-medium text-slate-500">Occupancy</span>
    </div>
  );
}

function BookingRow({
  booking,
  type,
  onVerify,
  verifyingId,
}: {
  booking: any;
  type: "in-house" | "arriving" | "departing" | "overdue";
  onVerify?: (id: string) => void;
  verifyingId?: string | null;
}) {
  const guest = booking.guestId;
  const room = booking.roomId;
  const category = booking.roomCategoryId;
  const dateField =
    type === "arriving" ? booking.checkInDate : booking.checkOutDate;
  const isPending = booking.status === "pending";
  const hasPayRef = !!(booking.metadata as any)?.paystackReference;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
        {(guest?.firstName?.[0] || "?").toUpperCase()}
        {(guest?.lastName?.[0] || "").toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900">
            {guestName(guest)}
          </p>
          {type === "overdue" && (
            <Badge variant="danger">OVERDUE</Badge>
          )}
          {isPending && <Badge variant="warning">Pending Payment</Badge>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
          {room && (
            <span className="flex items-center gap-1">
              <DoorOpen className="h-3 w-3" />
              Room {roomLabel(room)}
            </span>
          )}
          {category && <span>{category.name}</span>}
          {guest?.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {guest.phone}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {isPending && hasPayRef && onVerify && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => onVerify(booking._id)}
            disabled={verifyingId === booking._id}
          >
            {verifyingId === booking._id ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Verifying
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                Verify
              </>
            )}
          </Button>
        )}
        <div className="text-right">
          {(type === "in-house" || type === "departing" || type === "overdue") && (
            <TimeRemaining date={booking.checkOutDate} isOverdue={type === "overdue"} />
          )}
          {type === "arriving" && (
            <span className="text-xs text-slate-500">
              {format(new Date(dateField), "h:mm a")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptySection({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="h-10 w-10 text-slate-200" />
      <p className="mt-2 text-sm text-slate-400">{message}</p>
    </div>
  );
}

export default function FrontDeskBoardPage() {
  const { data, isLoading, refetch, isFetching } = useFrontDeskOverview();
  const verifyMutation = useAdminVerifyBooking();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const overview = data?.data;
  const stats = overview?.stats;

  const handleVerify = async (bookingId: string) => {
    setVerifyingId(bookingId);
    try {
      const res = await verifyMutation.mutateAsync(bookingId);
      const result = res.data;
      if (result.verified) {
        toast.success(result.message || "Payment verified! Booking confirmed.");
      } else {
        toast.error(result.message || "Payment not yet completed by guest.");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Verification failed. Try again."
      );
    } finally {
      setVerifyingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-52 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border bg-white" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg border bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Front Desk Board</h2>
          <p className="mt-1 text-sm text-slate-500">
            Live overview — {format(new Date(), "EEEE, MMMM d, yyyy · h:mm a")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">In-House</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {stats?.inHouseCount ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-100 p-3">
                <BedDouble className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Confirmed</p>
                <p className="mt-1 text-3xl font-bold text-blue-600">
                  {stats?.confirmedBookings ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-blue-100 p-3">
                <CalendarCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {stats?.pendingBookings ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-purple-100 p-3">
                <CalendarClock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Arriving Today</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {stats?.arrivingTodayCount ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-sky-100 p-3">
                <LogIn className="h-6 w-6 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Departing Today</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {stats?.departingTodayCount ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-amber-100 p-3">
                <LogOut className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden ${(stats?.overdueCount ?? 0) > 0 ? "border-red-200 bg-red-50/30" : ""}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Overdue</p>
                <p className={`mt-1 text-3xl font-bold ${(stats?.overdueCount ?? 0) > 0 ? "text-red-600" : "text-slate-900"}`}>
                  {stats?.overdueCount ?? 0}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${(stats?.overdueCount ?? 0) > 0 ? "bg-red-100" : "bg-slate-100"}`}>
                <AlertTriangle className={`h-6 w-6 ${(stats?.overdueCount ?? 0) > 0 ? "text-red-600" : "text-slate-400"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy & Revenue Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-6 p-6">
            <OccupancyGauge rate={stats?.occupancyRate ?? 0} />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Occupied:</span>
                <span className="font-semibold text-slate-900">
                  {stats?.occupiedRooms ?? 0} / {stats?.totalRooms ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Available:</span>
                <span className="font-semibold text-emerald-600">
                  {(stats?.totalRooms ?? 0) - (stats?.occupiedRooms ?? 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-5 p-6">
            <div className="rounded-xl bg-green-100 p-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Revenue Today</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {fmt(stats?.revenueToday ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-indigo-50 to-white border-indigo-100">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-indigo-100 p-3">
                <Sparkles className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-900">Quick Tips</p>
                <ul className="mt-2 space-y-1 text-xs text-indigo-700">
                  <li>• Auto-refreshes every 60 seconds</li>
                  <li>• Red alerts = overdue checkouts</li>
                  <li>• Amber = checkout within 2 hours</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Checkouts (Only shown if there are any) */}
      {(overview?.overdueCheckouts?.length ?? 0) > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-700">
                Overdue Checkouts — Immediate Attention
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.overdueCheckouts.map((b: any) => (
              <BookingRow key={b._id} booking={b} type="overdue" onVerify={handleVerify} verifyingId={verifyingId} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Departing Today + Arriving Today */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-amber-500" />
                <CardTitle>Departing Today</CardTitle>
              </div>
              <Badge variant="warning">{overview?.departingToday?.length ?? 0}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(overview?.departingToday?.length ?? 0) === 0 ? (
              <EmptySection icon={LogOut} message="No departures scheduled for today" />
            ) : (
              overview.departingToday.map((b: any) => (
                <BookingRow key={b._id} booking={b} type="departing" onVerify={handleVerify} verifyingId={verifyingId} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogIn className="h-5 w-5 text-blue-500" />
                <CardTitle>Arriving Today</CardTitle>
              </div>
              <Badge variant="info">{overview?.arrivingToday?.length ?? 0}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(overview?.arrivingToday?.length ?? 0) === 0 ? (
              <EmptySection icon={LogIn} message="No arrivals expected today" />
            ) : (
              overview.arrivingToday.map((b: any) => (
                <BookingRow key={b._id} booking={b} type="arriving" onVerify={handleVerify} verifyingId={verifyingId} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* In-House Guests */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              <CardTitle>Currently In-House</CardTitle>
            </div>
            <Badge variant="success">{overview?.inHouse?.length ?? 0} guests</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(overview?.inHouse?.length ?? 0) === 0 ? (
            <EmptySection icon={BedDouble} message="No guests currently checked in" />
          ) : (
            <div className="space-y-2">
              {overview.inHouse.map((b: any) => (
                <BookingRow key={b._id} booking={b} type="in-house" onVerify={handleVerify} verifyingId={verifyingId} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Departing Tomorrow */}
      {(overview?.departingTomorrow?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-orange-400" />
                <CardTitle>Departing Tomorrow</CardTitle>
              </div>
              <Badge>{overview.departingTomorrow.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.departingTomorrow.map((b: any) => (
              <BookingRow key={b._id} booking={b} type="in-house" onVerify={handleVerify} verifyingId={verifyingId} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Bookings (last 48 hours) — always visible */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-violet-500" />
              <CardTitle>Recent Bookings</CardTitle>
            </div>
            <Badge variant="info">{overview?.recentBookings?.length ?? 0}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(overview?.recentBookings?.length ?? 0) === 0 ? (
            <EmptySection icon={ClipboardList} message="No bookings received in the last 48 hours" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Guest</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Room Type</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Check-in</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Check-out</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Amount</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Status</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Booked</th>
                    <th className="pb-2 text-xs font-medium text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {overview.recentBookings.map((b: any) => {
                    const statusMap: Record<string, { label: string; variant: "success" | "warning" | "info" | "danger" | "default" }> = {
                      pending: { label: "Pending", variant: "warning" },
                      confirmed: { label: "Confirmed", variant: "info" },
                      checkedIn: { label: "Checked In", variant: "success" },
                      checkedOut: { label: "Checked Out", variant: "default" },
                      cancelled: { label: "Cancelled", variant: "danger" },
                    };
                    const st = statusMap[b.status] ?? { label: b.status, variant: "default" as const };
                    const isPending = b.status === "pending";
                    const hasPayRef = !!(b.metadata as any)?.paystackReference;
                    return (
                      <tr key={b._id} className="hover:bg-slate-50">
                        <td className="py-2.5 pr-4">
                          <div>
                            <p className="font-medium text-slate-900">
                              {guestName(b.guestId)}
                            </p>
                            {b.guestId?.email && (
                              <p className="text-xs text-slate-400">{b.guestId.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">
                          {b.roomCategoryId?.name ?? "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">
                          {format(new Date(b.checkInDate), "MMM d")}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">
                          {format(new Date(b.checkOutDate), "MMM d")}
                        </td>
                        <td className="py-2.5 pr-4 font-medium text-slate-900">
                          {b.totalAmount ? fmt(b.totalAmount) : "—"}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-slate-500">
                          {formatDistanceToNowStrict(new Date(b.createdAt), { addSuffix: true })}
                        </td>
                        <td className="py-2.5">
                          {isPending && hasPayRef ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleVerify(b._id)}
                              disabled={verifyingId === b._id}
                            >
                              {verifyingId === b._id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Verifying
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Verify
                                </>
                              )}
                            </Button>
                          ) : isPending ? (
                            <span className="text-xs text-slate-400">No payment ref</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Week */}
      {(overview?.upcomingWeek?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-indigo-400" />
                <CardTitle>Upcoming Arrivals (7 Days)</CardTitle>
              </div>
              <Badge variant="info">{overview.upcomingWeek.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Guest</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Check-in</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Check-out</th>
                    <th className="pb-2 pr-4 text-xs font-medium text-slate-500">Room Type</th>
                    <th className="pb-2 text-xs font-medium text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {overview.upcomingWeek.map((b: any) => (
                    <tr key={b._id} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-medium text-slate-900">
                        {guestName(b.guestId)}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">
                        {format(new Date(b.checkInDate), "MMM d, h:mm a")}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">
                        {format(new Date(b.checkOutDate), "MMM d")}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">
                        {b.roomCategoryId?.name ?? "—"}
                      </td>
                      <td className="py-2.5 font-medium text-slate-900">
                        {b.totalAmount ? fmt(b.totalAmount) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
