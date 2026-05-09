import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

type TokenRole = "ADMIN" | "CUSTOMER" | undefined;

function isStatic(pathname: string) {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname.startsWith("/images/") || pathname.startsWith("/downloads/");
}

function redirectTo(request: NextRequest, pathname: string, callbackPath?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (callbackPath) url.searchParams.set("callbackUrl", callbackPath);
  return NextResponse.redirect(url);
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  if (isStatic(pathname)) return NextResponse.next();

  if (host.toLowerCase().startsWith("admin.") && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin-login";
    return NextResponse.rewrite(url);
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const role = token?.role as TokenRole;

  if (pathname === "/admin-login" && role === "ADMIN") return redirectTo(request, "/admin");
  if (pathname === "/portal/login" && role === "CUSTOMER") return redirectTo(request, "/portal");
  // Admins may still visit the customer login page from the public website.
  // Do not redirect them back to admin here; they may need to sign into a customer account separately.
  if (pathname === "/auth/login") {
    if (role === "ADMIN") return redirectTo(request, "/admin");
    if (role === "CUSTOMER") return redirectTo(request, "/portal");
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!token) return redirectTo(request, "/admin-login", pathname + request.nextUrl.search);
    if (role !== "ADMIN") return redirectTo(request, "/portal");
  }

  if (pathname.startsWith("/portal") && pathname !== "/portal/login") {
    if (!token) return redirectTo(request, "/portal/login", pathname + request.nextUrl.search);
    if (role !== "CUSTOMER") return redirectTo(request, "/admin");
  }

  if (pathname.startsWith("/api/admin")) {
    if (!token) return jsonError("Admin sign-in required.", 401);
    if (role !== "ADMIN") return jsonError("Admin access required.", 403);
  }

  const adminOnlyApiPrefixes = [
    "/api/ai/",
    "/api/ebay/",
    "/api/ebay-sync",
    "/api/leads",
    "/api/marketing/automations",
    "/api/marketing/broadcast",
    "/api/marketing/templates",
    "/api/uploads",
  ];
  if (adminOnlyApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (!token) return jsonError("Admin sign-in required.", 401);
    if (role !== "ADMIN") return jsonError("Admin access required.", 403);
  }

  if ((pathname === "/api/products" || pathname.startsWith("/api/products/")) && request.method !== "GET") {
    if (!token) return jsonError("Admin sign-in required.", 401);
    if (role !== "ADMIN") return jsonError("Admin access required.", 403);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
