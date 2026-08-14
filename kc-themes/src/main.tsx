import { createRoot } from "react-dom/client";
import { StrictMode, Suspense } from "react";
import { KcContext, KcPage } from "./keycloak-theme/kc.gen";

// The following block can be uncommented to preview a specific page with
// `npm run dev`. Don't forget to comment it back out before building —
// it isn't tree-shaken out of a real Keycloak deployment.
/*
import { getKcContextMock } from "./keycloak-theme/login/KcPageStory";

if (import.meta.env.DEV) {
  window.kcContext = getKcContextMock({
    pageId: "login.ftl",
    overrides: {},
  });
}
*/

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {!window.kcContext ? (
      <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
        This app only renders inside a Keycloak login page context. See the
        README for how to preview it locally.
      </div>
    ) : (
      <Suspense>
        <KcPage kcContext={window.kcContext} />
      </Suspense>
    )}
  </StrictMode>
);

declare global {
  interface Window {
    kcContext?: KcContext;
  }
}
