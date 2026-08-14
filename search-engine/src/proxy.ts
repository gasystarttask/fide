import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@search/lib/auth";
import { checkRateLimit } from "@search/lib/rate-limit";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  return forwarded.split(",")[0]?.trim() || "unknown";
}

// next-auth's own OAuth flow endpoints must stay reachable without a session.
const PUBLIC_API_PREFIX = "/api/auth";

function rateLimitedResponse(rate: { remaining: number; resetAt: number }) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Remaining": String(rate.remaining),
        "X-RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
      },
    }
  );
}

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Per-IP first — catches unauthenticated flooding (including against the
  // login flow itself) before we even know who, if anyone, is signed in.
  const ip = getClientIp(req);
  let rate = checkRateLimit(`ip:${ip}`, 30, 60_000);

  if (!rate.allowed) {
    return rateLimitedResponse(rate);
  }

  if (!pathname.startsWith(PUBLIC_API_PREFIX) && !req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Per-user, independent of IP — a valid session rotating across IPs (or
  // sharing one with other users behind NAT/VPN) is still capped on its own.
  const userId = req.auth?.user?.email;

  if (userId) {
    const userRate = checkRateLimit(`user:${userId}`, 30, 60_000);

    if (!userRate.allowed) {
      return rateLimitedResponse(userRate);
    }

    if (userRate.remaining < rate.remaining) {
      rate = userRate;
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-ratelimit-remaining", String(rate.remaining));
  requestHeaders.set("x-ratelimit-reset", String(rate.resetAt));
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: ["/api/:path*"],
};
