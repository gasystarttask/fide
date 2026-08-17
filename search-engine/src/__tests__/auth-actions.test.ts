import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@search/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { auth, signIn, signOut } from "@search/lib/auth";
import { redirect } from "next/navigation";
import { signInAction, signOutAction } from "@search/app/actions/auth-actions";

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedSignIn = signIn as unknown as ReturnType<typeof vi.fn>;
const mockedSignOut = signOut as unknown as ReturnType<typeof vi.fn>;
const mockedRedirect = redirect as unknown as ReturnType<typeof vi.fn>;

describe("auth actions", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
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
    mockedAuth.mockResolvedValue({ idToken: "id-token-123" });

    await signOutAction();

    expect(mockedSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockedRedirect).toHaveBeenCalledTimes(1);

    const [redirectUrl] = mockedRedirect.mock.calls[0];
    const parsed = new URL(redirectUrl);
    expect(parsed.origin + parsed.pathname).toBe(
      "http://localhost:8080/realms/bible-sg/protocol/openid-connect/logout"
    );
    expect(parsed.searchParams.get("id_token_hint")).toBe("id-token-123");
    expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe("http://localhost:3000");
  });

  it("falls back to redirecting home when AUTH_URL is not configured", async () => {
    delete process.env.AUTH_URL;
    mockedAuth.mockResolvedValue({ idToken: "id-token-123" });

    await signOutAction();

    expect(mockedRedirect).toHaveBeenCalledWith("/");
  });

  it("falls back to redirecting home when there is no active session", async () => {
    process.env.AUTH_URL = "http://localhost:3000";
    process.env.KEYCLOAK_ISSUER = "http://localhost:8080/realms/bible-sg";
    mockedAuth.mockResolvedValue(null);

    await signOutAction();

    expect(mockedSignOut).toHaveBeenCalledWith({ redirect: false });
    const [redirectUrl] = mockedRedirect.mock.calls[0];
    const parsed = new URL(redirectUrl);
    expect(parsed.searchParams.has("id_token_hint")).toBe(false);
    expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe("http://localhost:3000");
  });
});
