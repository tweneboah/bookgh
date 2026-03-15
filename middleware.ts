import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function notFoundResponse(host: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not found</title></head><body><h1>Hotel not found</h1><p>No hotel is configured for this domain (${host}).</p><p>If you own this domain, add it in Bookgh under Platform → Tenants → Edit → Custom domain.</p></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

const PLATFORM_HOST = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname.toLowerCase()
  : null;

/**
 * When a request arrives on a custom domain (tenant's domain), resolve the tenant
 * and rewrite to /hotels/[slug] so the same app serves their branded page.
 * Requires NEXT_PUBLIC_APP_URL to be set (e.g. https://yourplatform.com).
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase()?.split(":")[0] ?? "";
  const pathname = request.nextUrl.pathname;

  if (!PLATFORM_HOST || host === PLATFORM_HOST) {
    return NextResponse.next();
  }

  const isRoot = pathname === "/" || pathname === "";
  const isHotelsRoot = pathname === "/hotels";
  if (!isRoot && !isHotelsRoot) {
    return NextResponse.next();
  }

  const platformOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
  let slug: string | undefined;
  try {
    const res = await fetch(
      `${platformOrigin}/api/public/tenant-by-domain?domain=${encodeURIComponent(host)}`,
      {
        headers: { host: request.headers.get("host") ?? "" },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      return notFoundResponse(host);
    }
    const json = await res.json();
    slug = json?.data?.slug;
  } catch {
    return notFoundResponse(host);
  }

  if (!slug) {
    return notFoundResponse(host);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/hotels/${slug}`;
  const response = NextResponse.rewrite(url);
  response.headers.set("x-tenant-slug", slug);
  response.headers.set("x-custom-domain", "1");
  return response;
}

export const config = {
  matcher: ["/", "/hotels"],
};
