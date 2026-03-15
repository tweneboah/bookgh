import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "./api-response";
import { checkRateLimit, getRateLimitConfig } from "./rate-limit";
import { extractAuth, type AuthContext } from "./auth-context";
import connectDB from "./db";

type RouteParams = { params: Promise<Record<string, string>> };

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: { params: Record<string, string>; auth: AuthContext }
) => Promise<NextResponse>;

type PublicHandler = (
  req: NextRequest,
  ctx: { params: Record<string, string> }
) => Promise<NextResponse>;

interface HandlerOptions {
  auth?: boolean;
}

/**
 * Wraps an API route handler with:
 * - Database connection
 * - Rate limiting
 * - Authentication (when auth: true)
 * - Error handling
 */
export function withHandler(
  handler: AuthenticatedHandler,
  options: { auth: true }
): (req: NextRequest, ctx: RouteParams) => Promise<NextResponse>;

export function withHandler(
  handler: PublicHandler,
  options?: { auth?: false }
): (req: NextRequest, ctx: RouteParams) => Promise<NextResponse>;

export function withHandler(
  handler: AuthenticatedHandler | PublicHandler,
  options: HandlerOptions = {}
) {
  return async (
    req: NextRequest,
    routeCtx: RouteParams
  ): Promise<NextResponse> => {
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown";
      const path = req.nextUrl.pathname;
      const rlConfig = getRateLimitConfig(path);
      checkRateLimit(`${ip}:${path}`, rlConfig);

      await connectDB();

      const params = await routeCtx.params;

      if (options.auth) {
        const auth = extractAuth(req);
        return await (handler as AuthenticatedHandler)(req, { params, auth });
      }

      return await (handler as PublicHandler)(req, { params });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
