import { withHandler } from "@/lib/with-handler";
import { requireBranch, requireRoles } from "@/lib/auth-context";
import { NotFoundError } from "@/lib/errors";
import { USER_ROLES } from "@/constants";
import EventBooking from "@/models/event/EventBooking";
import EventHall from "@/models/event/EventHall";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import mongoose from "mongoose";

export const GET = withHandler(
  async (_req, { auth, params }) => {
    requireRoles(auth, [
      USER_ROLES.TENANT_ADMIN,
      USER_ROLES.BRANCH_MANAGER,
      USER_ROLES.EVENT_MANAGER,
      USER_ROLES.SALES_OFFICER,
      USER_ROLES.OPERATIONS_COORDINATOR,
      USER_ROLES.EVENT_COORDINATOR,
      USER_ROLES.ACCOUNTANT,
    ]);
    const { tenantId, branchId } = requireBranch(auth);
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Event booking");
    }

    const booking = await EventBooking.findOne({
      _id: id,
      tenantId,
      branchId,
    } as Record<string, unknown>).lean();
    if (!booking) {
      throw new NotFoundError("Event booking");
    }

    const hall = booking.eventHallId
      ? await EventHall.findOne({
          _id: booking.eventHallId,
          tenantId,
          branchId,
        } as Record<string, unknown>)
          .select("name")
          .lean()
      : null;

    const lineItems = booking.billingLineItems ?? [];
    const charges = booking.charges;
    const fallbackPrice = Number(
      booking.agreedPrice ?? booking.quotedPrice ?? booking.totalRevenue ?? 0
    );
    const calculatedFromLines = lineItems.reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0
    );
    const totalRevenue = Number(
      booking.totalRevenue ??
        (calculatedFromLines > 0
          ? calculatedFromLines
          : fallbackPrice)
    );

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    let y = 800;

    const drawLine = (label: string, value: string) => {
      page.drawText(label, { x: 40, y, size: 10, font: boldFont, color: rgb(0.12, 0.14, 0.17) });
      page.drawText(value, { x: 190, y, size: 10, font, color: rgb(0.2, 0.24, 0.28) });
      y -= 18;
    };

    page.drawText("Conference Event Proposal", {
      x: 40,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.08, 0.1, 0.14),
    });
    y -= 26;

    drawLine("Reference", String(booking.bookingReference ?? ""));
    drawLine("Client", String(booking.clientName ?? ""));
    drawLine("Event Title", String(booking.title ?? ""));
    drawLine("Event Type", String(booking.eventType ?? ""));
    drawLine("Hall", String(hall?.name ?? "N/A"));
    drawLine("Start", new Date(String(booking.startDate)).toLocaleString("en-GH"));
    drawLine("End", new Date(String(booking.endDate)).toLocaleString("en-GH"));
    drawLine("Status", String(booking.status ?? ""));
    y -= 6;

    page.drawText("Financial Summary", {
      x: 40,
      y,
      size: 12,
      font: boldFont,
      color: rgb(0.08, 0.1, 0.14),
    });
    y -= 18;
    drawLine("Quoted Price", `${Number(booking.quotedPrice ?? 0).toFixed(2)} GHS`);
    drawLine("Agreed Price", `${Number(booking.agreedPrice ?? 0).toFixed(2)} GHS`);
    drawLine("Deposit Required", `${Number(booking.depositRequired ?? 0).toFixed(2)} GHS`);
    drawLine("Deposit Paid", `${Number(booking.depositPaid ?? 0).toFixed(2)} GHS`);
    drawLine("Total Revenue", `${Number(totalRevenue ?? 0).toFixed(2)} GHS`);
    y -= 6;

    if (lineItems.length > 0) {
      page.drawText("Line-item Billing", {
        x: 40,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.08, 0.1, 0.14),
      });
      y -= 16;
      lineItems.slice(0, 20).forEach((row) => {
        const rowText = `${row.label} | Qty ${row.quantity} x ${Number(row.unitPrice ?? 0).toFixed(2)} = ${Number(row.amount ?? 0).toFixed(2)} GHS`;
        page.drawText(rowText, { x: 40, y, size: 9, font, color: rgb(0.25, 0.28, 0.31), maxWidth: 510 });
        y -= 14;
      });
      y -= 6;
    } else if (charges) {
      page.drawText("Charges", {
        x: 40,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.08, 0.1, 0.14),
      });
      y -= 16;
      const rows: Array<[string, number]> = [
        ["Hall Rental", Number(charges.hallRental ?? 0)],
        ["Catering", Number(charges.catering ?? 0)],
        ["Equipment", Number(charges.equipment ?? 0)],
        ["Decoration", Number(charges.decoration ?? 0)],
        ["Security", Number(charges.security ?? 0)],
        ["Staffing", Number(charges.staffing ?? 0)],
      ];
      rows.forEach(([name, amount]) => {
        if (!amount) return;
        page.drawText(`${name}: ${amount.toFixed(2)} GHS`, {
          x: 40,
          y,
          size: 9,
          font,
          color: rgb(0.25, 0.28, 0.31),
        });
        y -= 14;
      });
    }

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="proposal-${booking.bookingReference}.pdf"`,
      },
    });
  },
  { auth: true }
);
