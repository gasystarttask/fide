"use server";

import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@search/lib/auth";
import { buildKeycloakEndSessionUrl } from "@search/lib/keycloak-logout";

export async function signInAction() {
  await signIn("keycloak");
}

export async function signOutAction() {
  const session = await auth();

  // Clear this app's own session without letting next-auth redirect yet —
  // we still need to also end the Keycloak SSO session below, otherwise
  // the next sign-in silently re-authenticates against Keycloak.
  await signOut({ redirect: false });

  const postLogoutRedirectUri = process.env.AUTH_URL;
  const endSessionUrl = postLogoutRedirectUri
    ? buildKeycloakEndSessionUrl(process.env.KEYCLOAK_ISSUER, session?.idToken, postLogoutRedirectUri)
    : null;

  redirect(endSessionUrl ?? "/");
}
