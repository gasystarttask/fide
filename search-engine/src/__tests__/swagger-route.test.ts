import { afterEach, describe, expect, it, vi } from "vitest";

async function getGET() {
  const mod = await import("@search/app/docs/swagger/route");
  return mod.GET;
}

describe("GET /docs/swagger", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const GET = await getGET();
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("serves the Swagger UI page outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const GET = await getGET();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("SwaggerUIBundle");
  });
});
