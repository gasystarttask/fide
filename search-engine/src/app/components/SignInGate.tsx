"use client";

import { signInAction } from "../actions/auth-actions";
import { Button } from "./ui/Button";
import { Footer } from "./Footer";
import { COPY } from "../services/localization";
import { useLocale } from "../hooks/useLocale";

export function SignInGate() {
  const locale = useLocale();
  const uiText = COPY[locale];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-3 pt-6 pb-[calc(1.5rem+var(--cookie-banner-height))] text-main sm:px-6">
      <p className="max-w-sm text-center text-b3 text-medium-gray">{uiText.signInPrompt}</p>
      <form action={signInAction}>
        <Button type="submit" variant="primary" size="md">
          {uiText.signIn}
        </Button>
      </form>
      <Footer uiText={uiText} />
    </main>
  );
}
