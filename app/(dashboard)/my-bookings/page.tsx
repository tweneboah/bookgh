"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarCheck,
  MapPin,
  BedDouble,
  ExternalLink,
  Globe,
  ShieldCheck,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useMyBookings, useVerifyMyBooking } from "@/hooks/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const statusVariant: Record<string, "success" | "warning" | "info" | "danger" | "default"> = {
  confirmed: "info",
  checkedIn: "success",
  pending: "warning",
  cancelled: "danger",
  checkedOut: "default",
  noShow: "danger",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export default function MyBookingsPage() {
  const { data, isLoading, isError } = useMyBookings({ limit: "50" });
  const bookings = data?.data ?? [];
  const verifyMutation = useVerifyMyBooking();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleVerify = async (bookingId: string) => {
    setVerifyingId(bookingId);
    try {
      const res = await verifyMutation.mutateAsync(bookingId);
      const result = res.data;
      if (result.verified) {
        toast.success(result.message || "Payment verified! Booking confirmed.");
      } else {
        toast.error(result.message || "Payment not yet completed.");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ?? "Verification failed. Please try again."
      );
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Bookings</h2>
          <p className="mt-1 text-sm text-slate-500">
            View and manage your hotel reservations
          </p>
        </div>
        <Link href="/browse-hotels">
          <Button>
            <Globe className="mr-2 h-4 w-4" />
            Book a Hotel
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
          Unable to load your bookings. Please try again later.
        </div>
      )}

      {!isLoading && !isError && bookings.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarCheck className="h-16 w-16 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">No bookings yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Browse hotels and make your first reservation.
            </p>
            <Link href="/browse-hotels" className="mt-6">
              <Button>
                <Globe className="mr-2 h-4 w-4" />
                Browse Hotels
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && bookings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {bookings.map((booking: any) => {
            const branch = booking.branchId;
            const category = booking.roomCategoryId;
            const tenant = booking.tenant;
            const hotelName = tenant?.name
              ? `${tenant.name} — ${branch?.name ?? ""}`
              : branch?.name ?? "Hotel";

            return (
              <Card key={booking._id} className="overflow-hidden transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{hotelName}</CardTitle>
                      {branch?.city && (
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {[branch.city, branch.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusVariant[booking.status] ?? "outline"}>
                      {booking.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <CalendarCheck className="h-4 w-4 text-slate-400" />
                      <span>
                        {format(new Date(booking.checkInDate), "MMM d")} –{" "}
                        {format(new Date(booking.checkOutDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="h-4 w-4 text-slate-400" />
                      <span>{category?.name ?? "Room"}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {booking.numberOfNights ?? booking.numberOfGuests ?? "—"}{" "}
                      {booking.numberOfNights === 1 ? "night" : "nights"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-xs text-slate-500">Booking Ref</p>
                      <p className="font-mono text-sm font-medium text-slate-800">
                        {booking.bookingReference}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {booking.totalAmount ? fmt(booking.totalAmount) : "—"}
                      </p>
                    </div>
                  </div>

                  {booking.status === "pending" && booking.metadata?.paystackReference && (
                    <div className="space-y-2 border-t border-amber-100 pt-3">
                      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-xs text-amber-700">
                          <p className="font-medium">Payment pending</p>
                          <p className="mt-0.5">
                            If you&apos;ve already paid, click below to verify your payment
                            and confirm this booking.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => handleVerify(booking._id)}
                        disabled={verifyingId === booking._id}
                      >
                        {verifyingId === booking._id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            Verify Payment
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {booking.status === "pending" && !booking.metadata?.paystackReference && branch?.slug && (
                    <div className="border-t border-amber-100 pt-3">
                      <Link href={`/hotels/${branch.slug}`}>
                        <Button size="sm" variant="outline" className="w-full gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Complete Payment
                        </Button>
                      </Link>
                    </div>
                  )}

                  {branch?.slug && (
                    <Link
                      href={`/hotels/${branch.slug}`}
                      className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View Hotel <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
