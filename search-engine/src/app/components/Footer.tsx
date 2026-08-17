import Link from "next/link";
import type { UIText } from "../types/ui";

type FooterProps = {
  uiText: UIText;
};

export function Footer({ uiText }: FooterProps) {
  return (
    <footer className="mx-auto w-full max-w-6xl px-3 py-4 text-center sm:px-6">
      <Link
        href="/privacy-policy"
        className="text-b4 text-medium-gray underline hover:text-main"
      >
        {uiText.privacyPolicyLink}
      </Link>
    </footer>
  );
}
