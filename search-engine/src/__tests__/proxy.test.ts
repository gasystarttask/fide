import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let mockSession: { user: { email: string } } | null = null;

vi.mock("@search/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (req: NextRequest) =>
    handler(Object.assign(req, { auth: mockSession })),
}));

// Key-aware so tests can distinguish the IP bucket from the per-user bucket
// instead of them sharing one blanket "always allowed" mock.
const blockedKeys = new Set<string>();

vi.mock("@search/lib/rate-limit", () => ({
  checkRateLimit: vi.fn((key: string) => {
    if (blockedKeys.has(key)) {
      return { allowed: false, remaining: 0, resetAt: Date.now() + 60_000 };
    }
    return { allowed: true, remaining: 29, resetAt: Date.now() + 60_000 };
  }),
}));

function buildRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { method: "GET" });
}

async function getProxy() {
  const mod = await import("@search/proxy");
  // Tests only exercise req-based branching — no proxy.ts code path uses
  // the NextFetchEvent argument (e.g. waitUntil), so a stub is sufficient.
  const fakeEvent = {} as Parameters<typeof mod.proxy>[1];
  return (req: NextRequest) => mod.proxy(req, fakeEvent);
}

describe("proxy auth gating", () => {
  beforeEach(() => {
    mockSession = null;
    blockedKeys.clear();
    vi.clearAllMocks();
  });

  it("returns 401 JSON for unauthenticated requests to protected API routes", async () => {
    const proxy = await getProxy();
    const res = await proxy(buildRequest("/api/chat"));
    expect(res?.status).toBe(401);
    expect((await res!.json()).error).toMatch(/unauthorized/i);
  });

  it("allows authenticated requests through", async () => {
    mockSession = { user: { email: "test@example.com" } };
    const proxy = await getProxy();
    const res = await proxy(buildRequest("/api/chat"));
    expect(res?.status).not.toBe(401);
  });

  it("does not gate next-auth's own routes", async () => {
    const proxy = await getProxy();
    const res = await proxy(buildRequest("/api/auth/session"));
    expect(res?.status).not.toBe(401);
  });

  it("passes through non-api paths untouched", async () => {
    const proxy = await getProxy();
    const res = await proxy(buildRequest("/"));
    expect(res?.status).not.toBe(401);
  });
});

describe("proxy rate limiting", () => {
  beforeEach(() => {
    mockSession = null;
    blockedKeys.clear();
    vi.clearAllMocks();
  });

  it("returns 429 when the per-IP bucket is exhausted, before the auth check", async () => {
    blockedKeys.add("ip:unknown");
    const proxy = await getProxy();
    // Unauthenticated — proves IP limiting applies even pre-login.
    const res = await proxy(buildRequest("/api/chat"));
    expect(res?.status).toBe(429);
    expect((await res!.json()).error).toMatch(/too many requests/i);
  });

  it("returns 429 when the authenticated user's own bucket is exhausted, even though their IP bucket is fine", async () => {
    mockSession = { user: { email: "heavy-user@example.com" } };
    blockedKeys.add("user:heavy-user@example.com");
    const proxy = await getProxy();
    const res = await proxy(buildRequest("/api/chat"));
    expect(res?.status).toBe(429);
  });

  it("does not rate-limit one user because another user on the same IP is exhausted", async () => {
    blockedKeys.add("user:noisy-neighbor@example.com");
    mockSession = { user: { email: "quiet-user@example.com" } };
    const proxy = await getProxy();
    const res = await proxy(buildRequest("/api/chat"));
    expect(res?.status).not.toBe(429);
  });

  it("does not consult a per-user bucket for unauthenticated requests", async () => {
    const { checkRateLimit } = await import("@search/lib/rate-limit");
    const proxy = await getProxy();
    await proxy(buildRequest("/api/chat"));
    const userKeyCalls = vi
      .mocked(checkRateLimit)
      .mock.calls.filter(([key]) => key.startsWith("user:"));
    expect(userKeyCalls).toHaveLength(0);
  });
});
