import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "morsar_session";

// Routes that don't require auth.
const PUBLIC_PATHS = ["/login"];

// Path prefixes only admins may access. Agents are redirected to /clients.
const ADMIN_ONLY = [
  "/providers",
  "/bouquets",
  "/settings",
  "/messages",
  "/users",
  "/orders",
  "/clients/new",
];

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? "");
}

/** Returns the role if the token is valid, otherwise null. */
async function verifyRole(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "agent" ? "agent" : "admin";
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const role = await verifyRole(token);
  const authed = role !== null;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Logged-in users shouldn't see the login page.
  if (isPublic) {
    if (authed) {
      return NextResponse.redirect(
        new URL(role === "agent" ? "/clients" : "/", req.url),
      );
    }
    return NextResponse.next();
  }

  // Everything else requires a session.
  if (!authed) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Agents may not reach admin-only sections.
  if (role === "agent" && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/clients", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except Next internals, the auth/cron APIs, and static assets.
  // (The cron route guards itself with CRON_SECRET.)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/cron|api/orders).*)",
  ],
};
