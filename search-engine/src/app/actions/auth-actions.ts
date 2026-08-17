"use server";

import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@search/lib/auth";
import { buildKeycloakEndSessionUrl } from "@search/lib/keycloak-logout";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export async function signInAction() {
  await signIn("keycloak");
}

export async function signOutAction() {
  const session = await auth();

  // Clear this app's own session without letting next-auth redirect yet —
  // we still need to also end the Keycloak SSO session below, otherwise
  // the next sign-in silently re-authenticates against Keycloak.
  await signOut({ redirect: false });

  const postLogoutRedirectUri = readEnv("AUTH_URL");
  const issuer = readEnv("KEYCLOAK_ISSUER");

  if (!postLogoutRedirectUri || !issuer) {
    console.warn(
      "[auth] AUTH_URL/KEYCLOAK_ISSUER is not configured — skipping Keycloak SSO logout; only the local session was cleared."
    );
  }

  const endSessionUrl =
    postLogoutRedirectUri && issuer
      ? await buildKeycloakEndSessionUrl({
          issuer,
          idToken: session?.idToken,
          clientId: process.env.KEYCLOAK_CLIENT_ID,
          postLogoutRedirectUri,
        })
      : null;

  redirect(endSessionUrl ?? "/");
}
