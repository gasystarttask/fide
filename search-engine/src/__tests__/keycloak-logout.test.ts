import { describe, expect, it } from "vitest";
import { buildKeycloakEndSessionUrl } from "@search/lib/keycloak-logout";

const ISSUER = "http://localhost:8080/realms/bible-sg";

describe("buildKeycloakEndSessionUrl", () => {
  it("returns null when the issuer is not configured", () => {
    expect(buildKeycloakEndSessionUrl(undefined, "id-token", "http://localhost:3000")).toBeNull();
  });

  it("builds the Keycloak end-session URL with id_token_hint and post_logout_redirect_uri", () => {
    const url = buildKeycloakEndSessionUrl(ISSUER, "id-token", "http://localhost:3000");

    expect(url).not.toBeNull();
    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe(
      "http://localhost:8080/realms/bible-sg/protocol/openid-connect/logout"
    );
    expect(parsed.searchParams.get("id_token_hint")).toBe("id-token");
    expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe("http://localhost:3000");
  });

  it("omits id_token_hint when no id token is available", () => {
    const url = buildKeycloakEndSessionUrl(ISSUER, undefined, "http://localhost:3000");

    const parsed = new URL(url as string);
    expect(parsed.searchParams.has("id_token_hint")).toBe(false);
    expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe("http://localhost:3000");
  });
});
