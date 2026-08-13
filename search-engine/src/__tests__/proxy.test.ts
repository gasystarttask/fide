import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let mockSession: { user: { email: string } } | null = null;

vi.mock("@search/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (req: NextRequest) =>
    handler(Object.assign(req, { auth: mockSession })),
}));

vi.mock("@search/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({
    allowed: true,
    remaining: 29,
    resetAt: Date.now() + 60_000,
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
