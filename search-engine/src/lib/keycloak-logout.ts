// Keycloak's RP-Initiated Logout endpoint. Ending only this app's own
// session leaves Keycloak's SSO session cookie in place, so the next
// sign-in silently re-authenticates instead of showing the login form.
// See: https://www.keycloak.org/docs/latest/securing_apps/#logout
// https://openid.net/specs/openid-connect-rpinitiated-1_0.html
const CONVENTIONAL_LOGOUT_PATH = "/protocol/openid-connect/logout";

let discoveryCache: { issuer: string; endSessionEndpoint: string } | null = null;

function normalizeIssuer(issuer: string): string {
  return issuer.replace(/\/+$/, "");
}

// Prefer the `end_session_endpoint` from OIDC discovery over the
// conventional Keycloak path, so this keeps working if Keycloak ever moves
// it. Falls back to the conventional path if discovery is unreachable or
// doesn't advertise one, so sign-out never hard-fails on a discovery hiccup.
async function resolveEndSessionEndpoint(issuer: string): Promise<string> {
  const normalizedIssuer = normalizeIssuer(issuer);
  const fallback = `${normalizedIssuer}${CONVENTIONAL_LOGOUT_PATH}`;

  if (discoveryCache?.issuer === normalizedIssuer) {
    return discoveryCache.endSessionEndpoint;
  }

  try {
    const response = await fetch(`${normalizedIssuer}/.well-known/openid-configuration`);
    if (!response.ok) {
      return fallback;
    }

    const config = (await response.json()) as { end_session_endpoint?: unknown };
    if (typeof config.end_session_endpoint !== "string" || !config.end_session_endpoint) {
      return fallback;
    }

    discoveryCache = { issuer: normalizedIssuer, endSessionEndpoint: config.end_session_endpoint };
    return config.end_session_endpoint;
  } catch {
    return fallback;
  }
}

type EndSessionParams = {
  issuer: string | undefined;
  idToken: string | undefined;
  clientId: string | undefined;
  postLogoutRedirectUri: string;
};

// The OP validates `post_logout_redirect_uri` against the session identified
// by `id_token_hint` when present, or against `client_id` per the
// RP-Initiated Logout spec. Sending both means sign-out still works even
// when the cached ID token is missing or has since expired.
export async function buildKeycloakEndSessionUrl({
  issuer,
  idToken,
  clientId,
  postLogoutRedirectUri,
}: EndSessionParams): Promise<string | null> {
  if (!issuer) {
    return null;
  }

  const endSessionEndpoint = await resolveEndSessionEndpoint(issuer);
  const url = new URL(endSessionEndpoint);

  if (idToken) {
    url.searchParams.set("id_token_hint", idToken);
  }
  if (clientId) {
    url.searchParams.set("client_id", clientId);
  }
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

  return url.toString();
}
