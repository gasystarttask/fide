# fide-kc-themes

Custom Keycloak **login** theme for the `fide` identity provider (see issue
#127 for how Keycloak itself is deployed), built with
[Keycloakify](https://docs.keycloakify.dev/). Only the login theme is
customized here — the Account and Admin console UIs are left as Keycloak's
defaults (`accountThemeImplementation: "none"` in `vite.config.ts`).

Keycloakify only supports Vite (or legacy webpack) projects — there is no
Next.js integration — so this app is a plain Vite + React + TypeScript
project, the same stack as the reference project this was modeled on.

## Theming

`src/keycloak-theme/login/kcLogin.css` ports the design tokens from
`search-engine/src/app/globals.css` 1:1 (near-black background, purple/
lavender primary/accent, pill-shaped primary button) so the login page reads
as part of the same product as the chat app — see issue #148 for the design
system this was synthesized from. `src/keycloak-theme/login/KcPage.tsx` uses
Keycloakify's `DefaultPage` with that stylesheet; no individual page has
been ejected/rewritten. To customize a specific page's layout or markup
instead of just its styling:

```bash
npx keycloakify eject-page --pageId login.ftl
```

## Local development

```bash
npm install
npm run dev
```

By default the dev server just shows a placeholder (this app only renders
inside a real Keycloak page context). To preview a specific page without a
running Keycloak instance, uncomment the mock-context block at the top of
`src/main.tsx` and set the `pageId` you want (`"login.ftl"`,
`"register.ftl"`, etc.) — comment it back out before building.

## Building the theme jar

```bash
npm run build-keycloak-theme
```

Requires a JDK and Maven on `PATH` (Keycloakify uses Maven to package the
jar) — `JAVA_HOME` must point at a valid JDK. Output lands in
`dist_keycloak/`; the file that matters for this repo's Keycloak version
(26.x) is `keycloak-theme-for-kc-all-other-versions.jar`.

## Releasing

`.github/workflows/kc-theme-release.yml` (`workflow_dispatch`, required
`version` input) builds the jar and publishes it as a GitHub Release tagged
`kc-theme-v<version>`, with the jar attached under the fixed asset name
`keycloak-theme.jar`. It then also moves a floating `kc-theme-latest` tag to
point at the same commit and updates a release under that tag with the same
jar — that fixed tag, **not** GitHub's generic `/releases/latest/`, is what
gets pulled at deploy time, since this repo's own `release.yml` (app
releases, tag `v<version>`) publishes into the same repo and would
otherwise hijack "latest" the next time an app release is cut after a theme
release.

## Installing into the running Keycloak instance

`.pipelines/deployment/keycloak/keycloak-deployment.yaml`'s `pull-theme`
initContainer downloads
`https://github.com/gasystarttask/fide/releases/download/kc-theme-latest/keycloak-theme.jar`
into `/opt/keycloak/providers` on every pod start — no manual install step,
no custom Keycloak image. Since Keycloak runs in non-optimized `start`
mode, it rebuilds providers from that directory automatically on boot. What's
still manual: setting a realm's *login theme* to `fide-kc-themes` in the
Admin Console (Realm Settings → Themes) once a release exists — see
`.pipelines/deployment/README.md`'s "Deploying Keycloak" section.

**Accepted risk, not yet addressed**: the deployment always tracks
`kc-theme-latest` with no version pinning and no rollback path — a broken
theme release breaks every login page at the next pod restart (including
the automated nightly one) with no fallback to a known-good jar. If that
becomes a real problem, pin `keycloak-deployment.yaml` to a specific
`kc-theme-v<version>` release URL instead and bump it deliberately, the same
way `search-engine-docker.yml` pins a sha-tagged image rather than `latest`.
