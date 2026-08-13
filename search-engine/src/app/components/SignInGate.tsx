"use client";

import { useEffect, useState } from "react";
import { signInAction } from "../actions/auth-actions";
import { Button } from "./ui/Button";
import type { Locale } from "../types/ui";
import { COPY, resolveLocale } from "../services/localization";

export function SignInGate() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(resolveLocale());
  }, []);

  const uiText = COPY[locale];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-main">
      <p className="text-b3 text-medium-gray">{uiText.signInPrompt}</p>
      <form action={signInAction}>
        <Button type="submit" variant="primary" size="md">
          {uiText.signIn}
        </Button>
      </form>
    </main>
  );
}
