import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/** Human-readable labels for common field names in API validation errors */
const FIELD_LABELS: Record<string, string> = {
  eventHallId: "Event hall",
  clientName: "Client name",
  clientEmail: "Client email",
  clientPhone: "Client phone",
  guestId: "Guest",
  eventType: "Event type",
  title: "Event title",
  description: "Description",
  startDate: "Start date",
  endDate: "End date",
  startTime: "Start time",
  endTime: "End time",
  expectedAttendees: "Expected attendees",
  selectedLayoutName: "Layout",
  quotedPrice: "Quoted price",
  quotationNotes: "Quotation notes",
  specialRequests: "Special requests",
  name: "Name",
  email: "Email",
  password: "Password",
  primaryColor: "Primary color",
  accentColor: "Accent color",
  customDomain: "Custom domain",
};

/** Convert Zod validation message to a short, user-friendly phrase */
function friendlyValidationMessage(zodMessage: string, fieldLabel: string): string {
  const lower = zodMessage.toLowerCase();
  if (lower === "required" || lower.includes("required")) return `${fieldLabel} is required`;
  if (lower.includes("invalid datetime") || lower.includes("invalid date")) return `${fieldLabel} must be a valid date and time (e.g. use the date picker to choose date and time)`;
  if (lower.includes("invalid email")) return `${fieldLabel} must be a valid email address`;
  if (lower.includes("too small") || lower.includes("minimum")) return `${fieldLabel} is too short`;
  if (lower.includes("too big") || lower.includes("maximum")) return `${fieldLabel} is too long`;
  if (lower.includes("invalid")) return `${fieldLabel}: ${zodMessage}`;
  return `${fieldLabel}: ${zodMessage}`;
}

/**
 * Build a single user-facing message from a Zod error (e.g. for toasts).
 * Keeps details in a structure suitable for inline form errors.
 */
export function formatZodErrorMessage(error: ZodError): string {
  const flattened = error.flatten();
  const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
  const lines: string[] = [];
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (!messages?.length) continue;
    const label = getFieldLabel(field);
    const first = messages[0];
    lines.push(friendlyValidationMessage(first, label));
  }
  if (lines.length === 0) return "Please check your input and try again.";
  if (lines.length === 1) return lines[0];
  return `Please fix the following: ${lines.join(". ")}`;
}

function getFieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const match = field.match(/^installments\.(\d+)\.(dueDate|amount)$/);
  if (match) {
    const i = Number(match[1]) + 1;
    return match[2] === "dueDate" ? `Installment ${i} due date` : `Installment ${i} amount`;
  }
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

/**
 * Build a map of field name → user-friendly message for inline form errors.
 * Use as error.details in 400 validation responses.
 */
export function formatZodFieldErrors(error: ZodError): Record<string, string> {
  const flattened = error.flatten();
  const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (!messages?.length) continue;
    const label = getFieldLabel(field);
    result[field] = friendlyValidationMessage(messages[0], label);
  }
  return result;
}

export function successResponse<T>(
  data: T,
  status = 200,
  meta?: Record<string, unknown>
): NextResponse<SuccessResponse<T>> {
  const body: SuccessResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function createdResponse<T>(data: T): NextResponse<SuccessResponse<T>> {
  return successResponse(data, 201);
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(error: unknown): NextResponse<ErrorResponse> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false as const,
        error: {
          message: error.message,
          code: error.code,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const userMessage = formatZodErrorMessage(error);
    const fieldErrors = formatZodFieldErrors(error);
    return NextResponse.json(
      {
        success: false as const,
        error: {
          message: userMessage,
          code: "VALIDATION_ERROR",
          details: fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof Error && error.message.includes("tenantId is required")) {
    return NextResponse.json(
      {
        success: false as const,
        error: {
          message: "Tenant context missing",
          code: "TENANT_REQUIRED",
        },
      },
      { status: 403 }
    );
  }

  console.error("Unhandled error:", error);
  return NextResponse.json(
    {
      success: false as const,
      error: {
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      },
    },
    { status: 500 }
  );
}
