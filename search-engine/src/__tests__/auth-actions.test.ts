import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@search/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@search/lib/keycloak-logout", () => ({
  buildKeycloakEndSessionUrl: vi.fn(),
}));

import { auth, signIn, signOut } from "@search/lib/auth";
import { redirect } from "next/navigation";
import { buildKeycloakEndSessionUrl } from "@search/lib/keycloak-logout";
import { signInAction, signOutAction } from "@search/app/actions/auth-actions";

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedSignIn = signIn as unknown as ReturnType<typeof vi.fn>;
const mockedSignOut = signOut as unknown as ReturnType<typeof vi.fn>;
const mockedRedirect = redirect as unknown as ReturnType<typeof vi.fn>;
const mockedBuildKeycloakEndSessionUrl = buildKeycloakEndSessionUrl as unknown as ReturnType<typeof vi.fn>;

describe("auth actions", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    mockedAuth.mockReset();
    mockedSignIn.mockReset();
    mockedSignOut.mockReset();
    mockedRedirect.mockReset();
    mockedBuildKeycloakEndSessionUrl.mockReset();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("signs in via Keycloak", async () => {
    await signInAction();

    expect(mockedSignIn).toHaveBeenCalledWith("keycloak");
  });

  it("clears the local session and ends the Keycloak SSO session on sign-out", async () => {
    process.env.AUTH_URL = "http://localhost:3000";
    process.env.KEYCLOAK_ISSUER = "http://localhost:8080/realms/bible-sg";
    process.env.KEYCLOAK_CLIENT_ID = "bible-sg-search";
    mockedAuth.mockResolvedValue({ idToken: "id-token-123" });
    mockedBuildKeycloakEndSessionUrl.mockResolvedValue(
      "http://localhost:8080/realms/bible-sg/protocol/openid-connect/logout?id_token_hint=id-token-123"
    );

    await signOutAction();

    expect(mockedSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockedBuildKeycloakEndSessionUrl).toHaveBeenCalledWith({
      issuer: "http://localhost:8080/realms/bible-sg",
      idToken: "id-token-123",
      clientId: "bible-sg-search",
      postLogoutRedirectUri: "http://localhost:3000",
    });
    expect(mockedRedirect).toHaveBeenCalledTimes(1);
    expect(mockedRedirect).toHaveBeenCalledWith(
      "http://localhost:8080/realms/bible-sg/protocol/openid-connect/logout?id_token_hint=id-token-123"
    );
  });

  it("falls back to redirecting home when AUTH_URL is not configured", async () => {
    delete process.env.AUTH_URL;
    process.env.KEYCLOAK_ISSUER = "http://localhost:8080/realms/bible-sg";
    mockedAuth.mockResolvedValue({ idToken: "id-token-123" });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await signOutAction();

    expect(mockedBuildKeycloakEndSessionUrl).not.toHaveBeenCalled();
    expect(mockedRedirect).toHaveBeenCalledTimes(1);
    expect(mockedRedirect).toHaveBeenCalledWith("/");
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
  });

  it("treats a blank AUTH_URL the same as unset instead of silently building a broken redirect", async () => {
    process.env.AUTH_URL = "   ";
    process.env.KEYCLOAK_ISSUER = "http://localhost:8080/realms/bible-sg";
    mockedAuth.mockResolvedValue({ idToken: "id-token-123" });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await signOutAction();

    expect(mockedBuildKeycloakEndSessionUrl).not.toHaveBeenCalled();
    expect(mockedRedirect).toHaveBeenCalledWith("/");
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
  });

  it("falls back to redirecting home when KEYCLOAK_ISSUER is not configured", async () => {
    process.env.AUTH_URL = "http://localhost:3000";
    delete process.env.KEYCLOAK_ISSUER;
    mockedAuth.mockResolvedValue({ idToken: "id-token-123" });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await signOutAction();

    expect(mockedBuildKeycloakEndSessionUrl).not.toHaveBeenCalled();
    expect(mockedRedirect).toHaveBeenCalledWith("/");

    warnSpy.mockRestore();
  });

  it("still ends the Keycloak SSO session when there is no active app session, relying on client_id instead of id_token_hint", async () => {
    process.env.AUTH_URL = "http://localhost:3000";
    process.env.KEYCLOAK_ISSUER = "http://localhost:8080/realms/bible-sg";
    process.env.KEYCLOAK_CLIENT_ID = "bible-sg-search";
    mockedAuth.mockResolvedValue(null);
    mockedBuildKeycloakEndSessionUrl.mockResolvedValue(
      "http://localhost:8080/realms/bible-sg/protocol/openid-connect/logout?client_id=bible-sg-search"
    );

    await signOutAction();

    expect(mockedSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockedBuildKeycloakEndSessionUrl).toHaveBeenCalledWith({
      issuer: "http://localhost:8080/realms/bible-sg",
      idToken: undefined,
      clientId: "bible-sg-search",
      postLogoutRedirectUri: "http://localhost:3000",
    });
    expect(mockedRedirect).toHaveBeenCalledWith(
      "http://localhost:8080/realms/bible-sg/protocol/openid-connect/logout?client_id=bible-sg-search"
    );
  });
});
