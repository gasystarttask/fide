// Keycloak's RP-Initiated Logout endpoint. Ending only this app's own
// session leaves Keycloak's SSO session cookie in place, so the next
// sign-in silently re-authenticates instead of showing the login form.
// See: https://www.keycloak.org/docs/latest/securing_apps/#logout
export function buildKeycloakEndSessionUrl(
  issuer: string | undefined,
  idToken: string | undefined,
  postLogoutRedirectUri: string
): string | null {
  if (!issuer) {
    return null;
  }

  const url = new URL(`${issuer}/protocol/openid-connect/logout`);
  if (idToken) {
    url.searchParams.set("id_token_hint", idToken);
  }
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

  return url.toString();
}
