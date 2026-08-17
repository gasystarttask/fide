import { afterEach, describe, expect, it, vi } from "vitest";
import { buildKeycloakEndSessionUrl } from "@search/lib/keycloak-logout";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetchRejecting() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("network error")))
  );
}

function stubFetchWithDiscovery(endSessionEndpoint: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ end_session_endpoint: endSessionEndpoint }),
      })
    )
  );
}

describe("buildKeycloakEndSessionUrl", () => {
  it("returns null when the issuer is not configured", async () => {
    stubFetchRejecting();

    await expect(
      buildKeycloakEndSessionUrl({
        issuer: undefined,
        idToken: "id-token",
        clientId: "bible-sg-search",
        postLogoutRedirectUri: "http://localhost:3000",
      })
    ).resolves.toBeNull();
  });

  it("builds the end-session URL with id_token_hint, client_id, and post_logout_redirect_uri, falling back to the conventional path when discovery is unreachable", async () => {
    stubFetchRejecting();

    const url = await buildKeycloakEndSessionUrl({
      issuer: "http://localhost:8080/realms/bible-sg-fallback",
      idToken: "id-token",
      clientId: "bible-sg-search",
      postLogoutRedirectUri: "http://localhost:3000",
    });

    expect(url).not.toBeNull();
    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe(
      "http://localhost:8080/realms/bible-sg-fallback/protocol/openid-connect/logout"
    );
    expect(parsed.searchParams.get("id_token_hint")).toBe("id-token");
    expect(parsed.searchParams.get("client_id")).toBe("bible-sg-search");
    expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe("http://localhost:3000");
  });

  it("uses the end_session_endpoint reported by OIDC discovery when available", async () => {
    stubFetchWithDiscovery("http://localhost:8080/realms/bible-sg-discovery/custom-logout");

    const url = await buildKeycloakEndSessionUrl({
      issuer: "http://localhost:8080/realms/bible-sg-discovery",
      idToken: "id-token",
      clientId: "bible-sg-search",
      postLogoutRedirectUri: "http://localhost:3000",
    });

    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe(
      "http://localhost:8080/realms/bible-sg-discovery/custom-logout"
    );
  });

  it("normalizes a trailing slash on the issuer before building the fallback URL", async () => {
    stubFetchRejecting();

    const url = await buildKeycloakEndSessionUrl({
      issuer: "http://localhost:8080/realms/bible-sg-trailing/",
      idToken: "id-token",
      clientId: "bible-sg-search",
      postLogoutRedirectUri: "http://localhost:3000",
    });

    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe(
      "http://localhost:8080/realms/bible-sg-trailing/protocol/openid-connect/logout"
    );
  });

  it("omits id_token_hint and client_id when neither is available", async () => {
    stubFetchRejecting();

    const url = await buildKeycloakEndSessionUrl({
      issuer: "http://localhost:8080/realms/bible-sg-omit",
      idToken: undefined,
      clientId: undefined,
      postLogoutRedirectUri: "http://localhost:3000",
    });

    const parsed = new URL(url as string);
    expect(parsed.searchParams.has("id_token_hint")).toBe(false);
    expect(parsed.searchParams.has("client_id")).toBe(false);
    expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe("http://localhost:3000");
  });

  it("still includes client_id when there is no id_token, so the OP can validate the redirect without the hint", async () => {
    stubFetchRejecting();

    const url = await buildKeycloakEndSessionUrl({
      issuer: "http://localhost:8080/realms/bible-sg-no-idtoken",
      idToken: undefined,
      clientId: "bible-sg-search",
      postLogoutRedirectUri: "http://localhost:3000",
    });

    const parsed = new URL(url as string);
    expect(parsed.searchParams.has("id_token_hint")).toBe(false);
    expect(parsed.searchParams.get("client_id")).toBe("bible-sg-search");
  });
});
