import { Suspense, lazy } from "react";
import type { KcContext } from "./KcContext";
import { useI18n } from "./i18n";
import DefaultPage from "keycloakify/login/DefaultPage";
import Template from "keycloakify/login/Template";
import "./kcLogin.css";

const UserProfileFormFields = lazy(() => import("keycloakify/login/UserProfileFormFields"));

const doMakeUserConfirmPassword = true;

// Visual customization lives entirely in kcLogin.css (design tokens ported
// from search-engine/src/app/globals.css, per issue #148). To customize the
// layout or markup of a specific page instead of just its styling, run
// `npx keycloakify eject-page --pageId login.ftl` and edit the ejected
// component — see https://docs.keycloakify.dev/customization-guide.
export default function KcPage(props: { kcContext: KcContext }) {
  const { kcContext } = props;

  const { i18n } = useI18n({ kcContext });

  return (
    <Suspense>
      <DefaultPage
        kcContext={kcContext}
        i18n={i18n}
        Template={Template}
        doUseDefaultCss={true}
        UserProfileFormFields={UserProfileFormFields}
        doMakeUserConfirmPassword={doMakeUserConfirmPassword}
      />
    </Suspense>
  );
}
