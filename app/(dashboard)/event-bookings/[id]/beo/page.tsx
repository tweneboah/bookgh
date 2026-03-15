"use client";

import { useParams } from "next/navigation";
import { useEventBookingBeo } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);

export default function EventBeoPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data, isLoading, isError } = useEventBookingBeo(id);
  const result = data?.data;
  const booking = result?.booking;
  const hall = result?.hall;

  const handlePrint = () => {
    window.print();
  };

  if (!id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 bg-white px-4">
        <p className="text-sm text-neutral-600">Invalid booking.</p>
        <Link href="/event-bookings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event Bookings
          </Button>
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 bg-white px-4">
        <p className="text-sm text-neutral-600">Could not load this booking.</p>
        <Link href="/event-bookings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event Bookings
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !booking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-600"
          aria-hidden
        />
      </div>
    );
  }

  const b = booking as any;
  const hallName = b.eventHallId?.name ?? hall?.name ?? "—";
  const selectedLayout = b.selectedLayoutName
    ? (hall?.layoutTemplates ?? []).find((t: any) => t.name === b.selectedLayoutName)
    : null;

  const hasCharges =
    (Array.isArray(b.billingLineItems) && b.billingLineItems.length > 0) ||
    b.charges ||
    b.quotedPrice != null;

  return (
    <div className="min-h-screen bg-neutral-100 font-sans print:bg-white">
      {/* Actions — screen only */}
      <div className="sticky top-0 z-50 border-b border-neutral-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-4 px-4 py-3">
          <Link href={`/event-bookings?edit=${b._id}`}>
            <Button variant="outline" size="sm" className="text-neutral-700">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to booking
            </Button>
          </Link>
          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-[#240046] text-white hover:bg-[#3c096c]"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print contract
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-[210mm] bg-white px-6 py-8 shadow-sm print:max-w-none print:shadow-none sm:px-12 sm:py-12 print:px-0 print:py-8">
        {/* Document title */}
        <header className="border-b-2 border-[#240046] pb-6">
          <h1 className="text-center text-xl font-bold uppercase tracking-wide text-neutral-900 sm:text-2xl">
            Banquet Event Order
          </h1>
          <p className="mt-1 text-center text-sm font-medium uppercase tracking-widest text-neutral-500">
            Event contract
          </p>
          <p className="mt-4 text-center font-mono text-sm text-neutral-600">
            Reference: {b.bookingReference}
          </p>
        </header>

        {/* Contract body — numbered sections */}
        <div className="mt-8 space-y-8 text-neutral-800">
          {/* 1. Event */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              1. Event
            </h2>
            <p className="mt-2 font-semibold text-neutral-900">{b.title}</p>
            {b.description && (
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">{b.description}</p>
            )}
            <p className="mt-2 text-sm text-neutral-600">
              Type: {String(b.eventType).replace(/([A-Z])/g, " $1").trim()}
            </p>
          </section>

          {/* 2. Client */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              2. Client
            </h2>
            <p className="mt-2 font-semibold text-neutral-900">{b.clientName}</p>
            {b.clientEmail && (
              <p className="mt-0.5 text-sm text-neutral-600">{b.clientEmail}</p>
            )}
            {b.clientPhone && (
              <p className="text-sm text-neutral-600">{b.clientPhone}</p>
            )}
          </section>

          {/* 3. Venue & setup */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              3. Venue & setup
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-neutral-500">Hall:</span> {hallName}
              </span>
              {b.selectedLayoutName && (
                <span>
                  <span className="text-neutral-500">Setup:</span> {b.selectedLayoutName}
                </span>
              )}
              {b.expectedAttendees != null && (
                <span>
                  <span className="text-neutral-500">Attendees:</span> {b.expectedAttendees}
                </span>
              )}
            </div>
            {selectedLayout?.imageUrl && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Layout
                </p>
                <img
                  src={selectedLayout.imageUrl}
                  alt={selectedLayout.name}
                  className="max-h-40 border border-neutral-200 object-contain print:max-h-32"
                />
              </div>
            )}
          </section>

          {/* 4. Date & time */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              4. Date & time
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-neutral-500">Start:</span>{" "}
                {format(new Date(b.startDate), "d MMMM yyyy")}
                {b.startTime ? `, ${b.startTime}` : ""}
              </span>
              <span>
                <span className="text-neutral-500">End:</span>{" "}
                {format(new Date(b.endDate), "d MMMM yyyy")}
                {b.endTime ? `, ${b.endTime}` : ""}
              </span>
            </div>
          </section>

          {/* 5. Financial terms */}
          {hasCharges && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                5. Financial terms
              </h2>
              {Array.isArray(b.billingLineItems) && b.billingLineItems.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-neutral-300">
                        <th className="py-2 text-left font-semibold text-neutral-700">Item</th>
                        <th className="py-2 text-right font-semibold text-neutral-700">Qty</th>
                        <th className="py-2 text-right font-semibold text-neutral-700">Unit price</th>
                        <th className="py-2 text-right font-semibold text-neutral-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.billingLineItems.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-neutral-100">
                          <td className="py-2.5 text-neutral-800">{row.label}</td>
                          <td className="py-2.5 text-right text-neutral-600">{row.quantity}</td>
                          <td className="py-2.5 text-right text-neutral-600">
                            {fmt(row.unitPrice ?? 0)}
                          </td>
                          <td className="py-2.5 text-right font-medium text-neutral-800">
                            {fmt(row.amount ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {b.charges && (
                <div className="mt-3 flex flex-wrap gap-6 text-sm">
                  {b.charges.hallRental != null && b.charges.hallRental > 0 && (
                    <span>Hall rental: {fmt(b.charges.hallRental)}</span>
                  )}
                  {b.charges.catering != null && b.charges.catering > 0 && (
                    <span>Catering: {fmt(b.charges.catering)}</span>
                  )}
                  {b.charges.equipment != null && b.charges.equipment > 0 && (
                    <span>Equipment: {fmt(b.charges.equipment)}</span>
                  )}
                </div>
              )}
              <p className="mt-4 border-t border-neutral-200 pt-3 text-right font-semibold text-neutral-900">
                Total: {fmt(b.quotedPrice ?? b.agreedPrice ?? 0)}
              </p>
            </section>
          )}

          {/* 6. Special requests */}
          {b.specialRequests && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                6. Special requests
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                {b.specialRequests}
              </p>
            </section>
          )}

          {/* 7. Additional expenses */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              7. Additional expenses
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">
              Any additional expenses incurred in connection with this event (including but not
              limited to extra catering, equipment, staffing, or other services not set out in this
              contract) may be charged to and shall be borne by the client unless otherwise agreed
              in writing.
            </p>
          </section>
        </div>

        {/* Signature section */}
        <section className="mt-12 border-t border-neutral-200 pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Signatures
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            By signing below, both parties agree to the terms of this Banquet Event Order.
          </p>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-neutral-600">Client</p>
              <div className="h-12 border-b border-neutral-300" aria-hidden />
              <p className="mt-2 text-xs text-neutral-500">Name (print)</p>
              <div className="mt-4 h-8 border-b border-neutral-300" aria-hidden />
              <p className="mt-2 text-xs text-neutral-500">Date</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-neutral-600">For the venue</p>
              <div className="h-12 border-b border-neutral-300" aria-hidden />
              <p className="mt-2 text-xs text-neutral-500">Name (print)</p>
              <div className="mt-4 h-8 border-b border-neutral-300" aria-hidden />
              <p className="mt-2 text-xs text-neutral-500">Date</p>
            </div>
          </div>
        </section>

        {/* Contract footer */}
        <footer className="mt-10 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
          <p>
            This document constitutes the Banquet Event Order and contract for the event described
            above. Issued on {format(new Date(), "d MMMM yyyy")}. For enquiries, contact the event
            coordinator.
          </p>
        </footer>
      </main>
    </div>
  );
}
