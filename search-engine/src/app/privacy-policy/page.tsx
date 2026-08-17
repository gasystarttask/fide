"use client";

import Link from "next/link";
import { COPY } from "../services/localization";
import { useLocale } from "../hooks/useLocale";

export default function PrivacyPolicyPage() {
  const locale = useLocale();
  const uiText = COPY[locale];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-background px-3 pt-10 pb-[calc(2.5rem+var(--cookie-banner-height))] text-main sm:px-6">
      <div>
        <Link href="/" className="text-b4 text-primary underline hover:text-primary-hover">
          {uiText.backToApp}
        </Link>
        <h1 className="mt-4 text-h3 font-semibold tracking-tight text-main">
          {uiText.privacyPolicyPageTitle}
        </h1>
        <p className="mt-2 text-b3 text-medium-gray">{uiText.privacyPolicyIntro}</p>
      </div>

      <section>
        <h2 className="text-b1 font-semibold text-main">{uiText.privacyPolicyDataTitle}</h2>
        <p className="mt-1 text-b4 text-medium-gray">{uiText.privacyPolicyDataBody}</p>
      </section>

      <section>
        <h2 className="text-b1 font-semibold text-main">{uiText.privacyPolicyCookiesTitle}</h2>
        <p className="mt-1 text-b4 text-medium-gray">{uiText.privacyPolicyCookiesBody}</p>
      </section>

      <section>
        <h2 className="text-b1 font-semibold text-main">{uiText.privacyPolicyRightsTitle}</h2>
        <p className="mt-1 text-b4 text-medium-gray">{uiText.privacyPolicyRightsBody}</p>
      </section>

      <section>
        <h2 className="text-b1 font-semibold text-main">{uiText.privacyPolicyContactTitle}</h2>
        <p className="mt-1 text-b4 text-medium-gray">{uiText.privacyPolicyContactBody}</p>
      </section>
    </main>
  );
}
